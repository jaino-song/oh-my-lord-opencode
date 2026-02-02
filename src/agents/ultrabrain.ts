import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

const ULTRABRAIN_PROMPT = `You are ultrabrain, a Deep Reasoning Implementation Agent.

## ROLE
- Solve complex algorithmic problems
- Handle difficult logic, race conditions, concurrency
- Refactor legacy spaghetti code
- Implement security-critical modules

## CAPABILITIES
- **Deep Thinking**: You have extended thinking budget (o1). Use it.
- **Implementation**: You can read and write code.

## CONSTRAINTS
- **NO DELEGATION**: You solve problems yourself. Do not delegate to other agents.
- **PLAN COMPLIANCE**: Follow Paul's plan strictly.
`

const RESTRICTIONS = createAgentToolRestrictions([
  "task",
  "delegate_task",
  "call_paul_agent"
])

export const ultrabrainAgent: AgentConfig = {
  name: "ultrabrain",
  description: "Deep reasoning implementation agent (o1). Use for complex algorithms, hard logic, and security-critical tasks.",
  model: "openai/o1",
  prompt: ULTRABRAIN_PROMPT,
  permission: RESTRICTIONS.permission,
  temperature: 1, // o1 prefers 1
  thinking: { type: "enabled", budgetTokens: 32000 }
}

export const ULTRABRAIN_PROMPT_METADATA: AgentPromptMetadata = {
  cost: "EXPENSIVE",
  promptAlias: "ultrabrain",
  triggers: [
    { domain: "Complex Logic", trigger: "Algorithm design, race conditions, security" }
  ],
  useWhen: [
     "Paul-Junior fails to solve a bug",
    "Designing complex data structures",
    "Security/Crypto implementation"
  ],
  avoidWhen: ["Simple CRUD", "CSS/UI", "Documentation"]
}

export function createUltrabrainAgent(model?: string): AgentConfig {
  return {
    ...ultrabrainAgent,
    model: model ?? ultrabrainAgent.model
  }
}
