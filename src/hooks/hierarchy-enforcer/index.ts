import type { PluginInput } from "@opencode-ai/plugin"
import { getSessionAgent } from "../../features/claude-code-session-state"
import { findNearestMessageWithFields, findFirstMessageWithAgent, MESSAGE_STORAGE } from "../../features/hook-message-injector"
import { existsSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { HOOK_NAME, AGENT_RELATIONSHIPS, BYPASS_AGENTS, CATEGORY_TO_AGENT } from "./constants"
import { hasRecentApproval, recordApproval, getApprovalPath } from "./approval-state"
import { log } from "../../shared/logger"

function getMessageDir(sessionID: string): string | null {
  if (!existsSync(MESSAGE_STORAGE)) return null
  const directPath = join(MESSAGE_STORAGE, sessionID)
  if (existsSync(directPath)) return directPath
  for (const dir of readdirSync(MESSAGE_STORAGE)) {
    const sessionPath = join(MESSAGE_STORAGE, dir, sessionID)
    if (existsSync(sessionPath)) return sessionPath
  }
  return null
}

function getAgentFromMessageFiles(sessionID: string): string | undefined {
  const messageDir = getMessageDir(sessionID)
  if (!messageDir) return undefined
  return findFirstMessageWithAgent(messageDir) ?? findNearestMessageWithFields(messageDir)?.agent
}

function getAgentFromSession(sessionID: string): string | undefined {
  return getSessionAgent(sessionID) ?? getAgentFromMessageFiles(sessionID)
}

function normalizeAgentName(agentArg: string | undefined): string | null {
  if (!agentArg) return null
  return agentArg.toLowerCase().trim()
}

function stripTddWarning(prompt: string): string {
  const warningPrefix = "[SYSTEM WARNING: TDD VIOLATION DETECTED]"
  if (!prompt.startsWith(warningPrefix)) return prompt
  const dividerIndex = prompt.indexOf("\n\n")
  if (dividerIndex === -1) return prompt
  return prompt.slice(dividerIndex + 2)
}

const COMPETENCY_RULES = [
  {
    category: "Visual/UI",
    keywords: ["css", "style", "color", "background", "border", "margin", "padding", "flex", "grid", "animation", "transition", "ui", "ux", "responsive", "mobile", "tailwind"],
    requiredAgent: "frontend-ui-ux-engineer",
    errorMsg: "Visual/UI tasks (css, styling, layout) MUST be delegated to 'frontend-ui-ux-engineer'."
  },
  {
    category: "Git Operations",
    keywords: ["commit", "rebase", "squash", "branch", "merge", "checkout", "push", "pull", "cherry-pick"],
    requiredAgent: "git-master",
    errorMsg: "Git operations (commit, rebase, branch) MUST be delegated to 'git-master'."
  },
  {
    category: "External Research",
    keywords: ["docs", "documentation", "library", "framework", "how to use", "api reference", "official docs"],
    requiredAgent: "librarian",
    errorMsg: "External documentation research MUST be delegated to 'librarian'."
  }
]

export function createHierarchyEnforcerHook(ctx: PluginInput) {
  if (!existsSync(getApprovalPath(ctx.directory))) {
    try {
      writeFileSync(getApprovalPath(ctx.directory), JSON.stringify({ approvals: [] }))
    } catch {}
  }

  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      const tool = input.tool.toLowerCase()
      const currentAgent = getAgentFromSession(input.sessionID) || "User"
      
      if (tool === "delegate_task" || tool === "task" || tool === "call_omo_agent") {
        const category = output.args.category as string | undefined
        let targetAgent = (output.args.agent || output.args.subagent_type || output.args.name) as string | undefined

        if (!targetAgent && category) {
          targetAgent = CATEGORY_TO_AGENT[category]
          if (!targetAgent) {
            log(`[hierarchy-enforcer] Unknown category: ${category}, skipping competency check`)
          }
        }

        const rawPrompt = output.args.prompt as string || ""
        const prompt = stripTddWarning(rawPrompt).toLowerCase()
        const normalizedTarget = normalizeAgentName(targetAgent)
        
        if (targetAgent && !BYPASS_AGENTS.includes(currentAgent)) {
          const allowedTargets = AGENT_RELATIONSHIPS[currentAgent] || []
          
          const isAllowed = allowedTargets.some(allowed => 
            normalizeAgentName(allowed) === normalizedTarget || 
            normalizedTarget?.includes(normalizeAgentName(allowed)!)
          )

          if (!isAllowed) {
            log(`[${HOOK_NAME}] BLOCKED: ${currentAgent} tried to call ${targetAgent}`, { sessionID: input.sessionID })
            throw new Error(
              `[${HOOK_NAME}] HIERARCHY VIOLATION: Agent '${currentAgent}' is not authorized to call '${targetAgent}'.\n` +
              `Allowed delegates for ${currentAgent}: ${allowedTargets.join(", ") || "None"}.\n` +
              `Please follow the strict chain of command.`
            )
          }

          if (currentAgent === "Paul" || currentAgent === "orchestrator-sisyphus") {
            if (normalizedTarget === "sisyphus-junior" || normalizedTarget === "ultrabrain" || normalizedTarget === "frontend-ui-ux-engineer") {
              const hasRecentTestRun = hasRecentApproval(ctx.directory, "joshua", 600000)
              if (!hasRecentTestRun) {
                log(`[${HOOK_NAME}] TDD Warning Injected`, { sessionID: input.sessionID })
                output.args.prompt = `[TDD: No recent test run. Run tests first if needed.]\n\n` + prompt
              }
            }

            for (const rule of COMPETENCY_RULES) {
              const hasKeyword = rule.keywords.some(k => prompt.includes(k))
              
              if (rule.category === "Visual/UI" && (normalizedTarget === "sisyphus-junior" || normalizedTarget === "git-master")) continue

              if (hasKeyword && normalizedTarget !== normalizeAgentName(rule.requiredAgent) && !normalizedTarget?.includes("auditor")) {
                
                if (normalizedTarget === "joshua (test runner)" || normalizedTarget === "joshua") continue
                
                log(`[${HOOK_NAME}] ADVISORY: Competency mismatch detected`, { 
                  sessionID: input.sessionID, 
                  category: rule.category,
                  target: targetAgent 
                })
                
                output.args.prompt = `[ADVISORY: ${rule.category} task → consider ${rule.requiredAgent}]\n\n` + rawPrompt
              }
            }
          }
        }
      }

      if (tool === "todowrite") {
        const todos = output.args.todos as Array<{ content: string; status: string; id: string }> | undefined
        if (todos) {
          for (const todo of todos) {
            if (todo.status === "completed") {
              const content = todo.content.toLowerCase()
              let requiredApproverPattern: string | null = null
              
              // Check for implementation/code tasks (requires test approval)
              if (content.includes("implement") || content.includes("refactor") || content.includes("fix") || content.startsWith("exec::")) {
                requiredApproverPattern = "joshua"
              } 
              // Check for planning tasks (only for planner-paul, not Paul)
              // Be specific: "create plan", "review plan", "write plan" - not just "plan" (too generic)
              else if (content.match(/\b(create|write|review|update)\s+plan\b/) || content.startsWith("plan::")) {
                requiredApproverPattern = "timothy"
              } 
              // Check for spec tasks
              else if (content.match(/\b(create|write|review|update)\s+spec\b/) || content.startsWith("spec::")) {
                requiredApproverPattern = "thomas"
              }

              if (requiredApproverPattern) {
                if (!hasRecentApproval(ctx.directory, requiredApproverPattern)) {
                  log(`[${HOOK_NAME}] BLOCKED: Task completion without approval`, { 
                    sessionID: input.sessionID, 
                    task: todo.content,
                    missingApprover: requiredApproverPattern 
                  })
                  
                  throw new Error(
                    `[${HOOK_NAME}] APPROVAL REQUIRED: Cannot mark task '${todo.content}' as completed.\n` +
                    `Missing recent approval from: ${requiredApproverPattern}.\n` +
                    `Action: Delegate verification to the required agent, wait for their 'Approved' signal, then try again.`
                  )
                }
              }
            }
          }
        }
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID?: string },
      output: { output: string; args?: Record<string, unknown> }
    ): Promise<void> => {
      if (input.tool.toLowerCase() === "delegate_task") {
        const result = output.output
        if (typeof result === "string") {
          const lowerResult = result.toLowerCase()
          if (input.tool.includes("Joshua") || result.includes("Agent: Joshua")) {
             recordApproval(ctx.directory, input.callID, "Joshua", "approved")
          }

          if (lowerResult.includes("approved") || lowerResult.includes("passed") || lowerResult.includes("verified")) {
            if (result.includes("Agent:") && (lowerResult.includes("passed") || lowerResult.includes("approved"))) {
               const match = result.match(/Agent:\s*([^\n]+)/)
               if (match) {
                 const approver = match[1].trim()
                 recordApproval(ctx.directory, input.callID, approver, "approved")
                 log(`[${HOOK_NAME}] Recorded approval from ${approver}`, { sessionID: input.sessionID })
               }
            }
          }
        }
      }
    }
  }
}
