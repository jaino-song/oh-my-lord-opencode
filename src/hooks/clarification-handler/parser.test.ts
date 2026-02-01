import { describe, test, expect } from "bun:test"
import {
  hasClarificationMarker,
  parseClarificationRequest,
  formatClarificationRequest,
} from "./parser"
import { CLARIFICATION_MARKER } from "./constants"

describe("clarification-handler parser", () => {
  describe("hasClarificationMarker", () => {
    test("detects simple marker", () => {
      expect(hasClarificationMarker(`Some text ${CLARIFICATION_MARKER} more text`)).toBe(true)
    })

    test("detects block format", () => {
      const text = `[NEEDS_CLARIFICATION]
question: What color?
options:
A) Red
B) Blue
[/NEEDS_CLARIFICATION]`
      expect(hasClarificationMarker(text)).toBe(true)
    })

    test("returns false for no marker", () => {
      expect(hasClarificationMarker("Just regular text")).toBe(false)
    })
  })

  describe("parseClarificationRequest", () => {
    test("parses valid clarification block", () => {
      const text = `[NEEDS_CLARIFICATION]
question: What color should the button be?
options:
A) Red - for danger/warning
B) Blue - for primary action
C) Green - for success
context: The button is for form submission
recommendation: B
[/NEEDS_CLARIFICATION]`

      const result = parseClarificationRequest(text)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.request.question).toBe("What color should the button be?")
        expect(result.request.options).toHaveLength(3)
        expect(result.request.options[0].label).toBe("A")
        expect(result.request.options[0].description).toBe("Red - for danger/warning")
        expect(result.request.context).toBe("The button is for form submission")
        expect(result.request.recommendation).toBe("B")
      }
    })

    test("parses block without optional fields", () => {
      const text = `[NEEDS_CLARIFICATION]
question: Which approach?
options:
A) Approach one
B) Approach two
[/NEEDS_CLARIFICATION]`

      const result = parseClarificationRequest(text)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.request.question).toBe("Which approach?")
        expect(result.request.options).toHaveLength(2)
        expect(result.request.context).toBeUndefined()
        expect(result.request.recommendation).toBeUndefined()
      }
    })

    test("fails for missing question", () => {
      const text = `[NEEDS_CLARIFICATION]
options:
A) One
B) Two
[/NEEDS_CLARIFICATION]`

      const result = parseClarificationRequest(text)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toContain("No question found")
      }
    })

    test("fails for less than 2 options", () => {
      const text = `[NEEDS_CLARIFICATION]
question: What?
options:
A) Only one option
[/NEEDS_CLARIFICATION]`

      const result = parseClarificationRequest(text)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toContain("At least 2 options")
      }
    })

    test("fails for no block", () => {
      const result = parseClarificationRequest("Just regular text")
      expect(result.success).toBe(false)
    })

    test("fails for marker without block", () => {
      const result = parseClarificationRequest(`${CLARIFICATION_MARKER} but no structured block`)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toContain("no structured block")
      }
    })
  })

  describe("formatClarificationRequest", () => {
    test("formats request with all fields", () => {
      const request = {
        question: "What color?",
        options: [
          { label: "A", description: "Red" },
          { label: "B", description: "Blue" },
        ],
        context: "For a button",
        recommendation: "B",
      }

      const formatted = formatClarificationRequest(request)
      expect(formatted).toContain("Question: What color?")
      expect(formatted).toContain("A) Red")
      expect(formatted).toContain("B) Blue")
      expect(formatted).toContain("Context: For a button")
      expect(formatted).toContain("Recommendation: B")
    })
  })
})
