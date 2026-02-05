import type { Message, Part } from "@opencode-ai/sdk"

/**
 * Delegation Alert Stripper Hook
 * 
 * Strips [DELEGATION ALERT - OH-MY-LORD-OPENCODE...] blocks from conversation
 * history before agents see them. This prevents notification injections
 * (task completion, todo updates, etc.) from polluting agent context.
 * 
 * NOTE: [SYSTEM DIRECTIVE...] blocks are NOT stripped - those contain
 * instructions that agents need to know (TDD warnings, competency advice, etc.)
 */

const ALERT_PATTERNS = [
  /\[DELEGATION ALERT - OH-MY-LORD-OPENCODE\][\s\S]*?(?=\n\n|\n*$)/g,
  /\[TODO ALERT - OH-MY-LORD-OPENCODE\][\s\S]*?(?=\n\n|\n*$)/g,
]

function stripAlerts(text: string): string {
  let result = text
  for (const pattern of ALERT_PATTERNS) {
    result = result.replace(pattern, "")
  }
  return result.trim()
}

interface MessageWithParts {
  info: Message
  parts: Part[]
}

type MessagesTransformHook = {
  "experimental.chat.messages.transform"?: (
    input: Record<string, never>,
    output: { messages: MessageWithParts[] }
  ) => Promise<void>
}

export function createSystemInjectionStripperHook(): MessagesTransformHook {
  return {
    "experimental.chat.messages.transform": async (_input, output) => {
      const { messages } = output

      for (const message of messages) {
        for (const part of message.parts) {
          if (part.type === "text") {
            const textPart = part as unknown as { text?: string }
            if (textPart.text) {
              const stripped = stripAlerts(textPart.text)
              if (stripped !== textPart.text) {
                textPart.text = stripped || "[system notification removed]"
              }
            }
          }
        }
      }
    },
  }
}
