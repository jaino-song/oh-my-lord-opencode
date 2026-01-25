# TDD Enforcement Gate Hook - Phase-Based Agent Delegation

## Context

### Problem
Paul (orchestrator) can:
1. "Forget" to run tests before completing tasks
2. Do work himself instead of delegating to specialized agents (wastes tokens/time)
3. Skip phases or move to next phase without approval

### Solution
Create a **phase-based enforcement system** that:
1. **BLOCKS** Paul from doing work that specialized agents should do
2. **REQUIRES** delegation to responsible agents for each phase
3. **GATES** phase transitions until responsible agent completes/approves

---

## Phase Structure & Responsible Agents

| Phase | Responsible Agent | Paul's Role | Gate Condition |
|-------|-------------------|-------------|----------------|
| **1. Research** | `explore`, `librarian` | Delegate only | At least 1 explore/librarian call |
| **2. Test Planning** | `Solomon (TDD Planner)` | Delegate only | Solomon called, test specs exist |
| **3. Test Writing** | `Peter` (unit), `John` (E2E) | Delegate only | Peter and/or John called |
| **4. Implementation** | `Sisyphus-Junior` (via category) | Delegate only | delegate_task with category called |
| **5. Test Verification** | `Joshua (Test Runner)` | Delegate only | Joshua called AND tests pass |
| **6. Completion** | Paul | Mark complete | All above phases satisfied |

---

## Blocking Rules (Token/Time Savings)

### What Paul CANNOT Do Directly

| Action | Blocked Tool | Required Delegation |
|--------|--------------|---------------------|
| Write test files (*.test.ts, *.spec.ts) | Write, Edit | Peter or John |
| Run test commands (bun test, jest, etc.) | Bash | Joshua |
| Write implementation code | Write, Edit | Sisyphus-Junior via category |
| Search codebase (>3 calls) | Grep, Glob | **BLOCKED** → explore agent |
| Fetch external docs (>3 calls) | webfetch, context7 | **BLOCKED** → librarian agent |

### Blocking Messages

When Paul attempts blocked actions, inject:
```
[DELEGATION REQUIRED - BLOCKED]

You are attempting to {action} directly. This MUST be delegated.

Required: delegate_task(agent="{agent}", prompt="...", run_in_background=false, skills=null)

Paul is an ORCHESTRATOR. You delegate, verify, and coordinate - you do NOT implement.
```

---

## Work Objectives

### Core Objective
Create a comprehensive phase-based enforcement hook that blocks Paul from doing delegated work and gates phase transitions.

### Concrete Deliverables

**4 files need changes:**

1. **`src/hooks/tdd-enforcement/index.ts`** - Enhanced hook implementation with:
   - Phase tracking per session
   - Blocking rules for direct work
   - Phase gate conditions
   - Agent call tracking

2. **`src/index.ts`** - Enable the hook:
   - Import `createTddEnforcementHook`
   - Instantiate the hook
   - Wire into `tool.execute.before` and `tool.execute.after`

3. **`src/config/schema.ts`** - Add to config schema:
   - Add `"tdd-enforcement"` to `HookNameSchema`

4. **`src/agents/orchestrator-sisyphus.ts`** - Update Paul's prompt:
   - Add delegation rules section so Paul knows to delegate first time
   - Prevents wasted tokens from blocked attempts

### Definition of Done
- [ ] Paul cannot write test files directly (blocked, must delegate to Peter/John)
- [ ] Paul cannot run tests directly (blocked, must delegate to Joshua)
- [ ] Paul cannot write implementation code directly (blocked, must delegate via category)
- [ ] Paul cannot make >3 search calls (blocked, must delegate to explore)
- [ ] Paul cannot make >3 doc fetch calls (blocked, must delegate to librarian)
- [ ] Paul cannot complete tasks until Joshua passes
- [ ] Phase transitions are gated by responsible agent completion

---

## TODOs

- [ ] 1. Define phase and session state interfaces

  **What to do**:
  ```typescript
  type Phase = "research" | "test-planning" | "test-writing" | "implementation" | "verification" | "complete"
  
  interface SessionPhaseState {
    currentPhase: Phase
    agentsCalled: Set<string>  // Track which agents were invoked
    phaseCompleted: Record<Phase, boolean>
    codeFilesChanged: Set<string>
    testFilesExist: boolean
    joshuaResult: "pending" | "pass" | "fail"
  }
  ```

- [ ] 2. Implement blocking rules for direct work

  **What to do**:
  - Block Write/Edit on test files → Require Peter/John
  - Block Write/Edit on implementation files → Require Sisyphus-Junior
  - Block Bash with test commands → Require Joshua
  - Block excessive Grep/Glob → Require explore
  - Block webfetch/context7 for docs → Require librarian

  **Detection patterns**:
  ```typescript
  const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/
  const TEST_COMMANDS = /\b(bun test|jest|vitest|pytest|npm test|yarn test)\b/
  ```

- [ ] 3. Implement phase gate conditions

  **What to do**:
  - Research → Test Planning: At least 1 explore OR librarian called
  - Test Planning → Test Writing: Solomon called
  - Test Writing → Implementation: Peter OR John called
  - Implementation → Verification: delegate_task with category called
  - Verification → Complete: Joshua called AND result = "pass"

- [ ] 4. Track agent invocations via delegate_task

  **What to do**:
  - In `tool.execute.after` for `delegate_task`
  - Parse `agent` or `subagent_type` argument
  - Add to `agentsCalled` set
  - Update phase completion status

- [ ] 5. Implement phase transition logic

  **What to do**:
  - Check gate conditions before allowing phase advancement
  - Inject blocking message if conditions not met
  - Auto-advance phase when conditions are satisfied

- [ ] 6. Enable hook in src/index.ts

  **What to do**:
  - Import `createTddEnforcementHook` from hooks
  - Add `isHookEnabled("tdd-enforcement")` check
  - Create hook instance
  - Wire into `tool.execute.before` and `tool.execute.after`

  **File**: `src/index.ts`

- [ ] 7. Add hook to config schema

  **What to do**:
  - Add `"tdd-enforcement"` to `HookNameSchema` enum in `src/config/schema.ts`

  **File**: `src/config/schema.ts`

- [ ] 8. Update Paul's prompt with delegation rules

  **What to do**:
  - Add a "MANDATORY DELEGATION RULES" section to Paul's system prompt
  - Tell Paul he CANNOT: write tests, run tests, write code, excessive searches/docs
  - Tell Paul he MUST delegate to: Peter/John, Joshua, Sisyphus-Junior, explore, librarian
  - This prevents wasted tokens from blocked attempts

  **File**: `src/agents/orchestrator-sisyphus.ts`

  **Add this section to Paul's prompt:**
  ```
  ## MANDATORY DELEGATION RULES (ENFORCED BY SYSTEM)

  You CANNOT perform these actions directly - they will be BLOCKED:

  | Action | You CANNOT | You MUST Delegate To |
  |--------|------------|---------------------|
  | Write test files | Write/Edit *.test.ts, *.spec.ts | Peter (unit) or John (E2E) |
  | Run tests | Bash with test commands | Joshua (Test Runner) |
  | Write implementation code | Write/Edit *.ts, *.tsx, etc. | Sisyphus-Junior via category |
  | Search codebase (>3 calls) | Grep, Glob | explore agent |
  | Fetch docs (>3 calls) | webfetch, context7 | librarian agent |
  | Complete tasks | Without Joshua passing | Joshua must pass first |

  These rules are ENFORCED by the tdd-enforcement hook. Attempts will be blocked.
  Delegate FIRST to avoid wasted tokens.
  ```

- [ ] 9. Add tests and verify

  **What to do**:
  - Create `src/hooks/tdd-enforcement/index.test.ts`
  - Test blocking rules
  - Test phase gates
  - Run `bun test tdd-enforcement`
  - Run `bun run build`

---

## Implementation Code

Replace `src/hooks/tdd-enforcement/index.ts` with:

```typescript
import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { log } from "../../shared/logger"
import { getSessionAgent } from "../../features/claude-code-session-state"

const HOOK_NAME = "tdd-enforcement"

// Patterns
const CODE_FILE_PATTERN = /\.(ts|tsx|js|jsx|py|go|java|cpp|c|rs)$/
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx|py)$|^test_.*\.py$/
const TEST_COMMANDS = /\b(bun test|jest|vitest|pytest|npm test|yarn test|npm run test|bun run test)\b/i
const WRITE_EDIT_TOOLS = ["mcp_write", "mcp_edit", "Write", "Edit", "write", "edit"]
const SEARCH_TOOLS = ["mcp_grep", "mcp_glob", "Grep", "Glob", "grep", "glob"]
const DOC_TOOLS = ["mcp_webfetch", "mcp_context7_query-docs", "mcp_context7_resolve-library-id"]

// Orchestrator agents that need enforcement
const ORCHESTRATOR_AGENTS = ["Paul", "orchestrator-sisyphus", "Sisyphus"]

// Responsible agents for each task type
const RESPONSIBLE_AGENTS = {
  testWriting: ["Peter (Test Writer)", "John (E2E Test Writer)", "Peter", "John"],
  testRunning: ["Joshua (Test Runner)", "Joshua"],
  exploration: ["explore"],
  documentation: ["librarian"],
  testPlanning: ["Solomon (TDD Planner)", "Solomon"],
  implementation: ["Sisyphus-Junior"], // via category delegation
}

type Phase = "research" | "test-planning" | "test-writing" | "implementation" | "verification" | "complete"

interface SessionPhaseState {
  currentPhase: Phase
  agentsCalled: Set<string>
  phaseCompleted: Record<Phase, boolean>
  codeFilesChanged: Set<string>
  testFilesChanged: Set<string>
  searchCallCount: number
  docCallCount: number
  joshuaResult: "pending" | "pass" | "fail"
  lastCodeChangeTime: number
  lastJoshuaCallTime: number
}

const sessionState = new Map<string, SessionPhaseState>()

function getOrCreateState(sessionID: string): SessionPhaseState {
  if (!sessionState.has(sessionID)) {
    sessionState.set(sessionID, {
      currentPhase: "research",
      agentsCalled: new Set(),
      phaseCompleted: {
        "research": false,
        "test-planning": false,
        "test-writing": false,
        "implementation": false,
        "verification": false,
        "complete": false,
      },
      codeFilesChanged: new Set(),
      testFilesChanged: new Set(),
      searchCallCount: 0,
      docCallCount: 0,
      joshuaResult: "pending",
      lastCodeChangeTime: 0,
      lastJoshuaCallTime: 0,
    })
  }
  return sessionState.get(sessionID)!
}

function resetState(sessionID: string): void {
  sessionState.delete(sessionID)
}

function isOrchestratorSession(sessionID: string, inputAgent?: string): boolean {
  const sessionAgent = getSessionAgent(sessionID)
  const agent = inputAgent || sessionAgent
  return agent ? ORCHESTRATOR_AGENTS.includes(agent) : false
}

function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath)
}

function isCodeFile(filePath: string): boolean {
  if (!filePath) return false
  if (isTestFile(filePath)) return false // Test files handled separately
  return CODE_FILE_PATTERN.test(filePath)
}

function isTestCommand(command: string): boolean {
  return TEST_COMMANDS.test(command)
}

function hasTestSpecs(workspaceRoot: string): boolean {
  const paulPlansDir = join(workspaceRoot, ".paul/plans")
  const sisyphusPlansDir = join(workspaceRoot, ".sisyphus/plans")
  
  for (const plansDir of [paulPlansDir, sisyphusPlansDir]) {
    if (existsSync(plansDir)) {
      try {
        const files = readdirSync(plansDir)
        if (files.some(file => file.endsWith("-tests.md"))) {
          return true
        }
      } catch {}
    }
  }
  return false
}

function agentWasCalled(state: SessionPhaseState, agentList: string[]): boolean {
  return agentList.some(agent => 
    Array.from(state.agentsCalled).some(called => 
      called.toLowerCase().includes(agent.toLowerCase())
    )
  )
}

function checkPhaseGate(state: SessionPhaseState, workspaceRoot: string): { canProceed: boolean; blockedReason?: string } {
  const phase = state.currentPhase

  switch (phase) {
    case "research":
      // Can proceed if explore OR librarian was called, or skip if simple task
      if (agentWasCalled(state, [...RESPONSIBLE_AGENTS.exploration, ...RESPONSIBLE_AGENTS.documentation])) {
        return { canProceed: true }
      }
      return { 
        canProceed: false, 
        blockedReason: "Research phase requires delegating to explore or librarian agents first." 
      }

    case "test-planning":
      if (agentWasCalled(state, RESPONSIBLE_AGENTS.testPlanning) || hasTestSpecs(workspaceRoot)) {
        return { canProceed: true }
      }
      return { 
        canProceed: false, 
        blockedReason: "Test planning requires Solomon. Call: delegate_task(agent=\"Solomon (TDD Planner)\", ...)" 
      }

    case "test-writing":
      if (agentWasCalled(state, RESPONSIBLE_AGENTS.testWriting) || state.testFilesChanged.size > 0) {
        return { canProceed: true }
      }
      return { 
        canProceed: false, 
        blockedReason: "Test writing requires Peter or John. Call: delegate_task(agent=\"Peter (Test Writer)\", ...) or delegate_task(agent=\"John (E2E Test Writer)\", ...)" 
      }

    case "implementation":
      if (state.codeFilesChanged.size > 0) {
        return { canProceed: true }
      }
      return { 
        canProceed: false, 
        blockedReason: "Implementation requires delegating via category. Call: delegate_task(category=\"general\", ...) or delegate_task(category=\"visual-engineering\", ...)" 
      }

    case "verification":
      if (agentWasCalled(state, RESPONSIBLE_AGENTS.testRunning) && state.joshuaResult === "pass") {
        return { canProceed: true }
      }
      if (!agentWasCalled(state, RESPONSIBLE_AGENTS.testRunning)) {
        return { 
          canProceed: false, 
          blockedReason: "Verification requires Joshua. Call: delegate_task(agent=\"Joshua (Test Runner)\", prompt=\"Run all tests\", run_in_background=false, skills=null)" 
        }
      }
      return { 
        canProceed: false, 
        blockedReason: `Joshua was called but tests ${state.joshuaResult === "fail" ? "FAILED" : "result unknown"}. Fix issues and re-run.` 
      }

    case "complete":
      return { canProceed: true }

    default:
      return { canProceed: true }
  }
}

function getAgentFromDelegateTask(args: Record<string, unknown>): string | null {
  const agent = args.agent as string | undefined
  const subagentType = args.subagent_type as string | undefined
  const category = args.category as string | undefined
  
  if (agent) return agent
  if (subagentType) return subagentType
  if (category) return `category:${category}`
  return null
}

function createBlockingMessage(action: string, requiredAgent: string, delegateExample: string): string {
  return `
[DELEGATION REQUIRED - BLOCKED]

You are attempting to ${action} directly. This MUST be delegated to a specialized agent.

**Required Agent**: ${requiredAgent}
**Example**: ${delegateExample}

Paul is an ORCHESTRATOR. You delegate, verify, and coordinate - you do NOT implement directly.

This saves tokens and ensures specialized agents handle their designated tasks.
`
}

export function createTddEnforcementHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string; agent?: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      // Only enforce for orchestrator agents
      if (!isOrchestratorSession(input.sessionID, input.agent)) {
        return
      }

      const toolName = input.tool
      const state = getOrCreateState(input.sessionID)

      // === BLOCKING RULES ===

      // 1. Block direct test file writing → Require Peter/John
      if (WRITE_EDIT_TOOLS.includes(toolName)) {
        const filePath = (output.args.filePath ?? output.args.path ?? output.args.file) as string | undefined
        
        if (filePath && isTestFile(filePath)) {
          if (!agentWasCalled(state, RESPONSIBLE_AGENTS.testWriting)) {
            output.message = createBlockingMessage(
              "write test files",
              "Peter (Test Writer) or John (E2E Test Writer)",
              `delegate_task(agent="Peter (Test Writer)", prompt="Write unit tests for [feature]", run_in_background=false, skills=null)`
            )
            log(`[${HOOK_NAME}] BLOCKED: Direct test file write`, { sessionID: input.sessionID, filePath })
            return
          }
        }

        // 2. Block direct implementation code writing → Require category delegation
        if (filePath && isCodeFile(filePath)) {
          // Check if any implementation delegation happened
          const hasImplementationDelegation = Array.from(state.agentsCalled).some(a => 
            a.startsWith("category:") || a === "Sisyphus-Junior"
          )
          
          if (!hasImplementationDelegation) {
            output.message = createBlockingMessage(
              "write implementation code",
              "Sisyphus-Junior (via category delegation)",
              `delegate_task(category="general", prompt="Implement [feature]", run_in_background=false, skills=null)`
            )
            log(`[${HOOK_NAME}] BLOCKED: Direct code write`, { sessionID: input.sessionID, filePath })
            return
          }
        }
      }

      // 3. Block direct test running → Require Joshua
      if (toolName === "mcp_bash" || toolName === "Bash" || toolName === "bash") {
        const command = (output.args.command ?? output.args.cmd) as string | undefined
        
        if (command && isTestCommand(command)) {
          if (!agentWasCalled(state, RESPONSIBLE_AGENTS.testRunning)) {
            output.message = createBlockingMessage(
              "run tests",
              "Joshua (Test Runner)",
              `delegate_task(agent="Joshua (Test Runner)", prompt="Run all tests", run_in_background=false, skills=null)`
            )
            log(`[${HOOK_NAME}] BLOCKED: Direct test command`, { sessionID: input.sessionID, command })
            return
          }
        }
      }

      // 4. BLOCK excessive search without delegation → Require explore
      if (SEARCH_TOOLS.includes(toolName)) {
        state.searchCallCount++
        if (state.searchCallCount > 3 && !agentWasCalled(state, RESPONSIBLE_AGENTS.exploration)) {
          output.message = createBlockingMessage(
            `perform codebase searches (${state.searchCallCount} calls exceeded limit of 3)`,
            "explore",
            `delegate_task(agent="explore", prompt="Find all [pattern] in codebase", run_in_background=true, skills=null)`
          )
          log(`[${HOOK_NAME}] BLOCKED: Excessive search calls`, { sessionID: input.sessionID, count: state.searchCallCount })
          return
        }
      }

      // 5. BLOCK excessive doc fetching without delegation → Require librarian
      if (DOC_TOOLS.includes(toolName)) {
        state.docCallCount++
        if (state.docCallCount > 3 && !agentWasCalled(state, RESPONSIBLE_AGENTS.documentation)) {
          output.message = createBlockingMessage(
            `fetch documentation (${state.docCallCount} calls exceeded limit of 3)`,
            "librarian",
            `delegate_task(agent="librarian", prompt="Research [topic] documentation and best practices", run_in_background=true, skills=null)`
          )
          log(`[${HOOK_NAME}] BLOCKED: Excessive doc calls`, { sessionID: input.sessionID, count: state.docCallCount })
          return
        }
      }

      // === PHASE GATE CHECK ON TODO COMPLETION ===
      if (toolName === "mcp_todowrite" || toolName === "todowrite") {
        const todos = output.args.todos as Array<{ status?: string; content?: string }> | undefined
        if (!todos) return

        const hasCompletingTodo = todos.some(todo => 
          todo.status === "completed" && 
          todo.content && 
          !todo.content.toLowerCase().includes("research") &&
          !todo.content.toLowerCase().includes("delegate")
        )

        if (hasCompletingTodo) {
          // Check if we're trying to complete implementation without verification
          if (state.codeFilesChanged.size > 0) {
            const gate = checkPhaseGate({ ...state, currentPhase: "verification" }, ctx.directory)
            if (!gate.canProceed) {
              output.message = `
[PHASE GATE - BLOCKED]

Cannot mark tasks complete. ${gate.blockedReason}

**Current State**:
- Code files changed: ${state.codeFilesChanged.size}
- Joshua called: ${agentWasCalled(state, RESPONSIBLE_AGENTS.testRunning) ? "Yes" : "NO"}
- Test result: ${state.joshuaResult}

Complete verification phase before marking tasks done.
`
              log(`[${HOOK_NAME}] BLOCKED: Todo completion without verification`, { 
                sessionID: input.sessionID,
                codeFilesChanged: state.codeFilesChanged.size,
                joshuaResult: state.joshuaResult,
              })
            }
          }
        }
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string; agent?: string },
      output: { args: Record<string, unknown>; output?: string; result?: unknown; message?: string }
    ): Promise<void> => {
      // Only track for orchestrator agents
      if (!isOrchestratorSession(input.sessionID, input.agent)) {
        return
      }

      const toolName = input.tool
      const state = getOrCreateState(input.sessionID)

      // Track delegate_task calls to record agent invocations
      if (toolName === "delegate_task" || toolName === "mcp_task") {
        const agent = getAgentFromDelegateTask(output.args)
        if (agent) {
          state.agentsCalled.add(agent)
          log(`[${HOOK_NAME}] Agent called via delegation`, { 
            sessionID: input.sessionID, 
            agent,
            totalAgentsCalled: state.agentsCalled.size,
          })

          // Check for Joshua result
          if (RESPONSIBLE_AGENTS.testRunning.some(a => agent.toLowerCase().includes(a.toLowerCase()))) {
            state.lastJoshuaCallTime = Date.now()
            
            const outputStr = typeof output.output === "string" ? output.output : ""
            if (outputStr.toLowerCase().includes("all tests pass") || 
                outputStr.toLowerCase().includes("tests passed") ||
                outputStr.toLowerCase().includes("0 failed")) {
              state.joshuaResult = "pass"
              state.codeFilesChanged.clear() // Clear on successful verification
              log(`[${HOOK_NAME}] Joshua PASSED - verification complete`, { sessionID: input.sessionID })
            } else if (outputStr.toLowerCase().includes("fail") || outputStr.toLowerCase().includes("error")) {
              state.joshuaResult = "fail"
              log(`[${HOOK_NAME}] Joshua FAILED - fixes required`, { sessionID: input.sessionID })
            }
          }

          // Track test file changes from Peter/John
          if (RESPONSIBLE_AGENTS.testWriting.some(a => agent.toLowerCase().includes(a.toLowerCase()))) {
            state.phaseCompleted["test-writing"] = true
          }
        }
      }

      // Track file changes (for subagent work, not direct - but record for state)
      if (WRITE_EDIT_TOOLS.includes(toolName)) {
        const filePath = (output.args.filePath ?? output.args.path ?? output.args.file) as string | undefined
        if (filePath) {
          if (isTestFile(filePath)) {
            state.testFilesChanged.add(filePath)
          } else if (isCodeFile(filePath)) {
            state.codeFilesChanged.add(filePath)
            state.lastCodeChangeTime = Date.now()
            
            // Reset verification if code changed after Joshua
            if (state.lastCodeChangeTime > state.lastJoshuaCallTime) {
              state.joshuaResult = "pending"
            }
          }
        }
      }
    },
  }
}

// Exports for testing
export { 
  sessionState, 
  resetState, 
  getOrCreateState, 
  isTestFile, 
  isCodeFile, 
  isTestCommand,
  checkPhaseGate,
  RESPONSIBLE_AGENTS,
}
export type { SessionPhaseState, Phase }
```

---

## Test File

Create `src/hooks/tdd-enforcement/index.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from "bun:test"
import { 
  isTestFile, 
  isCodeFile, 
  isTestCommand,
  resetState,
  getOrCreateState,
  checkPhaseGate,
  RESPONSIBLE_AGENTS,
} from "./index"

describe("tdd-enforcement", () => {
  beforeEach(() => {
    resetState("test-session")
  })

  describe("file detection", () => {
    test("should detect test files", () => {
      expect(isTestFile("foo.test.ts")).toBe(true)
      expect(isTestFile("bar.spec.tsx")).toBe(true)
      expect(isTestFile("test_utils.py")).toBe(true)
      expect(isTestFile("utils.ts")).toBe(false)
      expect(isTestFile("component.tsx")).toBe(false)
    })

    test("should detect code files (excluding tests)", () => {
      expect(isCodeFile("utils.ts")).toBe(true)
      expect(isCodeFile("component.tsx")).toBe(true)
      expect(isCodeFile("foo.test.ts")).toBe(false)
      expect(isCodeFile("bar.spec.tsx")).toBe(false)
    })
  })

  describe("command detection", () => {
    test("should detect test commands", () => {
      expect(isTestCommand("bun test")).toBe(true)
      expect(isTestCommand("npm test")).toBe(true)
      expect(isTestCommand("jest --watch")).toBe(true)
      expect(isTestCommand("vitest run")).toBe(true)
      expect(isTestCommand("bun run build")).toBe(false)
      expect(isTestCommand("npm install")).toBe(false)
    })
  })

  describe("phase gates", () => {
    test("should block verification without Joshua", () => {
      const state = getOrCreateState("test-session")
      state.currentPhase = "verification"
      state.codeFilesChanged.add("src/utils.ts")
      
      const result = checkPhaseGate(state, "/tmp")
      
      expect(result.canProceed).toBe(false)
      expect(result.blockedReason).toContain("Joshua")
    })

    test("should allow verification after Joshua passes", () => {
      const state = getOrCreateState("test-session")
      state.currentPhase = "verification"
      state.codeFilesChanged.add("src/utils.ts")
      state.agentsCalled.add("Joshua (Test Runner)")
      state.joshuaResult = "pass"
      
      const result = checkPhaseGate(state, "/tmp")
      
      expect(result.canProceed).toBe(true)
    })

    test("should block verification if Joshua failed", () => {
      const state = getOrCreateState("test-session")
      state.currentPhase = "verification"
      state.agentsCalled.add("Joshua (Test Runner)")
      state.joshuaResult = "fail"
      
      const result = checkPhaseGate(state, "/tmp")
      
      expect(result.canProceed).toBe(false)
      expect(result.blockedReason).toContain("FAILED")
    })
  })
})
```

---

## Changes to src/index.ts

Add these changes to enable the hook:

```typescript
// 1. Add import at top of file
import { createTddEnforcementHook } from "./hooks"

// 2. Inside the main function, add hook creation (after other hooks):
const tddEnforcement = isHookEnabled("tdd-enforcement")
  ? createTddEnforcementHook(ctx)
  : null;

// 3. Wire into tool.execute.before handler:
// Inside "tool.execute.before": async (input, output) => {
await tddEnforcement?.["tool.execute.before"]?.(input, output);

// 4. Wire into tool.execute.after handler:
// Inside "tool.execute.after": async (input, output) => {
await tddEnforcement?.["tool.execute.after"]?.(input, output);
```

---

## Changes to src/config/schema.ts

Add `"tdd-enforcement"` to the `HookNameSchema`:

```typescript
export const HookNameSchema = z.enum([
  // ... existing hooks ...
  "tdd-enforcement",  // ADD THIS LINE
  "sisyphus-orchestrator",
])
```

---

## Success Criteria

- [ ] Paul CANNOT write test files directly (blocked → must delegate to Peter/John)
- [ ] Paul CANNOT run test commands directly (blocked → must delegate to Joshua)
- [ ] Paul CANNOT write implementation code directly (blocked → must delegate via category)
- [ ] Paul CANNOT complete tasks without Joshua passing
- [ ] Paul CANNOT make >3 search calls (blocked → must delegate to explore)
- [ ] Paul CANNOT make >3 doc fetch calls (blocked → must delegate to librarian)
- [ ] Paul's prompt tells him the rules (avoids wasted blocked attempts)
- [ ] Hook is enabled in src/index.ts
- [ ] All tests pass
- [ ] Build succeeds
