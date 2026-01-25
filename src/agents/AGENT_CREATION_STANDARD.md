# Agent Creation Standard

> Reference document for creating new agents in oh-my-lord-opencode.
> Follow this standard to ensure consistency and proper integration.
> 
> **Location**: Move this file to `src/agents/AGENT_CREATION_STANDARD.md` after review.

---

## Table of Contents

1. [Agent Classification](#1-agent-classification)
2. [File Structure](#2-file-structure)
3. [Required Exports](#3-required-exports)
4. [AgentPromptMetadata Interface](#4-agentpromptmetadata-interface)
5. [Permission Patterns](#5-permission-patterns)
6. [Model Configuration](#6-model-configuration)
7. [Prompt Structure Guidelines](#7-prompt-structure-guidelines)
8. [Registration Checklist](#8-registration-checklist)
9. [Testing Requirements](#9-testing-requirements)
10. [Examples by Category](#10-examples-by-category)

---

## 1. Agent Classification

### Agent Types

| Type | Role | Can Delegate? | Examples |
|------|------|---------------|----------|
| **Orchestrator** | Coordinate and delegate work | YES | Paul, Sisyphus |
| **Subagent** | Execute specialized tasks | NO | Oracle, Explore, Peter |

### Agent Categories

```typescript
type AgentCategory = "exploration" | "specialist" | "advisor" | "utility"
```

| Category | Purpose | Typical Model | Examples |
|----------|---------|---------------|----------|
| `exploration` | Search, research, discovery | FREE/CHEAP models | explore, librarian |
| `specialist` | Domain-specific implementation | Varies by domain | frontend-ui-ux, document-writer, peter, john |
| `advisor` | Consultation, review, planning | EXPENSIVE models | oracle, momus, ezra, thomas, timothy |
| `utility` | Specific utility functions | CHEAP models | multimodal-looker |

### Cost Classification

```typescript
type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE"
```

| Cost | When to Use | Model Examples |
|------|-------------|----------------|
| `FREE` | High-volume, background tasks | opencode/grok-code, opencode/glm-4.7-free |
| `CHEAP` | Standard operations | anthropic/claude-sonnet-4-5 |
| `EXPENSIVE` | Complex reasoning, critical decisions | anthropic/claude-opus-4-5, openai/gpt-5.2 |

---

## 2. File Structure

### File Location
```
src/agents/{agent-name}.ts
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| File name | kebab-case | `my-agent.ts` |
| Prompt constant | SCREAMING_SNAKE | `MY_AGENT_SYSTEM_PROMPT` |
| Factory function | camelCase with create prefix | `createMyAgent` |
| Default export | camelCase with Agent suffix | `myAgent` |
| Metadata export | SCREAMING_SNAKE | `MY_AGENT_PROMPT_METADATA` |

### Standard File Template

```typescript
import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "./types"
import { isGptModel } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

/**
 * {AgentName} - {Brief Description}
 *
 * Named after {etymology/cultural reference}.
 * {Why this name is appropriate for the agent's role}.
 *
 * {Key capabilities in bullet points}
 */

const DEFAULT_MODEL = "{model-provider}/{model-name}"

export const {AGENT_NAME}_SYSTEM_PROMPT = `{prompt content}`

export function create{AgentName}Agent(model: string = DEFAULT_MODEL): AgentConfig {
  // Implementation
}

export const {agentName}Agent = create{AgentName}Agent()

export const {AGENT_NAME}_PROMPT_METADATA: AgentPromptMetadata = {
  // Metadata
}
```

---

## 3. Required Exports

Every agent file MUST export:

| Export | Type | Purpose |
|--------|------|---------|
| `{AGENT}_SYSTEM_PROMPT` | `string` | The agent's system prompt |
| `create{Agent}Agent` | `(model?: string) => AgentConfig` | Factory function |
| `{agent}Agent` | `AgentConfig` | Default instance |
| `{AGENT}_PROMPT_METADATA` | `AgentPromptMetadata` | Sisyphus integration metadata |

### Factory Function Pattern

```typescript
export function createMyAgent(model: string = DEFAULT_MODEL): AgentConfig {
  // 1. Create tool restrictions
  const restrictions = createAgentToolRestrictions([
    "write",      // Block file writing
    "edit",       // Block file editing
    "task",       // Block todo management
    "delegate_task", // Block delegation (subagents only)
  ])

  // 2. Build base config
  const base = {
    description: "One-line description for agent selection UI",
    mode: "subagent" as const,
    model,
    temperature: 0.1,
    ...restrictions,
    prompt: MY_AGENT_SYSTEM_PROMPT,
  } as AgentConfig

  // 3. Handle model-specific configurations
  if (isGptModel(model)) {
    return { 
      ...base, 
      reasoningEffort: "medium", 
      textVerbosity: "high" 
    } as AgentConfig
  }

  // 4. Default: Claude with extended thinking
  return { 
    ...base, 
    thinking: { type: "enabled", budgetTokens: 32000 } 
  } as AgentConfig
}
```

---

## 4. AgentPromptMetadata Interface

```typescript
interface AgentPromptMetadata {
  /** Category for grouping in Sisyphus prompt sections */
  category: "exploration" | "specialist" | "advisor" | "utility"

  /** Cost classification for Tool Selection table */
  cost: "FREE" | "CHEAP" | "EXPENSIVE"

  /** Domain triggers for Delegation Table */
  triggers: DelegationTrigger[]

  /** When to use this agent (for detailed sections) */
  useWhen?: string[]

  /** When NOT to use this agent */
  avoidWhen?: string[]

  /** Nickname/alias used in prompt (e.g., "Oracle" instead of "oracle") */
  promptAlias?: string

  /** Key triggers for Phase 0 (e.g., "External library → fire librarian") */
  keyTrigger?: string

  /** Optional dedicated prompt section (markdown) */
  dedicatedSection?: string
}

interface DelegationTrigger {
  domain: string   // e.g., "Architecture decisions"
  trigger: string  // e.g., "Multi-system tradeoffs, unfamiliar patterns"
}
```

### Example Metadata

```typescript
export const MY_AGENT_PROMPT_METADATA: AgentPromptMetadata = {
  category: "advisor",
  cost: "CHEAP",
  promptAlias: "MyAgent",
  triggers: [
    { 
      domain: "Code review", 
      trigger: "After completing significant implementation" 
    },
    { 
      domain: "Quality assurance", 
      trigger: "Before merging to main branch" 
    },
  ],
  useWhen: [
    "After completing a feature",
    "Before creating a PR",
    "When code quality is uncertain",
  ],
  avoidWhen: [
    "Simple, single-file changes",
    "Trivial formatting fixes",
    "When user explicitly skips review",
  ],
  keyTrigger: "Feature complete → invoke MyAgent for review",
}
```

---

## 5. Permission Patterns

### Tool Restriction Functions

```typescript
import { createAgentToolRestrictions } from "../shared/permission-compat"

// Deny specific tools (allow all others)
const restrictions = createAgentToolRestrictions([
  "write",
  "edit", 
  "task",
  "delegate_task",
])

// Allow only specific tools (deny all others)
import { createAgentToolAllowlist } from "../shared/permission-compat"
const allowlist = createAgentToolAllowlist([
  "read",
  "grep",
  "glob",
])
```

### Standard Permission Sets by Agent Type

#### Read-Only Advisor (Oracle, Momus, Ezra, Thomas)
```typescript
const restrictions = createAgentToolRestrictions([
  "write",         // Cannot write files
  "edit",          // Cannot edit files
  "task",          // Cannot manage todos
  "delegate_task", // Cannot delegate to other agents
])
```

#### Exploration Agent (Explore, Librarian)
```typescript
const restrictions = createAgentToolRestrictions([
  "write",         // Cannot write files
  "edit",          // Cannot edit files
  "task",          // Cannot manage todos
  "delegate_task", // Cannot delegate
  "call_omo_agent", // Cannot spawn other agents
])
```

#### Implementation Agent (Sisyphus-Junior, Peter, John)
```typescript
const restrictions = createAgentToolRestrictions([
  "task",          // Cannot manage todos (orchestrator does this)
  "delegate_task", // Cannot delegate (works alone)
])
// Note: CAN write/edit files, CAN call_omo_agent for explore/librarian
```

#### Orchestrator (Paul, Sisyphus)
```typescript
// Orchestrators have FULL access to delegate_task
// They typically don't need restrictions
```

---

## 6. Model Configuration

### Default Models by Category

| Category | Recommended Model | Reasoning |
|----------|-------------------|-----------|
| Exploration | `opencode/grok-code` or `opencode/glm-4.7-free` | Fast, cheap, high volume |
| Specialist | `google/gemini-3-pro-preview` or `anthropic/claude-sonnet-4-5` | Good balance |
| Advisor | `anthropic/claude-sonnet-4-5` | Strong reasoning, moderate cost |
| Orchestrator | `anthropic/claude-opus-4-5` | Maximum reasoning capability |

### Model-Specific Configuration

```typescript
export function createMyAgent(model: string = DEFAULT_MODEL): AgentConfig {
  const base = { /* ... */ }

  // GPT models: Use reasoningEffort instead of thinking
  if (isGptModel(model)) {
    return { 
      ...base, 
      reasoningEffort: "medium",  // "low" | "medium" | "high"
      textVerbosity: "high"       // "low" | "medium" | "high"
    } as AgentConfig
  }

  // Claude models: Use extended thinking
  return { 
    ...base, 
    thinking: { 
      type: "enabled", 
      budgetTokens: 32000  // Adjust based on task complexity
    } 
  } as AgentConfig
}
```

### Temperature Guidelines

| Agent Type | Temperature | Reasoning |
|------------|-------------|-----------|
| Code generation | 0.1 | Deterministic, consistent output |
| Review/Analysis | 0.1-0.2 | Consistent evaluation |
| Creative writing | 0.3-0.5 | Some variation allowed |
| Exploration | 0.1 | Consistent search patterns |

---

## 7. Prompt Structure Guidelines

### Advisor Agent Prompt Structure

```markdown
# {Agent Name} - {Role Description}

## IDENTITY
- Who the agent is
- What they're named after (etymology)
- Core responsibilities

## INPUT
- What the agent receives
- Expected format
- Validation rules

## CONSTRAINTS
- READ-ONLY vs READ-WRITE
- Tool restrictions
- Scope limitations

## EVALUATION CRITERIA
- How to assess the input
- Scoring/rating systems
- Pass/fail conditions

## OUTPUT FORMAT
- Structured output template
- Required sections
- Example output

## CRITICAL RULES
- NEVER do X
- ALWAYS do Y
- Edge case handling
```

### Exploration Agent Prompt Structure

```markdown
# {Agent Name}

## Your Mission
- Primary purpose
- Types of questions answered

## PHASE 0: Classification
- Request type classification
- Tool selection based on type

## PHASE N: Execution
- Step-by-step process
- Tool usage patterns

## Output Format
- Required structure
- Success criteria

## Failure Conditions
- What constitutes failure
- How to recover
```

### Implementation Agent Prompt Structure

```markdown
<Role>
{Agent Name} - {Brief role description}
</Role>

<Critical_Constraints>
BLOCKED ACTIONS:
- tool1: BLOCKED
- tool2: BLOCKED

ALLOWED:
- tool3: Description
</Critical_Constraints>

<Work_Context>
## File Locations
- Where to read from
- Where to write to

## Rules
- NEVER modify X
- ALWAYS verify Y
</Work_Context>

<Output_Standards>
## File Structure
- Template for output files
- Naming conventions

## Patterns
- Code patterns to follow
- Anti-patterns to avoid
</Output_Standards>
```

---

## 8. Registration Checklist

When creating a new agent, update these files:

### 1. Create Agent File
```
src/agents/{agent-name}.ts
```

### 2. Update types.ts
Add to `BuiltinAgentName` union:
```typescript
export type BuiltinAgentName =
  | /* existing agents */
  | "{Agent Name (Role)}"  // e.g., "Ezra (Plan Reviewer)"
```

### 3. Update index.ts
```typescript
// Add import
import { {agent}Agent } from "./{agent-name}"

// Add to builtinAgents
export const builtinAgents: Record<string, AgentConfig> = {
  /* existing agents */
  "{Agent Name (Role)}": {agent}Agent,
}
```

### 4. Update utils.ts
```typescript
// Add imports
import { create{Agent}Agent, {AGENT}_PROMPT_METADATA } from "./{agent-name}"

// Add to agentSources
const agentSources: Record<BuiltinAgentName, AgentSource> = {
  /* existing agents */
  "{Agent Name (Role)}": create{Agent}Agent,
}

// Add to agentMetadata
const agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> = {
  /* existing agents */
  "{Agent Name (Role)}": {AGENT}_PROMPT_METADATA,
}
```

### 5. Update AGENTS.md
Add row to agent table:
```markdown
| {Agent} | {model} | {Brief description} |
```

---

## 9. Testing Requirements

### Required Test File
```
src/agents/{agent-name}.test.ts
```

### Minimum Test Coverage

```typescript
import { describe, test, expect } from "bun:test"
import {
  {AGENT}_SYSTEM_PROMPT,
  create{Agent}Agent,
  {agent}Agent,
  {AGENT}_PROMPT_METADATA,
} from "./{agent-name}"

// 1. Export verification
describe("{agent}Agent exports", () => {
  test("should export {AGENT}_SYSTEM_PROMPT as non-empty string", () => {
    expect(typeof {AGENT}_SYSTEM_PROMPT).toBe("string")
    expect({AGENT}_SYSTEM_PROMPT.length).toBeGreaterThan(100)
  })

  test("should export create{Agent}Agent factory function", () => {
    expect(typeof create{Agent}Agent).toBe("function")
  })

  test("should export {agent}Agent as AgentConfig", () => {
    expect({agent}Agent).toBeDefined()
    expect({agent}Agent.prompt).toBe({AGENT}_SYSTEM_PROMPT)
  })
})

// 2. Factory function tests
describe("create{Agent}Agent factory", () => {
  test("should use default model when no model provided", () => {
    const agent = create{Agent}Agent()
    expect(agent.model).toBe("{expected-default-model}")
  })

  test("should use provided model when specified", () => {
    const agent = create{Agent}Agent("openai/gpt-4o")
    expect(agent.model).toBe("openai/gpt-4o")
  })

  test("should set correct temperature", () => {
    const agent = create{Agent}Agent()
    expect(agent.temperature).toBe(0.1)
  })

  test("should set mode to subagent", () => {
    const agent = create{Agent}Agent()
    expect(agent.mode).toBe("subagent")
  })

  test("should configure thinking for Claude models", () => {
    const agent = create{Agent}Agent("anthropic/claude-sonnet-4-5")
    expect(agent.thinking).toEqual({ type: "enabled", budgetTokens: 32000 })
  })

  test("should configure reasoningEffort for GPT models", () => {
    const agent = create{Agent}Agent("openai/gpt-5.2")
    expect(agent.reasoningEffort).toBe("medium")
  })
})

// 3. Metadata tests
describe("{AGENT}_PROMPT_METADATA", () => {
  test("should have correct category", () => {
    expect({AGENT}_PROMPT_METADATA.category).toBe("{expected-category}")
  })

  test("should have correct cost", () => {
    expect({AGENT}_PROMPT_METADATA.cost).toBe("{expected-cost}")
  })

  test("should have promptAlias", () => {
    expect({AGENT}_PROMPT_METADATA.promptAlias).toBe("{ExpectedAlias}")
  })

  test("should have triggers array", () => {
    expect({AGENT}_PROMPT_METADATA.triggers).toBeInstanceOf(Array)
    expect({AGENT}_PROMPT_METADATA.triggers.length).toBeGreaterThan(0)
  })
})

// 4. Prompt content tests (domain-specific)
describe("{AGENT}_SYSTEM_PROMPT content", () => {
  test("should include key feature X", () => {
    expect({AGENT}_SYSTEM_PROMPT.toLowerCase()).toMatch(/feature-x/)
  })
  
  // Add tests for all critical prompt features
})
```

---

## 10. Examples by Category

### Advisor Agent Example (Ezra)

```typescript
// Key characteristics:
// - Read-only (blocks write, edit, task, delegate_task)
// - Uses Sonnet model (CHEAP cost)
// - Structured evaluation criteria
// - Confidence scoring
// - Clear verdict output

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"

export const EZRA_PROMPT_METADATA: AgentPromptMetadata = {
  category: "advisor",
  cost: "CHEAP",
  promptAlias: "Ezra",
  triggers: [
    { domain: "Plan review", trigger: "Evaluate work plans with confidence-scored feedback" },
  ],
  useWhen: ["After planner-paul creates an implementation plan"],
  avoidWhen: ["Simple, single-task requests"],
  keyTrigger: "Implementation plan created → invoke Ezra for review",
}
```

### Exploration Agent Example (Explore)

```typescript
// Key characteristics:
// - Read-only + no agent spawning
// - Uses FREE model (grok-code)
// - Parallel tool execution
// - Structured results format
// - Intent analysis required

const DEFAULT_MODEL = "opencode/grok-code"

export const EXPLORE_PROMPT_METADATA: AgentPromptMetadata = {
  category: "exploration",
  cost: "FREE",
  promptAlias: "Explore",
  keyTrigger: "2+ modules involved → fire `explore` background",
  triggers: [
    { domain: "Explore", trigger: "Find existing codebase structure, patterns and styles" },
  ],
  useWhen: ["Multiple search angles needed", "Unfamiliar module structure"],
  avoidWhen: ["You know exactly what to search", "Single keyword suffices"],
}
```

### Implementation Agent Example (Peter)

```typescript
// Key characteristics:
// - Can write/edit files (test files only)
// - Blocks delegation
// - Follows strict output format
// - BDD comment pattern required
// - Domain-specific (Jest tests)

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"

export const PETER_PROMPT_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "CHEAP",
  promptAlias: "Peter",
  triggers: [
    { domain: "Unit testing", trigger: "Write Jest unit tests from Solomon's specs" },
  ],
  useWhen: ["TDD workflow: after Solomon generates test specs"],
  avoidWhen: ["E2E tests needed (use John instead)"],
}
```

---

## Quick Reference Card

### Creating a New Subagent

1. **Decide category**: exploration | specialist | advisor | utility
2. **Choose model**: FREE (exploration) | CHEAP (most) | EXPENSIVE (critical)
3. **Define permissions**: What tools should be blocked?
4. **Write prompt**: Follow category-specific structure
5. **Create file**: `src/agents/{name}.ts`
6. **Export**: PROMPT, factory, instance, METADATA
7. **Register**: types.ts → index.ts → utils.ts → AGENTS.md
8. **Test**: Create `{name}.test.ts` with minimum coverage

### Naming Convention Summary

| Element | Pattern | Example |
|---------|---------|---------|
| File | `{kebab-case}.ts` | `my-agent.ts` |
| Prompt | `{SCREAMING_SNAKE}_SYSTEM_PROMPT` | `MY_AGENT_SYSTEM_PROMPT` |
| Factory | `create{PascalCase}Agent` | `createMyAgent` |
| Instance | `{camelCase}Agent` | `myAgent` |
| Metadata | `{SCREAMING_SNAKE}_PROMPT_METADATA` | `MY_AGENT_PROMPT_METADATA` |
| Registry key | `"{Name} ({Role})"` | `"MyAgent (Reviewer)"` |

---

## Orchestrator vs Subagent Summary

| Aspect | Orchestrator | Subagent |
|--------|--------------|----------|
| **Role** | Coordinate, delegate, verify | Execute specialized tasks |
| **delegate_task** | ✅ Full access | ❌ Blocked |
| **call_omo_agent** | ✅ Full access | ⚠️ Varies (explore/librarian only for some) |
| **write/edit** | ⚠️ Rarely used directly | ✅ Implementation agents only |
| **Prompt size** | Large (500-2000 lines) | Medium (100-500 lines) |
| **Temperature** | 0.1 | 0.1-0.2 |
| **Model** | Opus (expensive) | Sonnet/cheaper |
| **Verification** | Obsessive (lsp, build, test) | Self-contained |

---

*Last updated: 2026-01-18*
*Version: 1.0.0*
