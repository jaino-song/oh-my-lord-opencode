import type { PluginInput } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import type { ExperimentalConfig } from "../../config"
import {
  findEmptyMessages,
  findEmptyMessageByIndex,
  findMessageByIndexNeedingThinking,
  findMessagesWithEmptyTextParts,
  findMessagesWithOrphanThinking,
  findMessagesWithThinkingBlocks,
  findMessagesWithThinkingOnly,
  injectTextPart,
  prependThinkingPart,
  readParts,
  removeToolUseParts,
  replaceEmptyTextParts,
  stripThinkingParts,
} from "./storage"
import type { MessageData, ResumeConfig } from "./types"

export interface SessionRecoveryOptions {
  experimental?: ExperimentalConfig
}

type Client = ReturnType<typeof createOpencodeClient>

type RecoveryErrorType =
  | "tool_result_missing"
  | "thinking_block_order"
  | "thinking_disabled_violation"
  | null

interface MessageInfo {
  id?: string
  role?: string
  sessionID?: string
  parentID?: string
  error?: unknown
}

interface ToolUsePart {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, unknown>
}

interface MessagePart {
  type: string
  id?: string
  text?: string
  thinking?: string
  name?: string
  input?: Record<string, unknown>
}

const RECOVERY_RESUME_TEXT = "[session recovered - continuing previous task]"

function findLastUserMessage(messages: MessageData[]): MessageData | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].info?.role === "user") {
      return messages[i]
    }
  }
  return undefined
}

function extractResumeConfig(userMessage: MessageData | undefined, sessionID: string): ResumeConfig {
  return {
    sessionID,
    agent: userMessage?.info?.agent,
    model: userMessage?.info?.model,
  }
}

async function resumeSession(client: Client, config: ResumeConfig): Promise<boolean> {
  try {
    await client.session.prompt({
      path: { id: config.sessionID },
      body: {
        parts: [{ type: "text", text: RECOVERY_RESUME_TEXT }],
        agent: config.agent,
        model: config.model,
      },
    })
    return true
  } catch {
    return false
  }
}

function getErrorMessage(error: unknown): string {
  if (!error) return ""
  if (typeof error === "string") return error.toLowerCase()

  const errorObj = error as Record<string, unknown>
  const paths = [
    errorObj.data,
    errorObj.error,
    errorObj,
    (errorObj.data as Record<string, unknown>)?.error,
  ]

  for (const obj of paths) {
    if (obj && typeof obj === "object") {
      const msg = (obj as Record<string, unknown>).message
      if (typeof msg === "string" && msg.length > 0) {
        return msg.toLowerCase()
      }
    }
  }

  try {
    return JSON.stringify(error).toLowerCase()
  } catch {
    return ""
  }
}

function extractMessageIndex(error: unknown): number | null {
  const message = getErrorMessage(error)
  const match = message.match(/messages\.(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function isToolResultMissingErrorMessage(message: string): boolean {
  if (!message) return false

  return (
    message.includes("tool_use block requires corresponding tool_result") ||
    message.includes("without `tool_result` blocks immediately after") ||
    message.includes("without tool_result blocks immediately after") ||
    message.includes("each `tool_use` block must have a corresponding `tool_result` block") ||
    message.includes("tool_use without corresponding tool_result")
  )
}

export function detectErrorType(error: unknown): RecoveryErrorType {
  const message = getErrorMessage(error)

  if (isToolResultMissingErrorMessage(message)) {
    return "tool_result_missing"
  }

  if (
    message.includes("thinking") &&
    (message.includes("first block") ||
      message.includes("must start with") ||
      message.includes("preceeding") ||
      message.includes("final block") ||
      message.includes("cannot be thinking") ||
      (message.includes("expected") && message.includes("found")))
  ) {
    return "thinking_block_order"
  }

  if (message.includes("thinking is disabled") && message.includes("cannot contain")) {
    return "thinking_disabled_violation"
  }

  return null
}

function extractOrphanedCallIds(error: unknown): string[] {
  const message = getErrorMessage(error)

  const ids = new Set<string>()

  for (const match of message.matchAll(/toolu_[a-z0-9]+/g)) {
    const id = match[0]?.trim()
    if (id) ids.add(id)
  }

  const segmentMatch = message.match(/tool_result.*?:\s*([^.\n]+)/)
  if (segmentMatch?.[1]) {
    const tokens = segmentMatch[1]
      .split(",")
      .map((token) => token.trim().replace(/[`"'.]/g, ""))
      .filter(Boolean)

    for (const token of tokens) {
      if (token.includes(" ")) continue
      ids.add(token)
    }
  }

  return Array.from(ids)
}

function hasToolParts(parts: MessagePart[]): boolean {
  return parts.some((p) => p.type === "tool_use" || p.type === "tool")
}

function hasToolPartsInMessage(msg: MessageData): boolean {
  return (msg.parts ?? []).some((p) => p.type === "tool_use" || p.type === "tool")
}

function messageContainsOrphanedCallId(msg: MessageData, orphanedCallIds: string[]): boolean {
  if (orphanedCallIds.length === 0) return false

  for (const part of msg.parts ?? []) {
    const candidateId = (part.callID ?? part.id ?? "").trim()
    if (!candidateId) continue
    if (orphanedCallIds.includes(candidateId)) {
      return true
    }
  }

  return false
}

async function recoverToolResultMissing(
  _client: Client,
  _sessionID: string,
  _failedAssistantMsg: MessageData,
  allMessages?: MessageData[],
  error?: unknown
): Promise<boolean> {
  const orphanedCallIds = error ? extractOrphanedCallIds(error) : []
  const targetIndex = error ? extractMessageIndex(error) : null
  const messages = allMessages ?? []

  let anyRecovered = false

  if (targetIndex !== null) {
    const indicesToTry = [targetIndex, targetIndex - 1, targetIndex + 1]
    for (const idx of indicesToTry) {
      if (idx < 0 || idx >= messages.length) continue
      const msg = messages[idx]
      if (msg.info?.role !== "assistant") continue
      const messageID = msg.info?.id
      if (!messageID) continue
      if (removeToolUseParts(messageID)) {
        anyRecovered = true
        break
      }
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.info?.role !== "assistant") continue

    const messageID = msg.info?.id
    if (!messageID) continue

    const storedParts = readParts(messageID)
    const hasStoredToolParts = storedParts.length > 0 && hasToolParts(storedParts)
    const hasMessageToolParts = hasToolPartsInMessage(msg)
    if (!hasStoredToolParts && !hasMessageToolParts) continue

    if (orphanedCallIds.length > 0) {
      const hasOrphan = storedParts.some((p) => {
        const raw = p as Record<string, unknown>
        const callID = typeof raw.callID === "string" ? raw.callID : ""
        const id = typeof raw.id === "string" ? raw.id : ""
        return orphanedCallIds.includes(callID) || orphanedCallIds.includes(id)
      }) || messageContainsOrphanedCallId(msg, orphanedCallIds)

      if (!hasOrphan) {
        continue
      }
    }

    if (removeToolUseParts(messageID)) anyRecovered = true
    break
  }

  return anyRecovered
}

async function recoverThinkingBlockOrder(
  _client: Client,
  sessionID: string,
  _failedAssistantMsg: MessageData,
  _directory: string,
  error: unknown
): Promise<boolean> {
  const targetIndex = extractMessageIndex(error)
  if (targetIndex !== null) {
    const targetMessageID = findMessageByIndexNeedingThinking(sessionID, targetIndex)
    if (targetMessageID) {
      return prependThinkingPart(sessionID, targetMessageID)
    }
  }

  const orphanMessages = findMessagesWithOrphanThinking(sessionID)

  if (orphanMessages.length === 0) {
    return false
  }

  let anySuccess = false
  for (const messageID of orphanMessages) {
    if (prependThinkingPart(sessionID, messageID)) {
      anySuccess = true
    }
  }

  return anySuccess
}

async function recoverThinkingDisabledViolation(
  _client: Client,
  sessionID: string,
  _failedAssistantMsg: MessageData
): Promise<boolean> {
  const messagesWithThinking = findMessagesWithThinkingBlocks(sessionID)

  if (messagesWithThinking.length === 0) {
    return false
  }

  let anySuccess = false
  for (const messageID of messagesWithThinking) {
    if (stripThinkingParts(messageID)) {
      anySuccess = true
    }
  }

  return anySuccess
}

const PLACEHOLDER_TEXT = "[user interrupted]"

async function recoverEmptyContentMessage(
  _client: Client,
  sessionID: string,
  failedAssistantMsg: MessageData,
  _directory: string,
  error: unknown
): Promise<boolean> {
  const targetIndex = extractMessageIndex(error)
  const failedID = failedAssistantMsg.info?.id
  let anySuccess = false

  const messagesWithEmptyText = findMessagesWithEmptyTextParts(sessionID)
  for (const messageID of messagesWithEmptyText) {
    if (replaceEmptyTextParts(messageID, PLACEHOLDER_TEXT)) {
      anySuccess = true
    }
  }

  const thinkingOnlyIDs = findMessagesWithThinkingOnly(sessionID)
  for (const messageID of thinkingOnlyIDs) {
    if (injectTextPart(sessionID, messageID, PLACEHOLDER_TEXT)) {
      anySuccess = true
    }
  }

  if (targetIndex !== null) {
    const targetMessageID = findEmptyMessageByIndex(sessionID, targetIndex)
    if (targetMessageID) {
      if (replaceEmptyTextParts(targetMessageID, PLACEHOLDER_TEXT)) {
        return true
      }
      if (injectTextPart(sessionID, targetMessageID, PLACEHOLDER_TEXT)) {
        return true
      }
    }
  }

  if (failedID) {
    if (replaceEmptyTextParts(failedID, PLACEHOLDER_TEXT)) {
      return true
    }
    if (injectTextPart(sessionID, failedID, PLACEHOLDER_TEXT)) {
      return true
    }
  }

  const emptyMessageIDs = findEmptyMessages(sessionID)
  for (const messageID of emptyMessageIDs) {
    if (replaceEmptyTextParts(messageID, PLACEHOLDER_TEXT)) {
      anySuccess = true
    }
    if (injectTextPart(sessionID, messageID, PLACEHOLDER_TEXT)) {
      anySuccess = true
    }
  }

  return anySuccess
}

// NOTE: fallbackRevertStrategy was removed (2025-12-08)
// Reason: Function was defined but never called - no error recovery paths used it.
// All error types have dedicated recovery functions (recoverToolResultMissing,
// recoverThinkingBlockOrder, recoverThinkingDisabledViolation, recoverEmptyContentMessage).

export interface SessionRecoveryHook {
  handleSessionRecovery: (info: MessageInfo) => Promise<boolean>
  isRecoverableError: (error: unknown) => boolean
  setOnAbortCallback: (callback: (sessionID: string) => void) => void
  setOnRecoveryCompleteCallback: (callback: (sessionID: string) => void) => void
}

export function createSessionRecoveryHook(ctx: PluginInput, options?: SessionRecoveryOptions): SessionRecoveryHook {
  const processingErrors = new Set<string>()
  const experimental = options?.experimental
  let onAbortCallback: ((sessionID: string) => void) | null = null
  let onRecoveryCompleteCallback: ((sessionID: string) => void) | null = null

  const setOnAbortCallback = (callback: (sessionID: string) => void): void => {
    onAbortCallback = callback
  }

  const setOnRecoveryCompleteCallback = (callback: (sessionID: string) => void): void => {
    onRecoveryCompleteCallback = callback
  }

  const isRecoverableError = (error: unknown): boolean => {
    return detectErrorType(error) !== null
  }

  const handleSessionRecovery = async (info: MessageInfo): Promise<boolean> => {
    if (!info || info.role !== "assistant" || !info.error) return false

    const errorType = detectErrorType(info.error)
    if (!errorType) return false

    const sessionID = info.sessionID
    const assistantMsgID = info.id

    if (!sessionID) return false
    
    const dedupeKey = assistantMsgID ?? `session-${sessionID}`
    if (processingErrors.has(dedupeKey)) return false
    processingErrors.add(dedupeKey)

    try {
      if (onAbortCallback) {
        onAbortCallback(sessionID)  // Mark recovering BEFORE abort
      }

      await ctx.client.session.abort({ path: { id: sessionID } }).catch(() => {})

      const messagesResp = await ctx.client.session.messages({
        path: { id: sessionID },
        query: { directory: ctx.directory },
      })
      const msgs = (messagesResp as { data?: MessageData[] }).data

      // Find the failed message by ID, or fall back to last assistant message
      let failedMsg = assistantMsgID
        ? msgs?.find((m) => m.info?.id === assistantMsgID)
        : undefined
      
      if (!failedMsg) {
        // session.error often doesn't include messageID — find last assistant message
        for (let i = (msgs?.length ?? 0) - 1; i >= 0; i--) {
          if (msgs![i].info?.role === "assistant") {
            failedMsg = msgs![i]
            break
          }
        }
      }

      if (!failedMsg) {
        return false
      }

      const toastTitles: Record<RecoveryErrorType & string, string> = {
        tool_result_missing: "Tool Crash Recovery",
        thinking_block_order: "Thinking Block Recovery",
        thinking_disabled_violation: "Thinking Strip Recovery",
      }
      const toastMessages: Record<RecoveryErrorType & string, string> = {
        tool_result_missing: "Removing unpaired tool blocks...",
        thinking_block_order: "Fixing message structure...",
        thinking_disabled_violation: "Stripping thinking blocks...",
      }

      await ctx.client.tui
        .showToast({
          body: {
            title: toastTitles[errorType],
            message: toastMessages[errorType],
            variant: "warning",
            duration: 3000,
          },
        })
        .catch(() => {})

      let success = false

      if (errorType === "tool_result_missing") {
        success = await recoverToolResultMissing(ctx.client, sessionID, failedMsg, msgs, info.error)
        if (success && experimental?.auto_resume) {
          const lastUser = findLastUserMessage(msgs ?? [])
          const resumeConfig = extractResumeConfig(lastUser, sessionID)
          await resumeSession(ctx.client, resumeConfig)
        }
      } else if (errorType === "thinking_block_order") {
        success = await recoverThinkingBlockOrder(ctx.client, sessionID, failedMsg, ctx.directory, info.error)
        if (success && experimental?.auto_resume) {
          const lastUser = findLastUserMessage(msgs ?? [])
          const resumeConfig = extractResumeConfig(lastUser, sessionID)
          await resumeSession(ctx.client, resumeConfig)
        }
      } else if (errorType === "thinking_disabled_violation") {
        success = await recoverThinkingDisabledViolation(ctx.client, sessionID, failedMsg)
        if (success && experimental?.auto_resume) {
          const lastUser = findLastUserMessage(msgs ?? [])
          const resumeConfig = extractResumeConfig(lastUser, sessionID)
          await resumeSession(ctx.client, resumeConfig)
        }
      }

      return success
  } catch (err) {
    console.error("[session-recovery] Recovery failed:", err)
    return false
  } finally {
    processingErrors.delete(dedupeKey)

    // Always notify recovery complete, regardless of success or failure
    if (sessionID && onRecoveryCompleteCallback) {
      onRecoveryCompleteCallback(sessionID)
    }
  }
  }

  return {
    handleSessionRecovery,
    isRecoverableError,
    setOnAbortCallback,
    setOnRecoveryCompleteCallback,
  }
}
