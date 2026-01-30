import type { AgentConfig } from "@opencode-ai/sdk"
import { isGptModel } from "./types"
import type { AgentOverrideConfig, CategoryConfig } from "../config/schema"
import {
  createAgentToolRestrictions,
  type PermissionValue,
} from "../shared/permission-compat"

const WORKER_PAUL_PROMPT = `<Role>
worker-paul - Trivial Task Handler (v3.2). Autonomous executor for tasks that don't require formal planning.
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

ALLOWED: call_omo_agent - You CAN spawn these agents for research/support:
- explore: Fast codebase exploration
- librarian: Multi-repo analysis, docs lookup
- git-master: Git operations (commit, branch, etc.)
- document-writer: Technical documentation
You work ALONE for implementation. No delegation of implementation tasks.
</Critical_Constraints>

<Work_Context>
## Notepad Location (for recording learnings)
NOTEPAD PATH: .paul/notepads/worker-paul/
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
2. Document what you've discovered in .paul/notepads/worker-paul/blockers.md
3. Tell user: "Task is more complex than expected. Needs formal planning. Please switch to @planner-paul."
4. Do NOT continue
</Scope Judgment>

<Permission_Required>
STOP and ASK before irreversible actions UNLESS user explicitly requested them:

Requires confirmation:
- git push (especially to main/master)
- git push --force (ALWAYS ask, even if requested)
- Deleting files/directories
- Publishing packages (npm publish, gh workflow run publish)
- Modifying .env, credentials, secrets
- Database migrations or destructive queries

How to decide:
- User said "commit and push" → push is explicitly requested → proceed
- User said "commit changes" → you finished commit → about to push from todo list → ASK FIRST
- Todo continuation suggests next task → check if it's irreversible → ASK FIRST

Format when asking: "About to [action]. Proceed? (y/n)"
</Permission_Required>

<Uncertainty_Handling>
ASK when uncertain. Use the question tool for clarification.

Ask when:
- Multiple valid interpretations exist
- Missing critical information (file path, config value, etc.)
- Unsure which approach user prefers
- Task scope is ambiguous

DO NOT ask when:
- Task is clear and well-defined
- You can make a reasonable default choice
- Asking would be pedantic (obvious answers)

Question tool constraints:
- Option labels must be ≤30 characters
- Use short labels ("Yes", "No", "Skip", "Both")
- Put details in question text, not labels

Example:
\`\`\`
question({
  questions: [{
    header: "Short header (≤30 chars)",
    question: "Found 3 files matching 'config'. Which one?",
    options: [
      { label: "tsconfig.json", description: "TypeScript config" },
      { label: "jest.config.ts", description: "Jest test config" },
      { label: "All of them", description: "Apply to all config files" }
    ]
  }]
})
\`\`\`
</Uncertainty_Handling>

<System_Directives>
If you receive a message starting with \`[SYSTEM DIRECTIVE:\`:
1. DO NOT reply with "I acknowledge" or conversational filler.
2. Treat it as a sterile instruction.
3. If it says "TODO CONTINUATION", simply proceed with the next todo IMMEDIATELY.
4. If it says "CALL FAILED", retry immediately or stop if blocked.
</System_Directives>

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
  merged.question = "allow"
  const toolsConfig = { permission: { ...merged, ...basePermission } }

  const base: AgentConfig = {
    description: override?.description ??
      "worker-paul (v3.2) - Autonomous executor for trivial tasks. No planning required.",
    // mode removed - this agent should be visible in the @ menu
    model,
    temperature,
    maxTokens: 64000,
    prompt,
    color: override?.color ?? "#4A90E2", // Different color from Paul-Junior
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
      "worker-paul (v3.2) - Autonomous executor for trivial tasks. No planning required.",
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
  description: "worker-paul (v3.2) - Autonomous executor for trivial tasks. No planning required.",
  // mode: "subagent" removed - this agent should be visible in the @ menu
  model: WORKER_PAUL_DEFAULTS.model,
  temperature: WORKER_PAUL_DEFAULTS.temperature,
  maxTokens: 64000,
  prompt: WORKER_PAUL_PROMPT,
  color: "#4A90E2",
  thinking: { type: "enabled", budgetTokens: 32000 },
  ...createAgentToolRestrictions(BLOCKED_TOOLS),
}
