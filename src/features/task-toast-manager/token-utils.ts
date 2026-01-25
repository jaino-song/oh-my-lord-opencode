/**
 * utility functions for fetching token usage from opencode sessions
 */

interface tokenusage {
  input: number
  output: number
}

interface sessionmessage {
  role: string
  tokens?: {
    input?: number
    output?: number
    reasoning?: number
    cache?: { read?: number; write?: number }
  }
}

/**
 * fetches total token usage from a session by summing all assistant message tokens.
 * returns null on failure (does not throw).
 */
export async function getsessiontokenusage(
  client: { session: { messages: (opts: { path: { id: string } }) => Promise<{ data?: sessionmessage[] }> } },
  sessionid: string
): Promise<tokenusage | null> {
  try {
    const result = await client.session.messages({ path: { id: sessionid } })
    const messages = result.data ?? []
    
    let totalinput = 0
    let totaloutput = 0
    
    for (const msg of messages) {
      if (msg.role === "assistant" && msg.tokens) {
        // input includes base input + cache reads
        totalinput += (msg.tokens.input ?? 0) + (msg.tokens.cache?.read ?? 0)
        totaloutput += msg.tokens.output ?? 0
      }
    }
    
    return { input: totalinput, output: totaloutput }
  } catch {
    // return null on any error - don't block task completion
    return null
  }
}
