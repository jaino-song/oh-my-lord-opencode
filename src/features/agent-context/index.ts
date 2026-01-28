import { getSessionAgent } from "../claude-code-session-state"
import { getMessageDir, findFirstMessageWithAgent, findNearestMessageWithFields } from "../hook-message-injector"

/**
 * get the parent/current agent name for a session.
 * uses multiple fallback strategies:
 * 1. in-memory session state (fastest)
 * 2. message files on disk
 * 3. provided fallback value
 */
export function getParentAgentName(sessionID: string, fallback: string = "agent"): string {
  if (typeof sessionID !== "string" || sessionID.trim().length === 0) {
    return fallback
  }

  const sessionAgent = getSessionAgent(sessionID)
  if (sessionAgent) return sessionAgent
  
  const messageDir = getMessageDir(sessionID)
  if (messageDir) {
    const agent = findFirstMessageWithAgent(messageDir) ?? 
                  findNearestMessageWithFields(messageDir)?.agent
    if (agent) return agent
  }
  
  return fallback
}
