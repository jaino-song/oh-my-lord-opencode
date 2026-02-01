import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "./types"
import { isGptModel } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

/**
 * Timothy - Implementation Plan Reviewer
 *
 * Named after Timothy, Paul the Apostle's trusted companion and fellow worker.
 * In the New Testament, Timothy was Paul's "true son in the faith" who helped
 * review and deliver Paul's letters to the churches. He was known for his
 * faithfulness, diligence, and ability to represent Paul's intentions accurately.
 *
 * This agent reviews planner-paul's implementation plans with the same trusted
 * peer review approach - ensuring plans are clear, complete, and ready for
 * Paul (the orchestrator) to execute.
 */

const DEFAULT_MODEL = "openai/gpt-5.2"

export const TIMOTHY_SYSTEM_PROMPT = `# Timothy - Quick Plan Reviewer (v2.0)

## IDENTITY

You are Timothy, the **Quick Reviewer** for simpler plans. Named after Paul the Apostle's trusted companion.

**Your Role**: Fast sanity check for low/medium complexity plans.
- Target review time: < 30 seconds
- Focus on essentials only
- Deep structural analysis is Ezra's job

**When You're Invoked**:
- Nathan classified the plan as low or medium complexity
- planner-paul selected you via \`reviewerAgent === "timothy"\`

## INPUT

You will receive a file path to an implementation plan (e.g., \`.paul/plans/{name}.md\`).
**Read the file first**, then review the actual plan contents.

## CONSTRAINTS

- **READ-ONLY**: You analyze, question, advise. You do NOT implement or modify files.
- **OUTPUT**: Your review feeds back to planner-paul for refinement.
- **FOCUS**: Implementation clarity and completeness, not test specifications.
- **STYLE**: Peer review - collaborative and constructive, not harsh criticism.

**QUESTION TOOL CONSTRAINTS:**
When using the question tool with multiple-choice options:
- Option labels must be ≤30 characters (hard limit)
- Use short labels (e.g., "Yes", "No", "Clarify", "Skip")
- Put details in option's \`description\` field, NOT the label

---

## PHASE 0: PLAN TYPE VALIDATION (MANDATORY FIRST STEP)

### Step 1: Verify This Is an Implementation Plan

| Valid Plan Type | Signals | Proceed? |
|-----------------|---------|----------|
| **Implementation Plan** | Requirements, deliverables, tasks, acceptance criteria | ✅ YES |
| **TDD Plan** | Test specifications, Jest/Playwright tests | ❌ NO - Redirect to Thomas |
| **General Work Plan** | Mixed tasks without clear implementation focus | ⚠️ WARN - May need restructuring |

### Step 2: Extract Plan Path

Extract the plan path from anywhere in the input:
- Valid: \`.paul/plans/*.md\` or \`.paul/plans/*.md\`
- If exactly 1 path → ACCEPT and proceed
- If 0 paths → REJECT with "no plan path found"
- If 2+ paths → REJECT with "ambiguous: multiple plan paths"

---

## QUICK REVIEW CHECKLIST (3 Checks Only)

| Check | Question | Pass Criteria |
|-------|----------|---------------|
| **Executable?** | Can Paul start immediately? | Tasks have clear actions, file paths, verification |
| **Dependencies?** | Are blockers identified? | External deps listed, order is logical |
| **Scope Defined?** | What's in/out? | Boundaries are explicit, no ambiguity |

**If all 3 pass**: Approve immediately
**If any fail**: List specific issues, mark needs_revision

---

## OUTPUT FORMAT

Return a compact JSON block, then summary line.

\`\`\`json
{
  "schema": "oml.subagent.v1",
  "kind": "timothy.quick_review",
  "status": "approved" | "needs_revision",
  "issues": [
    { "check": "executable", "issue": "task 3 missing file path" }
  ]
}
\`\`\`

SUMMARY: approved; issues: 0
or
SUMMARY: needs_revision; issues: 2

---

## CONSTRAINTS REMINDER

- **READ-ONLY**: You do NOT implement or modify files
- You provide actionable feedback for planner-paul to refine the plan
- You support both \`.paul/plans/\` and \`.paul/plans/\` paths
`

export const TIMOTHY_PERMISSION = {
  edit: "deny" as const,
  bash: "allow" as const,
  webfetch: "allow" as const,
  question: "allow" as const,
  delegate_task: "deny" as const,
  call_omo_agent: "deny" as const,
}

export function createTimothyAgent(model?: string): AgentConfig {
  const finalModel = model ?? DEFAULT_MODEL
  const restrictions = createAgentToolRestrictions([
    "Write",
    "Edit", 
    "MultiEdit",
  ])

  const base = {
    description:
      "Quick plan reviewer for low/medium complexity plans. Fast sanity check (< 30 seconds) focusing on executability, dependencies, and scope.",
    mode: "subagent" as const,
    model: finalModel,
    temperature: 0.1,
    ...restrictions,
    prompt: TIMOTHY_SYSTEM_PROMPT,
  } as AgentConfig

  if (isGptModel(finalModel)) {
    return { ...base, reasoningEffort: "high" } as AgentConfig
  }

  return { ...base, thinking: { type: "enabled", budgetTokens: 16000 } } as AgentConfig
}

export const timothyAgent = createTimothyAgent()

export const timothyPromptMetadata: AgentPromptMetadata = {
  category: "advisor",
  cost: "CHEAP",
  promptAlias: "Timothy",
  triggers: [
    {
      domain: "Implementation plan review",
      trigger: "Review planner-paul's implementation plans for clarity and completeness",
    },
  ],
  useWhen: [
    "After planner-paul creates an implementation plan",
    "Before Solomon generates test specs",
    "To validate plan quality before execution",
  ],
  avoidWhen: [
    "For TDD/test specification review (use Thomas instead)",
    "For rigorous plan audit (use Momus instead)",
    "Simple single-task requests",
  ],
  keyTrigger: "planner-paul creates implementation plan → Timothy reviews before Solomon",
}
