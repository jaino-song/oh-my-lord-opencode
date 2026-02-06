import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"

export const signal_done: ToolDefinition = tool({
  description: "Signal completion of a task with result. Called by subagents to explicitly mark task completion.",
  args: {
    result: tool.schema.string().describe("The result/output to signal as complete"),
  },
  execute: async (args) => {
    return args.result
  },
})
