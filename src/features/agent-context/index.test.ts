import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { getParentAgentName } from "./index"
import { MESSAGE_STORAGE } from "../hook-message-injector"
import { clearSessionAgent, setSessionAgent } from "../claude-code-session-state"

function removeDir(path: string): void {
  if (!existsSync(path)) return
  rmSync(path, { recursive: true, force: true })
}

describe("getParentAgentName", () => {
  const SESSION_WITH_AGENT = "agent-context-test-session-agent"
  const SESSION_WITH_FILES = "agent-context-test-session-files"

  const messageDirFor = (sessionID: string) => join(MESSAGE_STORAGE, sessionID)

  beforeEach(() => {
    clearSessionAgent(SESSION_WITH_AGENT)
    clearSessionAgent(SESSION_WITH_FILES)

    // Ensure these test dirs are clean so other test runs don't interfere
    removeDir(messageDirFor(SESSION_WITH_AGENT))
    removeDir(messageDirFor(SESSION_WITH_FILES))
  })

  afterEach(() => {
    clearSessionAgent(SESSION_WITH_AGENT)
    clearSessionAgent(SESSION_WITH_FILES)

    // Cleanup message dirs
    removeDir(messageDirFor(SESSION_WITH_AGENT))
    removeDir(messageDirFor(SESSION_WITH_FILES))
  })

  test("should return session agent when available", () => {
    // #given
    setSessionAgent(SESSION_WITH_AGENT, "planner-paul")

    // #when
    const result = getParentAgentName(SESSION_WITH_AGENT)

    // #then
    expect(result).toBe("planner-paul")
  })

  test("should fall back to message files when session agent unavailable", () => {
    // #given
    clearSessionAgent(SESSION_WITH_FILES)
    const dir = messageDirFor(SESSION_WITH_FILES)
    mkdirSync(dir, { recursive: true })

    writeFileSync(
      join(dir, "msg_001.json"),
      JSON.stringify({ agent: "sisyphus", model: { providerID: "test", modelID: "test" } })
    )

    // #when
    const result = getParentAgentName(SESSION_WITH_FILES)

    // #then
    expect(result).toBe("sisyphus")
  })

  test("should return fallback when no agent can be resolved", () => {
    // #given
    const sessionID = "agent-context-test-session-missing"
    const fallback = "fallback-agent"
    clearSessionAgent(sessionID)
    // Do NOT create message storage dir
    const dir = messageDirFor(sessionID)
    removeDir(dir)

    // #when
    const result = getParentAgentName(sessionID, fallback)

    // #then
    expect(result).toBe(fallback)
  })

  test("should handle undefined or empty sessionID gracefully", () => {
    // #given
    const fallback = "fallback-agent"
    const invalidSessionIDs = ["", undefined as unknown as string]

    // #when
    const results = invalidSessionIDs.map((sessionID) => getParentAgentName(sessionID, fallback))

    // #then
    expect(results).toEqual([fallback, fallback])
  })
})
