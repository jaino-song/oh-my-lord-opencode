import { describe, expect, test } from "bun:test"
import { isSystemDirective, SYSTEM_DIRECTIVE_PREFIX, SYSTEM_REMINDER_PREFIX } from "./system-directive"

describe("isSystemDirective", () => {
  test("should recognize new system reminder header (case-insensitive)", () => {
    // #given
    const lower = `${SYSTEM_REMINDER_PREFIX} Please follow the rules`
    const upper = "[SYSTEM REMINDER] Please follow the rules"

    // #when
    const lowerResult = isSystemDirective(lower)
    const upperResult = isSystemDirective(upper)

    // #then
    expect(lowerResult).toBe(true)
    expect(upperResult).toBe(true)
  })

  test("should recognize legacy SYSTEM DIRECTIVE header", () => {
    // #given
    const text = `${SYSTEM_DIRECTIVE_PREFIX} - TODO CONTINUATION] Continue tasks`

    // #when
    const result = isSystemDirective(text)

    // #then
    expect(result).toBe(true)
  })

  test("should return false for non-directive or mid-string markers", () => {
    // #given
    const nonDirective = "This is a normal message"
    const midString = `Message starts here ${SYSTEM_DIRECTIVE_PREFIX} - TODO CONTINUATION]`

    // #when
    const nonDirectiveResult = isSystemDirective(nonDirective)
    const midStringResult = isSystemDirective(midString)

    // #then
    expect(nonDirectiveResult).toBe(false)
    expect(midStringResult).toBe(false)
  })
})
