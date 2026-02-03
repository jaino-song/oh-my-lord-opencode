import { injectHookMessage } from "../../features/hook-message-injector"
import { log } from "../../shared/logger"
import { createSystemDirective, SystemDirectiveTypes } from "../../shared/system-directive"

export interface SummarizeContext {
  sessionID: string
  providerID: string
  modelID: string
  usageRatio: number
  directory: string
}

const SUMMARIZE_CONTEXT_PROMPT = `${createSystemDirective(SystemDirectiveTypes.COMPACTION_CONTEXT)}

SUMMARY LENGTH: Create a COMPREHENSIVE summary (4000-8000 tokens). Prioritize SPECIFICITY over brevity.
Include exact file paths, function names, error messages, and technical details. Vague summaries lose critical context.

You MUST include the following sections IN THIS EXACT ORDER.
Sections 1-2 are CRITICAL - preserve them VERBATIM, not summarized.

## 1. USER CONSTRAINTS (CRITICAL - PRESERVE VERBATIM)
Copy these EXACTLY as the user stated. Do NOT paraphrase:
- Explicit prohibitions ("don't", "never", "do not", "stop", "wait")
- Consent requirements ("ask me first", "confirm before", "wait for my approval")
- Workflow restrictions ("don't proceed", "don't mark complete", "don't auto-continue")
- Preferences about how work should be done
- Any instruction where user sets boundaries on agent behavior

WARNING: Dropping user constraints causes the agent to violate user trust. NEVER omit these.

## 2. USER'S GOAL (What They Want to Achieve)
- The overall objective of this session
- Why the user wants this (context/motivation if stated)
- Success criteria (how will we know it's done?)
- Quote user's exact words when describing their goal

## 3. WORK COMPLETED (Be Specific)
For each completed item, include:
- Exact file paths modified/created (e.g., \`src/hooks/foo/index.ts\`)
- What was changed (function names, line ranges if significant)
- Why it was done this way (technical decisions made)
- Any configuration or dependencies added

Example format:
- \`src/hooks/todo-enforcer.ts\`: Added \`worker-paul\` to DEFAULT_SKIP_AGENTS array (line 16)
- \`src/hooks/paul/index.ts\`: Added API fallback for abort detection - new \`isLastAssistantMessageAborted()\` function

## 4. REMAINING TASKS (Be Specific)
For each remaining item:
- Exact description of what needs to be done
- Which files will likely need modification
- Any blockers or dependencies
- Priority/order if relevant

Example format:
- [ ] Add tests for new abort detection in \`src/hooks/paul/index.test.ts\`
- [ ] Update documentation in \`docs/HOOKS.md\` to reflect new skip agents

## 5. CURRENT STATE
- What was the agent doing when compaction occurred?
- Any in-progress operations (uncommitted changes, running tests, etc.)
- Current branch and git state if relevant
- Active todo list items and their status

## 6. TECHNICAL CONTEXT
- Key technical decisions made and WHY
- Architecture patterns being followed
- Relevant code patterns or conventions discovered
- Error messages encountered and how they were resolved

## 7. FAILED APPROACHES (Avoid Repeating)
- What was tried and didn't work
- Specific error messages or reasons for failure
- Why the approach was abandoned

Post-compaction: Agent MUST re-read sections 1-2 before taking any action.
`

export function createCompactionContextInjector() {
  return async (ctx: SummarizeContext): Promise<void> => {
    log("[compaction-context-injector] injecting context", { sessionID: ctx.sessionID })

    const success = injectHookMessage(ctx.sessionID, SUMMARIZE_CONTEXT_PROMPT, {
      agent: "general",
      model: { providerID: ctx.providerID, modelID: ctx.modelID },
      path: { cwd: ctx.directory },
    })

    if (success) {
      log("[compaction-context-injector] context injected", { sessionID: ctx.sessionID })
    } else {
      log("[compaction-context-injector] injection failed", { sessionID: ctx.sessionID })
    }
  }
}
