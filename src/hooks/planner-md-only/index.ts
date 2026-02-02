import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync, readdirSync } from "node:fs"
import { join, resolve, relative, isAbsolute } from "node:path"
import { HOOK_NAME, PLANNER_AGENTS, ALLOWED_EXTENSIONS, BLOCKED_TOOLS, BASH_TOOLS, DANGEROUS_BASH_PATTERNS, SAFE_BASH_PATTERNS, PLANNING_CONSULT_WARNING, DRAFT_PATH_PATTERN, PLAN_PATH_PATTERN } from "./constants"
import { findNearestMessageWithFields, findFirstMessageWithAgent, MESSAGE_STORAGE } from "../../features/hook-message-injector"
import { getSessionAgent } from "../../features/claude-code-session-state"
import { log } from "../../shared/logger"
import { SYSTEM_DIRECTIVE_PREFIX } from "../../shared/system-directive"

export * from "./constants"

type FileValidationResult = 
  | { allowed: true }
  | { allowed: false; reason: "outside_workspace" | "invalid_extension"; details: string }

function isAllowedFile(filePath: string, workspaceRoot: string): FileValidationResult {
  const resolved = resolve(workspaceRoot, filePath)
  const rel = relative(workspaceRoot, resolved)

  if (rel.startsWith("..") || isAbsolute(rel)) {
    return { 
      allowed: false, 
      reason: "outside_workspace", 
      details: `File is outside workspace root (${workspaceRoot})` 
    }
  }

  const hasAllowedExtension = ALLOWED_EXTENSIONS.some(
    ext => resolved.toLowerCase().endsWith(ext.toLowerCase())
  )
  if (!hasAllowedExtension) {
    return { 
      allowed: false, 
      reason: "invalid_extension", 
      details: `Only .md files are allowed, got: ${filePath.split('.').pop() || 'no extension'}` 
    }
  }

  return { allowed: true }
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

const TASK_TOOLS = ["delegate_task", "task", "call_paul_agent"]

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
        // planner-paul no longer delegates to Paul/worker-paul (user switches manually).
        // This check remains for backward compatibility if delegation is re-enabled.
        if (toolName.toLowerCase() === "delegate_task") {
          const targetAgent = (output.args.agent || output.args.subagent_type || output.args.name) as string | undefined
          const normalizedTarget = targetAgent?.trim().toLowerCase()
          if (normalizedTarget === "paul" || normalizedTarget === "worker-paul") {
            return
          }
        }

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
            `Planners are READ-ONLY. Use /hit-it to execute the plan.`
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

      const validationResult = isAllowedFile(filePath, ctx.directory)
      if (!validationResult.allowed) {
        log(`[${HOOK_NAME}] Blocked: ${validationResult.details}`, {
          sessionID: input.sessionID,
          tool: toolName,
          filePath,
          agent: agentName,
          reason: validationResult.reason,
        })
        
        const reasonMessage = validationResult.reason === "outside_workspace"
          ? `outside workspace root (${ctx.directory})`
          : `invalid extension - ${validationResult.details}`
        
        throw new Error(
          `[${HOOK_NAME}] Planner agents can only write/edit .md files within the workspace root. ` +
          `Attempted to modify: ${filePath} (${reasonMessage}). ` +
          `Planners are READ-ONLY for code files. Use /hit-it to execute the plan.`
        )
      }

      const resolvedPath = resolve(ctx.directory, filePath)
      const isPlanPath = PLAN_PATH_PATTERN.test(resolvedPath)
      const isDraftPath = DRAFT_PATH_PATTERN.test(resolvedPath)

      if (isPlanPath && !isDraftPath) {
        type Todo = { content: string; status: string; priority: string; id: string }

        let todos: Todo[] = []
        try {
          const response = await ctx.client.session.todo({ path: { id: input.sessionID } })
          todos = (response.data ?? response) as Todo[]
        } catch (err) {
          log(`[${HOOK_NAME}] Blocked: Failed to fetch todos`, {
            sessionID: input.sessionID,
            tool: toolName,
            filePath,
            agent: agentName,
            error: String(err),
          })
          throw new Error(
            `[${HOOK_NAME}] Cannot write to plan files because todos could not be fetched. ` +
            `Register at least one todo first, then try again.`
          )
        }

        if (todos.length === 0) {
          log(`[${HOOK_NAME}] Blocked: Attempted plan write with no todos`, {
            sessionID: input.sessionID,
            tool: toolName,
            filePath,
            agent: agentName,
          })
          throw new Error(
            `[${HOOK_NAME}] Plan generation is gated: register at least one todo before writing to plans. ` +
            `Write to drafts is always allowed.`
          )
        }
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
