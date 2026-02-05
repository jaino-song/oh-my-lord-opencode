import type { PluginInput } from "@opencode-ai/plugin"
import { statSync } from "node:fs"
import { getSessionAgent } from "../../features/claude-code-session-state"

const PLAN_PATH_PATTERN = /[\\/](\.paul|\.sisyphus)[\\/]plans[\\/].+\.md$/
const SUMMARY_CACHE = new Map<string, { mtimeMs: number; summary: string }>()

function isPlanPath(filePath: string): boolean {
  return PLAN_PATH_PATTERN.test(filePath)
}

function summarizePlanContent(content: string, filePath: string): string {
  const lines = content.split("\n")
  const titleLine = lines.find((line) => line.startsWith("# "))
  const title = titleLine ? titleLine.replace(/^#\s*/, "") : filePath
  const todos = lines.filter((line) => /^[-*]\s*\[[ xX]\]/.test(line))
  const completed = todos.filter((line) => /\[[xX]\]/.test(line)).length
  const total = todos.length
  return `# ${title}\n\n## TODO Summary (${completed}/${total})\n${todos.join("\n") || "- [ ] (no todos found)"}\n\n[Plan summary - full content follows]\n\n${content}`
}

function getSummaryFromCache(filePath: string, content: string): string {
  try {
    const stats = statSync(filePath)
    const cached = SUMMARY_CACHE.get(filePath)
    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.summary
    }
    const summary = summarizePlanContent(content, filePath)
    SUMMARY_CACHE.set(filePath, { mtimeMs: stats.mtimeMs, summary })
    return summary
  } catch {
    return summarizePlanContent(content, filePath)
  }
}

export function createPlanSummaryInjectorHook(ctx: PluginInput) {
  return {
    "tool.execute.after": async (
      input: { tool: string; sessionID: string },
      output: { title: string; output: string }
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== "read") return
      const filePath = output.title
      if (!filePath || !isPlanPath(filePath)) return
      const agent = getSessionAgent(input.sessionID)
      if (agent !== "Paul") return
      if (typeof output.output !== "string") return
      output.output = getSummaryFromCache(filePath, output.output)
    },
  }
}
