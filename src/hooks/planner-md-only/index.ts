import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync, readdirSync } from "node:fs"
import { join, resolve, relative, isAbsolute } from "node:path"
import { HOOK_NAME, PLANNER_AGENTS, ALLOWED_EXTENSIONS, ALLOWED_PATH_PREFIXES, BLOCKED_TOOLS, BASH_TOOLS, DANGEROUS_BASH_PATTERNS, SAFE_BASH_PATTERNS, PLANNING_CONSULT_WARNING } from "./constants"
import { findNearestMessageWithFields, findFirstMessageWithAgent, MESSAGE_STORAGE } from "../../features/hook-message-injector"
import { getSessionAgent } from "../../features/claude-code-session-state"
import { log } from "../../shared/logger"
import { SYSTEM_DIRECTIVE_PREFIX } from "../../shared/system-directive"

export * from "./constants"

function isAllowedFile(filePath: string, workspaceRoot: string): boolean {
  const resolved = resolve(workspaceRoot, filePath)
  const rel = relative(workspaceRoot, resolved)

  if (rel.startsWith("..") || isAbsolute(rel)) {
    return false
  }

  const hasAllowedPath = ALLOWED_PATH_PREFIXES.some(prefix => {
    const pattern = new RegExp(`\\${prefix}[/\\\\]`, "i")
    return pattern.test(rel)
  })
  if (!hasAllowedPath) {
    return false
  }

  const hasAllowedExtension = ALLOWED_EXTENSIONS.some(
    ext => resolved.toLowerCase().endsWith(ext.toLowerCase())
  )
  if (!hasAllowedExtension) {
    return false
  }

  return true
}

function isSafeBashCommand(command: string): boolean {
  const trimmed = command.trim()
  return SAFE_BASH_PATTERNS.some(pattern => pattern.test(trimmed))
}

function isDangerousBashCommand(command: string): boolean {
  return DANGEROUS_BASH_PATTERNS.some(pattern => pattern.test(command))
}

function getMessageDir(sessionID: string): string | null {
  if (!existsSync(MESSAGE_STORAGE)) return null

  const directPath = join(MESSAGE_STORAGE, sessionID)
  if (existsSync(directPath)) return directPath

  for (const dir of readdirSync(MESSAGE_STORAGE)) {
    const sessionPath = join(MESSAGE_STORAGE, dir, sessionID)
    if (existsSync(sessionPath)) return sessionPath
  }

  return null
}

const TASK_TOOLS = ["delegate_task", "task", "call_omo_agent"]

function getAgentFromMessageFiles(sessionID: string): string | undefined {
  const messageDir = getMessageDir(sessionID)
  if (!messageDir) return undefined
  return findFirstMessageWithAgent(messageDir) ?? findNearestMessageWithFields(messageDir)?.agent
}

function getAgentFromSession(sessionID: string): string | undefined {
  return getSessionAgent(sessionID) ?? getAgentFromMessageFiles(sessionID)
}

export function createPlannerMdOnlyHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      const agentName = getAgentFromSession(input.sessionID)
      
      if (!agentName || !PLANNER_AGENTS.includes(agentName)) {
        return
      }

      const toolName = input.tool

      if (TASK_TOOLS.includes(toolName)) {
        const prompt = output.args.prompt as string | undefined
        if (prompt && !prompt.includes(SYSTEM_DIRECTIVE_PREFIX)) {
          output.args.prompt = prompt + PLANNING_CONSULT_WARNING
          log(`[${HOOK_NAME}] Injected read-only planning warning to ${toolName}`, {
            sessionID: input.sessionID,
            tool: toolName,
            agent: agentName,
          })
        }
        return
      }

      if (BASH_TOOLS.includes(toolName)) {
        const command = output.args.command as string | undefined
        if (!command) {
          return
        }

        if (isSafeBashCommand(command)) {
          log(`[${HOOK_NAME}] Allowed: Safe bash command`, {
            sessionID: input.sessionID,
            tool: toolName,
            command: command.substring(0, 100),
            agent: agentName,
          })
          return
        }

        if (isDangerousBashCommand(command)) {
          log(`[${HOOK_NAME}] Blocked: Dangerous bash command detected`, {
            sessionID: input.sessionID,
            tool: toolName,
            command: command.substring(0, 200),
            agent: agentName,
          })
          throw new Error(
            `[${HOOK_NAME}] Planner agents cannot execute file-modifying bash commands. ` +
            `Detected dangerous pattern in command. ` +
            `Planners are READ-ONLY. Use /start-work to execute the plan.`
          )
        }

        log(`[${HOOK_NAME}] Allowed: Bash command (no dangerous patterns detected)`, {
          sessionID: input.sessionID,
          tool: toolName,
          command: command.substring(0, 100),
          agent: agentName,
        })
        return
      }

      if (!BLOCKED_TOOLS.includes(toolName)) {
        return
      }

      const filePath = (output.args.filePath ?? output.args.path ?? output.args.file) as string | undefined
      if (!filePath) {
        return
      }

      if (!isAllowedFile(filePath, ctx.directory)) {
        log(`[${HOOK_NAME}] Blocked: Planner can only write to .sisyphus/*.md or .paul/*.md`, {
          sessionID: input.sessionID,
          tool: toolName,
          filePath,
          agent: agentName,
        })
        throw new Error(
          `[${HOOK_NAME}] Planner agents can only write/edit .md files inside .sisyphus/ or .paul/ directories. ` +
          `Attempted to modify: ${filePath}. ` +
          `Planners are READ-ONLY. Use /start-work to execute the plan.`
        )
      }

      log(`[${HOOK_NAME}] Allowed: Planner .md write permitted`, {
        sessionID: input.sessionID,
        tool: toolName,
        filePath,
        agent: agentName,
      })
    },
  }
}

export { createPlannerMdOnlyHook as createPrometheusMdOnlyHook }
