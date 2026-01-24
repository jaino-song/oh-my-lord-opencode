import type { PluginInput } from "@opencode-ai/plugin"
import { log } from "../../shared"
import { getSessionAgent } from "../../features/claude-code-session-state"
import type { ContextCollector } from "../../features/context-injector"
import {
  SPECIFIC_FILE_PATTERNS,
  TRIVIAL_TASK_PATTERNS,
  EXPLORATION_KEYWORDS,
  MAX_EXPLORE_AGENTS,
} from "./constants"

function isWorkerPaul(agentName?: string): boolean {
  if (!agentName) return false
  return agentName.toLowerCase().includes("worker-paul")
}

function hasSpecificFile(text: string): boolean {
  return SPECIFIC_FILE_PATTERNS.some((pattern) => pattern.test(text))
}

function isTrulyTrivial(text: string): boolean {
  return TRIVIAL_TASK_PATTERNS.some((pattern) => pattern.test(text))
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>()

  for (const pattern of EXPLORATION_KEYWORDS) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches) {
        keywords.add(match.toLowerCase())
      }
    }
  }

  return Array.from(keywords).slice(0, MAX_EXPLORE_AGENTS)
}

function extractPromptText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text || "")
    .join(" ")
}

function buildExplorationDirective(keywords: string[]): string {
  const explorationCalls = keywords
    .map(
      (kw) =>
        `delegate_task(agent="explore", prompt="Find all files and patterns related to: ${kw}", run_in_background=true)`
    )
    .join("\n")

  return `[WORKER-PAUL ULTRAWORK MODE]

Your task mentions concepts that may require codebase exploration.
Before implementing, spawn explore agents to gather context:

\`\`\`
${explorationCalls}
\`\`\`

This runs in parallel while you analyze the task. Results will stream in.
Proceed with your work - check background task results as they complete.`
}

export function createWorkerPaulUltraworkHook(ctx: PluginInput, collector?: ContextCollector) {
  const processedSessions = new Set<string>()

  return {
    "chat.message": async (
      input: {
        sessionID: string
        agent?: string
      },
      output: {
        message: Record<string, unknown>
        parts: Array<{ type: string; text?: string; [key: string]: unknown }>
      }
    ): Promise<void> => {
      if (processedSessions.has(input.sessionID)) {
        return
      }

      const currentAgent = getSessionAgent(input.sessionID) ?? input.agent
      if (!isWorkerPaul(currentAgent)) {
        return
      }

      const promptText = extractPromptText(output.parts)

      if (hasSpecificFile(promptText)) {
        log(`[worker-paul-ultrawork] Specific file mentioned, skipping exploration`, {
          sessionID: input.sessionID,
        })
        return
      }

      if (isTrulyTrivial(promptText)) {
        log(`[worker-paul-ultrawork] Truly trivial task, skipping exploration`, {
          sessionID: input.sessionID,
        })
        return
      }

      const keywords = extractKeywords(promptText)
      if (keywords.length === 0) {
        log(`[worker-paul-ultrawork] No exploration keywords found`, {
          sessionID: input.sessionID,
        })
        return
      }

      processedSessions.add(input.sessionID)

      log(`[worker-paul-ultrawork] Injecting exploration directive for ${keywords.length} keywords`, {
        sessionID: input.sessionID,
        keywords,
      })

      ctx.client.tui
        .showToast({
          body: {
            title: "Ultrawork Exploration",
            message: `Suggesting ${keywords.length} explore agents for: ${keywords.join(", ")}`,
            variant: "info" as const,
            duration: 3000,
          },
        })
        .catch(() => {})

      if (collector) {
        collector.register(input.sessionID, {
          id: "worker-paul-ultrawork",
          source: "worker-paul-ultrawork",
          content: buildExplorationDirective(keywords),
          priority: "high",
        })
      }
    },
  }
}
