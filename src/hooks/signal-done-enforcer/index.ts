import type { PluginInput } from "@opencode-ai/plugin"
import { subagentSessions, callPaulAgentSessions } from "../../features/claude-code-session-state"
import { SIGNAL_DONE_TOOL_NAME } from "../../tools/signal-done/constants"
import { log } from "../../shared/logger"

const HOOK_NAME = "signal-done-enforcer"

const sessionsWithSignalDone = new Set<string>()

const SIGNAL_DONE_REMINDER = `[DELEGATION VIOLATION ALERT - OH-MY-LORD-OPENCODE]
You have NOT called signal_done yet. This is MANDATORY for all subagents.

Call signal_done NOW with your complete output:

\`\`\`typescript
signal_done({ result: "Your complete response here" })
\`\`\`

Do NOT output anything else. Call the tool immediately.`

interface MessageInfo {
  agent?: string
  model?: { providerID: string; modelID: string }
  modelID?: string
  providerID?: string
}

export function clearSignalDoneTracking(sessionID?: string): void {
  if (sessionID) {
    sessionsWithSignalDone.delete(sessionID)
  } else {
    sessionsWithSignalDone.clear()
  }
}

export function createSignalDoneEnforcerHook(ctx: PluginInput) {
  const client = ctx.client as {
    session?: {
      prompt?: (opts: {
        path: { id: string }
        body: {
          agent?: string
          model?: { providerID: string; modelID: string }
          parts: Array<{ type: string; text: string }>
        }
      }) => Promise<unknown>
      messages?: (opts: { path: { id: string } }) => Promise<{
        data?: Array<{ info?: MessageInfo }>
      }>
    }
  }

  return {
    "tool.execute.after": async (
      input: { tool: string; sessionID: string },
      _output: { output: string }
    ): Promise<void> => {
      if (input.tool.toLowerCase() === SIGNAL_DONE_TOOL_NAME.toLowerCase()) {
        sessionsWithSignalDone.add(input.sessionID)
        log(`[${HOOK_NAME}] signal_done called`, { sessionID: input.sessionID })
      }
    },

    handler: async (input: { event: { type: string; properties?: Record<string, unknown> }; sessionID?: string }) => {
      const { event } = input
      if (event.type !== "session.idle") return
      const props = event.properties as Record<string, unknown> | undefined
      const sessionID = props?.sessionID as string | undefined
      if (!sessionID) return

      const isSubagent = subagentSessions.has(sessionID)
      
      if (!isSubagent) return

      // call_paul_agent sessions use polling for completion, not signal_done
      if (callPaulAgentSessions.has(sessionID)) return
      
      if (sessionsWithSignalDone.has(sessionID)) {
        log(`[${HOOK_NAME}] Subagent completed with signal_done`, { sessionID })
        return
      }

      log(`[${HOOK_NAME}] Subagent idle WITHOUT signal_done - injecting reminder`, { sessionID })
      
      let agentName: string | undefined
      let model: { providerID: string; modelID: string } | undefined
      
      try {
        const messagesResp = await client.session?.messages?.({ path: { id: sessionID } })
        const messages = messagesResp?.data ?? []
        
        for (let i = messages.length - 1; i >= 0; i--) {
          const info = messages[i].info
          if (info?.agent || info?.model || (info?.modelID && info?.providerID)) {
            agentName = info.agent
            model = info.model ?? (info.providerID && info.modelID 
              ? { providerID: info.providerID, modelID: info.modelID } 
              : undefined)
            break
          }
        }
      } catch (err) {
        log(`[${HOOK_NAME}] Failed to fetch messages for agent info`, { sessionID, error: String(err) })
      }
      
      try {
        await client.session?.prompt?.({
          path: { id: sessionID },
          body: {
            ...(agentName ? { agent: agentName } : {}),
            ...(model ? { model } : {}),
            parts: [{ type: "text", text: SIGNAL_DONE_REMINDER }],
          },
        })
        log(`[${HOOK_NAME}] Reminder injected`, { sessionID, agent: agentName })
      } catch (err) {
        log(`[${HOOK_NAME}] Failed to inject reminder`, { sessionID, error: String(err) })
      }
    },
  }
}
