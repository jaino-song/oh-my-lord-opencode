import type { PluginInput } from "@opencode-ai/plugin"
import { getSessionAgent } from "../../features/claude-code-session-state"
import { findNearestMessageWithFields, findFirstMessageWithAgent, MESSAGE_STORAGE } from "../../features/hook-message-injector"
import { existsSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { HOOK_NAME, AGENT_RELATIONSHIPS, BYPASS_AGENTS, CATEGORY_TO_AGENT } from "./constants"
import { hasRecentApproval, recordApproval, getApprovalPath } from "./approval-state"
import { log } from "../../shared/logger"

type ToastVariant = "info" | "success" | "warning" | "error"

interface ToastClient {
  tui?: {
    showToast?: (opts: { body: { title: string; message: string; variant: ToastVariant; duration?: number } }) => Promise<void>
  }
}

async function showToast(
  client: ToastClient,
  title: string,
  message: string,
  variant: ToastVariant = "info",
  duration = 3000
): Promise<void> {
  if (!client.tui?.showToast) return
  await client.tui.showToast({ body: { title, message, variant, duration } }).catch(() => {})
}

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

  const client = ctx.client as unknown as ToastClient

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
        const description = (output.args.description as string) || ""

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
            await showToast(client, `🚫 ${currentAgent}`, `Blocked: Cannot call ${targetAgent}`, "error", 4000)
            throw new Error(
              `[${HOOK_NAME}] HIERARCHY VIOLATION: Agent '${currentAgent}' is not authorized to call '${targetAgent}'.\n` +
              `Allowed delegates for ${currentAgent}: ${allowedTargets.join(", ") || "None"}.\n` +
              `Please follow the strict chain of command.`
            )
          }

          if (currentAgent === "Paul" || currentAgent === "orchestrator-sisyphus") {
            const shortDesc = description.slice(0, 50) + (description.length > 50 ? "..." : "")
            await showToast(client, `⚡ Paul → ${targetAgent}`, shortDesc || "Delegating task...", "info", 2500)
            
            if (normalizedTarget === "sisyphus-junior" || normalizedTarget === "ultrabrain" || normalizedTarget === "frontend-ui-ux-engineer") {
              const hasRecentTestRun = hasRecentApproval(ctx.directory, "joshua", 600000)
              if (!hasRecentTestRun) {
                log(`[${HOOK_NAME}] TDD Warning Injected`, { sessionID: input.sessionID })
                await showToast(client, "⚠️ TDD Warning", "No recent test run (Joshua)", "warning", 3000)
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
                
                await showToast(client, `💡 Competency Hint`, `${rule.category} → consider ${rule.requiredAgent}`, "warning", 3000)
                output.args.prompt = `[ADVISORY: ${rule.category} task → consider ${rule.requiredAgent}]\n\n` + rawPrompt
              }
            }
          }
          
          if (currentAgent === "planner-paul") {
            const shortDesc = description.slice(0, 50) + (description.length > 50 ? "..." : "")
            await showToast(client, `📋 Planner → ${targetAgent}`, shortDesc || "Planning consultation...", "info", 2500)
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
              
              if (content.includes("implement") || content.includes("refactor") || content.includes("fix") || content.startsWith("exec::")) {
                requiredApproverPattern = "joshua"
              } 
              else if (content.match(/\b(create|write|review|update)\s+plan\b/) || content.startsWith("plan::")) {
                requiredApproverPattern = "timothy"
              } 
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
                  
                  const shortTask = todo.content.slice(0, 40) + (todo.content.length > 40 ? "..." : "")
                  await showToast(client, "🚫 Approval Required", `Need ${requiredApproverPattern} approval for: ${shortTask}`, "error", 4000)
                  
                  throw new Error(
                    `[${HOOK_NAME}] APPROVAL REQUIRED: Cannot mark task '${todo.content}' as completed.\n` +
                    `Missing recent approval from: ${requiredApproverPattern}.\n` +
                    `Action: Delegate verification to the required agent, wait for their 'Approved' signal, then try again.`
                  )
                } else {
                  const shortTask = todo.content.slice(0, 40) + (todo.content.length > 40 ? "..." : "")
                  await showToast(client, "✅ Task Completed", shortTask, "success", 2500)
                }
              } else {
                const shortTask = todo.content.slice(0, 40) + (todo.content.length > 40 ? "..." : "")
                await showToast(client, "✅ Task Completed", shortTask, "success", 2000)
              }
            } else if (todo.status === "in_progress") {
              const shortTask = todo.content.slice(0, 40) + (todo.content.length > 40 ? "..." : "")
              await showToast(client, "🔄 Task Started", shortTask, "info", 2000)
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
        const targetAgent = (output.args?.agent || output.args?.subagent_type || output.args?.name) as string | undefined
        
        if (typeof result === "string") {
          const lowerResult = result.toLowerCase()
          
          if (lowerResult.includes("error") || lowerResult.includes("failed") || lowerResult.includes("exception")) {
            await showToast(client, `❌ ${targetAgent || "Task"} Failed`, "Check output for details", "error", 4000)
          } else if (lowerResult.includes("approved") || lowerResult.includes("passed") || lowerResult.includes("verified") || lowerResult.includes("success")) {
            await showToast(client, `✅ ${targetAgent || "Task"} Complete`, "Delegation successful", "success", 2500)
          }
          
          if (input.tool.includes("Joshua") || result.includes("Agent: Joshua")) {
             recordApproval(ctx.directory, input.callID, "Joshua", "approved")
             await showToast(client, "🧪 Joshua Approved", "Tests passed - ready for completion", "success", 3000)
          }

          if (lowerResult.includes("approved") || lowerResult.includes("passed") || lowerResult.includes("verified")) {
            if (result.includes("Agent:") && (lowerResult.includes("passed") || lowerResult.includes("approved"))) {
               const match = result.match(/Agent:\s*([^\n]+)/)
               if (match) {
                 const approver = match[1].trim()
                 recordApproval(ctx.directory, input.callID, approver, "approved")
                 log(`[${HOOK_NAME}] Recorded approval from ${approver}`, { sessionID: input.sessionID })
                 await showToast(client, `✓ ${approver} Approved`, "Verification passed", "success", 2500)
               }
            }
          }
        }
      }
    }
  }
}
