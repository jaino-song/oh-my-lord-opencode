/**
 * clarification-handler state management
 *
 * manages active clarification sessions using a map-based store.
 * sessions are keyed by sessionId + delegationId.
 */

import type { ClarificationState, ClarificationHistoryEntry } from "./types"
import { STALE_SESSION_THRESHOLD_MS } from "./constants"

/** in-memory state store */
const stateStore = new Map<string, ClarificationState>()

/** generate a unique key for a clarification session */
export function getStateKey(sessionId: string, delegationId: string): string {
  return `${sessionId}:${delegationId}`
}

/** get state for a clarification session */
export function getState(sessionId: string, delegationId: string): ClarificationState | undefined {
  return stateStore.get(getStateKey(sessionId, delegationId))
}

/** create or update state for a clarification session */
export function setState(sessionId: string, delegationId: string, state: ClarificationState): void {
  stateStore.set(getStateKey(sessionId, delegationId), state)
}

/** delete state for a clarification session */
export function deleteState(sessionId: string, delegationId: string): boolean {
  return stateStore.delete(getStateKey(sessionId, delegationId))
}

/** create initial state for a new clarification session */
export function createInitialState(sessionId: string, delegationId: string): ClarificationState {
  return {
    sessionId,
    delegationId,
    iterations: 0,
    history: [],
    startTime: Date.now(),
  }
}

/** add a history entry to the state */
export function addHistoryEntry(
  state: ClarificationState,
  question: string,
  answer: string,
  answeredBy: "orchestrator" | "user"
): ClarificationState {
  const entry: ClarificationHistoryEntry = {
    question,
    answer,
    answeredBy,
    timestamp: Date.now(),
  }
  return {
    ...state,
    iterations: state.iterations + 1,
    history: [...state.history, entry],
  }
}

/** check if a session is stale (older than threshold) */
export function isStaleSession(state: ClarificationState): boolean {
  return Date.now() - state.startTime > STALE_SESSION_THRESHOLD_MS
}

/** cleanup stale sessions from the store */
export function cleanupStaleSessions(): number {
  let cleaned = 0
  for (const [key, state] of stateStore.entries()) {
    if (isStaleSession(state)) {
      stateStore.delete(key)
      cleaned++
    }
  }
  return cleaned
}

/** get all active sessions (for debugging) */
export function getAllSessions(): Map<string, ClarificationState> {
  return new Map(stateStore)
}

/** clear all sessions (for testing) */
export function clearAllSessions(): void {
  stateStore.clear()
}
