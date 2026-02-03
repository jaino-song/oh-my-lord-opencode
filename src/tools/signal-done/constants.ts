export const SIGNAL_DONE_TOOL_NAME = "signal_done"

export const SIGNAL_DONE_DESCRIPTION = `Signal task completion to the orchestrator. Call this when you have finished your work.

Your result will be returned directly to the calling agent (e.g., planner-paul).

Usage:
- Call this ONCE at the end of your task
- Include your FULL response/analysis in the result parameter
- Do NOT output anything after calling this tool`
