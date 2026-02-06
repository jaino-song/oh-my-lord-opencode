export const HOOK_NAME = "clarification-handler"

export const CLARIFICATION_MARKER = "[NEEDS_CLARIFICATION]"

export const MAX_ITERATIONS = 3

export const ENABLED_AGENTS = [
  "paul-junior",
  "frontend-ui-ux-engineer",
  "explore",
  "librarian",
] as const

export const POLL_INTERVAL_MS = 1000

export const ROUND_TIMEOUT_MS = 10 * 60 * 1000

export const STALE_SESSION_THRESHOLD_MS = 30 * 60 * 1000

export const CLARIFICATION_TOOLS = ["delegate_task", "task", "call_paul_agent"] as const

export type EnabledAgent = (typeof ENABLED_AGENTS)[number]
export type ClarificationTool = (typeof CLARIFICATION_TOOLS)[number]
