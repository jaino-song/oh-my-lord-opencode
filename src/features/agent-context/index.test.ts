import { describe, test, expect, beforeEach, mock } from "bun:test"

type StoredMessage = { agent?: string }

const getSessionAgentMock = mock((_sessionID: string) => undefined as string | undefined)
const getMessageDirMock = mock((_sessionID: string) => null as string | null)
const findFirstMessageWithAgentMock = mock((_messageDir: string) => null as string | null)
const findNearestMessageWithFieldsMock = mock(
  (_messageDir: string) => null as StoredMessage | null
)

mock.module("../claude-code-session-state", () => ({
  getSessionAgent: getSessionAgentMock,
}))

mock.module("../hook-message-injector", () => ({
  getMessageDir: getMessageDirMock,
  findFirstMessageWithAgent: findFirstMessageWithAgentMock,
  findNearestMessageWithFields: findNearestMessageWithFieldsMock,
}))

const { getParentAgentName } = await import("./index")

describe("getParentAgentName", () => {
  beforeEach(() => {
    getSessionAgentMock.mockClear()
    getMessageDirMock.mockClear()
    findFirstMessageWithAgentMock.mockClear()
    findNearestMessageWithFieldsMock.mockClear()

    getSessionAgentMock.mockImplementation(() => undefined)
    getMessageDirMock.mockImplementation(() => null)
    findFirstMessageWithAgentMock.mockImplementation(() => null)
    findNearestMessageWithFieldsMock.mockImplementation(() => null)
  })

  test("should return session agent when available", () => {
    // #given
    const sessionID = "session-123"
    getSessionAgentMock.mockImplementation(() => "planner-paul")

    // #when
    const result = getParentAgentName(sessionID)

    // #then
    expect(result).toBe("planner-paul")
    expect(getSessionAgentMock).toHaveBeenCalledWith(sessionID)
  })

  test("should fall back to message files when session agent unavailable", () => {
    // #given
    const sessionID = "session-456"
    getMessageDirMock.mockImplementation(() => "/tmp/message-dir")
    findFirstMessageWithAgentMock.mockImplementation(() => null)
    findNearestMessageWithFieldsMock.mockImplementation(() => ({ agent: "sisyphus" }))

    // #when
    const result = getParentAgentName(sessionID)

    // #then
    expect(result).toBe("sisyphus")
    expect(getMessageDirMock).toHaveBeenCalledWith(sessionID)
    expect(findFirstMessageWithAgentMock).toHaveBeenCalledWith("/tmp/message-dir")
    expect(findNearestMessageWithFieldsMock).toHaveBeenCalledWith("/tmp/message-dir")
  })

  test("should return fallback when no agent can be resolved", () => {
    // #given
    const sessionID = "session-789"
    const fallback = "fallback-agent"
    getMessageDirMock.mockImplementation(() => null)

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
