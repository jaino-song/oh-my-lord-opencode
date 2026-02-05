import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { findNearestMessageWithFields, MESSAGE_STORAGE, type StoredMessage } from "../../features/hook-message-injector"

export type ToastVariant = "info" | "success" | "warning" | "error"

export interface ToastClient {
  tui?: {
    showToast?: (opts: { body: { title: string; message: string; variant: ToastVariant; duration?: number } }) => Promise<void>
  }
  session?: {
    prompt?: (opts: { path: { id: string }; body: { noReply?: boolean; parts: Array<{ type: string; text: string }> } }) => Promise<unknown>
  }
}

export async function showToast(
  client: ToastClient,
  title: string,
  message: string,
  variant: ToastVariant = "info",
  duration = 5000
): Promise<void> {
  if (!client.tui?.showToast) return
  await client.tui.showToast({ body: { title, message, variant, duration } }).catch(() => {})
}

export type NotificationStatus = "delegated" | "completed" | "delegation_complete" | "failed"

export interface NotificationOptions {
  fromAgent?: string
  toAgent?: string
  task?: string
  duration?: string
  reason?: string
}

export async function injectNotification(
  client: ToastClient,
  sessionID: string,
  status: NotificationStatus,
  options: NotificationOptions = {},
  currentAgent?: string,
  currentModel?: StoredMessage["model"]
): Promise<void> {
  if (!client.session?.prompt) return
  
  const statusIcon = status === "delegated" ? "🚀" : (status === "completed" || status === "delegation_complete") ? "✅" : "❌"
  const statusText = status === "delegated" 
    ? "DELEGATED" 
    : status === "delegation_complete"
      ? "DELEGATED"
      : status === "completed" 
        ? "TODO DONE" 
        : "TODO FAILED"
  
  const lines: string[] = []
  
  if (options.fromAgent && options.toAgent) {
    const capitalize = (s: string) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('-')
    lines.push(`⚡ ${capitalize(options.fromAgent)} → ${capitalize(options.toAgent)}`)
  }
  if (options.task) {
    lines.push(`TODO: ${options.task}`)
  }
  if (options.duration) {
    lines.push(`DURATION: ${options.duration}`)
  }
  lines.push(`${statusIcon} ${statusText}`)
  if (status === "failed" && options.reason) {
    lines.push(`ERROR: ${options.reason}`)
  }
  
  const notification = `[DELEGATION ALERT - OH-MY-LORD-OPENCODE]
${lines.join("\n")}`
  
  await client.session.prompt({
    path: { id: sessionID },
    body: { 
      noReply: true, 
      parts: [{ type: "text", text: notification }],
      ...(currentAgent ? { agent: currentAgent } : {}),
      ...(currentModel ? { model: currentModel } : {})
    },
  }).catch(() => {})
}

export function getMessageDir(sessionID: string): string | null {
  if (!existsSync(MESSAGE_STORAGE)) return null
  const directPath = join(MESSAGE_STORAGE, sessionID)
  if (existsSync(directPath)) return directPath
  for (const dir of readdirSync(MESSAGE_STORAGE)) {
    const sessionPath = join(MESSAGE_STORAGE, dir, sessionID)
    if (existsSync(sessionPath)) return sessionPath
  }
  return null
}

export function getCurrentModel(sessionID: string): StoredMessage["model"] | undefined {
  const messageDir = getMessageDir(sessionID)
  if (!messageDir) return undefined
  const nearestMsg = findNearestMessageWithFields(messageDir)
  return nearestMsg?.model
}
