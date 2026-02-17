import { describe, expect, test } from "bun:test"
import { detectErrorLoop, extractLatestAssistantText, findSignalDoneResult } from "./delegation-reliability"

describe("delegation reliability helpers", () => {
  test("findSignalDoneResult returns tool result", () => {
    // #given
    const messages = [
      {
        info: { role: "assistant" },
        parts: [
          {
            type: "tool_use",
            name: "signal_done",
            input: { result: "done payload" },
          },
        ],
      },
    ]

    // #when
    const result = findSignalDoneResult(messages)

    // #then
    expect(result).toBe("done payload")
  })

  test("detectErrorLoop catches repeated assistant text", () => {
    // #given
    const repeated = "fatal: same failure"
    const messages = [
      { info: { role: "assistant" }, parts: [{ type: "text", text: repeated }] },
      { info: { role: "assistant" }, parts: [{ type: "text", text: repeated }] },
      { info: { role: "assistant" }, parts: [{ type: "text", text: repeated }] },
    ]

    // #when
    const result = detectErrorLoop(messages)

    // #then
    expect(result.detected).toBe(true)
    expect(result.reason).toContain("repeated")
  })

  test("extractLatestAssistantText reads latest assistant text and reasoning", () => {
    // #given
    const messages = [
      {
        info: { role: "assistant", time: { created: 1 } },
        parts: [{ type: "text", text: "older" }],
      },
      {
        info: { role: "assistant", time: { created: 2 } },
        parts: [
          { type: "reasoning", text: "new thinking" },
          { type: "text", text: "new answer" },
        ],
      },
    ]

    // #when
    const result = extractLatestAssistantText(messages)

    // #then
    expect(result).toContain("new thinking")
    expect(result).toContain("new answer")
    expect(result).not.toContain("older")
  })
})
