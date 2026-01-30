/**
 * Agent Progress Injector Hook
 *
 * Detects and strips agent progress messages from session context
 * while tracking progress timestamps for unresponsiveness detection.
 *
 * Progress messages use patterns like:
 * - `[PROGRESS] message`
 * - `[AGENT PROGRESS] message`
 */

import type { PluginInput } from "@opencode-ai/plugin"
import {
  CONTEXT_INJECTOR_INJECTED_KEY,
  findNearestMessageWithFields,
  MESSAGE_STORAGE,
} from "../hook-message-injector"
import { log } from "../../shared"

export interface ProgressInfo {
  agent: string
  lastProgressTime: number | null
}

export interface AgentProgressInjectorConfig {
  enabled?: boolean
}

export interface AgentProgressContext {
  progressByAgent: Map<string, ProgressInfo>
}

// Progress message patterns to detect and strip
const PROGRESS_PATTERNS = [
  /\[PROGRESS\]/i,
  /\[AGENT PROGRESS\]/i,
  /\[\w+ PROGRESS\]/i,
]

function isProgressMessage(message: string): boolean {
  return PROGRESS_PATTERNS.some(pattern => pattern.test(message))
}

function extractAgentFromProgress(message: string): string | null {
  const match = message.match(/\[([\w\-]+)\s+PROGRESS\]/i)
  return match ? match[1] : null
}

export function createAgentProgressInjector(config: AgentProgressInjectorConfig = {}) {
  return {
    name: "agent-progress-injector",
    version: "1.0.0",
    description: "Strips agent progress messages from context while tracking progress timestamps for unresponsiveness detection",

    async preToolUse(ctx: PluginInput) {
      const { enabled = true } = config

      if (!enabled) {
        return
      }

      const sessionDir = ctx.directory
      const messageDir = `${MESSAGE_STORAGE}/${sessionDir}`

      const messages = await ctx.client.session.messages({
      })

      if (messages.error) {
        log("[agent-progress-injector] Failed to read messages:", messages.error)
        return
      }

      const progressContext = hadProgressMessages
        ? {
            progressByAgent: new Map(),
          }
        : null

      let hadProgressMessages = false

      for (const message of messages.data ?? []) {
        if (!message.parts || message.parts.length === 0) {
          continue
        }

        for (const part of message.parts) {
          if (part.type !== "text") {
            continue
          }

          const text = part.text ?? ""

          if (isProgressMessage(text)) {
            hadProgressMessages = true

            const agentName = extractAgentFromProgress(text)
            const timestamp = message.createdAt?.getTime() || Date.now()

            if (agentName) {
              progressContext.progressByAgent.set(agentName, {
                agent: agentName,
                lastProgressTime: timestamp,
              })
              log(`[agent-progress-injector] Detected progress from ${agentName}`)
            }
          }
        }
      }

      if (hadProgressMessages && ctx.metadata) {
        const injected = await ctx.metadata(CONTEXT_INJECTOR_INJECTED_KEY, progressContext)
        if (injected) {
          log("[agent-progress-injector] Progress context injected for session:", ctx.directory)
        }
      }
    },

    async postToolUse(ctx: PluginInput) {
      const { enabled = true } = config

      if (!enabled) {
        return
      }

      if (!ctx.metadata) {
        return
      }

      const progressContext = await ctx.metadata(CONTEXT_INJECTOR_INJECTED_KEY) as AgentProgressContext | null

      if (!progressContext) {
        return
      }

      const now = Date.now()
      const UNRESPONSIVE_THRESHOLD_MS = 30000

      let unresponsiveAgents: string[] = []

      for (const [agent, info] of progressContext.progressByAgent.entries()) {
        if (!info.lastProgressTime) {
          continue
        }

        const timeSinceProgress = now - info.lastProgressTime
        if (timeSinceProgress > UNRESPONSIVE_THRESHOLD_MS) {
          unresponsiveAgents.push(agent)
        }
      }

      if (unresponsiveAgents.length > 0) {
        const warning = `⚠️ Unresponsive agents detected: ${unresponsiveAgents.join(", ")} (no progress for 30s)\nAgents may be slow, stuck, or rate-limited.`
        await ctx.client.prompt({
          body: {
            role: "system",
            parts: [{ type: "text", text: warning }],
          },
        })
      }
    },
  }
}


export interface AgentProgressInjectorConfig {
  enabled?: boolean
}

export interface AgentProgressContext {
  progressByAgent: Map<string, ProgressInfo>
}

// Progress message patterns to detect and strip
const PROGRESS_PATTERNS = [
  /\[PROGRESS\]/i,
  /\[AGENT PROGRESS\]/i,
  /\[\w+ PROGRESS\]/i,
]

function isProgressMessage(message: string): boolean {
  return PROGRESS_PATTERNS.some(pattern => pattern.test(message))
}

function extractAgentFromProgress(message: string): string | null {
  const match = message.match(/\[([\w\-]+)\s+PROGRESS\]/i)
  return match ? match[1] : null
}

export function createAgentProgressInjector(config: AgentProgressInjectorConfig = {}) {
  return {
    name: "agent-progress-injector",
    version: "1.0.0",
    description: "Strips agent progress messages from context while tracking progress timestamps for unresponsiveness detection",

    async preToolUse(ctx: PluginInput) {
      const { enabled = true } = config

      if (!enabled) {
        return
      }

      const sessionDir = ctx.directory
      const messageDir = `${MESSAGE_STORAGE}/${sessionDir}`

      const messages = await ctx.client.session.messages({})

      if (messages.error) {
        log("[agent-progress-injector] Failed to read messages:", messages.error)
        return
      }

      const progressContext: AgentProgressContext = {
        progressByAgent: new Map(),
      }

      let hadProgressMessages = false

      for (const message of messages.data ?? []) {
        if (!message.parts || message.parts.length === 0) {
          continue
        }

        for (const part of message.parts) {
          if (part.type !== "text") {
            continue
          }

          const text = part.text ?? ""

          if (isProgressMessage(text)) {
            hadProgressMessages = true

            const agentName = extractAgentFromProgress(text)
            const timestamp = message.createdAt?.getTime() || Date.now()

            if (agentName) {
              progressContext.progressByAgent.set(agentName, {
                agent: agentName,
                lastProgressTime: timestamp,
              })
              log(`[agent-progress-injector] Detected progress from ${agentName}`)
            }
          }
        }
      }

      if (hadProgressMessages) {
        const injected = await ctx.metadata({
          key: CONTEXT_INJECTOR_INJECTED_KEY,
          value: progressContext,
        })
        if (injected) {
          log("[agent-progress-injector] Progress context injected for session:", ctx.directory)
        }
      }
    },

    async postToolUse(ctx: PluginInput) {
      const { enabled = true } = config

      if (!enabled) {
        return
      }

      const injectedValue = await ctx.metadata(CONTEXT_INJECTOR_INJECTED_KEY) as AgentProgressInjectorContext | null

      if (!injectedValue) {
        return
      }

      const now = Date.now()
      const UNRESPONSIVE_THRESHOLD_MS = 30000

      let unresponsiveAgents: string[] = []

      for (const [agent, info] of injectedValue.progressByAgent.entries()) {
        if (!info.lastProgressTime) {
          continue
        }

        const timeSinceProgress = now - info.lastProgressTime
        if (timeSinceProgress > UNRESPONSIVE_THRESHOLD_MS) {
          unresponsiveAgents.push(agent)
        }
      }

      if (unresponsiveAgents.length > 0) {
        const warning = `⚠️ Unresponsive agents: ${unresponsiveAgents.join(", ")} (no progress for 30s)\nAgents may be slow, stuck, or rate-limited.`
        await ctx.client.prompt({
          body: {
            role: "system",
            parts: [{ type: "text", text: warning }],
          },
        })
      }
    },
  }
}


export interface AgentProgressInjectorConfig {
  enabled?: boolean
}

export interface AgentProgressContext {
  progressByAgent: Map<string, ProgressInfo>
}

export interface AgentProgressInjectorHooks {
  onPreProcess?: (ctx: PluginInput, agentProgressContext: AgentProgressContext) => Promise<void>
  onPostProcess?: (ctx: PluginInput, agentProgressContext: AgentProgressContext) => Promise<void>
}

export interface AgentProgressInjectorContext {
  progressByAgent: Map<string, ProgressInfo>
}

// Storage for progress timestamps (in-memory for now)
const progressStorage = new Map<string, number>()

// Progress message patterns to detect and strip
const PROGRESS_PATTERNS = [
  /\[PROGRESS\]/i,  // [PROGRESS] prefix
  /\[AGENT PROGRESS\]/i,  // [AGENT PROGRESS] prefix
  /\[\w+ PROGRESS\]/i,  // [PAUL-JUNIOR PROGRESS], etc.
]

/**
 * Detects if a message is a progress update
 */
function isProgressMessage(message: string): boolean {
  return PROGRESS_PATTERNS.some(pattern => pattern.test(message))
}

/**
 * Extracts agent name from progress message
 * Supports: "[PROGRESS]", "[AGENT PROGRESS]", "[PAUL-JUNIOR PROGRESS]"
 */
function extractAgentFromProgress(message: string): string | null {
  const match = message.match(/\[([\w\-]+)\s+PROGRESS\]/i)
  return match ? match[1] : null
}

export function createAgentProgressInjector(config: AgentProgressInjectorConfig = {}) {
  return {
    name: "agent-progress-injector",
    version: "1.0.0",
    description: "Strips agent progress messages from context while tracking timestamps for unresponsiveness detection",

    async preToolUse(ctx: PluginInput) {
      const { enabled = true } = config

      if (!enabled) {
        return
      }

      const sessionDir = ctx.directory
      const messageDir = `${MESSAGE_STORAGE}/${sessionDir}`

      // Find all messages in session directory
      const messages = await ctx.client.session.messages({})

      if (messages.error) {
        log("[agent-progress-injector] Failed to read messages:", messages.error)
        return
      }

      const progressContext: AgentProgressContext = {
        progressByAgent: new Map(),
      }

      let hadProgressMessages = false

      // Scan all messages for progress markers
      for (const message of messages.data ?? []) {
        if (!message.parts || message.parts.length === 0) {
          continue
        }

        for (const part of message.parts) {
          if (part.type !== "text") {
            continue
          }

          const text = part.text ?? ""

          if (isProgressMessage(text)) {
            hadProgressMessages = true

            const agentName = extractAgentFromProgress(text)
            const timestamp = message.createdAt.getTime()

            if (agentName) {
              progressContext.progressByAgent.set(agentName, {
                agent: agentName,
                lastProgressTime: timestamp,
              })
              log(`[agent-progress-injector] Detected progress from ${agentName} at ${new Date(timestamp).toISOString()}`)
            }
          }
        }
      }

      if (hadProgressMessages && ctx.metadata) {
        await ctx.metadata({
          key: CONTEXT_INJECTOR_INJECTED_KEY,
          value: progressContext,
        })
      }
    },

    async postToolUse(ctx: PluginInput) {
      const { enabled = true } = config

      if (!enabled) {
        return
      }

      // Restore progress context and check for unresponsive agents
      if (!ctx.metadata) {
        return
      }

      const injectedValue = ctx.metadata[CONTEXT_INJECTOR_INJECTED_KEY] as AgentProgressInjectorContext | null

      if (!injectedValue) {
        return
      }

      const now = Date.now()
      const UNRESPONSIVE_THRESHOLD_MS = 30000 // 30 seconds

      let unresponsiveAgents: string[] = []

      for (const [agent, info] of injectedValue.progressByAgent.entries()) {
        if (!info.lastProgressTime) {
          continue
        }

        const timeSinceProgress = now - info.lastProgressTime
        if (timeSinceProgress > UNRESPONSIVE_THRESHOLD_MS) {
          unresponsiveAgents.push(agent)
          log(`[agent-progress-injector] Agent ${agent} unresponsive: last progress was ${new Date(info.lastProgressTime).toISOString()} (${Math.floor(timeSinceProgress / 1000)}s ago)`)
        }
      }

      if (unresponsiveAgents.length > 0 && ctx.metadata) {
        const warning = `⚠️ Unresponsive agents detected: ${unresponsiveAgents.join(", ")} (no progress for 30s)\nAgents may be slow, stuck, or rate-limited.`
        await ctx.client.prompt({
          body: {
            role: "system",
            parts: [{ type: "text", text: warning }],
          },
        })
      }
    },
  }
}
