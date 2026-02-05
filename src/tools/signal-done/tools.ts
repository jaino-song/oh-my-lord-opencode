import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import type { SignalDoneArgs } from "./types"
import { SIGNAL_DONE_DESCRIPTION } from "./constants"

type ToolContext = {
  sessionID?: string
}

export const signal_done: ToolDefinition = tool({
  description: SIGNAL_DONE_DESCRIPTION,
  args: {
    result: tool.schema.string().describe("Your complete response/analysis to return to the orchestrator"),
  },
  async execute(args: SignalDoneArgs, toolContext?: ToolContext) {
    const sessionID = toolContext?.sessionID ?? "unknown"
    return `[session_id="${sessionID}" result="${args.result}"]`
  },
})
