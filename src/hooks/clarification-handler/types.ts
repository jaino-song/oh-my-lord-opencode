/**
 * clarification-handler types
 *
 * types for the orchestrator-subagent clarification feature.
 * enables subagents to request clarification from orchestrators.
 */

/** a single option in a clarification request */
export interface ClarificationOption {
  label: string // e.g., "a", "b", "c"
  description: string // what this option means
}

/** a clarification request from a subagent */
export interface ClarificationRequest {
  question: string // the question being asked
  options: ClarificationOption[] // available choices (a/b/c format)
  context?: string // additional context for the question
  recommendation?: string // subagent's recommended choice
}

/** history entry for a clarification round */
export interface ClarificationHistoryEntry {
  question: string
  answer: string
  answeredBy: "orchestrator" | "user"
  timestamp: number
}

/** state for an active clarification session */
export interface ClarificationState {
  sessionId: string
  delegationId: string
  iterations: number
  history: ClarificationHistoryEntry[]
  startTime: number
}

/** result of parsing a clarification request */
export type ParseResult =
  | { success: true; request: ClarificationRequest }
  | { success: false; reason: string }
