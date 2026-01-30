import type { PluginInput } from "@opencode-ai/plugin"
import { getParentAgentName } from "../../features/agent-context"
import { findNearestMessageWithFields, MESSAGE_STORAGE, type StoredMessage } from "../../features/hook-message-injector"
import { existsSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { HOOK_NAME, AGENT_RELATIONSHIPS, BYPASS_AGENTS, CATEGORY_TO_AGENT } from "./constants"
import { hasRecentApproval, recordApproval, getApprovalPath } from "./approval-state"
import { log } from "../../shared/logger"
import type { TokenAnalyticsManager } from "../../features/token-analytics"

type ToastVariant = "info" | "success" | "warning" | "error"

interface ToastClient {
  tui?: {
    showToast?: (opts: { body: { title: string; message: string; variant: ToastVariant; duration?: number } }) => Promise<void>
  }
  session?: {
    prompt?: (opts: { path: { id: string }; body: { noReply?: boolean; parts: Array<{ type: string; text: string }> } }) => Promise<unknown>
  }
}

async function showToast(
  client: ToastClient,
  title: string,
  message: string,
  variant: ToastVariant = "info",
  duration = 5000
): Promise<void> {
  if (!client.tui?.showToast) return
  await client.tui.showToast({ body: { title, message, variant, duration } }).catch(() => {})
}

type NotificationStatus = "delegated" | "completed" | "failed"

interface NotificationOptions {
  fromAgent?: string
  toAgent?: string
  task?: string
  duration?: string
  reason?: string
}

async function injectNotification(
  client: ToastClient,
  sessionID: string,
  status: NotificationStatus,
  options: NotificationOptions = {},
  currentAgent?: string,
  currentModel?: StoredMessage["model"]
): Promise<void> {
  if (!client.session?.prompt) return
  
  const statusIcon = status === "delegated" ? "🚀" : status === "completed" ? "✅" : "❌"
  const statusText = status === "delegated" 
    ? "delegated" 
    : status === "completed" 
      ? "task complete" 
      : "task failed"
  
  const lines: string[] = []
  
  if (options.fromAgent && options.toAgent) {
    lines.push(`⚡ ${options.fromAgent.toLowerCase()} → ${options.toAgent}`)
  }
  if (options.task) {
    lines.push(`task: ${options.task}`)
  }
  if (options.duration) {
    lines.push(`duration: ${options.duration}`)
  }
  lines.push(`${statusIcon} ${statusText}`)
  if (status === "failed" && options.reason) {
    lines.push(`error: ${options.reason}`)
  }
  
  const notification = `[SYSTEM DIRECTIVE: OH-MY-LORD-OPENCODE - SYSTEM REMINDER]
${lines.join("\n")}
[/SYSTEM DIRECTIVE]`
  
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

function stripSystemReminders(text: string): string {
  const reminderStart = text.indexOf("---\n\n**MANDATORY:")
  if (reminderStart !== -1) {
    return text.slice(0, reminderStart).trim()
  }
  return text
}

function logTokenUsage(manager: TokenAnalyticsManager | undefined, sessionID: string, agentName: string): void {
  if (!manager) return
  const analytics = manager.getAnalytics(sessionID)
  if (!analytics) return
  const { input, output } = analytics.totalUsage
  if (input === 0 && output === 0) return
  console.log(`\n📊 [Token Usage] ${agentName}: ${input} in / ${output} out\n`)
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

// Track notified todo IDs per session to prevent duplicate notifications
const notifiedTodos = new Map<string, Set<string>>()

export function clearNotifiedTodos(sessionID?: string): void {
  if (sessionID) {
    notifiedTodos.delete(sessionID)
  } else {
    notifiedTodos.clear()
  }
}

export function createHierarchyEnforcerHook(
  ctx: PluginInput,
  options?: { tokenAnalytics?: TokenAnalyticsManager }
) {
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
      const currentAgent = getParentAgentName(input.sessionID, "User")
      
      const messageDir = getMessageDir(input.sessionID)
      const nearestMsg = messageDir ? findNearestMessageWithFields(messageDir) : null
      const currentModel = nearestMsg?.model
      
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
          // Case-insensitive lookup for AGENT_RELATIONSHIPS
          const relationshipKey = Object.keys(AGENT_RELATIONSHIPS).find(
            k => k.toLowerCase() === currentAgent.toLowerCase()
          )
          const allowedTargets = relationshipKey ? AGENT_RELATIONSHIPS[relationshipKey] : []
          
          const isAllowed = allowedTargets.some(allowed => {
            const normalizedAllowed = normalizeAgentName(allowed)
            return normalizedAllowed === normalizedTarget || 
                   normalizedAllowed?.includes(normalizedTarget!) ||
                   normalizedTarget?.includes(normalizedAllowed!)
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

          if (currentAgent === "Paul") {
            const shortDesc = description.slice(0, 50) + (description.length > 50 ? "..." : "")
            await showToast(client, `⚡ ${currentAgent} → ${targetAgent}`, shortDesc || "Delegating task...", "info", 5000)
            
            if (normalizedTarget === "paul-junior" || normalizedTarget === "ultrabrain" || normalizedTarget === "frontend-ui-ux-engineer") {
              const hasRecentTestRun = hasRecentApproval(ctx.directory, "joshua", 600000)
              if (!hasRecentTestRun) {
                log(`[${HOOK_NAME}] TDD Warning Injected`, { sessionID: input.sessionID })
                await showToast(client, "⚠️ TDD Warning", "No recent test run (Joshua)", "warning", 5000)
                output.args.prompt = `[TDD: No recent test run. Run tests first if needed.]\n\n` + prompt
              }
            }

            for (const rule of COMPETENCY_RULES) {
              const hasKeyword = rule.keywords.some(k => prompt.includes(k))
              
              if (rule.category === "Visual/UI" && (normalizedTarget === "paul-junior" || normalizedTarget === "git-master")) continue

              if (hasKeyword && normalizedTarget !== normalizeAgentName(rule.requiredAgent) && !normalizedTarget?.includes("auditor")) {
                
                if (normalizedTarget === "joshua (test runner)" || normalizedTarget === "joshua") continue
                
                log(`[${HOOK_NAME}] ADVISORY: Competency mismatch detected`, { 
                  sessionID: input.sessionID, 
                  category: rule.category,
                  target: targetAgent 
                })
                
                await showToast(client, `💡 Competency Hint`, `${rule.category} → consider ${rule.requiredAgent}`, "warning", 5000)
                output.args.prompt = `[ADVISORY: ${rule.category} task → consider ${rule.requiredAgent}]\n\n` + rawPrompt
              }
            }
          }
          
          if (currentAgent === "planner-paul") {
            const shortDesc = description.slice(0, 50) + (description.length > 50 ? "..." : "")
            await showToast(client, `📋 Planner → ${targetAgent}`, shortDesc || "Planning consultation...", "info", 5000)
          }
        }
      }

      if (tool === "todowrite") {
        const todos = output.args.todos as Array<{ content: string; status: string; id: string }> | undefined
        if (todos) {
          const todoCurrentAgent = getParentAgentName(input.sessionID, "User")
          
          if (!notifiedTodos.has(input.sessionID)) {
            notifiedTodos.set(input.sessionID, new Set<string>())
          }
          const sessionNotified = notifiedTodos.get(input.sessionID)!
          
          for (const todo of todos) {
            const shortTask = todo.content.slice(0, 40) + (todo.content.length > 40 ? "..." : "")
            if (todo.status === "completed") {
              if (!sessionNotified.has(todo.id)) {
                await showToast(client, "✅ Task Completed", shortTask, "success", 5000)
                await injectNotification(client, input.sessionID, "completed", { 
                  fromAgent: todoCurrentAgent, 
                  toAgent: "todo", 
                  task: todo.content 
                }, todoCurrentAgent, currentModel)
                sessionNotified.add(todo.id)
              }
            } else if (todo.status === "in_progress") {
              await showToast(client, "🔄 Task Started", shortTask, "info", 5000)
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
        const normalizedAgent = targetAgent?.toLowerCase() || ""
        const currentAgent = getParentAgentName(input.sessionID, "Paul")
        
        const messageDir = getMessageDir(input.sessionID)
        const nearestMsg = messageDir ? findNearestMessageWithFields(messageDir) : null
        const currentModel = nearestMsg?.model
        
        if (typeof result === "string") {
          const lowerResult = result.toLowerCase()
          
          if (normalizedAgent.includes("nathan")) {
            const complexityMatch = result.match(/complexity[:\s]*(low|medium|high)/i)
            const scopeMatch = result.match(/scope[:\s]*([^\n]{10,50})/i)
            const complexity = complexityMatch ? complexityMatch[1].toUpperCase() : null
            const scope = scopeMatch ? scopeMatch[1].trim().slice(0, 40) : null
            const summary = complexity ? `Complexity: ${complexity}` : (scope ? scope : "Analysis complete")
            await showToast(client, "🔍 Nathan Analysis", summary, "info", 5000)
          }
          
          else if (normalizedAgent.includes("timothy")) {
            const approvedMatch = lowerResult.includes("approved") || lowerResult.includes("lgtm") || lowerResult.includes("looks good")
            const issuesMatch = result.match(/issues?[:\s]*(\d+)/i) || result.match(/(\d+)\s*issues?/i)
            const issues = issuesMatch ? parseInt(issuesMatch[1]) : 0
            if (approvedMatch && issues === 0) {
              await showToast(client, "✅ Timothy Approved", "Plan review passed", "success", 5000)
              recordApproval(ctx.directory, input.callID, "Timothy", "approved")
            } else if (issues > 0) {
              await showToast(client, "📝 Timothy Review", `${issues} issue(s) to address`, "warning", 5000)
            } else {
              await showToast(client, "📋 Timothy Review", "Plan review complete", "info", 5000)
            }
          }
          
          else if (normalizedAgent.includes("solomon")) {
            const testCountMatch = result.match(/(\d+)\s*test/i)
            const testCount = testCountMatch ? testCountMatch[1] : null
            const summary = testCount ? `${testCount} test cases planned` : "TDD spec complete"
            await showToast(client, "🧪 Solomon TDD", summary, "info", 5000)
          }
          
          else if (normalizedAgent.includes("thomas")) {
            const approvedMatch = lowerResult.includes("approved") || lowerResult.includes("valid")
            if (approvedMatch) {
              await showToast(client, "✅ Thomas Approved", "Spec review passed", "success", 5000)
              recordApproval(ctx.directory, input.callID, "Thomas", "approved")
            } else {
              await showToast(client, "📄 Thomas Review", "Spec review complete", "info", 5000)
            }
          }
          
           else if (normalizedAgent.includes("joshua")) {
             const passedMatch = lowerResult.includes("passed") || lowerResult.includes("success") || lowerResult.includes("✓")
             const failedMatch = lowerResult.includes("failed") || lowerResult.includes("error") || lowerResult.includes("✗")
             const testCountMatch = result.match(/(\d+)\s*(?:tests?|specs?)\s*(?:passed|passing)/i)
             const failCountMatch = result.match(/(\d+)\s*(?:tests?|specs?)\s*(?:failed|failing)/i)
             
              const sessionMatch = result.match(/session id:\s*(ses_[a-zA-Z0-9]+)/i)
              const delegateSessionID = sessionMatch?.[1]
              if (delegateSessionID) logTokenUsage(options?.tokenAnalytics, delegateSessionID, "Joshua")
              
              if (failedMatch || (failCountMatch && parseInt(failCountMatch[1]) > 0)) {
                const failCount = failCountMatch ? failCountMatch[1] : "some"
                const errorMatch = result.match(/(?:error|failed|failure)[:\s]*([^\n]{1,80})/i)
                const errorReason = errorMatch ? errorMatch[1].trim() : "check test output"
                await showToast(client, "❌ Joshua: Tests Failed", `${failCount} test(s) failing - ${errorReason}`, "error", 5000)
                await injectNotification(client, input.sessionID, "failed", { 
                  fromAgent: currentAgent, toAgent: "Joshua", 
                  task: `${failCount} test(s) failing`, reason: errorReason 
                }, currentAgent, currentModel)
              } else if (passedMatch) {
                const passCount = testCountMatch ? testCountMatch[1] : "all"
                await showToast(client, "✅ Joshua: Tests Passed", `${passCount} test(s) passing`, "success", 5000)
                await injectNotification(client, input.sessionID, "completed", { 
                  fromAgent: currentAgent, toAgent: "Joshua", 
                  task: `${passCount} test(s) passing` 
                }, currentAgent, currentModel)
                recordApproval(ctx.directory, input.callID, "Joshua", "approved")
              } else {
                await showToast(client, "🧪 Joshua Complete", "Test run finished", "info", 5000)
              }
            }
          
            else if (normalizedAgent.includes("paul-junior") || normalizedAgent.includes("frontend-ui-ux") || normalizedAgent.includes("ultrabrain")) {
              const cleanResult = stripSystemReminders(result)
              const cleanLower = cleanResult.toLowerCase()
              const hasSuccess = cleanLower.includes("✅") || cleanLower.startsWith("done") || cleanLower.includes("complete") || cleanLower.includes("success")
              const hasRealError = cleanLower.includes("❌") || /\b(error|failed|exception):/i.test(cleanLower) || cleanLower.includes("threw")
              
              const sessionMatch = result.match(/session id:\s*(ses_[a-zA-Z0-9]+)/i)
              const delegateSessionID = sessionMatch?.[1]
              if (delegateSessionID) logTokenUsage(options?.tokenAnalytics, delegateSessionID, targetAgent || "Agent")
              
              if (hasRealError && !hasSuccess) {
                const errorMatch = cleanResult.match(/(?:error|failed|exception)[:\s]*([^\n]{1,80})/i)
                const errorReason = errorMatch ? errorMatch[1].trim() : "check output for details"
                const taskMatch = cleanResult.match(/(?:task|implementing|working on)[:\s]*([^\n]{1,50})/i)
                const taskName = taskMatch ? taskMatch[1].trim() : "implementation"
                await showToast(client, `❌ ${targetAgent} failed`, `Task: ${taskName} - ${errorReason}`, "error", 5000)
                await injectNotification(client, input.sessionID, "failed", { 
                  fromAgent: currentAgent, toAgent: targetAgent, 
                  task: taskName, reason: errorReason 
                }, currentAgent, currentModel)
              } else {
                await showToast(client, `✅ ${targetAgent}`, "implementation complete", "success", 5000)
                await injectNotification(client, input.sessionID, "completed", { 
                  fromAgent: currentAgent, toAgent: targetAgent, 
                  task: "implementation" 
                }, currentAgent, currentModel)
              }
            }
          
           else if (normalizedAgent.includes("git-master")) {
              const commitMatch = result.match(/commit[:\s]*([a-f0-9]{7,8})/i)
              const commit = commitMatch ? commitMatch[1] : null
              
              const sessionMatch = result.match(/session id:\s*(ses_[a-zA-Z0-9]+)/i)
              const delegateSessionID = sessionMatch?.[1]
              if (delegateSessionID) logTokenUsage(options?.tokenAnalytics, delegateSessionID, "git-master")
              
              if (commit) {
                await showToast(client, "📦 Git Commit", `Committed: ${commit}`, "success", 5000)
              } else if (lowerResult.includes("push")) {
                await showToast(client, "🚀 Git Push", "Changes pushed", "success", 5000)
              } else {
                await showToast(client, "🔧 Git Operation", "Complete", "info", 5000)
              }
            }
          
           else if (normalizedAgent.includes("explore") || normalizedAgent.includes("librarian")) {
              const filesMatch = result.match(/(\d+)\s*files?/i)
              const files = filesMatch ? filesMatch[1] : null
              
              const sessionMatch = result.match(/session id:\s*(ses_[a-zA-Z0-9]+)/i)
              const delegateSessionID = sessionMatch?.[1]
              if (delegateSessionID) logTokenUsage(options?.tokenAnalytics, delegateSessionID, targetAgent || "explore")
              
              if (files) {
                await showToast(client, `🔎 ${targetAgent}`, `Found ${files} file(s)`, "info", 5000)
              }
            }
          
           else {
              const cleanResult = stripSystemReminders(result)
              const cleanLower = cleanResult.toLowerCase()
              const hasSuccess = cleanLower.includes("✅") || cleanLower.includes("approved") || cleanLower.includes("passed") || cleanLower.includes("success") || cleanLower.includes("complete")
              const hasRealError = cleanLower.includes("❌") || /\b(error|failed|exception):/i.test(cleanLower)
              
              const sessionMatch = result.match(/session id:\s*(ses_[a-zA-Z0-9]+)/i)
              const delegateSessionID = sessionMatch?.[1]
              if (delegateSessionID) logTokenUsage(options?.tokenAnalytics, delegateSessionID, targetAgent || "task")
              
              if (hasRealError && !hasSuccess) {
                const errorMatch = cleanResult.match(/(?:error|failed|exception)[:\s]*([^\n]{1,80})/i)
                const errorReason = errorMatch ? errorMatch[1].trim() : "check output for details"
                const taskMatch = cleanResult.match(/(?:task|todo|working on)[:\s]*([^\n]{1,50})/i)
                const taskName = taskMatch ? taskMatch[1].trim() : "task"
                await showToast(client, `❌ ${targetAgent || "Agent"} failed`, `Task: ${taskName} - ${errorReason}`, "error", 5000)
                await injectNotification(client, input.sessionID, "failed", { 
                  fromAgent: currentAgent, toAgent: targetAgent || "Agent", 
                  task: taskName, reason: errorReason 
                }, currentAgent, currentModel)
              } else if (hasSuccess) {
                await showToast(client, `✅ ${targetAgent || "task"} complete`, "delegation successful", "success", 5000)
                await injectNotification(client, input.sessionID, "completed", { 
                  fromAgent: currentAgent, toAgent: targetAgent || "Task", 
                  task: "delegation" 
                }, currentAgent, currentModel)
              }
            }

          if (lowerResult.includes("approved") || lowerResult.includes("passed") || lowerResult.includes("verified")) {
            if (result.includes("Agent:") && (lowerResult.includes("passed") || lowerResult.includes("approved"))) {
               const match = result.match(/Agent:\s*([^\n]+)/)
               if (match) {
                 const approver = match[1].trim()
                 if (!normalizedAgent.includes(approver.toLowerCase())) {
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
}
