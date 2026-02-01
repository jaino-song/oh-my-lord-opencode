import type { PluginInput } from "@opencode-ai/plugin"

type OpencodeClient = PluginInput["client"]

export interface SessionMessage {
  info?: { role?: string }
  parts?: Array<{
    type?: string
    text?: string
    tool?: string  // For tool_use detection
    name?: string  // For tool_use detection
    content?: string | Array<{ type: string; text?: string }>
  }>
}

/**
 * PURE FUNCTION: Validates that messages contain actual output content.
 * Does NOT fetch messages - operates on already-fetched data.
 * 
 * Checks for:
 * - Text content (type: "text" with non-empty text)
 * - Reasoning content (type: "reasoning" with non-empty text)
 * - Tool calls (type: "tool" OR type: "tool_use" OR has .tool property)
 * - Tool results (type: "tool_result" with content)
 * 
 * Ignores:
 * - Empty thinking blocks
 * - Step metadata (step-start, step-finish)
 * - Messages with no parts
 * 
 * @param messages - Already-fetched messages array
 * @returns true if messages contain valid output, false otherwise
 */
export function hasValidOutputFromMessages(messages: SessionMessage[]): boolean {
  // Check for at least one assistant or tool message
  const hasAssistantOrToolMessage = messages.some(
    (m) => m.info?.role === "assistant" || m.info?.role === "tool"
  )

  if (!hasAssistantOrToolMessage) {
    return false
  }

  // Check that at least one message has actual content
  return messages.some((m) => {
    if (m.info?.role !== "assistant" && m.info?.role !== "tool") return false
    const parts = m.parts ?? []
    
    return parts.some((p) => {
      // Text content (final output)
      if (p.type === "text" && p.text && p.text.trim().length > 0) return true
      
      // Reasoning content (thinking blocks)
      if (p.type === "reasoning" && p.text && p.text.trim().length > 0) return true
      
      // Tool calls (multiple detection methods for compatibility)
      // BackgroundManager uses: part.tool || part.name
      if (p.type === "tool" || p.type === "tool_use" || p.tool || p.name) return true
      
      // Tool results (output from executed tools)
      if (p.type === "tool_result" && p.content) {
        if (typeof p.content === "string") {
          return p.content.trim().length > 0
        }
        return Array.isArray(p.content) && p.content.length > 0
      }
      
      return false
    })
  })
}

/**
 * CONVENIENCE WRAPPER: Fetches messages and validates.
 * Use this when you don't already have messages fetched.
 * 
 * @param sessionID - Session to validate
 * @param client - OpenCode client for fetching messages
 * @returns true if session has valid output, false otherwise
 */
export async function validateSessionHasOutput(
  sessionID: string,
  client: OpencodeClient
): Promise<boolean> {
  try {
    const response = await client.session.messages({
      path: { id: sessionID },
    })

    const messages = (response.data ?? []) as SessionMessage[]
    return hasValidOutputFromMessages(messages)
  } catch (error) {
    // On error, return TRUE to allow completion to proceed (don't block indefinitely)
    // This matches BackgroundManager's current behavior (line 627-629)
    // Rationale: A transient API error shouldn't cause infinite waiting
    return true
  }
}
