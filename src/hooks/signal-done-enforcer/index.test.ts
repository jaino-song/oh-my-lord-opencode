import { describe, expect, test, beforeEach, mock } from "bun:test"
import { createSignalDoneEnforcerHook, clearSignalDoneTracking } from "./index"
import { subagentSessions } from "../../features/claude-code-session-state"

describe("signal-done-enforcer", () => {
  const TEST_SESSION = "test-session-123"

  beforeEach(() => {
    clearSignalDoneTracking()
    subagentSessions.clear()
  })

  test("should track when signal_done is called", async () => {
    // #given
    const promptMock = mock(async () => {})
    const hook = createSignalDoneEnforcerHook({
      client: { session: { prompt: promptMock } },
      directory: "/tmp",
    } as never)

    // #when
    await hook["tool.execute.after"](
      { tool: "signal_done", sessionID: TEST_SESSION },
      { output: "result" }
    )

    // #then - session should be tracked as having called signal_done
    subagentSessions.add(TEST_SESSION)
    await hook.handler({ event: { type: "session.idle" }, sessionID: TEST_SESSION })
    
    expect(promptMock).not.toHaveBeenCalled()
  })

  test("should inject reminder for subagent without signal_done", async () => {
    // #given
    const promptMock = mock(async () => {})
    const hook = createSignalDoneEnforcerHook({
      client: { session: { prompt: promptMock } },
      directory: "/tmp",
    } as never)
    subagentSessions.add(TEST_SESSION)

    // #when
    await hook.handler({ event: { type: "session.idle" }, sessionID: TEST_SESSION })

    // #then
    expect(promptMock).toHaveBeenCalledTimes(1)
    const callArgs = (promptMock.mock.calls[0] as unknown[])[0] as { body: { parts: Array<{ text: string }> } }
    expect(callArgs.body.parts[0].text).toContain("signal_done")
    expect(callArgs.body.parts[0].text).toContain("DELEGATION VIOLATION ALERT")
  })

  test("should not inject reminder for non-subagent sessions", async () => {
    // #given
    const promptMock = mock(async () => {})
    const hook = createSignalDoneEnforcerHook({
      client: { session: { prompt: promptMock } },
      directory: "/tmp",
    } as never)

    // #when - session is NOT in subagentSessions
    await hook.handler({ event: { type: "session.idle" }, sessionID: TEST_SESSION })

    // #then
    expect(promptMock).not.toHaveBeenCalled()
  })

  test("should ignore non-idle events", async () => {
    // #given
    const promptMock = mock(async () => {})
    const hook = createSignalDoneEnforcerHook({
      client: { session: { prompt: promptMock } },
      directory: "/tmp",
    } as never)
    subagentSessions.add(TEST_SESSION)

    // #when
    await hook.handler({ event: { type: "session.start" }, sessionID: TEST_SESSION })

    // #then
    expect(promptMock).not.toHaveBeenCalled()
  })
})
