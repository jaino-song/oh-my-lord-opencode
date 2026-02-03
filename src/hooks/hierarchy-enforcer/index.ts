import type { PluginInput } from "@opencode-ai/plugin"
import { getParentAgentName } from "../../features/agent-context"
import { existsSync, writeFileSync } from "node:fs"
import { HOOK_NAME, AGENT_RELATIONSHIPS, BYPASS_AGENTS, SYNC_DELEGATION_REQUIRED } from "./constants"
import { getApprovalPath } from "./approval-state"
import { log } from "../../shared/logger"
import { showToast, type ToastClient } from "../shared/notification"

function normalizeAgentName(agentArg: string | undefined): string | null {
  if (!agentArg) return null
  return agentArg.toLowerCase().trim()
}

const SYSTEM_INJECTION_PATTERNS = [
  /^\[SYSTEM WARNING: TDD VIOLATION DETECTED\][\s\S]*?\n\n/,
  /^\[TDD:[^\]]*\]\n\n/,
  /^\[ADVISORY:[^\]]*\]\n\n/,
  /\[SYSTEM DIRECTIVE: OH-MY-LORD-OPENCODE[^\]]*\][\s\S]*?\[\/SYSTEM DIRECTIVE\]\n?/g,
  /\[SYSTEM DIRECTIVE - READ-ONLY PLANNING CONSULTATION\][\s\S]*?---\n/g,
  /---\n\n\*\*MANDATORY:[\s\S]*$/,
]

export function stripAllSystemInjections(text: string): string {
  let result = text
  for (const pattern of SYSTEM_INJECTION_PATTERNS) {
    result = result.replace(pattern, "")
  }
  return result.trim()
}

const COMPETENCY_RULES = [
  {
    category: "Visual/UI",
    keywords: ["css", "style", "styles", "color", "colors", "background", "border", "margin", "padding", "flex", "grid", "animation", "transition", "responsive", "mobile", "tailwind", "layout", "spacing", "font", "hover", "shadow"],
    requiredAgent: "frontend-ui-ux-engineer",
  },
  {
    category: "Git Operations",
    keywords: ["commit", "rebase", "squash", "branch", "merge", "checkout", "push", "pull", "cherry-pick"],
    requiredAgent: "git-master",
  },
  {
    category: "External Research",
    keywords: ["docs", "documentation", "library", "framework", "api reference", "official docs"],
    requiredAgent: "librarian",
  }
]

function hasKeywordMatch(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
    return pattern.test(text)
  })
}

export function createHierarchyEnforcerHook(ctx: PluginInput) {
  if (!existsSync(getApprovalPath(ctx.directory))) {
    try {
      writeFileSync(getApprovalPath(ctx.directory), JSON.stringify({ approvals: [] }))
    } catch {}
  }

  const client = ctx.client as unknown as ToastClient

  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      const tool = input.tool.toLowerCase()
      
      if (tool !== "delegate_task" && tool !== "task" && tool !== "call_paul_agent") return

      const currentAgent = getParentAgentName(input.sessionID, "User")
      let targetAgent = (output.args.agent || output.args.subagent_type || output.args.name) as string | undefined
      const description = (output.args.description as string) || ""
      const rawPrompt = output.args.prompt as string || ""
      const prompt = stripAllSystemInjections(rawPrompt).toLowerCase()
      const normalizedTarget = normalizeAgentName(targetAgent)
      
      if (!targetAgent || BYPASS_AGENTS.includes(currentAgent)) return

      const relationshipKey = Object.keys(AGENT_RELATIONSHIPS).find(
        k => k.toLowerCase() === currentAgent.toLowerCase()
      )
      const allowedTargets = relationshipKey ? AGENT_RELATIONSHIPS[relationshipKey] : []
      
      const isAllowed = allowedTargets.some(allowed => {
        const normalizedAllowed = normalizeAgentName(allowed)
        return normalizedAllowed === normalizedTarget || 
               normalizedAllowed?.startsWith(normalizedTarget + " ") ||
               normalizedAllowed?.startsWith(normalizedTarget + "(") ||
               normalizedAllowed?.startsWith(normalizedTarget!)
      })

      if (!isAllowed) {
        log(`[${HOOK_NAME}] BLOCKED: ${currentAgent} tried to call ${targetAgent}`, { sessionID: input.sessionID })
        await showToast(client, `🚫 ${currentAgent}`, `Blocked: Cannot call ${targetAgent}`, "error", 5000)
        throw new Error(
          `[${HOOK_NAME}] HIERARCHY VIOLATION: Agent '${currentAgent}' is not authorized to call '${targetAgent}'.\n` +
          `Allowed delegates for ${currentAgent}: ${allowedTargets.join(", ") || "None"}.\n` +
          `Please follow the strict chain of command.`
        )
      }

      const requiresSync = SYNC_DELEGATION_REQUIRED[currentAgent]
      if (requiresSync && requiresSync.some(agent => targetAgent?.toLowerCase().includes(agent.toLowerCase()))) {
        const runInBackground = output.args.run_in_background
        if (runInBackground === true || runInBackground === "true") {
          log(`[${HOOK_NAME}] BLOCKED: ${currentAgent} tried to delegate to ${targetAgent} with run_in_background=true`, { sessionID: input.sessionID })
          await showToast(client, `🚫 ${currentAgent}`, `Blocked: Must use run_in_background=false for ${targetAgent}`, "error", 5000)
          throw new Error(
            `[${HOOK_NAME}] SYNC DELEGATION REQUIRED: Agent '${currentAgent}' must use run_in_background=false when delegating to '${targetAgent}'.\n` +
            `Background delegation causes race conditions and multiple agent conflicts.\n` +
            `Please use: delegate_task(subagent_type="${targetAgent}", run_in_background=false, ...)`
          )
        }
      }

      if (currentAgent === "Paul") {
        const shortDesc = description.slice(0, 50) + (description.length > 50 ? "..." : "")
        await showToast(client, `⚡ ${currentAgent} → ${targetAgent}`, shortDesc || "Delegating task...", "info", 5000)

        for (const rule of COMPETENCY_RULES) {
          if (normalizedTarget === "joshua (test runner)" || normalizedTarget === "joshua") continue

          if (hasKeywordMatch(prompt, rule.keywords) && normalizedTarget !== normalizeAgentName(rule.requiredAgent) && !normalizedTarget?.includes("auditor")) {
            log(`[${HOOK_NAME}] ADVISORY: Competency mismatch detected`, { 
              sessionID: input.sessionID, 
              category: rule.category,
              target: targetAgent 
            })
            
            await showToast(client, `⚠️ Wrong Agent?`, `${rule.category} work → use ${rule.requiredAgent}`, "warning", 8000)
          }
        }
      }
      
      if (currentAgent === "planner-paul") {
        const shortDesc = description.slice(0, 50) + (description.length > 50 ? "..." : "")
        await showToast(client, `📋 Planner → ${targetAgent}`, shortDesc || "Delegating...", "info", 5000)
      }
    }
  }
}
