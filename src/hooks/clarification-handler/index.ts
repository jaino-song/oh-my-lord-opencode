/**
 * clarification-handler hook
 *
 * PostToolUse hook that intercepts delegate_task results and handles
 * clarification requests from subagents. Enables bidirectional
 * orchestrator-subagent conversation.
 */

import type { PluginInput } from "@opencode-ai/plugin"
import {
  HOOK_NAME,
  CLARIFICATION_TOOLS,
  ENABLED_AGENTS,
  MAX_ITERATIONS,
  type EnabledAgent,
} from "./constants"
import {
  hasClarificationMarker,
  parseClarificationRequest,
  formatClarificationRequest,
} from "./parser"
import {
  getState,
  setState,
  deleteState,
  createInitialState,
  addHistoryEntry,
} from "./state"
import { log } from "../../shared/logger"

export * from "./types"
export * from "./constants"
export * from "./parser"
export * from "./state"

function isEnabledAgent(agentName: string): agentName is EnabledAgent {
  const normalized = agentName.toLowerCase().replace(/[^a-z-]/g, "")
  return ENABLED_AGENTS.some((a) => normalized.includes(a.replace("-", "")))
}

function isBackgroundTask(args: Record<string, unknown>): boolean {
  return args.run_in_background === true
}

export function createClarificationHandlerHook(_ctx: PluginInput) {
  return {
    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { output: string; args?: Record<string, unknown> }
    ): Promise<void> => {
      const toolName = input.tool.toLowerCase()

      if (!CLARIFICATION_TOOLS.some((t) => toolName.includes(t))) {
        return
      }

      const args = output.args ?? {}
      const result = output.output

      if (!hasClarificationMarker(result)) {
        return
      }

      const targetAgent = (args.subagent_type ?? args.category ?? "") as string
      if (!targetAgent) {
        log(`[${HOOK_NAME}] no target agent found in args`, {
          sessionID: input.sessionID,
        })
        return
      }

      if (!isEnabledAgent(targetAgent)) {
        log(`[${HOOK_NAME}] agent ${targetAgent} not enabled for clarification`, {
          sessionID: input.sessionID,
          enabledAgents: ENABLED_AGENTS,
        })
        return
      }

      if (isBackgroundTask(args)) {
        log(
          `[${HOOK_NAME}] warning: clarification requested in background task - skipping`,
          {
            sessionID: input.sessionID,
            agent: targetAgent,
          }
        )
        output.output =
          result +
          `\n\n⚠️ [${HOOK_NAME}] Clarification was requested but skipped (background task). Run synchronously for clarification support.`
        return
      }

      const parseResult = parseClarificationRequest(result)
      if (!parseResult.success) {
        log(
          `[${HOOK_NAME}] failed to parse clarification request: ${parseResult.reason}`,
          {
            sessionID: input.sessionID,
          }
        )
        return
      }

      const request = parseResult.request
      const delegationId = input.callID

      let state = getState(input.sessionID, delegationId)
      if (!state) {
        state = createInitialState(input.sessionID, delegationId)
      }

      if (state.iterations >= MAX_ITERATIONS) {
        log(
          `[${HOOK_NAME}] max iterations (${MAX_ITERATIONS}) reached - using recommendation`,
          {
            sessionID: input.sessionID,
            iterations: state.iterations,
          }
        )

        const answer =
          request.recommendation ?? request.options[0]?.label ?? "A"
        output.output =
          result +
          `\n\n⚠️ [${HOOK_NAME}] Max clarification rounds reached. Auto-selected: ${answer}`
        deleteState(input.sessionID, delegationId)
        return
      }

      log(`[${HOOK_NAME}] clarification requested by ${targetAgent}`, {
        sessionID: input.sessionID,
        question: request.question,
        options: request.options.map((o) => o.label),
        iteration: state.iterations + 1,
        maxIterations: MAX_ITERATIONS,
      })

      const formattedRequest = formatClarificationRequest(request)
      output.output =
        result +
        `\n\n📋 [${HOOK_NAME}] Subagent needs clarification (round ${state.iterations + 1}/${MAX_ITERATIONS}):\n${formattedRequest}\n\nTo answer: resume the delegation with your choice.`

      state = addHistoryEntry(state, request.question, "(pending)", "orchestrator")
      setState(input.sessionID, delegationId, state)
    },
  }
}
