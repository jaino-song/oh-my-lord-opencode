import type { AgentConfig } from "@opencode-ai/sdk"
import { isGptModel } from "./types"
import type { AgentOverrideConfig, CategoryConfig } from "../config/schema"
import {
  createAgentToolRestrictions,
  migrateToolsToPermission,
  type PermissionValue,
} from "../shared/permission-compat"

const PAUL_JUNIOR_PROMPT = `<Role>
Paul-Junior - Focused executor from OhMyOpenCode.
Execute tasks directly. NEVER delegate or spawn other agents.
</Role>

<Critical_Constraints>
BLOCKED ACTIONS (will fail if attempted):
- task tool: BLOCKED

ALLOWED: delegate_task - You CAN spawn explore/librarian agents for research ONLY.
You work ALONE for implementation. No delegation of implementation tasks.
</Critical_Constraints>

<Work_Context>
## Notepad Location (for recording learnings)
NOTEPAD PATH: .paul/notepads/{plan-name}/
- learnings.md: Record patterns, conventions, successful approaches
- issues.md: Record problems, blockers, gotchas encountered
- decisions.md: Record architectural choices and rationales
- problems.md: Record unresolved issues, technical debt

You SHOULD append findings to notepad files after completing work.

## Plan Location (READ ONLY)
PLAN PATH: .paul/plans/{plan-name}.md

⚠️⚠️⚠️ CRITICAL RULE: NEVER MODIFY THE PLAN FILE ⚠️⚠️⚠️

The plan file (.paul/plans/*.md) is SACRED and READ-ONLY.
- You may READ the plan to understand tasks
- You may READ checkbox items to know what to do
- You MUST NOT edit, modify, or update the plan file
- You MUST NOT mark checkboxes as complete in the plan
- Only the Orchestrator manages the plan file

VIOLATION = IMMEDIATE FAILURE. The Orchestrator tracks plan state.
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

<clarification_protocol>
## when to ask for clarification

if you encounter ambiguity that blocks progress, you can request clarification from the orchestrator (paul).

**when to ask**:
- multiple valid approaches exist and you can't determine which is preferred
- missing critical information (file path, config value, expected behavior)
- task instructions are contradictory or unclear
- you need to make an architectural decision that affects other tasks

**when not to ask**:
- you can make a reasonable default choice
- the answer is obvious from context
- asking would be pedantic

**format** (use exactly this structure):
\`\`\`
[needs_clarification]
question: what is the expected behavior when the user submits an empty form?
options:
a) show validation error inline
b) disable submit button until valid
c) show modal error dialog
context: the form has 3 required fields and uses react-hook-form
recommendation: a
[/needs_clarification]
\`\`\`

**rules**:
- always provide at least 2 options
- include your recommendation when you have one
- keep questions specific and actionable
- max 3 clarification rounds per task (then use your best judgment)

**behavior**:
- after asking, the orchestrator will resume with an answer
- continue with the chosen option
- if no answer after timeout, use your recommendation
</clarification_protocol>

<Style>
- Start immediately. No acknowledgments.
- Match user's communication style.
- Dense > verbose.
</Style>`

function buildPaulJuniorPrompt(promptAppend?: string): string {
  if (!promptAppend) return PAUL_JUNIOR_PROMPT
  return PAUL_JUNIOR_PROMPT + "\n\n" + promptAppend
}

// Core tools that Paul-Junior must NEVER have access to
const BLOCKED_TOOLS = ["task", "delegate_task"]

export const PAUL_JUNIOR_DEFAULTS = {
  model: "openai/gpt-5.2-codex",
  temperature: 0.1,
} as const

export function createPaulJuniorAgentWithOverrides(
  override: AgentOverrideConfig | undefined,
  systemDefaultModel?: string
): AgentConfig {
  if (override?.disable) {
    override = undefined
  }

  const model = override?.model ?? systemDefaultModel ?? PAUL_JUNIOR_DEFAULTS.model
  const temperature = override?.temperature ?? PAUL_JUNIOR_DEFAULTS.temperature

  const promptAppend = override?.prompt_append
  const prompt = buildPaulJuniorPrompt(promptAppend)

  const baseRestrictions = createAgentToolRestrictions(BLOCKED_TOOLS)

  // Convert legacy tools format to permission format if provided
  let userPermission: Record<string, PermissionValue> = {}
  if (override?.tools && typeof override.tools === "object") {
    userPermission = migrateToolsToPermission(override.tools as Record<string, boolean>)
  }
  if (override?.permission && typeof override.permission === "object") {
    userPermission = { ...userPermission, ...(override.permission as Record<string, PermissionValue>) }
  }

  // Start with user permissions, then enforce blocked tools
  const merged: Record<string, PermissionValue> = { ...userPermission }
  for (const tool of BLOCKED_TOOLS) {
    merged[tool] = "deny"
  }
  // call_omo_agent is allowed for spawning explore/librarian agents
  merged.call_omo_agent = "allow"

  const toolsConfig = { permission: merged }

  const base: AgentConfig = {
    description: override?.description ??
      "Paul-Junior - Focused task executor. Same discipline, no delegation.",
    mode: "subagent" as const,
    model,
    temperature,
    maxTokens: 64000,
    prompt,
    color: override?.color ?? "#20B2AA",
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

export function createPaulJuniorAgent(
  categoryConfig: CategoryConfig,
  promptAppend?: string
): AgentConfig {
  const prompt = buildPaulJuniorPrompt(promptAppend)
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
      "Paul-Junior - Focused task executor. Same discipline, no delegation.",
    mode: "subagent" as const,
    model,
    maxTokens: categoryConfig.maxTokens ?? 64000,
    prompt,
    color: "#20B2AA",
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
