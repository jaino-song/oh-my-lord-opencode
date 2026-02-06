import type { ALLOWED_AGENTS } from "./constants"

export type AllowedAgentType = (typeof ALLOWED_AGENTS)[number]

export interface CallPaulAgentArgs {
  description: string
  prompt: string
  subagent_type: string
  run_in_background: boolean
  session_id?: string
  skills?: string[] | null
}

export interface CallPaulAgentSyncResult {
  title: string
  metadata: {
    summary?: Array<{
      id: string
      tool: string
      state: {
        status: string
        title?: string
      }
    }>
    sessionId: string
  }
  output: string
}
