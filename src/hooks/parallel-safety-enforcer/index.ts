import type { PluginInput } from "@opencode-ai/plugin"
import { 
  HOOK_NAME, 
  BACKGROUND_CAPABLE_TOOLS, 
  MAX_PARALLEL_TASKS 
} from "./constants"
import {
  extractFilesFromPrompt,
  checkFileConflicts,
  registerPendingFiles,
  clearPendingFiles,
  getPendingTaskCount,
} from "./file-tracker"
import { log } from "../../shared/logger"

export * from "./constants"
export * from "./file-tracker"

const callToTaskMap = new Map<string, { parentSessionID: string; taskId: string }>()

export function createParallelSafetyEnforcerHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      if (!BACKGROUND_CAPABLE_TOOLS.includes(input.tool)) {
        return
      }

      const isBackground = output.args.run_in_background === true
      if (!isBackground) {
        return
      }

      const prompt = (output.args.prompt as string) || ""
      const parentSessionID = input.sessionID
      const taskId = `task_${input.callID}`

      const pendingCount = getPendingTaskCount(parentSessionID)
      if (pendingCount >= MAX_PARALLEL_TASKS) {
        log(`[${HOOK_NAME}] BLOCKED: Max parallel tasks (${MAX_PARALLEL_TASKS}) reached`, {
          sessionID: parentSessionID,
          pendingCount,
        })
        throw new Error(
          `[${HOOK_NAME}] PARALLEL LIMIT: Maximum ${MAX_PARALLEL_TASKS} parallel tasks allowed.\n` +
          `Currently ${pendingCount} tasks pending. Wait for some to complete or run sequentially.`
        )
      }

      const files = extractFilesFromPrompt(prompt)
      if (files.length === 0) {
        log(`[${HOOK_NAME}] Warning: No files detected in prompt, allowing parallel execution`, {
          sessionID: parentSessionID,
          taskId,
        })
        return
      }

      const conflict = checkFileConflicts(parentSessionID, files)
      if (conflict.hasConflict) {
        log(`[${HOOK_NAME}] BLOCKED: File conflict detected`, {
          sessionID: parentSessionID,
          conflictingFile: conflict.conflictingFile,
          conflictingTaskId: conflict.conflictingTaskId,
        })
        throw new Error(
          `[${HOOK_NAME}] FILE CONFLICT: Cannot run parallel task.\n` +
          `File '${conflict.conflictingFile}' is already being modified by task '${conflict.conflictingTaskId}'.\n` +
          `Options:\n` +
          `1. Wait for the other task to complete\n` +
          `2. Run this task with run_in_background=false (sequential)\n` +
          `3. Modify a different file`
        )
      }

      registerPendingFiles(parentSessionID, taskId, files)
      callToTaskMap.set(input.callID, { parentSessionID, taskId })

      log(`[${HOOK_NAME}] Registered parallel task`, {
        sessionID: parentSessionID,
        taskId,
        files,
      })
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      _output: { output?: string; error?: Error }
    ): Promise<void> => {
      const mapping = callToTaskMap.get(input.callID)
      if (mapping) {
        clearPendingFiles(mapping.parentSessionID, mapping.taskId)
        callToTaskMap.delete(input.callID)
        log(`[${HOOK_NAME}] Cleared pending files for task`, {
          taskId: mapping.taskId,
        })
      }
    },
  }
}
