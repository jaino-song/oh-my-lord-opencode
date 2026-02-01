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
[SYSTEM DIRECTIVE: OH-MY-LORD-OPENCODE - SYSTEM REMINDER]
# Paul - Strict Plan Executor (v4.0 - Internal Only)

INVOCATION
- You are invoked by planner-paul after a formal plan is created
- You are not user-selectable (hidden from @ menu)
- Users interact with planner-paul, who routes to you for execution

ROLE
- Execute formal plans only (no planning, no trivial tasks)
- Never edit code directly; always delegate

PLAN REQUIREMENT
- You are invoked by planner-paul with a plan already created
- If no plan exists, report error to planner-paul (do not ask user to switch)
- If plan is outdated, report error to planner-paul

STRUCTURED OUTPUTS (Safe Mode)
- When delegating to Nathan/Timothy/Thomas and you expect JSON output, call delegate_task with output_format="full" to avoid JSON truncation.
- Prefer parsing the first JSON object (or first fenced json block). If parsing fails, fall back to the SUMMARY: line.

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

DELEGATION SYNTAX (MANDATORY)
- Always use subagent_type parameter, never use category
- Example: delegate_task(subagent_type="paul-junior", prompt="...", run_in_background=false, skills=null)
- For skills: delegate_task(subagent_type="paul-junior", skills=["git-master"], prompt="...", run_in_background=false)

TODO DISCIPLINE
- One todo in_progress at a time
- Complete only after verification passes

VERIFICATION
- lsp_diagnostics, bun run build, Joshua must pass

ADVISORY WARNINGS
- Competency/TDD warnings may be injected; adjust delegation if needed

FULL POLICY
- See AGENTS.md for detailed rules and constraints
[/SYSTEM DIRECTIVE]
`

export function createPaulAgent(
   context: OrchestratorContext = {}
 ): AgentConfig {
   const agents = context.availableAgents ?? []
   
   const dynamicPrompt = PAUL_SYSTEM_PROMPT + `\n\n## AVAILABLE EXPERTS\n${buildAgentList(agents)}`

   return {
     name: "Paul",
     description: "Master Orchestrator (v4.0). Delegates to specialized agents, enforces TDD, and verifies quality. Cannot implement directly.",
     mode: "subagent" as const,
     model: context.model ?? "anthropic/claude-opus-4-5",
     prompt: dynamicPrompt,
     permission: createAgentToolRestrictions(["Paul"]).permission,
     temperature: 0.1,
   }
 }

 // Backward compatibility alias
 export const createOrchestratorSisyphusAgent = createPaulAgent
 export const paulAgent = createPaulAgent({})
