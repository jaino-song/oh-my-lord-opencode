# Strict Mode Enforcement Rewrite

> **Date**: 2026-01-20
> **Purpose**: Eliminate Fast Mode, enforce strict TDD, make Paul a pure orchestrator
> **Status**: Planning Complete - Ready for Implementation

---

## Context

Based on discrepancy analysis, the current system has structural flaws:
1. Paul has too much autonomy (can self-plan, can skip TDD)
2. Fast Mode creates confusion
3. Soft warnings instead of hard blocks
4. Testing delegation is ambiguous
5. Paul can write to planning files

**User Requirements**:
- Eliminate Fast Mode entirely
- Strict TDD mandatory (HARD BLOCKS)
- Paul cannot create plans (planner-paul only)
- Paul cannot modify plans (strict follower)
- Testing delegation must be explicit
- Phase-based gates with parallel delegation within phases

---

## Objectives

### Primary Goals:
1. ✓ Remove all Fast Mode logic from Paul's system prompt
2. ✓ Change Paul's orchestrator hook from WARNING to ERROR for code writes
3. ✓ Add testing competency trap (test keywords → Peter/John/Joshua)
4. ✓ Strengthen TDD enforcement (BLOCK implementation without RED phase)
5. ✓ Block Paul from writing to `.paul/plans/*`
6. ✓ Add phase gate enforcement (strict transitions)
7. ✓ Update category system (remove "quick", add "general-purpose")
8. ✓ Rewrite documentation to reflect strict-only mode

### Success Criteria:
- Paul CANNOT write code (hard error)
- Paul CANNOT write/edit plans (hard error)
- Paul CANNOT implement without tests (hard error)
- Paul CANNOT skip Joshua RED phase (hard error)
- Paul MUST have a plan from planner-paul (hard error if no plan)
- Testing tasks route to correct agents (Peter/John/Joshua)
- Parallel delegation works within phases
- All documentation reflects strict mode only

---

## Architecture Changes

### 1. Testing Delegation System

**Current State**: All categories spawn Sisyphus-Junior

**Target State**:
```typescript
// src/hooks/hierarchy-enforcer/constants.ts

export const CATEGORY_TO_AGENT: Record<string, string> = {
  // Testing categories (NEW)
  "unit-testing": "Peter (Test Writer)",
  "e2e-testing": "John (E2E Test Writer)",
  "test-execution": "Joshua (Test Runner)",

  // Implementation categories
  "backend-implementation": "Sisyphus-Junior",
  "frontend-implementation": "frontend-ui-ux-engineer",
  "general-purpose": "Sisyphus-Junior",  // NEW (replaces "quick")

  // Deprecated (REMOVE)
  // "quick": "Sisyphus-Junior",  ❌ REMOVE

  // Keep existing
  "ultrabrain": "Sisyphus-Junior",
  "visual-engineering": "Sisyphus-Junior",
  "artistry": "Sisyphus-Junior",
  "most-capable": "Sisyphus-Junior",
  "writing": "Sisyphus-Junior",
}

export const TESTING_KEYWORDS = [
  "test", "spec", "jest", "playwright", "vitest",
  "unit test", "e2e test", "integration test", "e2e",
  "test suite", "test case", "test runner",
  "testing", "run test", "execute test"
]

// Add to COMPETENCY_RULES
{
  category: "Testing",
  keywords: TESTING_KEYWORDS,
  requiredAgents: ["Peter (Test Writer)", "John (E2E Test Writer)", "Joshua (Test Runner)"],
  errorMsg: "Testing tasks (writing/running tests) MUST be delegated to Peter (Jest), John (Playwright), or Joshua (Test Runner)."
}
```

**Enforcement Logic**:
```typescript
// In hierarchy-enforcer hook
if (hasTestingKeyword && targetAgent === "Sisyphus-Junior") {
  throw new Error(
    "COMPETENCY VIOLATION: Testing task detected.\n" +
    "- Jest/unit tests → Peter (Test Writer)\n" +
    "- Playwright/E2E tests → John (E2E Test Writer)\n" +
    "- Running tests → Joshua (Test Runner)\n" +
    "You tried to delegate to: Sisyphus-Junior"
  )
}
```

---

### 2. Paul's Code Write Prohibition (HARD BLOCK)

**Current State**: Warning injected, call proceeds

**Target State**: Throw error, call rejected

**File**: `src/hooks/sisyphus-orchestrator/index.ts`

**Change**:
```typescript
// BEFORE (soft warning):
if (WRITE_EDIT_TOOLS.includes(toolName) && !isSisyphusPath(filePath)) {
  output.message = (output.message || "") + DIRECT_WORK_REMINDER
  // Call still proceeds ❌
}

// AFTER (hard block):
if (WRITE_EDIT_TOOLS.includes(toolName) && !isSisyphusPath(filePath)) {
  // Check if it's a .paul/plans/* file
  if (filePath.includes('.paul/plans/')) {
    throw new Error(
      `[sisyphus-orchestrator] PLAN MODIFICATION BLOCKED\n\n` +
      `Paul attempted to write to: ${filePath}\n\n` +
      `Paul is a PLAN FOLLOWER, not a PLAN CREATOR.\n` +
      `If the plan needs changes, STOP and ask the user to switch to planner-paul.\n\n` +
      `Paul's allowed writes:\n` +
      `✓ .sisyphus/* (notepads, approval state)\n` +
      `✗ .paul/plans/* (planning files - planner-paul only)\n` +
      `✗ Source code (must delegate)`
    )
  }

  // For other code files
  throw new Error(
    `[sisyphus-orchestrator] CODE WRITE BLOCKED\n\n` +
    `Paul attempted to write to: ${filePath}\n\n` +
    `Paul is an ORCHESTRATOR, not an IMPLEMENTER.\n` +
    `You MUST delegate all code changes via delegate_task.\n\n` +
    `Correct approach:\n` +
    `delegate_task(\n` +
    `  category="backend-implementation",\n` +
    `  prompt="[specific task with clear acceptance criteria]"\n` +
    `)`
  )
}
```

**Allowed Writes**:
- ✓ `.sisyphus/notepads/*` (session notes)
- ✓ `.sisyphus/approval_state.json` (tracking)
- ✗ `.paul/plans/*` (planning files - planner-paul only)
- ✗ Source code files (must delegate)

---

### 3. TDD Mandatory Enforcement (HARD BLOCK)

**Current State**: Warning if no recent Joshua run

**Target State**: Block if no test files OR no RED phase

**File**: `src/hooks/tdd-enforcement/index.ts`

**New Logic**:
```typescript
// Track test state per session
const testState = new Map<string, {
  testFilesExist: boolean
  redPhaseComplete: boolean
  greenPhaseComplete: boolean
}>()

// Before implementation delegation
if (toolName === "delegate_task") {
  const targetAgent = getTargetAgent(output.args)
  const isImplementation = isImplementationAgent(targetAgent)

  if (isImplementation) {
    const state = testState.get(input.sessionID) || {
      testFilesExist: false,
      redPhaseComplete: false,
      greenPhaseComplete: false
    }

    // BLOCK 1: No test files exist
    if (!state.testFilesExist) {
      throw new Error(
        `⛔ TDD VIOLATION: NO TESTS EXIST\n\n` +
        `You cannot implement without tests (RED phase).\n\n` +
        `Required steps:\n` +
        `1. delegate_task(agent="Peter", prompt="Write Jest tests for X")\n` +
        `2. delegate_task(agent="John", prompt="Write Playwright tests for X")\n` +
        `3. delegate_task(agent="Joshua", prompt="Run tests") → Must FAIL\n` +
        `4. THEN you can implement\n\n` +
        `Current state: No test files detected.`
      )
    }

    // BLOCK 2: Joshua hasn't run and reported FAIL
    if (!state.redPhaseComplete) {
      throw new Error(
        `⛔ TDD VIOLATION: RED PHASE INCOMPLETE\n\n` +
        `You cannot implement without confirming tests FAIL first.\n\n` +
        `Required: delegate_task(agent="Joshua", prompt="Run tests")\n` +
        `Expected result: Tests must FAIL (RED phase)\n\n` +
        `This proves the tests actually test the feature you're about to build.`
      )
    }

    // Allow implementation
    markFileDirty(input.sessionID, filePath)
  }
}

// After test write (Peter/John)
if (targetAgent === "Peter (Test Writer)" || targetAgent === "John (E2E Test Writer)") {
  // Mark test files exist
  updateTestState(input.sessionID, { testFilesExist: true })
}

// After Joshua runs
if (targetAgent === "Joshua (Test Runner)") {
  const result = await getJoshuaResult(input.callID)

  if (result.status === "FAIL") {
    updateTestState(input.sessionID, { redPhaseComplete: true })
  } else if (result.status === "PASS") {
    updateTestState(input.sessionID, { greenPhaseComplete: true })
    clearDirtyFiles(input.sessionID)
  }
}
```

**States**:
```
Initial → testFilesExist: false, redPhase: false, greenPhase: false
  ↓
Peter/John write tests → testFilesExist: true
  ↓
Joshua runs → FAIL → redPhase: true (Can implement now)
  ↓
Sisyphus-Junior implements → dirty files marked
  ↓
Joshua runs → PASS → greenPhase: true, dirty files cleared
  ↓
Todo completion allowed ✓
```

---

### 4. Plan Requirement Enforcement

**File**: `src/agents/paul.ts`

**New System Prompt Logic**:
```typescript
export const ORCHESTRATOR_SISYPHUS_SYSTEM_PROMPT = `
<system-reminder>
# Paul - Strict Orchestrator (Lord Edition v3.0)

## 1. CORE IDENTITY & ABSOLUTE CONSTRAINTS

**ROLE**: You are a PLAN EXECUTOR. You follow plans, you do NOT create them.

**MANDATORY WORKFLOW**:
1. Check if plan exists in .paul/plans/
2. If NO plan exists → STOP immediately:
   - Tell user: "No plan found. Please invoke @planner-paul to create a formal plan first."
   - Do NOT proceed with ANY execution
   - Do NOT create todos yourself
   - Do NOT self-plan
3. If plan exists → Read plan, read todos, execute strictly

**FORBIDDEN AUTONOMY**:
❌ Creating plans yourself (must come from planner-paul)
❌ Modifying plans (if plan needs changes, ask user to switch to planner-paul)
❌ Self-drive execution (must have formal plan)
❌ Writing code directly (must delegate)
❌ Skipping TDD steps (hard blocked by system)
❌ Moving to next todo without confirmation (each step verified)

## 2. STRICT TDD WORKFLOW (MANDATORY)

For EVERY implementation task:

**Step 1: Write Tests (REQUIRED FIRST)**
delegate_task(agent="Peter (Test Writer)", prompt="Write Jest tests for X")
delegate_task(agent="John (E2E Test Writer)", prompt="Write Playwright E2E tests for X")

**Step 2: RED Phase (MUST FAIL)**
delegate_task(agent="Joshua (Test Runner)", prompt="Run all tests")
→ Result MUST be FAIL (proves tests work)
→ System will BLOCK Step 3 if this doesn't happen

**Step 3: Implementation (BLOCKED until RED complete)**
delegate_task(agent="Sisyphus-Junior", prompt="Implement X according to plan")
→ System will throw error if Step 2 not complete

**Step 4: GREEN Phase (MUST PASS)**
delegate_task(agent="Joshua (Test Runner)", prompt="Run all tests again")
→ Result MUST be PASS
→ Dirty files cleared

**Step 5: Complete Todo (BLOCKED if dirty files remain)**
TodoWrite([...todos with status="completed"])
→ System will throw error if Joshua hasn't approved

**NO EXCEPTIONS**: Even documentation, configs, trivial changes follow this flow.

## 3. DELEGATION RULES (COMPETENCY ENFORCEMENT)

**Testing** (HARD BLOCKED if wrong agent):
- Writing Jest tests → Peter (Test Writer)
- Writing Playwright tests → John (E2E Test Writer)
- Running tests → Joshua (Test Runner)
- ❌ NEVER delegate testing to Sisyphus-Junior

**Visual/UI** (HARD BLOCKED if wrong agent):
- CSS, styling, layout, animations, Tailwind → frontend-ui-ux-engineer
- ❌ NEVER delegate UI to Sisyphus-Junior

**Git Operations** (HARD BLOCKED if wrong agent):
- Commits, branches, rebases, merges → git-master
- ❌ NEVER use git commands yourself

**Documentation Research** (HARD BLOCKED if wrong agent):
- Official docs, API references, libraries → librarian
- ❌ NEVER use web search yourself

**General Implementation**:
- Backend logic, business rules → category="backend-implementation" (Sisyphus-Junior)
- General-purpose tasks → category="general-purpose" (Sisyphus-Junior)

## 4. PHASE GATE ENFORCEMENT

You cannot skip phases. System hooks enforce this.

**Phase 1: Planning** (planner-paul's domain)
- Plan file must exist: .paul/plans/{name}.md
- Todos must exist (created by planner-paul)
- You start here

**Phase 2: Test Writing**
- Call Peter for Jest tests
- Call John for Playwright tests
- Cannot proceed to Phase 3 without test files

**Phase 3: RED Phase**
- Call Joshua
- Tests MUST fail
- System blocks Phase 4 if not FAIL

**Phase 4: Implementation**
- Call implementation agent (Sisyphus-Junior, frontend-ui-ux-engineer, etc.)
- Files marked dirty
- Cannot complete todo yet

**Phase 5: GREEN Phase**
- Call Joshua again
- Tests MUST pass
- Dirty files cleared
- Can now complete todo

**Phase 6: Todo Completion**
- Mark todo as completed
- Move to next todo
- Repeat Phase 2-6 for each todo

**Phase 7: Plan Complete**
- All todos marked completed
- Final verification
- Report to user

## 5. PARALLEL DELEGATION (WITHIN PHASES)

You CAN delegate multiple tasks in parallel IF:
✓ All tasks are in the SAME phase
✓ No file conflicts (different files)
✓ All have required test coverage

Example (CORRECT):
// Phase 4: Parallel implementation of independent features
delegate_task(agent="Sisyphus-Junior", prompt="Implement user service", background=true)
delegate_task(agent="Sisyphus-Junior", prompt="Implement auth service", background=true)
// Wait for both, then proceed to Phase 5 for each

Example (WRONG):
// Trying to parallelize across phases
delegate_task(agent="Peter", prompt="Write tests")  // Phase 2
delegate_task(agent="Sisyphus-Junior", prompt="Implement")  // Phase 4
// ❌ BLOCKED: Cannot implement before RED phase

## 6. PLAN MODIFICATION PROTOCOL

If you encounter issues that require plan changes:

1. STOP execution immediately
2. Document the issue in .sisyphus/notepads/{plan-name}/blockers.md
3. Tell user: "Blocker encountered. Plan needs modification. Please switch to @planner-paul to update the plan."
4. Do NOT attempt to work around it
5. Do NOT modify the plan yourself (HARD BLOCKED by system)

## 7. VERIFICATION AFTER EVERY DELEGATION

After EVERY delegate_task call:
1. Read the files that were supposed to be modified
2. Verify the work matches requirements
3. Run diagnostics if code changed
4. Do NOT trust subagent self-reports

Subagents lie. Always verify.

</system-reminder>
`
```

---

### 5. Phase Gate System

**New Hook**: `src/hooks/phase-gate-enforcer/index.ts`

```typescript
export interface PhaseState {
  currentPhase: Phase
  phasesComplete: Set<Phase>
  testFilesExist: boolean
  redPhaseComplete: boolean
  greenPhaseComplete: boolean
}

export enum Phase {
  PLANNING = 1,      // planner-paul domain
  TEST_WRITING = 2,  // Peter/John
  RED_PHASE = 3,     // Joshua (FAIL)
  IMPLEMENTATION = 4,// Sisyphus-Junior, etc.
  GREEN_PHASE = 5,   // Joshua (PASS)
  COMPLETION = 6,    // Todo completion
}

export function createPhaseGateEnforcerHook(ctx: PluginInput) {
  const sessionPhases = new Map<string, PhaseState>()

  return {
    "tool.execute.before": async (input, output) => {
      const state = getPhaseState(input.sessionID)
      const targetAgent = getTargetAgent(output.args)

      // Phase 1: Planning (planner-paul must create plan)
      if (input.tool === "delegate_task" && state.currentPhase === Phase.PLANNING) {
        const currentAgent = getAgentFromSession(input.sessionID)

        if (currentAgent === "Paul" || currentAgent === "orchestrator-sisyphus") {
          // Check if plan exists
          const planExists = existsSync(join(ctx.directory, ".paul/plans"))

          if (!planExists) {
            throw new Error(
              `⛔ PHASE GATE VIOLATION: NO PLAN EXISTS\n\n` +
              `Paul cannot execute without a formal plan from planner-paul.\n\n` +
              `Required: User must invoke @planner-paul to create a plan first.\n\n` +
              `Paul's role: PLAN EXECUTOR (not plan creator)`
            )
          }

          // Plan exists, advance to Phase 2
          advancePhase(input.sessionID, Phase.TEST_WRITING)
        }
      }

      // Phase 2: Test Writing (must call Peter/John before implementation)
      if (state.currentPhase === Phase.TEST_WRITING) {
        if (targetAgent === "Peter (Test Writer)" || targetAgent === "John (E2E Test Writer)") {
          // Allowed
          return
        }

        if (isImplementationAgent(targetAgent)) {
          throw new Error(
            `⛔ PHASE GATE VIOLATION: TEST WRITING INCOMPLETE\n\n` +
            `Current phase: Test Writing (Phase 2)\n` +
            `You tried to: Delegate implementation\n\n` +
            `Required: Write tests first\n` +
            `1. delegate_task(agent="Peter", prompt="Write Jest tests")\n` +
            `2. delegate_task(agent="John", prompt="Write Playwright tests")\n` +
            `3. Then proceed to RED phase`
          )
        }
      }

      // Phase 3: RED Phase (Joshua must fail)
      if (state.currentPhase === Phase.RED_PHASE) {
        if (targetAgent === "Joshua (Test Runner)") {
          // Allowed - waiting for FAIL result
          return
        }

        if (isImplementationAgent(targetAgent)) {
          throw new Error(
            `⛔ PHASE GATE VIOLATION: RED PHASE INCOMPLETE\n\n` +
            `Current phase: RED Phase (Phase 3)\n` +
            `You tried to: Delegate implementation\n\n` +
            `Required: Confirm tests FAIL first\n` +
            `delegate_task(agent="Joshua", prompt="Run tests")\n` +
            `Expected: Tests FAIL (RED phase)\n\n` +
            `Current state: Waiting for Joshua to report FAIL`
          )
        }
      }

      // Similar logic for other phases...
    },

    "tool.execute.after": async (input, output) => {
      const state = getPhaseState(input.sessionID)
      const targetAgent = getTargetAgent(output.args)

      // Advance phases based on results
      if (targetAgent === "Peter (Test Writer)" || targetAgent === "John (E2E Test Writer)") {
        state.testFilesExist = true
        if (state.testFilesExist) {
          advancePhase(input.sessionID, Phase.RED_PHASE)
        }
      }

      if (targetAgent === "Joshua (Test Runner)") {
        const result = parseJoshuaResult(output.result)

        if (result.status === "FAIL" && state.currentPhase === Phase.RED_PHASE) {
          state.redPhaseComplete = true
          advancePhase(input.sessionID, Phase.IMPLEMENTATION)
        }

        if (result.status === "PASS" && state.currentPhase === Phase.GREEN_PHASE) {
          state.greenPhaseComplete = true
          advancePhase(input.sessionID, Phase.COMPLETION)
        }
      }

      if (isImplementationAgent(targetAgent) && state.currentPhase === Phase.IMPLEMENTATION) {
        advancePhase(input.sessionID, Phase.GREEN_PHASE)
      }
    }
  }
}
```

---

## Implementation TODOs

### Hook Changes:

- [ ] **sisyphus-orchestrator hook**: Change from warning to error for code writes
  - File: `src/hooks/sisyphus-orchestrator/index.ts`
  - Change: `output.message = ...` → `throw new Error(...)`
  - Add: Special check for `.paul/plans/*` with dedicated error message
  - Verify: Only `.sisyphus/*` writes allowed

- [ ] **hierarchy-enforcer hook**: Add testing competency trap
  - File: `src/hooks/hierarchy-enforcer/constants.ts`
  - Add: `TESTING_KEYWORDS` array
  - Add: Testing competency rule to `COMPETENCY_RULES`
  - Update: `CATEGORY_TO_AGENT` - remove "quick", add testing categories
  - Verify: Test keywords trigger error if not going to Peter/John/Joshua

- [ ] **tdd-enforcement hook**: Strengthen to HARD BLOCK
  - File: `src/hooks/tdd-enforcement/index.ts`
  - Add: Test file existence check before implementation
  - Add: RED phase completion check before implementation
  - Change: Warning → Error for missing prerequisites
  - Add: Test state tracking per session
  - Verify: Cannot implement without tests + RED phase

- [ ] **Create phase-gate-enforcer hook** (NEW)
  - File: `src/hooks/phase-gate-enforcer/index.ts`
  - Create: Phase state management
  - Implement: Phase transition validation
  - Add: Plan existence check for Paul
  - Verify: Phases advance in strict order

### Agent Changes:

- [ ] **Paul system prompt**: Remove Fast Mode, enforce Strict Mode
  - File: `src/agents/paul.ts`
  - Remove: All "Fast Mode" / "Ad-hoc Mode" logic
  - Add: Mandatory plan requirement
  - Add: Phase gate workflow description
  - Add: Testing delegation rules
  - Add: Plan modification protocol
  - Verify: No self-planning allowed

- [ ] **planner-paul system prompt**: Reinforce planning-only role
  - File: `src/agents/planner-paul.ts`
  - Add: Explicit "NEVER implement" warning
  - Add: "Setup execution todos" as MANDATORY final step
  - Verify: Delegation whitelist unchanged

### Category System Changes:

- [ ] **Update delegate-task tool categories**
  - File: `src/tools/delegate-task/constants.ts`
  - Add: "unit-testing", "e2e-testing", "test-execution"
  - Add: "backend-implementation", "frontend-implementation"
  - Add: "general-purpose" (replaces "quick")
  - Remove: "quick"
  - Update: Documentation for each category

### Documentation Changes:

- [ ] **Update Notion page**: Remove Fast Mode entirely
  - Remove: All "Fast Mode" sections
  - Remove: "Operating Modes" comparison table
  - Update: Workflow to show Strict Mode only
  - Add: Phase gate enforcement details
  - Add: Testing delegation rules
  - Update: TDD flow diagram (HARD BLOCKS)

- [ ] **Update README.md**: Reflect strict-only mode
  - Update: "How It Works" section
  - Remove: Fast Mode references
  - Add: Phase gate enforcement
  - Add: Testing competency rules

- [ ] **Update AGENTS.md**: Clarify agent roles
  - Update: Paul's role (executor, not planner)
  - Update: Testing agent responsibilities
  - Add: Phase gate system explanation

### Testing:

- [ ] **Test sisyphus-orchestrator hook**: Verify hard block
  - Write test: Paul attempts to write code → Error thrown
  - Write test: Paul attempts to write to .paul/plans/ → Error thrown
  - Write test: Paul writes to .sisyphus/ → Allowed

- [ ] **Test hierarchy-enforcer hook**: Verify testing trap
  - Write test: Paul delegates testing task to Sisyphus-Junior → Error thrown
  - Write test: Paul delegates testing task to Peter/John/Joshua → Allowed
  - Write test: Testing keywords trigger trap

- [ ] **Test tdd-enforcement hook**: Verify hard blocks
  - Write test: Implement without test files → Error thrown
  - Write test: Implement without RED phase → Error thrown
  - Write test: Implement after RED phase → Allowed
  - Write test: Complete todo with dirty files → Error thrown

- [ ] **Test phase-gate-enforcer hook**: Verify strict phases
  - Write test: Paul executes without plan → Error thrown
  - Write test: Implement before test writing → Error thrown
  - Write test: Implement before RED phase → Error thrown
  - Write test: Skip GREEN phase → Error thrown

---

## Verification Checklist

After implementation, verify:

### Paul's Constraints:
- [ ] Paul cannot write code (hard error)
- [ ] Paul cannot write to .paul/plans/ (hard error)
- [ ] Paul cannot execute without plan (hard error)
- [ ] Paul cannot self-plan (no logic for it)
- [ ] Paul cannot skip TDD steps (hard errors)

### Testing Delegation:
- [ ] Testing tasks route to Peter/John/Joshua
- [ ] Testing keywords trigger competency trap
- [ ] "quick" category removed
- [ ] "general-purpose" category works

### TDD Flow:
- [ ] Cannot implement without test files (hard error)
- [ ] Cannot implement without RED phase (hard error)
- [ ] Cannot complete todo without GREEN phase (hard error)
- [ ] Joshua clears dirty files on PASS

### Phase Gates:
- [ ] Phases advance in strict order
- [ ] Cannot skip phases
- [ ] Parallel delegation works within phases
- [ ] Phase violations throw clear errors

### Documentation:
- [ ] No Fast Mode references remain
- [ ] Strict Mode is only mode
- [ ] TDD flow shows HARD BLOCKS
- [ ] Testing delegation is explicit
- [ ] Phase gates documented

---

## Rollout Plan

### Phase 1: Core Enforcement (Week 1)
1. sisyphus-orchestrator: Hard block code writes
2. hierarchy-enforcer: Testing competency trap
3. tdd-enforcement: Hard block without tests/RED
4. Test thoroughly

### Phase 2: Phase Gates (Week 2)
1. Create phase-gate-enforcer hook
2. Integrate with existing hooks
3. Test phase transitions
4. Verify parallel delegation

### Phase 3: Agent Updates (Week 3)
1. Update Paul system prompt
2. Update planner-paul system prompt
3. Update category system
4. Test end-to-end workflows

### Phase 4: Documentation (Week 4)
1. Rewrite Notion page
2. Update README.md
3. Update AGENTS.md
4. Create migration guide for users

---

## Risk Mitigation

### Risk 1: Breaking Existing Workflows
- **Mitigation**: Add feature flag `STRICT_MODE_ENABLED` (default: true)
- **Rollback**: Set flag to false to restore warnings

### Risk 2: User Confusion
- **Mitigation**: Clear error messages with actionable instructions
- **Mitigation**: Update all documentation before rollout

### Risk 3: Performance Impact
- **Mitigation**: Phase gate checks are lightweight (file existence, state lookups)
- **Monitoring**: Add performance logging

---

## Success Metrics

- [ ] Zero instances of Paul writing code directly
- [ ] Zero instances of implementation without tests
- [ ] Zero instances of skipped RED phase
- [ ] 100% of testing tasks routed to Peter/John/Joshua
- [ ] Zero Fast Mode references in docs
- [ ] User feedback positive on clarity (strict mode reduces confusion)

---

**End of Plan**
