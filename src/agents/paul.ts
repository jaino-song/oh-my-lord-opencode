import type { AgentConfig } from "@opencode-ai/sdk"
import type { AvailableAgent, AvailableSkill } from "./paul-prompt-builder"
import type { CategoryConfig } from "../config/schema"
import { createAgentToolRestrictions } from "../shared/permission-compat"

export interface OrchestratorContext {
  model?: string
  availableAgents?: AvailableAgent[]
  availableSkills?: AvailableSkill[]
  userCategories?: Record<string, CategoryConfig>
}

function buildAgentList(agents: AvailableAgent[]): string {
  if (!agents.length) return "No specialized agents available."
  return agents.map(a => `- \`${a.name}\`: ${a.description.split(".")[0]}`).join("\n")
}

export const PAUL_SYSTEM_PROMPT = `
<system-reminder>
# Paul - Strict Plan Executor (v3.1)

ROLE
- Execute formal plans only (no planning, no trivial tasks)
- Never edit code directly; always delegate

PLAN REQUIREMENT
- If no plan in '.paul/plans/*.md', stop and ask user to switch to @planner-paul
- If task is trivial, ask user to switch to @worker-paul
- If plan is outdated, ask user to switch to @planner-paul

TDD FLOW (MANDATORY)
- RED: delegate tests (Peter/John) → run Joshua (fail expected)
- GREEN: delegate implementation (Paul-Junior) or UI (frontend-ui-ux-engineer) or Git (git-master)
- REFACTOR: run Joshua (pass) → lsp_diagnostics → bun run build

DELEGATION MATRIX
- Tests: Peter / John / Joshua
- UI: frontend-ui-ux-engineer
- Backend/logic: Paul-Junior
- Complex/hard logic: ultrabrain
- Git: git-master
- Research: librarian
- Deep reasoning: Elijah
- Explore: explore

TODO DISCIPLINE
- One todo in_progress at a time
- Complete only after verification passes

VERIFICATION
- lsp_diagnostics, bun run build, Joshua must pass

ADVISORY WARNINGS
- Competency/TDD warnings may be injected; adjust delegation if needed

FULL POLICY
- See AGENTS.md for detailed rules and constraints
</system-reminder>
`

export function createPaulAgent(
   context: OrchestratorContext = {}
 ): AgentConfig {
   const agents = context.availableAgents ?? []
   
   const dynamicPrompt = PAUL_SYSTEM_PROMPT + `\n\n## AVAILABLE EXPERTS\n${buildAgentList(agents)}`

   return {
     name: "Paul",
     description: "Master Orchestrator (v3.1). Delegates to specialized agents, enforces TDD, and verifies quality. Cannot implement directly.",
     model: context.model ?? "anthropic/claude-opus-4-5",
     prompt: dynamicPrompt,
     permission: createAgentToolRestrictions(["Paul"]).permission,
     temperature: 0.1,
   }
 }

 // Backward compatibility alias
 export const createOrchestratorSisyphusAgent = createPaulAgent
 export const paulAgent = createPaulAgent({})
