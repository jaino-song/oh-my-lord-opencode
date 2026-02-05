import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin"
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { BackgroundManager } from "../../features/background-agent"
import type { DelegateTaskArgs } from "./types"
import type { GitMasterConfig } from "../../config/schema"
import { DELEGATE_TASK_DESCRIPTION } from "./constants"
import { findNearestMessageWithFields, findFirstMessageWithAgent, MESSAGE_STORAGE } from "../../features/hook-message-injector"
import { resolveMultipleSkillsAsync } from "../../features/opencode-skill-loader/skill-content"
import { discoverSkills } from "../../features/opencode-skill-loader"
import { getTaskToastManager } from "../../features/task-toast-manager"

import { getsessiontokenusage } from "../../features/task-toast-manager/token-utils"
import { subagentSessions, getSessionAgent } from "../../features/claude-code-session-state"
import { log, getAgentToolRestrictions, hasValidOutputFromMessages } from "../../shared"
import { truncateToTokenLimit } from "../../shared/dynamic-truncator"
import { getParentAgentName } from "../../features/agent-context"
import { AGENT_FALLBACK_MODELS, MAX_RETRY_ATTEMPTS, RETRY_DELAY_MS } from "../../config/fallback-models"
import { SIGNAL_DONE_TOOL_NAME } from "../signal-done"

type OpencodeClient = PluginInput["client"]

const ORCHESTRATOR_AGENTS = ["Paul", "planner-paul", "Sisyphus"]

const DEFAULT_OUTPUT_SUMMARY_TOKENS = 300
const SKILL_SUMMARY_TOKENS = 300

const capitalizeAgent = (s: string) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('-')

function parseModelString(model: string): { providerID: string; modelID: string } | undefined {
  const parts = model.split("/")
  if (parts.length >= 2) {
    return { providerID: parts[0], modelID: parts.slice(1).join("/") }
  }
  return undefined
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

function formatDuration(start: Date, end?: Date): string {
  const duration = (end ?? new Date()).getTime() - start.getTime()
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("unresponsive") ||
    message.includes("503") ||
    message.includes("429") ||
    message.includes("overloaded") ||
    message.includes("no output")
}

function getFallbackModel(agentName: string): string | undefined {
  const config = AGENT_FALLBACK_MODELS[agentName]
  return config?.fallback
}

interface ErrorContext {
  operation: string
  args?: DelegateTaskArgs
  sessionID?: string
  agent?: string
}

function formatDetailedError(error: unknown, ctx: ErrorContext): string {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  const lines: string[] = [
    `❌ ${ctx.operation} failed`,
    "",
    `**Error**: ${message}`,
  ]

  if (ctx.sessionID) {
    lines.push(`**Session ID**: ${ctx.sessionID}`)
  }

  if (ctx.agent) {
    lines.push(`**Agent**: ${ctx.agent}`)
  }

  if (ctx.args) {
    lines.push("", "**Arguments**:")
    lines.push(`- description: "${ctx.args.description}"`)
    lines.push(`- subagent_type: ${ctx.args.subagent_type ?? "(none)"}`)
    lines.push(`- run_in_background: ${ctx.args.run_in_background}`)
    lines.push(`- skills: [${ctx.args.skills?.join(", ") ?? ""}]`)
    if (ctx.args.resume) {
      lines.push(`- resume: ${ctx.args.resume}`)
    }
  }

  if (stack) {
    lines.push("", "**Stack Trace**:")
    lines.push("```")
    lines.push(stack.split("\n").slice(0, 10).join("\n"))
    lines.push("```")
  }

  return lines.join("\n")
}

function formatOutputByPreference(content: string, outputFormat: "summary" | "full"): string {
  if (outputFormat === "full") return content
  if (!content.trim()) return "(No text output)"
  const { result, truncated } = truncateToTokenLimit(content, DEFAULT_OUTPUT_SUMMARY_TOKENS, 0)
  if (!truncated) return result
  return `${result}\n\n[Output truncated. Use output_format=\"full\" to retrieve the full output.]`
}

function summarizeSkillContent(content: string): string {
  const { result, truncated } = truncateToTokenLimit(content, SKILL_SUMMARY_TOKENS, 0)
  if (!truncated) return result
  return `${result}\n\n[Skill content truncated to save context. Use a full skill load if needed.]`
}

interface MessagePart {
  type?: string
  name?: string
  tool?: string
  text?: string
  input?: { result?: string }
  state?: { input?: { result?: string } }
}

interface SessionMessage {
  info?: { role?: string }
  parts?: MessagePart[]
}

function findSignalDoneResult(messages: SessionMessage[]): string | null {
  for (const msg of messages) {
    if (msg.info?.role !== "assistant") continue
    for (const part of msg.parts ?? []) {
      const isToolPart = part.type === "tool_use" || part.type === "tool"
      const isSignalDone = part.name === SIGNAL_DONE_TOOL_NAME || part.tool === SIGNAL_DONE_TOOL_NAME
      if (isToolPart && isSignalDone) {
        const result = part.input?.result ?? part.state?.input?.result
        if (typeof result === "string") {
          return result
        }
      }
    }
  }
  return null
}

interface ErrorLoopResult {
  detected: boolean
  reason?: string
  recentOutputs?: string[]
}

function detectErrorLoop(messages: SessionMessage[]): ErrorLoopResult {
  const recentTexts: string[] = []
  
  const recentMsgs = messages.slice(-10)
  for (const msg of recentMsgs) {
    if (msg.info?.role !== "assistant") continue
    for (const part of msg.parts ?? []) {
      if (part.type === "text" && part.text) {
        recentTexts.push(part.text.trim().slice(0, 200))
      }
    }
  }
  
  if (recentTexts.length < 3) {
    return { detected: false }
  }
  
  const lastThree = recentTexts.slice(-3)
  const allSame = lastThree.every(t => t === lastThree[0])
  if (allSame && lastThree[0].length > 10) {
    return {
      detected: true,
      reason: "Same output repeated 3+ times",
      recentOutputs: lastThree,
    }
  }
  
  const errorPatterns = /\b(error|failed|cannot|unable|exception|refused|denied|invalid|unauthorized)\b/i
  const errorCount = recentTexts.filter(t => errorPatterns.test(t)).length
  if (errorCount >= 3 && errorCount === recentTexts.length) {
    return {
      detected: true,
      reason: "All recent outputs contain error messages",
      recentOutputs: recentTexts.slice(-3),
    }
  }
  
  return { detected: false }
}

type ToolContextWithMetadata = {
  sessionID: string
  messageID: string
  agent: string
  abort: AbortSignal
  metadata?: (input: { title?: string; metadata?: Record<string, unknown> }) => void
}

export interface DelegateTaskToolOptions {
  manager: BackgroundManager
  client: OpencodeClient
  directory: string
  gitMasterConfig?: GitMasterConfig
}

export function buildSystemContent(skillContent?: string): string | undefined {
  return skillContent
}

export function createDelegateTask(options: DelegateTaskToolOptions): ToolDefinition {
  const { manager, client, directory, gitMasterConfig } = options

  return tool({
    description: DELEGATE_TASK_DESCRIPTION,
    args: {
      description: tool.schema.string().describe("Short task description"),
      prompt: tool.schema.string().describe("Full detailed prompt for the agent"),

      subagent_type: tool.schema.string().optional().describe("Agent name directly (e.g., 'oracle', 'explore'). Mutually exclusive with category."),
      run_in_background: tool.schema.boolean().describe("Run in background. MUST be explicitly set. Use false for task delegation, true only for parallel exploration."),
      resume: tool.schema.string().optional().describe("Session ID to resume - continues previous agent session with full context"),
      skills: tool.schema.array(tool.schema.string()).nullable().describe("Array of skill names to prepend to the prompt. Use null if no skills needed. Empty array [] is NOT allowed."),
      output_format: tool.schema.enum(["summary", "full"]).optional().describe("Output format for sync results. 'summary' (default) truncates long outputs."),
    },
    async execute(args: DelegateTaskArgs, toolContext) {
      const ctx = toolContext as ToolContextWithMetadata
      const parentAgentName = getParentAgentName(ctx.sessionID, "agent")
      if (args.run_in_background === undefined) {
        return `❌ Invalid arguments: 'run_in_background' parameter is REQUIRED. Use run_in_background=false for task delegation, run_in_background=true only for parallel exploration.`
      }
      if (args.skills === undefined) {
        return `❌ Invalid arguments: 'skills' parameter is REQUIRED. Use skills=null if no skills are needed, or provide an array of skill names.`
      }
      if (Array.isArray(args.skills) && args.skills.length === 0) {
        const allSkills = await discoverSkills({ includeClaudeCodePaths: true })
        const availableSkillsList = allSkills.map(s => `  - ${s.name}`).slice(0, 15).join("\n")
        return `❌ Invalid arguments: Empty array [] is not allowed for 'skills' parameter.

Use skills=null if this task genuinely requires no specialized skills.
Otherwise, select appropriate skills from available options:

${availableSkillsList}${allSkills.length > 15 ? `\n  ... and ${allSkills.length - 15} more` : ""}

If you believe no skills are needed, you MUST explicitly explain why to the user before using skills=null.`
      }
      let runInBackground = args.run_in_background === true
      const outputFormat = args.output_format ?? "summary"

      let skillContent: string | undefined
      if (args.skills !== null && args.skills.length > 0) {
        const { resolved, notFound } = await resolveMultipleSkillsAsync(args.skills, { gitMasterConfig })
        if (notFound.length > 0) {
          const allSkills = await discoverSkills({ includeClaudeCodePaths: true })
          const available = allSkills.map(s => s.name).join(", ")
          return `❌ Skills not found: ${notFound.join(", ")}. Available: ${available}`
        }
        const summarized = Array.from(resolved.values()).map(summarizeSkillContent)
        skillContent = summarized.join("\n\n")
      }

      const messageDir = getMessageDir(ctx.sessionID)
      const prevMessage = messageDir ? findNearestMessageWithFields(messageDir) : null
      const firstMessageAgent = messageDir ? findFirstMessageWithAgent(messageDir) : null
      const sessionAgent = getSessionAgent(ctx.sessionID)
      const parentAgent = ctx.agent ?? sessionAgent ?? firstMessageAgent ?? prevMessage?.agent
      
      log("[delegate_task] parentAgent resolution", {
        sessionID: ctx.sessionID,
        messageDir,
        ctxAgent: ctx.agent,
        sessionAgent,
        firstMessageAgent,
        prevMessageAgent: prevMessage?.agent,
        resolvedParentAgent: parentAgent,
      })
      const parentModel = prevMessage?.model?.providerID && prevMessage?.model?.modelID
        ? { providerID: prevMessage.model.providerID, modelID: prevMessage.model.modelID }
        : undefined

      if (args.resume) {
        if (runInBackground) {
          try {
            const existingTask = manager.findBySession(args.resume)
            if (!existingTask) {
              runInBackground = false
            } else {
              const task = await manager.resume({
                sessionId: args.resume,
                prompt: args.prompt,
                parentSessionID: ctx.sessionID,
                parentMessageID: ctx.messageID,
                parentModel,
                parentAgent,
              })

              ctx.metadata?.({
                title: `Resume: ${task.description}`,
                metadata: { sessionId: task.sessionID },
              })

              return `Background task resumed.

Task ID: ${task.id}
Session ID: ${task.sessionID}
Description: ${task.description}
Agent: ${task.agent}
Status: ${task.status}

Agent continues with full previous context preserved.
Use \`background_output\` with task_id="${task.id}" to check progress.`
            }
          } catch (error) {
            return formatDetailedError(error, {
              operation: "Resume background task",
              args,
              sessionID: args.resume,
            })
          }
        }

        const toastManager = getTaskToastManager()
        const taskId = `resume_sync_${args.resume.slice(0, 8)}`
        const startTime = new Date()

        if (toastManager) {
          toastManager.addTask({
            id: taskId,
            description: args.description,
            agent: "resume",
            isBackground: false,
          })
        }

        ctx.metadata?.({
          title: `Resume: ${args.description}`,
          metadata: { sessionId: args.resume, sync: true },
        })

        let resumeAgent: string | undefined
        let resumeModel: { providerID: string; modelID: string } | undefined

        try {

          try {
            const messagesResp = await client.session.messages({ path: { id: args.resume } })
            const messages = (messagesResp.data ?? []) as Array<{
              info?: { agent?: string; model?: { providerID: string; modelID: string }; modelID?: string; providerID?: string }
            }>
            for (let i = messages.length - 1; i >= 0; i--) {
              const info = messages[i].info
              if (info?.agent || info?.model || (info?.modelID && info?.providerID)) {
                resumeAgent = info.agent
                resumeModel = info.model ?? (info.providerID && info.modelID ? { providerID: info.providerID, modelID: info.modelID } : undefined)
                break
              }
            }
          } catch {
            const resumeMessageDir = getMessageDir(args.resume)
            const resumeMessage = resumeMessageDir ? findNearestMessageWithFields(resumeMessageDir) : null
            resumeAgent = resumeMessage?.agent
            resumeModel = resumeMessage?.model?.providerID && resumeMessage?.model?.modelID
              ? { providerID: resumeMessage.model.providerID, modelID: resumeMessage.model.modelID }
              : undefined
          }

          await client.session.prompt({
            path: { id: args.resume },
            body: {
              ...(resumeAgent !== undefined ? { agent: resumeAgent } : {}),
              ...(resumeModel !== undefined ? { model: resumeModel } : {}),
              tools: {
                ...(resumeAgent ? getAgentToolRestrictions(resumeAgent) : {}),
                task: false,
                delegate_task: resumeAgent ? ORCHESTRATOR_AGENTS.includes(resumeAgent) : false,
                call_paul_agent: true,
              },
              parts: [{ type: "text", text: args.prompt }],
            },
          })
        } catch (promptError) {
          if (toastManager) {
            toastManager.removeTask(taskId)
          }
          const errorMessage = promptError instanceof Error ? promptError.message : String(promptError)
          return `❌ Failed to send resume prompt: ${errorMessage}\n\nSession ID: ${args.resume}`
        }

        const POLL_INTERVAL_MS = 500
        const pollStart = Date.now()
        let lastMsgCount = 0

        while (Date.now() - pollStart < 120000) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

          const messagesCheck = await client.session.messages({ path: { id: args.resume } })
          const msgs = ((messagesCheck as { data?: unknown }).data ?? messagesCheck) as Array<SessionMessage>
          const currentMsgCount = msgs.length

          const signalDoneResult = findSignalDoneResult(msgs)
          if (signalDoneResult !== null) {
            log("[delegate_task:resume] signal_done detected", { sessionID: args.resume })
            subagentSessions.delete(args.resume)
            if (toastManager) toastManager.removeTask(taskId)
            const duration = formatDuration(startTime)
            const tokens = await getsessiontokenusage(client as any, args.resume)
            const total = tokens ? tokens.input + tokens.output : 0
            const tokenline = tokens ? `TOKENS: ${tokens.input} in / ${tokens.output} out / ${total} total` : ""
            return `⚡ RESUME → ${args.resume}
TASK: ${args.prompt.slice(0, 100)}...
${tokenline}
DURATION: ${duration}
✅ TASK (session_id="${args.resume}") COMPLETE (signal_done)

SESSION ID: ${args.resume}

---

${formatOutputByPreference(signalDoneResult, outputFormat)}`
          }

          lastMsgCount = currentMsgCount
        }

        const messagesResult = await client.session.messages({
          path: { id: args.resume },
        })

        if (messagesResult.error) {
          if (toastManager) {
            toastManager.removeTask(taskId)
          }
          return `❌ Error fetching result: ${messagesResult.error}\n\nSession ID: ${args.resume}`
        }

        const messages = ((messagesResult as { data?: unknown }).data ?? messagesResult) as Array<{
          info?: { role?: string; time?: { created?: number } }
          parts?: Array<{ type?: string; text?: string }>
        }>

        const assistantMessages = messages
          .filter((m) => m.info?.role === "assistant")
          .sort((a, b) => (b.info?.time?.created ?? 0) - (a.info?.time?.created ?? 0))
        const lastMessage = assistantMessages[0]

        if (!lastMessage) {
          return `❌ No assistant response found.\n\nSession ID: ${args.resume}`
        }

        // Extract text from both "text" and "reasoning" parts (thinking models use "reasoning")
        const textParts = lastMessage?.parts?.filter((p) => p.type === "text" || p.type === "reasoning") ?? []
        const textContent = textParts.map((p) => p.text ?? "").filter(Boolean).join("\n")
        const formattedOutput = formatOutputByPreference(textContent, outputFormat)

        const duration = formatDuration(startTime)

        // fetch tokens (non-blocking, returns null on failure)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokens = await getsessiontokenusage(client as any, args.resume)

        if (toastManager) {
          toastManager.showCompletionToast({
            id: taskId,
            description: args.description,
            agent: resumeAgent ?? "resume",
            duration: duration,
            tokens: tokens ?? undefined,
            result: formattedOutput.slice(0, 200),
          })
        }

        const total = tokens ? tokens.input + tokens.output : 0
        const tokenline = tokens 
          ? `TOKENS: ${tokens.input} in / ${tokens.output} out / ${total} total`
          : ""

        return `⚡ ${capitalizeAgent(parentAgentName)} → ${capitalizeAgent(resumeAgent ?? "Agent")}
TASK: ${args.description}
${tokenline}
DURATION: ${duration}
✅ TASK (session_id="${args.resume}") COMPLETE

SESSION ID: ${args.resume}

---

${formattedOutput}`
      }

      if (!args.subagent_type?.trim()) {
        return `❌ Agent name cannot be empty. Provide subagent_type parameter (e.g., 'explore', 'librarian', 'paul-junior').`
      }
      const agentName = args.subagent_type.trim()
      let agentToUse = agentName

        try {
          const agentsResult = await client.app.agents()
          type AgentInfo = { name: string; mode?: "subagent" | "primary" | "all" }
          const agents = (agentsResult as { data?: AgentInfo[] }).data ?? agentsResult as unknown as AgentInfo[]

          const callableAgents = agents.filter((a) => a.mode !== "primary")
          
          const exactMatch = callableAgents.find((a) => a.name === agentName)
          const caseInsensitiveMatch = callableAgents.find(
            (a) => a.name.toLowerCase() === agentName.toLowerCase()
          )
          
          if (exactMatch) {
            agentToUse = exactMatch.name
          } else if (caseInsensitiveMatch) {
            agentToUse = caseInsensitiveMatch.name
          } else {
            const isPrimaryAgent = agents.some(
              (a) => a.name.toLowerCase() === agentName.toLowerCase() && a.mode === "primary"
            )
            if (isPrimaryAgent) {
              return `❌ Cannot call primary agent "${agentName}" via delegate_task. Primary agents are top-level orchestrators.`
            }

            const availableAgents = callableAgents
              .map((a) => a.name)
              .sort()
              .join(", ")
            return `❌ Unknown agent: "${agentName}". Available agents: ${availableAgents}`
          }
        } catch {
          // If we can't fetch agents, proceed anyway - the session.prompt will fail with a clearer error
        }

      const systemContent = buildSystemContent(skillContent)

      if (runInBackground) {
        try {
          const task = await manager.launch({
            description: args.description,
            prompt: args.prompt,
            agent: agentToUse,
            parentSessionID: ctx.sessionID,
            parentMessageID: ctx.messageID,
            parentAgent,
            skills: args.skills ?? undefined,
            skillContent: systemContent,
          })

          ctx.metadata?.({
            title: args.description,
            metadata: { sessionId: task.sessionID },
          })

          return `${parentAgentName} → ${task.agent}
task: ${task.description}
parallelism: yes

task id: ${task.id}
session id: ${task.sessionID}

task launched in background. use \`background_output\` with task_id="${task.id}" to check.`
        } catch (error) {
          return formatDetailedError(error, {
            operation: "Launch background task",
            args,
            agent: agentToUse,
          })
        }
      }

      const toastManager = getTaskToastManager()
      let taskId: string | undefined
      let syncSessionID: string | undefined

      try {
        const parentSession = client.session.get
          ? await client.session.get({ path: { id: ctx.sessionID } }).catch(() => null)
          : null
        const parentDirectory = parentSession?.data?.directory ?? directory

        const createResult = await client.session.create({
          body: {
            parentID: ctx.sessionID,
            title: `Task: ${args.description}`,
          },
          query: {
            directory: parentDirectory,
          },
        })

        if (createResult.error) {
          return `❌ Failed to create session: ${createResult.error}`
        }

        const sessionID = createResult.data.id
        syncSessionID = sessionID
        subagentSessions.add(sessionID)
        taskId = `sync_${sessionID.slice(0, 8)}`
        const startTime = new Date()

        if (toastManager) {
          toastManager.addTask({
            id: taskId,
            description: args.description,
            agent: agentToUse,
            isBackground: false,
            skills: args.skills ?? undefined,
          })
        }

        ctx.metadata?.({
          title: args.description,
          metadata: { sessionId: sessionID, sync: true },
        })

        // don't inherit parent's model - let subagent use its dedicated model
        // parent model override was causing all subagents to use parent's model (e.g., opus)
        // instead of their configured models (e.g., haiku for explore, gemini for ui agents)
        let currentModel: { providerID: string; modelID: string } | undefined = undefined
        let currentAgent = agentToUse
        let lastError: unknown = null

const POLL_INTERVAL_MS = 500
const MAX_POLL_TIME_MS = 10 * 60 * 1000
const WORKING_NO_PROGRESS_TIMEOUT_MS = 90000
const CHECKPOINT_TIME_MS = 5 * 60 * 1000
const ERROR_LOOP_CHECK_INTERVAL_MS = 2 * 60 * 1000

        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
          try {
            log(`[delegate_task] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for ${currentAgent}`, {
              model: currentModel ? `${currentModel.providerID}/${currentModel.modelID}` : "default",
            })

            // Fire-and-forget prompt (don't await) - polling loop handles completion detection
            // This prevents blocking when API is rate-limited
            let promptError: Error | null = null
            client.session.prompt({
              path: { id: sessionID },
              body: {
                agent: currentAgent,
                system: systemContent,
                tools: {
                  task: false,
                  delegate_task: ORCHESTRATOR_AGENTS.includes(agentToUse),
                  call_paul_agent: true,
                },
                parts: [{ type: "text", text: args.prompt }],
                ...(currentModel ? { model: currentModel } : {}),
              },
            }).catch((error) => {
              log("[delegate_task] Prompt error (fire-and-forget):", error)
              promptError = error instanceof Error ? error : new Error(String(error))
            })

            const pollStart = Date.now()
            let lastMsgCount = 0
            let pollCount = 0
            let lastMsgChangeTime = Date.now()
            let checkpointChecked = false
            let needsRetry = false
            let lastErrorLoopCheck = 0

            log("[delegate_task] Starting poll loop", { sessionID, agentToUse })

            while (Date.now() - pollStart < MAX_POLL_TIME_MS) {
              if (ctx.abort?.aborted) {
                log("[delegate_task] Aborted by user - checking for signal_done first", { sessionID })
                try {
                  const messagesOnAbort = await client.session.messages({ path: { id: sessionID } })
                  const msgsOnAbort = ((messagesOnAbort as { data?: unknown }).data ?? messagesOnAbort) as Array<SessionMessage>
                  const signalDoneOnAbort = findSignalDoneResult(msgsOnAbort)
                  if (signalDoneOnAbort !== null) {
                    log("[delegate_task] signal_done found on abort - returning result", { sessionID })
                    subagentSessions.delete(sessionID)
                    if (toastManager && taskId) toastManager.removeTask(taskId)
                    return `⚡ ${capitalizeAgent(parentAgentName)} → ${capitalizeAgent(agentToUse)}
TASK: ${args.description}
✅ TASK (session_id="${sessionID}") COMPLETE (signal_done, recovered on abort)

SESSION ID: ${sessionID}

---

${formatOutputByPreference(signalDoneOnAbort, outputFormat)}`
                  }
                } catch (err) {
                  log("[delegate_task] Failed to check signal_done on abort", { sessionID, error: String(err) })
                }
                if (toastManager && taskId) toastManager.removeTask(taskId)
                return `Task aborted.\n\nSession ID: ${sessionID}`
              }

              if (promptError) {
                throw promptError
              }

              await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
              pollCount++

              const statusResult = await client.session.status()
              const allStatuses = (statusResult.data ?? {}) as Record<string, { type: string }>
              const sessionStatus = allStatuses[sessionID]

              if (pollCount % 10 === 0) {
                log("[delegate_task] Poll status", {
                  sessionID,
                  pollCount,
                  elapsed: Math.floor((Date.now() - pollStart) / 1000) + "s",
                  sessionStatus: sessionStatus?.type ?? "not_in_status",
                  lastMsgCount,
                })
              }

              const messagesCheck = await client.session.messages({ path: { id: sessionID } })
              const msgs = ((messagesCheck as { data?: unknown }).data ?? messagesCheck) as Array<SessionMessage>
              const currentMsgCount = msgs.length
              const assistantMsgs = msgs.filter((m) => m.info?.role === "assistant")

              const signalDoneResult = findSignalDoneResult(msgs)
              if (signalDoneResult !== null) {
                log("[delegate_task] signal_done detected", { sessionID, pollCount })
                subagentSessions.delete(sessionID)
                const duration = formatDuration(startTime)
                const tokens = await getsessiontokenusage(client as any, sessionID)
                const total = tokens ? tokens.input + tokens.output : 0
                const tokenline = tokens ? `TOKENS: ${tokens.input} in / ${tokens.output} out / ${total} total` : ""
                if (toastManager && taskId) {
                  toastManager.showCompletionToast({
                    id: taskId,
                    description: args.description,
                    agent: agentToUse,
                    duration,
                    tokens: tokens ?? undefined,
                    result: signalDoneResult.slice(0, 200),
                  })
                }
                return `⚡ ${capitalizeAgent(parentAgentName)} → ${capitalizeAgent(agentToUse)}
TASK: ${args.description}
${tokenline}
DURATION: ${duration}
✅ TASK (session_id="${sessionID}") COMPLETE (signal_done)

SESSION ID: ${sessionID}

---

${formatOutputByPreference(signalDoneResult, outputFormat)}`
              }

              // debug: log message state every 10 polls
              if (pollCount % 10 === 0) {
                log("[delegate_task] message check", { 
                  sessionID, 
                  totalMsgs: currentMsgCount, 
                  assistantMsgs: assistantMsgs.length,
                  status: sessionStatus?.type ?? "unknown",
                  msgRoles: msgs.map((m: any) => m.info?.role).filter(Boolean)
                })
              }

              // validate output using pure function (no extra api call)
              const hasValidOutput = hasValidOutputFromMessages(msgs as any)

              // No-progress timeout: catches rate limiting regardless of session status
              if (currentMsgCount !== lastMsgCount) {
                lastMsgChangeTime = Date.now()
              } else {
                const timeSinceLastProgress = Date.now() - lastMsgChangeTime
                if (!hasValidOutput && timeSinceLastProgress >= WORKING_NO_PROGRESS_TIMEOUT_MS) {
                  log("[delegate_task] No progress timeout", { 
                    sessionID, timeSinceLastProgress, currentMsgCount, status: sessionStatus?.type ?? "undefined", hasValidOutput 
                  })
                  throw new Error(`No progress for 90s and no valid output - possible rate limiting or API stall`)
                }
              }

              // 5-minute checkpoint: if session idle without signal_done, mark for retry
              // (signal_done is already checked every poll at line 703, so no need to check again)
              const elapsed = Date.now() - pollStart
              if (!checkpointChecked && elapsed >= CHECKPOINT_TIME_MS) {
                checkpointChecked = true
                log("[delegate_task] 5-minute checkpoint reached", { sessionID, status: sessionStatus?.type })
                
                if (sessionStatus?.type === "idle" || !sessionStatus) {
                  log("[delegate_task] Session idle at checkpoint without signal_done - marking for retry", { sessionID })
                  needsRetry = true
                  break
                }
                log("[delegate_task] Session still busy at checkpoint - continuing", { sessionID, status: sessionStatus?.type })
              }
              
              // Error loop detection: check if busy session is stuck in error loop
              if (sessionStatus?.type !== "idle" && elapsed - lastErrorLoopCheck >= ERROR_LOOP_CHECK_INTERVAL_MS) {
                lastErrorLoopCheck = elapsed
                const errorLoop = detectErrorLoop(msgs)
                if (errorLoop.detected) {
                  log("[delegate_task] Error loop detected", { sessionID, reason: errorLoop.reason })
                  if (toastManager && taskId) toastManager.removeTask(taskId)
                  subagentSessions.delete(sessionID)
                  const recentOutput = errorLoop.recentOutputs?.join("\n---\n") ?? "(no output)"
                  return `⚠️ ERROR LOOP DETECTED

⚡ ${capitalizeAgent(parentAgentName)} → ${capitalizeAgent(agentToUse)}
TASK: ${args.description}

❌ Subagent appears stuck in an error loop.

**Reason**: ${errorLoop.reason}
**Session ID**: ${sessionID}

**Recent outputs**:
\`\`\`
${recentOutput}
\`\`\`

**Actions for user**:
1. Check session manually: \`session_read(session_id="${sessionID}")\`
2. The subagent may be hitting a repeating error
3. Review the error and fix the underlying issue

This task requires manual intervention.`
                }
              }
              
              lastMsgCount = currentMsgCount
            }

            if (Date.now() - pollStart >= MAX_POLL_TIME_MS) {
              log("[delegate_task] Poll timeout reached", { sessionID, pollCount, lastMsgCount })
              needsRetry = true
            }

            if (needsRetry && attempt < MAX_RETRY_ATTEMPTS) {
              log("[delegate_task] Retrying delegation after checkpoint failure", { sessionID, attempt })
              if (toastManager && taskId) toastManager.removeTask(taskId)
              continue
            }

            if (needsRetry) {
              log("[delegate_task] Retry also failed - escalating to user", { sessionID })
              if (toastManager && taskId) toastManager.removeTask(taskId)
              subagentSessions.delete(sessionID)
              return `⚠️ ESCALATION REQUIRED

⚡ ${capitalizeAgent(parentAgentName)} → ${capitalizeAgent(agentToUse)}
TASK: ${args.description}

❌ Subagent did not call signal_done after 5 minutes and retry failed.

**Session ID**: ${sessionID}

**What happened**:
- Delegated task to ${agentToUse}
- Waited 5 minutes, session went idle without signal_done
- Retried delegation, still no signal_done

**Actions for user**:
1. Check session manually: \`session_read(session_id="${sessionID}")\`
2. The subagent may have completed but forgot to call signal_done
3. Review the session output and decide next steps

This task requires manual intervention.`
            }

            lastError = null
            break
          } catch (promptError) {
            lastError = promptError
            const errorMessage = promptError instanceof Error ? promptError.message : String(promptError)

            if (errorMessage.includes("agent.name") || errorMessage.includes("undefined")) {
              if (toastManager && taskId !== undefined) {
                toastManager.removeTask(taskId)
              }
              return formatDetailedError(new Error(`Agent "${currentAgent}" not found. Make sure the agent is registered in your opencode.json or provided by a plugin.`), {
                operation: "Send prompt to agent",
                args,
                sessionID,
                agent: currentAgent,
              })
            }

            if (!isRetryableError(promptError) || attempt >= MAX_RETRY_ATTEMPTS) {
              break
            }

            const fallbackModelStr = getFallbackModel(currentAgent)
            if (fallbackModelStr) {
              const parsed = parseModelString(fallbackModelStr)
              if (parsed) {
                currentModel = parsed
                log(`[delegate_task] Retrying with fallback model: ${fallbackModelStr}`)
              }
            } else {
              // Don't silently substitute agents - return error instead
              // Silent substitution caused wrong agent to handle tasks (e.g., UI tasks to backend agent)
              log(`[delegate_task] No fallback model for ${currentAgent}, failing`)
              break // Exit retry loop, let error handling take over
            }

            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
          }
        }

        if (lastError) {
          if (toastManager && taskId !== undefined) {
            toastManager.removeTask(taskId)
          }
          return formatDetailedError(lastError, {
            operation: "Execute task",
            args,
            sessionID,
            agent: currentAgent,
          })
        }

        const messagesResult = await client.session.messages({
          path: { id: sessionID },
        })

        if (messagesResult.error) {
          return `❌ Error fetching result: ${messagesResult.error}\n\nSession ID: ${sessionID}`
        }

        const messages = ((messagesResult as { data?: unknown }).data ?? messagesResult) as Array<{
          info?: { role?: string; time?: { created?: number } }
          parts?: Array<{ type?: string; text?: string }>
        }>

        const assistantMessages = messages
          .filter((m) => m.info?.role === "assistant")
          .sort((a, b) => (b.info?.time?.created ?? 0) - (a.info?.time?.created ?? 0))
        const lastMessage = assistantMessages[0]
        
        if (!lastMessage) {
          return `❌ No assistant response found.\n\nSession ID: ${sessionID}`
        }
        
        // Extract text from both "text" and "reasoning" parts (thinking models use "reasoning")
        const textParts = lastMessage?.parts?.filter((p) => p.type === "text" || p.type === "reasoning") ?? []
        const textContent = textParts.map((p) => p.text ?? "").filter(Boolean).join("\n")
        const formattedOutput = formatOutputByPreference(textContent, outputFormat)

        const duration = formatDuration(startTime)

        // fetch tokens (non-blocking, returns null on failure)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokens = await getsessiontokenusage(client as any, sessionID)

        if (toastManager) {
          toastManager.showCompletionToast({
            id: taskId,
            description: args.description,
            agent: agentToUse,
            duration,
            tokens: tokens ?? undefined,
            result: formattedOutput.slice(0, 200),
          })
        }

        subagentSessions.delete(sessionID)

        const total = tokens ? tokens.input + tokens.output : 0
        const tokenline = tokens 
          ? `TOKENS: ${tokens.input} in / ${tokens.output} out / ${total} total`
          : ""

        return `⚡ ${capitalizeAgent(parentAgentName)} → ${capitalizeAgent(agentToUse)}
TASK: ${args.description}
${tokenline}
DURATION: ${duration}
✅ TASK (session_id="${sessionID}") COMPLETE

SESSION ID: ${sessionID}

---

${formattedOutput}`
      } catch (error) {
        if (toastManager && taskId !== undefined) {
          toastManager.removeTask(taskId)
        }
        if (syncSessionID) {
          subagentSessions.delete(syncSessionID)
        }
        return formatDetailedError(error, {
          operation: "Execute task",
          args,
          sessionID: syncSessionID,
          agent: agentToUse,
        })
      }
    },
  })
}

