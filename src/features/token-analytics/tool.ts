import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import type { TokenAnalyticsManager } from "./manager"
import { generateTokenReport } from "./reporter"
import { getMainSessionID } from "../claude-code-session-state"

export function createTokenReportTool(manager: TokenAnalyticsManager): ToolDefinition {
  return tool({
    description: `Display token usage analytics for the current session.

Shows:
- Total tokens consumed and estimated cost
- Per-agent breakdown with model, tokens, cost, and percentage
- Delegation tree showing parent-child relationships
- Detailed token breakdown (input/output/reasoning/cache)

Use this to understand token consumption patterns and costs during a session.`,

    args: {
      sessionID: tool.schema
        .string()
        .optional()
        .describe("Session ID to report on. Defaults to current main session."),
    },

    async execute(args) {
      const sessionID = args.sessionID || getMainSessionID()
      
      if (!sessionID) {
        return "No active session found. Start a session first."
      }

      const report = manager.getReport(sessionID)
      
      if (!report) {
        return `No token analytics data found for session ${sessionID}. Token tracking may not have started yet.`
      }

      if (report.agentBreakdown.length === 0) {
        return `Session ${sessionID} has no recorded token usage yet.`
      }

      return generateTokenReport(report)
    },
  })
}
