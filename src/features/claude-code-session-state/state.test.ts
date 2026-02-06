import { describe, test, expect, beforeEach } from "bun:test"
import {
  setSessionAgent,
  getSessionAgent,
  clearSessionAgent,
  updateSessionAgent,
  setMainSession,
  getMainSessionID,
  subagentSessions,
} from "./state"

describe("claude-code-session-state", () => {
  beforeEach(() => {
    // #given - clean state before each test
    clearSessionAgent("test-session-1")
    clearSessionAgent("test-session-2")
    clearSessionAgent("test-planner-session")
    setMainSession(undefined)
    subagentSessions.clear()
  })

  describe("setSessionAgent", () => {
    test("should store agent for session", () => {
      // #given
      const sessionID = "test-session-1"
      const agent = "planner-paul"

      // #when
      setSessionAgent(sessionID, agent)

      // #then
      expect(getSessionAgent(sessionID)).toBe(agent)
    })

    test("should NOT overwrite existing agent (first-write wins)", () => {
       // #given
       const sessionID = "test-session-1"
       setSessionAgent(sessionID, "planner-paul")

       // #when - try to overwrite
       setSessionAgent(sessionID, "Paul")

       // #then - first agent preserved
       expect(getSessionAgent(sessionID)).toBe("planner-paul")
    })

    test("should return undefined for unknown session", () => {
      // #given - no session set

      // #when / #then
      expect(getSessionAgent("unknown-session")).toBeUndefined()
    })
  })

  describe("updateSessionAgent", () => {
     test("should overwrite existing agent", () => {
       // #given
       const sessionID = "test-session-1"
       setSessionAgent(sessionID, "planner-paul")

       // #when - force update
       updateSessionAgent(sessionID, "Paul")

       // #then
       expect(getSessionAgent(sessionID)).toBe("Paul")
    })
  })

  describe("clearSessionAgent", () => {
    test("should remove agent from session", () => {
      // #given
      const sessionID = "test-session-1"
      setSessionAgent(sessionID, "planner-paul")
      expect(getSessionAgent(sessionID)).toBe("planner-paul")

      // #when
      clearSessionAgent(sessionID)

      // #then
      expect(getSessionAgent(sessionID)).toBeUndefined()
    })
  })

   describe("planner-md-only integration scenario", () => {
    test("should correctly identify planner agent for permission checks", () => {
      // #given - planner session
      const sessionID = "test-planner-session"
      const plannerAgent = "planner-paul"

      // #when - agent is set (simulating chat.message hook)
      setSessionAgent(sessionID, plannerAgent)

      // #then - getSessionAgent returns correct agent for planner-md-only hook
      const agent = getSessionAgent(sessionID)
      expect(agent).toBe("planner-paul")
      expect(["planner-paul"].includes(agent!)).toBe(true)
    })

    test("should return undefined when agent not set (bug scenario)", () => {
      // #given - session exists but no agent set (the bug)
      const sessionID = "test-planner-session"

      // #when / #then - this is the bug: agent is undefined
      expect(getSessionAgent(sessionID)).toBeUndefined()
    })
  })
})
