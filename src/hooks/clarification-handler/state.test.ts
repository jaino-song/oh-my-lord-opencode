import { describe, test, expect, beforeEach } from "bun:test"
import {
  getStateKey,
  getState,
  setState,
  deleteState,
  createInitialState,
  addHistoryEntry,
  isStaleSession,
  cleanupStaleSessions,
  clearAllSessions,
} from "./state"
import type { ClarificationState } from "./types"

describe("clarification-handler state", () => {
  beforeEach(() => {
    clearAllSessions()
  })

  test("getStateKey generates unique key", () => {
    const key = getStateKey("session1", "delegation1")
    expect(key).toBe("session1:delegation1")
  })

  test("createInitialState creates valid state", () => {
    const state = createInitialState("session1", "delegation1")
    expect(state.sessionId).toBe("session1")
    expect(state.delegationId).toBe("delegation1")
    expect(state.iterations).toBe(0)
    expect(state.history).toEqual([])
    expect(state.startTime).toBeGreaterThan(0)
  })

  test("setState and getState work correctly", () => {
    const state = createInitialState("session1", "delegation1")
    setState("session1", "delegation1", state)

    const retrieved = getState("session1", "delegation1")
    expect(retrieved).toEqual(state)
  })

  test("getState returns undefined for non-existent session", () => {
    const state = getState("nonexistent", "nonexistent")
    expect(state).toBeUndefined()
  })

  test("deleteState removes session", () => {
    const state = createInitialState("session1", "delegation1")
    setState("session1", "delegation1", state)

    const deleted = deleteState("session1", "delegation1")
    expect(deleted).toBe(true)
    expect(getState("session1", "delegation1")).toBeUndefined()
  })

  test("addHistoryEntry increments iterations and adds entry", () => {
    const state = createInitialState("session1", "delegation1")
    const updated = addHistoryEntry(state, "what color?", "blue", "orchestrator")

    expect(updated.iterations).toBe(1)
    expect(updated.history).toHaveLength(1)
    expect(updated.history[0].question).toBe("what color?")
    expect(updated.history[0].answer).toBe("blue")
    expect(updated.history[0].answeredBy).toBe("orchestrator")
  })

  test("isStaleSession detects stale sessions", () => {
    const freshState = createInitialState("session1", "delegation1")
    expect(isStaleSession(freshState)).toBe(false)

    const staleState: ClarificationState = {
      ...freshState,
      startTime: Date.now() - 31 * 60 * 1000,
    }
    expect(isStaleSession(staleState)).toBe(true)
  })

  test("cleanupStaleSessions removes stale sessions", () => {
    const freshState = createInitialState("fresh", "delegation1")
    setState("fresh", "delegation1", freshState)

    const staleState: ClarificationState = {
      ...createInitialState("stale", "delegation2"),
      startTime: Date.now() - 31 * 60 * 1000,
    }
    setState("stale", "delegation2", staleState)

    const cleaned = cleanupStaleSessions()
    expect(cleaned).toBe(1)
    expect(getState("fresh", "delegation1")).toBeDefined()
    expect(getState("stale", "delegation2")).toBeUndefined()
  })
})
