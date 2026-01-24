import type { AgentConfig } from "@opencode-ai/sdk"
import { isGptModel } from "./types"
import type { AgentOverrideConfig, CategoryConfig } from "../config/schema"
import {
  createAgentToolRestrictions,
  type PermissionValue,
} from "../shared/permission-compat"

const WORKER_PAUL_PROMPT = `<Role>
worker-paul - Trivial Task Handler (v3.1). Autonomous executor for tasks that don't require formal planning.
Named after Paul's work ethic, but focused on quick, standalone tasks.
Execute tasks directly. NEVER delegate or spawn other agents.
</Role>

<Purpose>
You handle tasks that are:
- Small in scope (single file, < 50 lines of change)
- Well-defined (clear requirements, no ambiguity)
- Low risk (typos, formatting, simple bugfixes, configs)
- Trivial (documentation updates, comment additions, minor refactors)

NOT for you:
- Features requiring architectural decisions
- Multi-file changes
- Complex refactoring
- Security-critical changes
- Database migrations
- API changes

⚠️⚠️⚠️ CRITICAL: YOU CANNOT INVOKE OTHER PAULS ⚠️⚠️⚠️

If task is complex:
1. STOP immediately
2. Tell user: "This task requires formal planning. Please switch to @planner-paul to create a plan."
3. Do NOT attempt to delegate to planner-paul (you cannot)
4. Do NOT attempt to delegate to Paul (you cannot)
5. Wait for user to switch agents manually

You work STANDALONE. You never invoke Paul or planner-paul.

## OVERRIDE MODE

If user's prompt contains the tag "--override":
- **BYPASS** complexity checks
- **PROCEED** with the task even if it seems complex
- User takes full responsibility for the decision
- Still maintain quality standards (tests, verification, todos)
- Still CANNOT delegate to Paul/planner-paul (hard constraint)

Example: "Implement user authentication --override"
→ You proceed despite complexity, working autonomously within your constraints.
</Purpose>

<Critical_Constraints>
BLOCKED ACTIONS (will fail if attempted):
- task tool: BLOCKED
- delegate_task tool: BLOCKED

ALLOWED: call_omo_agent - You CAN spawn explore/librarian agents for research.
You work ALONE for implementation. No delegation of implementation tasks.
</Critical_Constraints>

<Work_Context>
## Notepad Location (for recording learnings)
NOTEPAD PATH: .sisyphus/notepads/worker-paul/
- learnings.md: Record patterns, conventions, successful approaches
- issues.md: Record problems, blockers, gotchas encountered

You SHOULD append findings to notepad files after completing work.

## No Plan Required
You work WITHOUT a formal plan from planner-paul.
You are autonomous for small tasks.
</Work_Context>

<Todo_Discipline>
TODO OBSESSION (NON-NEGOTIABLE):
- 2+ steps → todowrite FIRST, atomic breakdown
- Mark in_progress before starting (ONE at a time)
- Mark completed IMMEDIATELY after each step
- NEVER batch completions

No todos on multi-step work = INCOMPLETE WORK.
</Todo_Discipline>

<Verification>
Task NOT complete without:
- lsp_diagnostics clean on changed files
- Build passes (if applicable)
- All todos marked completed
</Verification>

<TDD Policy>
For CODE changes (*.ts, *.tsx, *.js, *.jsx, *.py):
- Write test FIRST (if testing makes sense for the scope)
- Run tests to confirm RED
- Implement
- Run tests to confirm GREEN

For NON-CODE changes (*.md, *.json, *.yaml, configs):
- TDD not required
- Just make the change

Use judgment: trivial changes (typo fix, comment addition) don't need tests.
Complex logic (validation, business rules) DO need tests.
</TDD Policy>

<Scope Judgment>
If task feels too big while working:
1. STOP immediately
2. Document what you've discovered in .sisyphus/notepads/worker-paul/blockers.md
3. Tell user: "Task is more complex than expected. Needs formal planning. Please switch to @planner-paul."
4. Do NOT continue
</Scope Judgment>

<Style>
- Start immediately. No acknowledgments.
- Match user's communication style.
- Dense > verbose.
- Fast execution for trivial tasks.
</Style>`

function buildWorkerPaulPrompt(promptAppend?: string): string {
  if (!promptAppend) return WORKER_PAUL_PROMPT
  return WORKER_PAUL_PROMPT + "\n\n" + promptAppend
}

// Core tools that worker-paul must NEVER have access to
// Note: call_omo_agent is ALLOWED so subagents can spawn explore/librarian
const BLOCKED_TOOLS = ["task", "delegate_task"]

export const WORKER_PAUL_DEFAULTS = {
  model: "anthropic/claude-opus-4-5",
  temperature: 0.1,
} as const

export function createWorkerPaulAgentWithOverrides(
  override: AgentOverrideConfig | undefined,
  systemDefaultModel?: string
): AgentConfig {
  if (override?.disable) {
    override = undefined
  }

  const model = override?.model ?? systemDefaultModel ?? WORKER_PAUL_DEFAULTS.model
  const temperature = override?.temperature ?? WORKER_PAUL_DEFAULTS.temperature

  const promptAppend = override?.prompt_append
  const prompt = buildWorkerPaulPrompt(promptAppend)

  const baseRestrictions = createAgentToolRestrictions(BLOCKED_TOOLS)

  const userPermission = (override?.permission ?? {}) as Record<string, PermissionValue>
  const basePermission = baseRestrictions.permission
  const merged: Record<string, PermissionValue> = { ...userPermission }
  for (const tool of BLOCKED_TOOLS) {
    merged[tool] = "deny"
  }
  merged.call_omo_agent = "allow"
  const toolsConfig = { permission: { ...merged, ...basePermission } }

  const base: AgentConfig = {
    description: override?.description ??
      "worker-paul (v3.1) - Autonomous executor for trivial tasks. No planning required.",
    // mode removed - this agent should be visible in the @ menu
    model,
    temperature,
    maxTokens: 64000,
    prompt,
    color: override?.color ?? "#4A90E2", // Different color from Sisyphus-Junior
    ...toolsConfig,
  }

  if (override?.top_p !== undefined) {
    base.top_p = override.top_p
  }

  if (isGptModel(model)) {
    return { ...base, reasoningEffort: "medium" } as AgentConfig
  }

  return {
    ...base,
    thinking: { type: "enabled", budgetTokens: 32000 },
  } as AgentConfig
}

export function createWorkerPaulAgent(
  categoryConfig: CategoryConfig,
  promptAppend?: string
): AgentConfig {
  const prompt = buildWorkerPaulPrompt(promptAppend)
  const model = categoryConfig.model
  const baseRestrictions = createAgentToolRestrictions(BLOCKED_TOOLS)
  const categoryPermission = categoryConfig.tools
    ? Object.fromEntries(
        Object.entries(categoryConfig.tools).map(([k, v]) => [
          k,
          v ? ("allow" as const) : ("deny" as const),
        ])
      )
    : {}
  const mergedPermission = {
    ...categoryPermission,
    ...baseRestrictions.permission,
  }


  const base: AgentConfig = {
    description:
      "worker-paul (v3.1) - Autonomous executor for trivial tasks. No planning required.",
    // mode removed - this agent should be visible in the @ menu
    model,
    maxTokens: categoryConfig.maxTokens ?? 64000,
    prompt,
    color: "#4A90E2",
    permission: mergedPermission,
  }

  if (categoryConfig.temperature !== undefined) {
    base.temperature = categoryConfig.temperature
  }
  if (categoryConfig.top_p !== undefined) {
    base.top_p = categoryConfig.top_p
  }

  if (categoryConfig.thinking) {
    return { ...base, thinking: categoryConfig.thinking } as AgentConfig
  }

  if (categoryConfig.reasoningEffort) {
    return {
      ...base,
      reasoningEffort: categoryConfig.reasoningEffort,
      textVerbosity: categoryConfig.textVerbosity,
    } as AgentConfig
  }

  if (isGptModel(model)) {
    return { ...base, reasoningEffort: "medium" } as AgentConfig
  }

  return {
    ...base,
    thinking: { type: "enabled", budgetTokens: 32000 },
  } as AgentConfig
}

export const workerPaulAgent: AgentConfig = {
  description: "worker-paul (v3.1) - Autonomous executor for trivial tasks. No planning required.",
  // mode: "subagent" removed - this agent should be visible in the @ menu
  model: WORKER_PAUL_DEFAULTS.model,
  temperature: WORKER_PAUL_DEFAULTS.temperature,
  maxTokens: 64000,
  prompt: WORKER_PAUL_PROMPT,
  color: "#4A90E2",
  thinking: { type: "enabled", budgetTokens: 32000 },
  ...createAgentToolRestrictions(BLOCKED_TOOLS),
}
