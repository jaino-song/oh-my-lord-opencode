import { describe, expect, test } from "bun:test"
import { createSystemInjectionStripperHook } from "./index"

function createMockMessage(text: string) {
  return {
    info: { id: "msg1", role: "user" },
    parts: [{ type: "text", text }],
  }
}

describe("system-injection-stripper", () => {
  test("should strip [DELEGATION ALERT...] blocks", async () => {
    // #given
    const hook = createSystemInjectionStripperHook()
    const messages = [
      createMockMessage(`[DELEGATION ALERT - OH-MY-LORD-OPENCODE]
⚡ Nathan → Explore
TASK: Test task
✅ TASK COMPLETE

Actual user message here`),
    ]
    const output = { messages }

    // #when
    await hook["experimental.chat.messages.transform"]!({}, output as any)

    // #then
    const text = (messages[0].parts[0] as { text: string }).text
    expect(text).not.toContain("[DELEGATION ALERT")
    expect(text).toContain("Actual user message here")
  })

  test("should NOT strip [SYSTEM DIRECTIVE...] blocks", async () => {
    // #given
    const hook = createSystemInjectionStripperHook()
    const messages = [
      createMockMessage(`[SYSTEM DIRECTIVE: OH-MY-LORD-OPENCODE - SYSTEM REMINDER]
Important instruction for agent
[/SYSTEM DIRECTIVE]

User message`),
    ]
    const output = { messages }

    // #when
    await hook["experimental.chat.messages.transform"]!({}, output as any)

    // #then
    const text = (messages[0].parts[0] as { text: string }).text
    expect(text).toContain("[SYSTEM DIRECTIVE")
    expect(text).toContain("Important instruction for agent")
  })

  test("should leave messages without delegation alerts unchanged", async () => {
    // #given
    const hook = createSystemInjectionStripperHook()
    const originalText = "This is a normal message without any alerts"
    const messages = [createMockMessage(originalText)]
    const output = { messages }

    // #when
    await hook["experimental.chat.messages.transform"]!({}, output as any)

    // #then
    const text = (messages[0].parts[0] as { text: string }).text
    expect(text).toBe(originalText)
  })

  test("should handle message that is only a delegation alert", async () => {
    // #given
    const hook = createSystemInjectionStripperHook()
    const messages = [
      createMockMessage(`[DELEGATION ALERT - OH-MY-LORD-OPENCODE]
Some notification only`),
    ]
    const output = { messages }

    // #when
    await hook["experimental.chat.messages.transform"]!({}, output as any)

    // #then
    const text = (messages[0].parts[0] as { text: string }).text
    expect(text).toBe("[system notification removed]")
  })

  test("should strip multiple delegation alerts from same message", async () => {
    // #given
    const hook = createSystemInjectionStripperHook()
    const messages = [
      createMockMessage(`[DELEGATION ALERT - OH-MY-LORD-OPENCODE]
First notification

Middle content

[DELEGATION ALERT - OH-MY-LORD-OPENCODE]
Second notification

End content`),
    ]
    const output = { messages }

    // #when
    await hook["experimental.chat.messages.transform"]!({}, output as any)

    // #then
    const text = (messages[0].parts[0] as { text: string }).text
    expect(text).not.toContain("[DELEGATION ALERT")
    expect(text).toContain("Middle content")
    expect(text).toContain("End content")
  })
})
