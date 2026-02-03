import type { PluginInput } from "@opencode-ai/plugin"
import { getParentAgentName } from "../../features/agent-context"
import { recordApproval } from "../hierarchy-enforcer/approval-state"
import { stripAllSystemInjections } from "../hierarchy-enforcer"
import { showToast, injectNotification, getCurrentModel, type ToastClient, type NotificationStatus, type NotificationOptions } from "../shared/notification"
import { log } from "../../shared/logger"

const HOOK_NAME = "delegation-notification"

export function createDelegationNotificationHook(ctx: PluginInput) {
  const client = ctx.client as unknown as ToastClient

  return {
    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID?: string },
      output: { output: string; args?: Record<string, unknown> }
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== "delegate_task") return

      const result = output.output
      if (typeof result !== "string") return

      const isBackgroundTask = output.args?.run_in_background === true
      
      let targetAgent = (output.args?.agent || output.args?.subagent_type || output.args?.name) as string | undefined
      if (!targetAgent) {
        const arrowMatch = result.match(/→\s*([A-Za-z][\w-]*)/i)
        if (arrowMatch) targetAgent = arrowMatch[1]
      }
      
      const normalizedAgent = targetAgent?.toLowerCase() || ""
      const currentAgent = getParentAgentName(input.sessionID, "Paul")
      const currentModel = getCurrentModel(input.sessionID)
      const lowerResult = result.toLowerCase()
      
      const maybeInjectNotification = async (status: NotificationStatus, opts: NotificationOptions) => {
        if (isBackgroundTask) {
          await injectNotification(client, input.sessionID, status, opts, currentAgent, currentModel)
        }
      }

      if (normalizedAgent.includes("nathan")) {
        const complexityMatch = result.match(/complexity[:\s]*(low|medium|high)/i)
        const scopeMatch = result.match(/scope[:\s]*([^\n]{10,50})/i)
        const complexity = complexityMatch ? complexityMatch[1].toUpperCase() : null
        const scope = scopeMatch ? scopeMatch[1].trim().slice(0, 40) : null
        const summary = complexity ? `Complexity: ${complexity}` : (scope ? scope : "Analysis complete")
        await showToast(client, "🔍 Nathan Analysis", summary, "info", 5000)
        await maybeInjectNotification("delegation_complete", { fromAgent: currentAgent, toAgent: "Nathan", task: "Analysis" })
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
        await maybeInjectNotification("delegation_complete", { fromAgent: currentAgent, toAgent: "Timothy", task: "Plan Review" })
      }
      
      else if (normalizedAgent.includes("solomon")) {
        const testCountMatch = result.match(/(\d+)\s*test/i)
        const testCount = testCountMatch ? testCountMatch[1] : null
        const summary = testCount ? `${testCount} test cases planned` : "TDD spec complete"
        await showToast(client, "🧪 Solomon TDD", summary, "info", 5000)
        await maybeInjectNotification("delegation_complete", { fromAgent: currentAgent, toAgent: "Solomon", task: "TDD Spec" })
      }
      
      else if (normalizedAgent.includes("thomas")) {
        const approvedMatch = lowerResult.includes("approved") || lowerResult.includes("valid")
        if (approvedMatch) {
          await showToast(client, "✅ Thomas Approved", "Spec review passed", "success", 5000)
          recordApproval(ctx.directory, input.callID, "Thomas", "approved")
        } else {
          await showToast(client, "📄 Thomas Review", "Spec review complete", "info", 5000)
        }
        await maybeInjectNotification("delegation_complete", { fromAgent: currentAgent, toAgent: "Thomas", task: "Spec Review" })
      }
      
      else if (normalizedAgent.includes("joshua")) {
        const passedMatch = lowerResult.includes("passed") || lowerResult.includes("success") || lowerResult.includes("✓")
        const failedMatch = lowerResult.includes("failed") || lowerResult.includes("error") || lowerResult.includes("✗")
        const testCountMatch = result.match(/(\d+)\s*(?:tests?|specs?)\s*(?:passed|passing)/i)
        const failCountMatch = result.match(/(\d+)\s*(?:tests?|specs?)\s*(?:failed|failing)/i)
        
        if (failedMatch || (failCountMatch && parseInt(failCountMatch[1]) > 0)) {
          const failCount = failCountMatch ? failCountMatch[1] : "some"
          const errorMatch = result.match(/(?:error|failed|failure)[:\s]*([^\n]{1,80})/i)
          const errorReason = errorMatch ? errorMatch[1].trim() : "check test output"
          await showToast(client, "❌ Joshua: Tests Failed", `${failCount} test(s) failing - ${errorReason}`, "error", 5000)
          await maybeInjectNotification("failed", { fromAgent: currentAgent, toAgent: "Joshua", task: `${failCount} test(s) failing`, reason: errorReason })
        } else if (passedMatch) {
          const passCount = testCountMatch ? testCountMatch[1] : "all"
          await showToast(client, "✅ Joshua: Tests Passed", `${passCount} test(s) passing`, "success", 5000)
          await maybeInjectNotification("completed", { fromAgent: currentAgent, toAgent: "Joshua", task: `${passCount} test(s) passing` })
          recordApproval(ctx.directory, input.callID, "Joshua", "approved")
        } else {
          await showToast(client, "🧪 Joshua Complete", "Test run finished", "info", 5000)
        }
      }
      
      else if (normalizedAgent.includes("paul-junior") || normalizedAgent.includes("frontend-ui-ux")) {
        const cleanResult = stripAllSystemInjections(result)
        const cleanLower = cleanResult.toLowerCase()
        const hasSuccess = cleanLower.includes("✅") || cleanLower.startsWith("done") || cleanLower.includes("complete") || cleanLower.includes("success")
        const hasRealError = cleanLower.includes("❌") || /\b(error|failed|exception):/i.test(cleanLower) || cleanLower.includes("threw")
        
        if (hasRealError && !hasSuccess) {
          const errorMatch = cleanResult.match(/(?:error|failed|exception)[:\s]*([^\n]{1,80})/i)
          const errorReason = errorMatch ? errorMatch[1].trim() : "check output for details"
          const taskMatch = cleanResult.match(/(?:task|implementing|working on)[:\s]*([^\n]{1,50})/i)
          const taskName = taskMatch ? taskMatch[1].trim() : "implementation"
          await showToast(client, `❌ ${targetAgent} failed`, `Task: ${taskName} - ${errorReason}`, "error", 5000)
          await maybeInjectNotification("failed", { fromAgent: currentAgent, toAgent: targetAgent, task: taskName, reason: errorReason })
        } else {
          await showToast(client, `✅ ${targetAgent}`, "implementation complete", "success", 5000)
          await maybeInjectNotification("completed", { fromAgent: currentAgent, toAgent: targetAgent, task: "implementation" })
        }
      }
      
      else if (normalizedAgent.includes("git-master")) {
        const commitMatch = result.match(/commit[:\s]*([a-f0-9]{7,8})/i)
        const commit = commitMatch ? commitMatch[1] : null
        
        if (commit) {
          await showToast(client, "📦 Git Commit", `Committed: ${commit}`, "success", 5000)
        } else if (lowerResult.includes("push")) {
          await showToast(client, "🚀 Git Push", "Changes pushed", "success", 5000)
        } else {
          await showToast(client, "🔧 Git Operation", "Complete", "info", 5000)
        }
        await maybeInjectNotification("delegation_complete", { fromAgent: currentAgent, toAgent: "Git-Master", task: "Git Operation" })
      }
      
      else if (normalizedAgent.includes("explore") || normalizedAgent.includes("librarian")) {
        const filesMatch = result.match(/(\d+)\s*files?/i)
        const files = filesMatch ? filesMatch[1] : null
        
        if (files) {
          await showToast(client, `🔎 ${targetAgent}`, `Found ${files} file(s)`, "info", 5000)
        } else {
          await showToast(client, `✅ DELEGATED TO ${targetAgent?.toUpperCase() || "AGENT"}`, "DELEGATED", "success", 5000)
        }
        await maybeInjectNotification("delegation_complete", { fromAgent: currentAgent, toAgent: targetAgent || "Agent", task: "Delegation" })
      }
      
      else {
        const cleanResult = stripAllSystemInjections(result)
        const cleanLower = cleanResult.toLowerCase()
        const hasSuccess = cleanLower.includes("✅") || cleanLower.includes("approved") || cleanLower.includes("passed") || cleanLower.includes("success") || cleanLower.includes("complete")
        const hasRealError = cleanLower.includes("❌") || /\b(error|failed|exception):/i.test(cleanLower)
        
        if (hasRealError && !hasSuccess) {
          const errorMatch = cleanResult.match(/(?:error|failed|exception)[:\s]*([^\n]{1,80})/i)
          const errorReason = errorMatch ? errorMatch[1].trim() : "check output for details"
          const taskMatch = cleanResult.match(/(?:task|todo|working on)[:\s]*([^\n]{1,50})/i)
          const taskName = taskMatch ? taskMatch[1].trim() : "task"
          await showToast(client, `❌ ${targetAgent || "Agent"} failed`, `Task: ${taskName} - ${errorReason}`, "error", 5000)
          await maybeInjectNotification("failed", { fromAgent: currentAgent, toAgent: targetAgent || "Agent", task: taskName, reason: errorReason })
        } else if (hasSuccess) {
          await showToast(client, `✅ DELEGATED TO ${targetAgent?.toUpperCase() || "AGENT"}`, "DELEGATED", "success", 5000)
          await maybeInjectNotification("delegation_complete", { fromAgent: currentAgent, toAgent: targetAgent || "Agent", task: "Delegation" })
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
