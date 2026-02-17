import { describe, expect, test } from "bun:test"
import { classifyPollResultForDelegateTask } from "../delegate-task/tools"
import { classifyPollResultForExecutePhase } from "../execute-phase/tools"
import { pollSessionReliability, type DelegationSessionMessage, type PollSessionResult } from "./delegation-reliability"

function createStaticClient(statusType: string, messages: DelegationSessionMessage[]) {
  return {
    session: {
      status: async () => ({ data: { test_session: { type: statusType } } }),
      messages: async () => ({ data: messages }),
    },
  }
}

describe("delegation reliability integration parity", () => {
  test("aborted session maps to same cancelled classification", async () => {
    // #given
    const controller = new AbortController()
    controller.abort()
    const client = createStaticClient("running", [])

    // #when
    const pollResult = await pollSessionReliability({
      client: client as any,
      sessionID: "test_session",
      abort: controller.signal,
      pollIntervalMs: 2,
      checkpointTimeMs: 50,
      noProgressTimeoutMs: 50,
      errorLoopCheckIntervalMs: 50,
      maxPollTimeMs: 100,
    })

    // #then
    expect(pollResult.status).toBe("aborted")
    expect(classifyPollResultForDelegateTask(pollResult.status)).toBe("cancelled")
    expect(classifyPollResultForExecutePhase(pollResult.status)).toBe("cancelled")
  })

  test("checkpoint-idle stuck session maps to same retryable classification", async () => {
    // #given
    const client = createStaticClient("idle", [])

    // #when
    const pollResult = await pollSessionReliability({
      client: client as any,
      sessionID: "test_session",
      pollIntervalMs: 2,
      checkpointTimeMs: 5,
      noProgressTimeoutMs: 500,
      errorLoopCheckIntervalMs: 500,
      maxPollTimeMs: 200,
    })

    // #then
    expect(pollResult.status).toBe("checkpoint_idle")
    expect(classifyPollResultForDelegateTask(pollResult.status)).toBe("retryable_failure")
    expect(classifyPollResultForExecutePhase(pollResult.status)).toBe("retryable_failure")
  })

  test("no-progress stuck session maps to same retryable classification", async () => {
    // #given
    const client = createStaticClient("running", [])

    // #when
    const pollResult = await pollSessionReliability({
      client: client as any,
      sessionID: "test_session",
      pollIntervalMs: 2,
      checkpointTimeMs: 200,
      noProgressTimeoutMs: 8,
      errorLoopCheckIntervalMs: 200,
      maxPollTimeMs: 200,
    })

    // #then
    expect(pollResult.status).toBe("no_progress_timeout")
    expect(classifyPollResultForDelegateTask(pollResult.status)).toBe("retryable_failure")
    expect(classifyPollResultForExecutePhase(pollResult.status)).toBe("retryable_failure")
  })

  test("error-loop stuck session maps to same terminal classification", async () => {
    // #given
    const repeated = "error: same failure"
    const messages: DelegationSessionMessage[] = [
      { info: { role: "assistant" }, parts: [{ type: "text", text: repeated }] },
      { info: { role: "assistant" }, parts: [{ type: "text", text: repeated }] },
      { info: { role: "assistant" }, parts: [{ type: "text", text: repeated }] },
    ]
    const client = createStaticClient("running", messages)

    // #when
    const pollResult = await pollSessionReliability({
      client: client as any,
      sessionID: "test_session",
      pollIntervalMs: 2,
      checkpointTimeMs: 200,
      noProgressTimeoutMs: 200,
      errorLoopCheckIntervalMs: 0,
      maxPollTimeMs: 200,
    })

    // #then
    expect(pollResult.status).toBe("error_loop")
    expect(classifyPollResultForDelegateTask(pollResult.status)).toBe("terminal_failure")
    expect(classifyPollResultForExecutePhase(pollResult.status)).toBe("terminal_failure")
  })

  test("classification mapping stays aligned for all poll statuses", () => {
    // #given
    const expectedByStatus = {
      signal_done: "success",
      checkpoint_idle: "retryable_failure",
      error_loop: "terminal_failure",
      no_progress_timeout: "retryable_failure",
      aborted: "cancelled",
      max_wait: "retryable_failure",
      unknown: "terminal_failure",
    } satisfies Record<PollSessionResult["status"], ReturnType<typeof classifyPollResultForDelegateTask>>

    const statuses = Object.keys(expectedByStatus) as PollSessionResult["status"][]

    // #when / #then
    for (const status of statuses) {
      const delegateClassification = classifyPollResultForDelegateTask(status)
      const executePhaseClassification = classifyPollResultForExecutePhase(status)

      expect(delegateClassification).toBe(expectedByStatus[status])
      expect(executePhaseClassification).toBe(expectedByStatus[status])
    }
  })
})
