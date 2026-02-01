import { describe, test, expect } from "bun:test"
import { hasValidOutputFromMessages, validateSessionHasOutput, type SessionMessage } from "./session-validation"

describe("session-validation", () => {
  describe("hasValidOutputFromMessages", () => {
    // #region returns false cases

    test("returns false when no messages exist", () => {
      // #given - empty messages array
      const messages: SessionMessage[] = []

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("returns false when only user messages exist", () => {
      // #given - only user messages
      const messages: SessionMessage[] = [
        { info: { role: "user" }, parts: [{ type: "text", text: "hello" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("returns false when assistant messages have no parts", () => {
      // #given - assistant message with empty parts
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("returns false when assistant message parts are undefined", () => {
      // #given - assistant message with undefined parts
      const messages: SessionMessage[] = [
        { info: { role: "assistant" } },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("returns false for empty reasoning blocks", () => {
      // #given - assistant message with empty reasoning
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "reasoning", text: "   " }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return false (whitespace-only is not valid)
      expect(result).toBe(false)
    })

    test("returns false for step metadata only", () => {
      // #given - assistant message with only step metadata
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "step-start" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("returns false for tool_result with empty content", () => {
      // #given - tool message with empty tool_result
      const messages: SessionMessage[] = [
        { info: { role: "tool" }, parts: [{ type: "tool_result", content: "" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("returns false when role is neither assistant nor tool", () => {
      // #given - system message with text content
      const messages: SessionMessage[] = [
        { info: { role: "system" }, parts: [{ type: "text", text: "meta" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return false
      expect(result).toBe(false)
    })

    // #endregion

    // #region returns true cases

    test("returns true when text content exists", () => {
      // #given - assistant message with text content
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "text", text: "done" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("returns true when reasoning content exists", () => {
      // #given - assistant message with reasoning content
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "reasoning", text: "thinking..." }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("returns true when tool call type 'tool' exists", () => {
      // #given - assistant message with tool type
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "tool" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("returns true when tool call type 'tool_use' exists", () => {
      // #given - assistant message with tool_use type
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ type: "tool_use" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("returns true when tool call has .tool property", () => {
      // #given - assistant message with .tool property
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ tool: "read" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("returns true when tool call has .name property", () => {
      // #given - assistant message with .name property
      const messages: SessionMessage[] = [
        { info: { role: "assistant" }, parts: [{ name: "read" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("returns true for tool_result with string content", () => {
      // #given - tool message with string content
      const messages: SessionMessage[] = [
        { info: { role: "tool" }, parts: [{ type: "tool_result", content: "ok" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("returns true for tool_result with array content", () => {
      // #given - tool message with array content
      const messages: SessionMessage[] = [
        { info: { role: "tool" }, parts: [{ type: "tool_result", content: [{ type: "text", text: "ok" }] }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    // #endregion

    // #region edge cases

    test("returns true when mixed valid and invalid parts exist", () => {
      // #given - assistant message with both valid and invalid parts
      const messages: SessionMessage[] = [
        { 
          info: { role: "assistant" }, 
          parts: [
            { type: "step-start" },
            { type: "text", text: "done" },
          ] 
        },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true (at least one valid part)
      expect(result).toBe(true)
    })

    test("returns true when valid message exists among invalid messages", () => {
      // #given - mix of user and assistant messages
      const messages: SessionMessage[] = [
        { info: { role: "user" }, parts: [{ type: "text", text: "hello" }] },
        { info: { role: "assistant" }, parts: [{ type: "text", text: "hi" }] },
      ]

      // #when - validate output
      const result = hasValidOutputFromMessages(messages)

      // #then - should return true
      expect(result).toBe(true)
    })

    // #endregion
  })

  describe("validateSessionHasOutput", () => {
    // Mock client type
    interface MockClient {
      session: {
        messages: (params: { path: { id: string } }) => Promise<{ data: SessionMessage[] | undefined }>
      }
    }

    test("returns false when client returns empty list", async () => {
      // #given - mock client returning empty data
      const mockClient: MockClient = {
        session: {
          messages: async () => ({ data: [] }),
        },
      }

      // #when - validate session
      const result = await validateSessionHasOutput("session-123", mockClient as any)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("returns true when client returns valid assistant text", async () => {
      // #given - mock client returning valid assistant message
      const mockClient: MockClient = {
        session: {
          messages: async () => ({
            data: [{ info: { role: "assistant" }, parts: [{ type: "text", text: "done" }] }],
          }),
        },
      }

      // #when - validate session
      const result = await validateSessionHasOutput("session-123", mockClient as any)

      // #then - should return true
      expect(result).toBe(true)
    })

    test("returns false when data is undefined", async () => {
      // #given - mock client returning undefined data
      const mockClient: MockClient = {
        session: {
          messages: async () => ({ data: undefined }),
        },
      }

      // #when - validate session
      const result = await validateSessionHasOutput("session-123", mockClient as any)

      // #then - should return false
      expect(result).toBe(false)
    })

    test("returns true on client error (matches BackgroundManager behavior)", async () => {
      // #given - mock client that throws error
      const mockClient: MockClient = {
        session: {
          messages: async () => {
            throw new Error("network error")
          },
        },
      }

      // #when - validate session
      const result = await validateSessionHasOutput("session-123", mockClient as any)

      // #then - should return true (allow completion to proceed)
      expect(result).toBe(true)
    })

    test("passes correct session ID into client call", async () => {
      // #given - mock client that captures call args
      let capturedPath: { id: string } | undefined
      const mockClient: MockClient = {
        session: {
          messages: async (params) => {
            capturedPath = params.path
            return { data: [] }
          },
        },
      }

      // #when - validate session
      await validateSessionHasOutput("session-123", mockClient as any)

      // #then - should have called with correct session ID
      expect(capturedPath).toEqual({ id: "session-123" })
    })
  })
})
