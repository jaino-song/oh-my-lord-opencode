import type { PluginInput } from "@opencode-ai/plugin"
import { SIGNAL_DONE_TOOL_NAME } from "../signal-done"
import { hasValidOutputFromMessages } from "../../shared"

type OpencodeClient = PluginInput["client"]

export interface DelegationMessagePart {
  type?: string
  name?: string
  tool?: string
  text?: string
  input?: { result?: string }
  state?: { input?: { result?: string } }
}

export interface DelegationSessionMessage {
  info?: { role?: string; time?: { created?: number } }
  parts?: DelegationMessagePart[]
}

export interface ErrorLoopResult {
  detected: boolean
  reason?: string
  recentOutputs?: string[]
}

export interface PollSessionOptions {
  client: OpencodeClient
  sessionID: string
  abort?: AbortSignal
  pollIntervalMs?: number
  noProgressTimeoutMs?: number
  checkpointTimeMs?: number
  errorLoopCheckIntervalMs?: number
  maxPollTimeMs?: number
}

export interface PollSessionResult {
  status: "signal_done" | "checkpoint_idle" | "error_loop" | "no_progress_timeout" | "aborted" | "max_wait" | "unknown"
  signalDoneResult?: string
  errorLoop?: ErrorLoopResult
  messages: DelegationSessionMessage[]
  sessionStatus?: string
}

export function findSignalDoneResult(messages: DelegationSessionMessage[]): string | null {
  for (const msg of messages) {
    if (msg.info?.role !== "assistant") continue
    for (const part of msg.parts ?? []) {
      const isToolPart = part.type === "tool_use" || part.type === "tool"
      const isSignalDone = part.name === SIGNAL_DONE_TOOL_NAME || part.tool === SIGNAL_DONE_TOOL_NAME
      if (isToolPart && isSignalDone) {
        const result = part.input?.result ?? part.state?.input?.result
        if (typeof result === "string") {
          return result
        }
      }
    }
  }
  return null
}

export function detectErrorLoop(messages: DelegationSessionMessage[]): ErrorLoopResult {
  const recentTexts: string[] = []

  const recentMsgs = messages.slice(-10)
  for (const msg of recentMsgs) {
    if (msg.info?.role !== "assistant") continue
    for (const part of msg.parts ?? []) {
      if (part.type === "text" && part.text) {
        recentTexts.push(part.text.trim().slice(0, 200))
      }
    }
  }

  if (recentTexts.length < 3) {
    return { detected: false }
  }

  const lastThree = recentTexts.slice(-3)
  const allSame = lastThree.every((t) => t === lastThree[0])
  if (allSame && lastThree[0].length > 10) {
    return {
      detected: true,
      reason: "Same output repeated 3+ times",
      recentOutputs: lastThree,
    }
  }

  const errorPatterns = /\b(error|failed|cannot|unable|exception|refused|denied|invalid|unauthorized)\b/i
  const errorCount = recentTexts.filter((t) => errorPatterns.test(t)).length
  if (errorCount >= 3 && errorCount === recentTexts.length) {
    return {
      detected: true,
      reason: "All recent outputs contain error messages",
      recentOutputs: recentTexts.slice(-3),
    }
  }

  return { detected: false }
}

export async function pollSessionReliability(options: PollSessionOptions): Promise<PollSessionResult> {
  const {
    client,
    sessionID,
    abort,
    pollIntervalMs = 500,
    noProgressTimeoutMs = 10 * 60 * 1000,
    checkpointTimeMs = 5 * 60 * 1000,
    errorLoopCheckIntervalMs = 2 * 60 * 1000,
    maxPollTimeMs,
  } = options

  const pollStart = Date.now()
  let lastMsgCount = 0
  let lastMsgChangeTime = Date.now()
  let checkpointChecked = false
  let lastErrorLoopCheck = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (abort?.aborted) {
      const messagesOnAbort = await client.session.messages({ path: { id: sessionID } })
      const msgsOnAbort = ((messagesOnAbort as { data?: unknown }).data ?? messagesOnAbort) as DelegationSessionMessage[]
      const signalDoneOnAbort = findSignalDoneResult(msgsOnAbort)
      if (signalDoneOnAbort !== null) {
        return {
          status: "signal_done",
          signalDoneResult: signalDoneOnAbort,
          messages: msgsOnAbort,
        }
      }
      return {
        status: "aborted",
        messages: msgsOnAbort,
      }
    }

    if (maxPollTimeMs && Date.now() - pollStart >= maxPollTimeMs) {
      const currentMessages = await client.session.messages({ path: { id: sessionID } })
      const msgs = ((currentMessages as { data?: unknown }).data ?? currentMessages) as DelegationSessionMessage[]
      return { status: "max_wait", messages: msgs }
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))

    const statusResult = await client.session.status()
    const allStatuses = (statusResult.data ?? {}) as Record<string, { type: string }>
    const sessionStatus = allStatuses[sessionID]?.type

    const messagesCheck = await client.session.messages({ path: { id: sessionID } })
    const msgs = ((messagesCheck as { data?: unknown }).data ?? messagesCheck) as DelegationSessionMessage[]
    const currentMsgCount = msgs.length

    const signalDoneResult = findSignalDoneResult(msgs)
    if (signalDoneResult !== null) {
      return {
        status: "signal_done",
        signalDoneResult,
        messages: msgs,
        sessionStatus,
      }
    }

    const hasValidOutput = hasValidOutputFromMessages(msgs as any)
    if (currentMsgCount !== lastMsgCount) {
      lastMsgChangeTime = Date.now()
    } else {
      const timeSinceLastProgress = Date.now() - lastMsgChangeTime
      if (!hasValidOutput && timeSinceLastProgress >= noProgressTimeoutMs) {
        return {
          status: "no_progress_timeout",
          messages: msgs,
          sessionStatus,
        }
      }
    }

    const elapsed = Date.now() - pollStart
    if (!checkpointChecked && elapsed >= checkpointTimeMs) {
      checkpointChecked = true
      if (sessionStatus === "idle" || !sessionStatus) {
        return {
          status: "checkpoint_idle",
          messages: msgs,
          sessionStatus,
        }
      }
    }

    if (sessionStatus !== "idle" && elapsed - lastErrorLoopCheck >= errorLoopCheckIntervalMs) {
      lastErrorLoopCheck = elapsed
      const errorLoop = detectErrorLoop(msgs)
      if (errorLoop.detected) {
        return {
          status: "error_loop",
          errorLoop,
          messages: msgs,
          sessionStatus,
        }
      }
    }

    lastMsgCount = currentMsgCount
  }
}

export function extractLatestAssistantText(messages: DelegationSessionMessage[]): string {
  const assistantMessages = messages
    .filter((m) => m.info?.role === "assistant")
    .sort((a, b) => (b.info?.time?.created ?? 0) - (a.info?.time?.created ?? 0))

  const lastMessage = assistantMessages[0]
  if (!lastMessage) return ""

  const textParts = lastMessage.parts?.filter((p) => p.type === "text" || p.type === "reasoning") ?? []
  return textParts.map((p) => p.text ?? "").filter(Boolean).join("\n")
}
