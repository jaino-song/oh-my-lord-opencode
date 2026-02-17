import type { PluginInput } from "@opencode-ai/plugin"
import type { TokenAnalyticsManager } from "./manager"
import { getSessionAgent, getMainSessionID } from "../../features/claude-code-session-state"
import { subagentSessions } from "../../features/claude-code-session-state/state"
import { generateCompactTokenSummary, generateIdleTokenSummary, generateCompactionTokenSummary } from "./reporter"

interface AssistantMessageInfo {
  role: "assistant"
  providerID: string
  model?: string
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
}

interface MessageWrapper {
  info: { role: string } & Partial<AssistantMessageInfo>
}

interface ToolExecuteInput {
  tool: string
  sessionID: string
  callID: string
  agent?: string
}

interface ToolExecuteOutput {
  title: string
  output: string
  metadata: unknown
}

interface EventInput {
  event: {
    type: string
    properties?: unknown
  }
}

type PromptClient = {
  session?: {
    prompt?: (opts: {
      path: { id: string }
      body: { noReply?: boolean; parts: Array<{ type: string; text: string }> }
    }) => Promise<unknown>
  }
}

async function injectNotification(
  ctx: PluginInput,
  sessionID: string,
  text: string
): Promise<void> {
  const promptClient = ctx.client as unknown as PromptClient
  if (!promptClient.session?.prompt) return

  await promptClient.session.prompt({
    path: { id: sessionID },
    body: {
      noReply: true,
      parts: [{ type: "text", text }],
    },
  }).catch(() => {})
}

export function createTokenAnalyticsHook(
  ctx: PluginInput,
  manager: TokenAnalyticsManager
) {
  const messageUpdatedHandler = async ({
    sessionID,
  }: {
    sessionID: string
  }) => {
    try {
      const response = await ctx.client.session.messages({
        path: { id: sessionID },
      })

      const messages = (response.data ?? response) as MessageWrapper[]

      const assistantMessages = messages
        .filter((m) => m.info.role === "assistant")
        .map((m) => m.info as AssistantMessageInfo)

      if (assistantMessages.length === 0) return

      const lastProcessedCount = manager.getProcessedMessageCount(sessionID)
      if (assistantMessages.length <= lastProcessedCount) return

      const newMessages = assistantMessages.slice(lastProcessedCount)
      manager.setProcessedMessageCount(sessionID, assistantMessages.length)

      const agent = getSessionAgent(sessionID) ?? "unknown"

      for (const msg of newMessages) {
        const model = msg.model ?? "unknown"
        const provider = msg.providerID ?? "unknown"

        manager.recordMessage(sessionID, agent, model, provider, {
          input: msg.tokens?.input,
          output: msg.tokens?.output,
          reasoning: msg.tokens?.reasoning,
          cache: {
            read: msg.tokens?.cache?.read,
            write: msg.tokens?.cache?.write,
          },
        })
      }
    } catch {
      // Graceful degradation
    }
  }

  const toolExecuteAfter = async (
    input: ToolExecuteInput,
    _output: ToolExecuteOutput
  ) => {
    const { sessionID } = input
    const agent = getSessionAgent(sessionID) ?? "unknown"

    try {
      manager.recordToolCall(sessionID, agent)
    } catch {
      // Graceful degradation
    }
  }

  const compactingHandler = async ({ sessionID }: { sessionID: string }) => {
    try {
      const report = manager.getReport(sessionID)
      if (!report || report.totalTokens === 0) return

      const summary = generateCompactionTokenSummary(report)
      await injectNotification(ctx, sessionID, summary)
    } catch {
      // Graceful degradation
    }
  }

  const idleHandler = async (sessionID: string) => {
    try {
      if (subagentSessions.has(sessionID)) return

      const mainSessionID = getMainSessionID()
      if (mainSessionID && sessionID !== mainSessionID) return

      const activityUsage = manager.getActivityUsage(sessionID)
      const activityTotal = activityUsage.input + activityUsage.output + activityUsage.reasoning
      if (activityTotal === 0) return

      const activityCost = manager.getActivityCost(sessionID)
      const accumulatedReport = manager.getReport(sessionID)
      if (!accumulatedReport) return

      const summary = generateIdleTokenSummary(activityUsage, activityCost, accumulatedReport)
      await injectNotification(ctx, sessionID, summary)

      manager.markReported(sessionID)
    } catch {
      // Graceful degradation
    }
  }

  const sessionEndHandler = async (sessionID: string) => {
    try {
      const report = manager.getReport(sessionID)
      if (!report || report.totalTokens === 0) return

      const mainSessionID = getMainSessionID()
      if (!mainSessionID || mainSessionID === sessionID) return

      const parentSessionID = manager.getParentSessionID(sessionID) ?? mainSessionID
      const summary = generateCompactTokenSummary(report)
      await injectNotification(ctx, parentSessionID, summary)
    } catch {
      // Graceful degradation
    }
  }

  const eventHandler = async ({ event }: EventInput) => {
    const props = event.properties as Record<string, unknown> | undefined

    if (event.type === "session.created") {
      const sessionInfo = props?.info as
        | { id?: string; parentID?: string }
        | undefined
      if (sessionInfo?.id) {
        const agent = getSessionAgent(sessionInfo.id)
        manager.startSession(
          sessionInfo.id,
          sessionInfo.parentID,
          agent,
          undefined
        )
      }
    }

    if (event.type === "session.idle") {
      const sessionID = props?.sessionID as string | undefined
      if (sessionID) {
        await idleHandler(sessionID)
      }
    }

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined
      if (sessionInfo?.id) {
        await sessionEndHandler(sessionInfo.id)
        manager.clear(sessionInfo.id)
      }
    }
  }

  return {
    "message.updated": messageUpdatedHandler,
    "tool.execute.after": toolExecuteAfter,
    "experimental.session.compacting": compactingHandler,
    event: eventHandler,
  }
}
