import { describe, test, expect } from "bun:test"
import type { SessionMessage } from "../../shared/session-validation"

// Constants matching tools.ts
const POLL_INTERVAL_MS = 500
const MIN_STABILITY_TIME_MS = 30000
const STABILITY_POLLS_REQUIRED = 5
const NO_PROGRESS_TIMEOUT_MS = 10 * 60 * 1000

describe("delegate_task polling logic", () => {
  describe("hasValidOutputFromMessages integration", () => {
    // Import the pure function for testing
    const { hasValidOutputFromMessages } = require("../../shared/session-validation")

    test("correctly identifies empty messages as no output", () => {
      // #given - empty messages array
      const msgs: SessionMessage[] = []

      // #when - validate
      const result = hasValidOutputFromMessages(msgs)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("correctly identifies assistant text as valid output", () => {
      // #given - assistant message with text
      const msgs: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "text", text: "done" }] }
      ]

      // #when - validate
      const result = hasValidOutputFromMessages(msgs)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("correctly identifies reasoning blocks as valid output", () => {
      // #given - assistant message with reasoning
      const msgs: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "reasoning", text: "thinking..." }] }
      ]

      // #when - validate
      const result = hasValidOutputFromMessages(msgs)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("correctly identifies empty reasoning as no output", () => {
      // #given - assistant message with empty reasoning
      const msgs: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "reasoning", text: "   " }] }
      ]

      // #when - validate
      const result = hasValidOutputFromMessages(msgs)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("correctly identifies tool calls as valid output", () => {
      // #given - assistant message with tool call
      const msgs: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "tool" }] }
      ]

      // #when - validate
      const result = hasValidOutputFromMessages(msgs)

      // #then - should return true
      expect(result).toBe(true)
    })
  })

  describe("no-progress timeout (rate limit detection)", () => {
    test("timeout triggers after 10min of no message progress", () => {
      // #given - 10 minutes elapsed with no new messages
      const lastMsgChangeTime = Date.now() - NO_PROGRESS_TIMEOUT_MS
      const hasValidOutput = false

      // #when - check timeout condition
      const timeSinceLastProgress = Date.now() - lastMsgChangeTime
      const shouldTimeout = !hasValidOutput && timeSinceLastProgress >= NO_PROGRESS_TIMEOUT_MS

      // #then - should trigger timeout
      expect(shouldTimeout).toBe(true)
    })

    test("no timeout when valid output exists", () => {
      // #given - 90 seconds elapsed but has valid output
      const lastMsgChangeTime = Date.now() - NO_PROGRESS_TIMEOUT_MS
      const hasValidOutput = true

      // #when - check timeout condition
      const timeSinceLastProgress = Date.now() - lastMsgChangeTime
      const shouldTimeout = !hasValidOutput && timeSinceLastProgress >= NO_PROGRESS_TIMEOUT_MS

      // #then - should NOT timeout
      expect(shouldTimeout).toBe(false)
    })

    test("no timeout when messages are progressing", () => {
      // #given - recent message change
      const lastMsgChangeTime = Date.now() - 5000 // 5 seconds ago
      const hasValidOutput = false

      // #when - check timeout condition
      const timeSinceLastProgress = Date.now() - lastMsgChangeTime
      const shouldTimeout = !hasValidOutput && timeSinceLastProgress >= NO_PROGRESS_TIMEOUT_MS

      // #then - should NOT timeout
      expect(shouldTimeout).toBe(false)
    })

    test("lastMsgChangeTime resets when message count changes", () => {
      // #given - message count changed
      let lastMsgChangeTime = Date.now() - 60000
      let lastMsgCount = 5
      const currentMsgCount = 6

      // #when - message count changed
      if (currentMsgCount !== lastMsgCount) {
        lastMsgChangeTime = Date.now()
        lastMsgCount = currentMsgCount
      }

      // #then - time should be recent
      expect(Date.now() - lastMsgChangeTime).toBeLessThan(100)
      expect(lastMsgCount).toBe(6)
    })
  })

  describe("stability detection", () => {
    test("stability detection requires MIN_STABILITY_TIME_MS + stable polls", () => {
      // #given - timing constants
      const minStabilityMs = MIN_STABILITY_TIME_MS
      const stablePollsRequired = STABILITY_POLLS_REQUIRED
      const pollIntervalMs = POLL_INTERVAL_MS

      // #when - calculate minimum completion time
      const minCompletionTime = minStabilityMs + (stablePollsRequired * pollIntervalMs)

      // #then - should be 30s + 2.5s = 32.5s
      expect(minCompletionTime).toBe(32500)
    })

    test("stability detection resets when message count changes", () => {
      // #given - stable polls accumulated
      let stablePolls = 2
      let lastMsgCount = 5
      const currentMsgCount = 6 // new message arrived

      // #when - message count changed
      if (currentMsgCount !== lastMsgCount) {
        stablePolls = 0
        lastMsgCount = currentMsgCount
      }

      // #then - stable polls should reset
      expect(stablePolls).toBe(0)
      expect(lastMsgCount).toBe(6)
    })

    test("stability detection increments when message count stable", () => {
      // #given - message count unchanged
      let stablePolls = 1
      const lastMsgCount = 5
      const currentMsgCount = 5

      // #when - message count same
      if (currentMsgCount === lastMsgCount) {
        stablePolls++
      }

      // #then - stable polls should increment
      expect(stablePolls).toBe(2)
    })

    test("completion requires both stability AND valid output", () => {
      // #given - stable but no valid output
      const stablePolls = STABILITY_POLLS_REQUIRED
      const hasValidOutput = false

      // #when - check completion condition
      const shouldComplete = stablePolls >= STABILITY_POLLS_REQUIRED && hasValidOutput

      // #then - should NOT complete without valid output
      expect(shouldComplete).toBe(false)
    })

    test("completion succeeds with stability AND valid output", () => {
      // #given - stable with valid output
      const stablePolls = STABILITY_POLLS_REQUIRED
      const hasValidOutput = true

      // #when - check completion condition
      const shouldComplete = stablePolls >= STABILITY_POLLS_REQUIRED && hasValidOutput

      // #then - should complete
      expect(shouldComplete).toBe(true)
    })
  })
})
