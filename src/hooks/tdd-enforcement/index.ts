import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { log } from "../../shared/logger"
import { markFileDirty, clearDirtyFiles, hasDirtyFiles, getDirtyFiles } from "./dirty-file-tracker"

const HOOK_NAME = "tdd-enforcement"
const CODE_FILE_PATTERN = /\.(ts|tsx|js|jsx|py|go|java|cpp|c|rs)$/
const WRITE_EDIT_TOOLS = ["mcp_write", "mcp_edit"]

export function isCodeFile(filePath: string): boolean {
  if (!filePath) return false
  return CODE_FILE_PATTERN.test(filePath)
}

function hasTestSpecs(workspaceRoot: string): boolean {
  const plansDir = join(workspaceRoot, ".paul/plans")
  
  if (!existsSync(plansDir)) {
    return false
  }

  try {
    const files = readdirSync(plansDir)
    return files.some(file => file.endsWith("-tests.md"))
  } catch {
    return false
  }
}

function isVerificationAgent(args: Record<string, unknown>): boolean {
  const agentName = (args.subagent_type as string | undefined) ?? ""
  return agentName.includes("Joshua") || agentName.includes("Test Runner")
}

const TODO_TOOLS = ["todo", "todowrite"]

function isCompletingTodo(args: Record<string, unknown>): boolean {
  const todos = (args.todos as Array<{ status?: string }>) ?? []
  if (Array.isArray(todos)) {
    return todos.some(t => t.status === "completed" || t.status === "done")
  }
  return false
}

export function createTddEnforcementHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string; args: Record<string, unknown> },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      const toolName = input.tool

      if (TODO_TOOLS.includes(toolName)) {
        if (isCompletingTodo(input.args)) {
          if (hasDirtyFiles(input.sessionID)) {
             const dirtyFiles = getDirtyFiles(input.sessionID)
             const errorMsg = `
⛔ **DEFINITION OF DONE BLOCKED**

You cannot mark this task as 'completed' because you have unverified code changes.
**Dirty Files**:
${dirtyFiles.map(f => `- ${f}`).join("\n")}

**Requirement**: You MUST run Joshua (Test Runner) to verify changes before completing the todo.
Use: \`delegate_task(agent="Joshua (Test Runner)", prompt="Run tests")\`
`
             throw new Error(errorMsg)
          }
        }
        return
      }

      if (toolName === "delegate_task") {
        const isVerification = isVerificationAgent(input.args)

        if (isVerification) {
          if (hasDirtyFiles(input.sessionID)) {
             log(`[${HOOK_NAME}] Clearing dirty files for verification run`, {
               sessionID: input.sessionID,
               agent: input.args.subagent_type
             })
             clearDirtyFiles(input.sessionID)
          }
          return
        }

        if (hasDirtyFiles(input.sessionID)) {
          const dirtyFiles = getDirtyFiles(input.sessionID)
          const errorMsg = `
⛔ **TDD ENFORCEMENT BLOCK**

You have modified code that has not been verified yet.
**Dirty Files**:
${dirtyFiles.map(f => `- ${f}`).join("\n")}

**You MUST run tests before starting any new task.**
Use: \`delegate_task(agent="Joshua (Test Runner)", prompt="Run tests")\`
`
          throw new Error(errorMsg)
        }
        return
      }

      if (!WRITE_EDIT_TOOLS.includes(toolName)) {
        return
      }

      const filePath = (output.args.filePath ?? output.args.path ?? output.args.file) as string | undefined
      if (!filePath || !isCodeFile(filePath)) {
        return
      }

      if (!hasTestSpecs(ctx.directory)) {
        const reminder = "[TDD REMINDER] No test specs found in .paul/plans/. Consider using Solomon to create test specs first."
        output.message = output.message ? `${output.message}\n\n${reminder}` : reminder
        
        log(`[${HOOK_NAME}] Injected pre-write TDD reminder`, {
          sessionID: input.sessionID,
          tool: toolName,
          filePath,
        })
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; result?: unknown; message?: string }
    ): Promise<void> => {
      const toolName = input.tool

      if (!WRITE_EDIT_TOOLS.includes(toolName)) {
        return
      }

      const filePath = (output.args.filePath ?? output.args.path ?? output.args.file) as string | undefined
      if (!filePath || !isCodeFile(filePath)) {
        return
      }

      markFileDirty(input.sessionID, filePath)
      
      const dirtyCount = getDirtyFiles(input.sessionID).length
      const reminder = `[TDD REMINDER] Code changed (${dirtyCount} dirty files). Run Joshua (Test Runner) to verify: delegate_task(agent='Joshua (Test Runner)', prompt='Run tests')`
      output.message = output.message ? `${output.message}\n\n${reminder}` : reminder
      
      log(`[${HOOK_NAME}] Marked file dirty & injected reminder`, {
        sessionID: input.sessionID,
        tool: toolName,
        filePath,
        dirtyCount
      })
    },
  }
}
