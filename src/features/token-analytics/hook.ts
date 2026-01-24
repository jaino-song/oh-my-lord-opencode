import type { PluginInput } from "@opencode-ai/plugin"
import type { TokenAnalyticsManager } from "./manager"
import { getSessionAgent } from "../../features/claude-code-session-state"

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

      const lastAssistant = assistantMessages[assistantMessages.length - 1]
      
      const agent = getSessionAgent(sessionID) ?? "unknown"
      const model = lastAssistant.model ?? "unknown"
      const provider = lastAssistant.providerID ?? "unknown"

      manager.recordMessage(sessionID, agent, model, provider, {
        input: lastAssistant.tokens?.input,
        output: lastAssistant.tokens?.output,
        reasoning: lastAssistant.tokens?.reasoning,
        cache: {
          read: lastAssistant.tokens?.cache?.read,
          write: lastAssistant.tokens?.cache?.write,
        },
      })
    } catch {
      // Graceful degradation - do not disrupt message handling
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

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined
      if (sessionInfo?.id) {
        manager.clear(sessionInfo.id)
      }
    }
  }

  return {
    "message.updated": messageUpdatedHandler,
    "tool.execute.after": toolExecuteAfter,
    event: eventHandler,
  }
}
