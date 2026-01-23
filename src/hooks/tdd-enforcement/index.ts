import type { PluginInput } from "@opencode-ai/plugin"
import { basename } from "node:path"
import { log } from "../../shared/logger"
import { markFileDirty, clearDirtyFiles, hasDirtyFiles, getDirtyFiles } from "./dirty-file-tracker"
import { requiresTDD, getTDDRequirementReason } from "./constants"

const HOOK_NAME = "tdd-enforcement"
const WRITE_EDIT_TOOLS = ["mcp_write", "mcp_edit"]

/**
 * TDD Phase Tracking
 *
 * Phases per TODO/session:
 * - NONE: No work started
 * - RED: Test written, not yet run (or run and failed)
 * - GREEN: Implementation written, tests passing
 */
type TDDPhase = "NONE" | "RED" | "GREEN"

interface TodoPhaseState {
  phase: TDDPhase
  testFiles: Set<string>
  implFiles: Set<string>
}

const todoPhases = new Map<string, TodoPhaseState>()

function getTodoPhaseState(sessionID: string): TodoPhaseState {
  if (!todoPhases.has(sessionID)) {
    todoPhases.set(sessionID, {
      phase: "NONE",
      testFiles: new Set(),
      implFiles: new Set(),
    })
  }
  return todoPhases.get(sessionID)!
}

export function isCodeFile(filePath: string): boolean {
  if (!filePath) return false
  return requiresTDD(filePath)
}

function isTestFile(filePath: string): boolean {
  const file = basename(filePath)
  return /\.(test|spec)\.(ts|tsx|js|jsx|py)$/.test(file) || /__tests__\//.test(filePath)
}

function isVerificationAgent(args: Record<string, unknown>): boolean {
  const agentName = (args.subagent_type as string | undefined) ?? ""
  return agentName.includes("Joshua") || agentName.includes("Test Runner")
}

const TODO_TOOLS = ["todo", "todowrite"]

function isCompletingTodo(args: Record<string, unknown>): boolean {
  const todos = (args.todos as Array<{ status?: string }>) ?? []
  if (Array.isArray(todos)) {
    return todos.some(t => t.status === "completed" || t.status === "done")
  }
  return false
}

const callToFilePathMap = new Map<string, string>()

export function createTddEnforcementHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      const toolName = input.tool

      if (TODO_TOOLS.includes(toolName)) {
        if (isCompletingTodo(output.args)) {
          if (hasDirtyFiles(input.sessionID)) {
             const dirtyFiles = getDirtyFiles(input.sessionID)
             const errorMsg = `
⛔ **DEFINITION OF DONE BLOCKED**

You cannot mark this task as 'completed' because you have unverified code changes.
**Dirty Files**:
${dirtyFiles.map(f => `- ${f}`).join("\n")}

**Requirement**: You MUST run Joshua (Test Runner) to verify changes before completing the todo.
Use: \`delegate_task(agent="Joshua (Test Runner)", prompt="Run tests")\`
`
             throw new Error(errorMsg)
          }
        }
        return
      }

      if (toolName === "delegate_task") {
        const isVerification = isVerificationAgent(output.args)

        if (isVerification) {
          if (hasDirtyFiles(input.sessionID)) {
             log(`[${HOOK_NAME}] Clearing dirty files for verification run`, {
               sessionID: input.sessionID,
               agent: output.args.subagent_type
             })
             clearDirtyFiles(input.sessionID)

             // Also reset phase state after verification
             const phaseState = getTodoPhaseState(input.sessionID)
             if (phaseState.phase === "GREEN") {
               // Tests will verify GREEN phase → Reset for next cycle
               phaseState.phase = "NONE"
               phaseState.testFiles.clear()
               phaseState.implFiles.clear()

               log(`[${HOOK_NAME}] Reset phase state after verification`, {
                 sessionID: input.sessionID,
               })
             }
          }
          return
        }

        if (hasDirtyFiles(input.sessionID)) {
          const dirtyFiles = getDirtyFiles(input.sessionID)
          const errorMsg = `
⛔ **TDD ENFORCEMENT BLOCK**

You have modified code that has not been verified yet.
**Dirty Files**:
${dirtyFiles.map(f => `- ${f}`).join("\n")}

**You MUST run tests before starting any new task.**
Use: \`delegate_task(agent="Joshua (Test Runner)", prompt="Run tests")\`
`
          throw new Error(errorMsg)
        }
        return
      }

      if (WRITE_EDIT_TOOLS.includes(toolName)) {
        const filePath = (output.args.filePath ?? output.args.path ?? output.args.file) as string | undefined
        if (!filePath) return

        // Check if file requires TDD
        if (!requiresTDD(filePath)) {
          log(`[${HOOK_NAME}] File exempt from TDD`, {
            sessionID: input.sessionID,
            tool: toolName,
            filePath,
            reason: getTDDRequirementReason(filePath),
          })
          return
        }

        callToFilePathMap.set(input.callID, filePath)
        const phaseState = getTodoPhaseState(input.sessionID)
        const isTest = isTestFile(filePath)

        if (isTest) {
          // Writing a test file → Transition to RED phase
          phaseState.testFiles.add(filePath)
          phaseState.phase = "RED"

          log(`[${HOOK_NAME}] Test file write → RED phase`, {
            sessionID: input.sessionID,
            filePath,
            phase: phaseState.phase,
          })
          return
        }

        // Writing implementation code → Check for RED phase first
        if (phaseState.phase === "NONE") {
          const errorMsg = `
⛔ **TDD VIOLATION: TEST-FIRST REQUIRED**

You attempted to write implementation code without tests:
**File**: ${filePath}
**Reason**: ${getTDDRequirementReason(filePath)}

**TDD Workflow**:
1. ❌ You are here: Trying to implement FIRST
2. ✅ Required: Write TEST first (RED phase)
3. ✅ Then: Implement code (GREEN phase)
4. ✅ Finally: Verify tests pass

**Action Required**:
Create test file first, OR delegate to test writers:
- Unit tests: \`delegate_task(agent="Peter (Test Writer)", prompt="Write tests for ${basename(filePath)}")\`
- E2E tests: \`delegate_task(agent="John (E2E Test Writer)", prompt="Write E2E tests")\`
`
          log(`[${HOOK_NAME}] BLOCKED: Implementation without tests`, {
            sessionID: input.sessionID,
            filePath,
            phase: phaseState.phase,
          })

          throw new Error(errorMsg)
        }

        if (phaseState.phase === "RED") {
          // Implementing after test exists → Allowed, transition to GREEN
          phaseState.implFiles.add(filePath)
          phaseState.phase = "GREEN"

          log(`[${HOOK_NAME}] Implementation write after RED → GREEN phase`, {
            sessionID: input.sessionID,
            filePath,
            phase: phaseState.phase,
          })
        }
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      _output: unknown
    ): Promise<void> => {
      const filePath = callToFilePathMap.get(input.callID)
      if (filePath) {
        callToFilePathMap.delete(input.callID)
        markFileDirty(input.sessionID, filePath)
        
        const dirtyCount = getDirtyFiles(input.sessionID).length
        
        log(`[${HOOK_NAME}] Marked file dirty`, {
          sessionID: input.sessionID,
          tool: input.tool,
          filePath,
          dirtyCount
        })
      }
    },
  }
}
