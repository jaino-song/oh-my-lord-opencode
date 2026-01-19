import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { log } from "../../shared/logger"

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

export function createTddEnforcementHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      const toolName = input.tool

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

      const reminder = "[TDD REMINDER] Code changed. Run Joshua (Test Runner) to verify: delegate_task(agent='Joshua (Test Runner)', prompt='Run tests')"
      output.message = output.message ? `${output.message}\n\n${reminder}` : reminder
      
      log(`[${HOOK_NAME}] Injected post-write TDD reminder`, {
        sessionID: input.sessionID,
        tool: toolName,
        filePath,
      })
    },
  }
}
