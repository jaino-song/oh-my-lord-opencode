# Implementation Plan: Agent Enforcement & Prompt Deduplication

## Context

### Original Request
Fix planner-paul rule violations and improve agent enforcement across the orchestration layer.

### Interview Summary
- planner-paul violated "wait for user trigger" rule
- Paul violated "frontend → frontend-ui-ux-engineer" rule via category bypass
- Multiple rules repeated 3-4x in prompts when hooks already enforce them
- `hierarchy-enforcer` hook has critical bypass vulnerability
- Joshua doesn't auto-run headed mode for visual tests
- Blocked todos trigger continuation hook incorrectly

### Key Research Findings
1. `hierarchy-enforcer` hook exists but only checks `agent/subagent_type/name`, not `category`
2. Supporting agents (Timothy, Thomas, Nathan, Peter, John, Joshua, Elijah) are well-designed
3. Enforcement gaps are in orchestration layer (Paul, planner-paul, Solomon)
4. ~5,000 tokens can be saved through deduplication (39%)

---

## Objectives & Deliverables

### Core Objective
Fix enforcement gaps and deduplicate prompts while ensuring agent rule obedience.

### Concrete Deliverables
1. **Fixed `hierarchy-enforcer` hook** - Catches category-based visual task bypass
2. **Enhanced `planner-md-only` hook** - Gates plan generation on user trigger + todos
3. **Deduplicated prompts** - Paul, planner-paul, Solomon (~5,000 token savings)
4. **Visual test improvements** - Joshua auto-headed, Solomon visual test flags

### Must Have
- All hooks pass existing tests after changes
- Category-based delegation is enforced
- Plan generation requires explicit user trigger
- Prompts mention rules once (not 3-4x)

### Must NOT Have
- Breaking changes to hook interfaces
- New hook dependencies
- Changes to Sisyphus or deprecated agents
- Removal of any rules (only deduplication)

### Out of Scope (Deferred)
- **Blocked todos trigger continuation hook** - The `todo-continuation-enforcer` behavior for cancelled/blocked todos will be addressed in a separate plan. This plan fixes the root cause (planner-paul creating blocked todos) via prompt changes in Task 2.2.

---

## Task Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Hook Enforcement (CRITICAL - Do First)                 │
├─────────────────────────────────────────────────────────────────┤
│ Task 1.1: Fix hierarchy-enforcer category bypass                │
│     ↓                                                           │
│ Task 1.2: Add plan generation gate to planner-md-only           │
│     ↓                                                           │
│ Task 1.3: Run existing hook tests                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Prompt Deduplication (Can Parallelize)                 │
├─────────────────────────────────────────────────────────────────┤
│ Task 2.1: Deduplicate paul.ts          ─┐                       │
│ Task 2.2: Deduplicate planner-paul.ts  ─┼─ Parallel             │
│ Task 2.3: Deduplicate solomon.ts       ─┘                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Visual Test Improvements                               │
├─────────────────────────────────────────────────────────────────┤
│ Task 3.1: Add visual test detection to joshua.ts                │
│ Task 3.2: Add type:visual flag to solomon.ts E2E specs          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Verification                                           │
├─────────────────────────────────────────────────────────────────┤
│ Task 4.1: Run full test suite (bun test)                        │
│ Task 4.2: Run typecheck (bun run typecheck)                     │
│ Task 4.3: Manual verification of hook behavior                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parallelization

### Can Run in Parallel
- Task 2.1, 2.2, 2.3 (prompt deduplication - independent files)
- Task 3.1, 3.2 (visual test improvements - independent files)

### Must Run Sequentially
- Phase 1 before Phase 2 (hooks must work before prompts reference them)
- Phase 4 after all other phases (verification)

---

## TODOs

### PHASE 1: Hook Enforcement (CRITICAL)

---

- [ ] **1.1 Fix hierarchy-enforcer category bypass**

  **Data Flow Context**:
  The hook intercepts `delegate_task` in `tool.execute.before`, receiving `output.args` which contains the RAW arguments before category resolution. The actual agent (Sisyphus-Junior) is determined LATER by the delegate_task tool. This is why we need to map category → agent in the hook.

  **What to do**:
  1. Read `src/hooks/hierarchy-enforcer/index.ts`
  2. Verify category names against `src/tools/delegate-task/constants.ts` (DEFAULT_CATEGORIES)
  3. Add category → agent mapping constant to `constants.ts`:
     ```typescript
     // Import or duplicate from delegate-task/constants.ts to stay in sync
     export const CATEGORY_TO_AGENT: Record<string, string> = {
       "quick": "Sisyphus-Junior",
       "visual-engineering": "frontend-ui-ux-engineer",
       "ultrabrain": "ultrabrain",
       "artistry": "frontend-ui-ux-engineer",
       "most-capable": "Sisyphus-Junior",
       "writing": "document-writer",
       "general": "Sisyphus-Junior",
     }
     
     // Fallback: Unknown categories should NOT bypass - treat as requiring explicit agent
     ```
  4. In `index.ts`, before competency check (around line 73), resolve category:
     ```typescript
     const category = output.args.category as string | undefined
     let targetAgent = (output.args.agent || output.args.subagent_type || output.args.name) as string | undefined
     
     // Map category to effective agent for competency checking
     // Hook sees raw args; category resolves to agent LATER in delegate_task tool
     if (!targetAgent && category) {
       targetAgent = CATEGORY_TO_AGENT[category]
       // If unknown category, log warning but don't block (maintain backward compat)
       if (!targetAgent) {
         log(`[hierarchy-enforcer] Unknown category: ${category}, skipping competency check`)
       }
     }
     ```
  5. Run `bun test src/hooks/hierarchy-enforcer/`

  **Must NOT do**:
  - Change the competency rules themselves
  - Remove any existing checks
  - Modify AGENT_RELATIONSHIPS
  - Block unknown categories (may break future extensions)

  **References**:
  - `src/hooks/hierarchy-enforcer/index.ts` (lines 72-130)
  - `src/hooks/hierarchy-enforcer/constants.ts`
  - `src/tools/delegate-task/constants.ts` (DEFAULT_CATEGORIES - source of truth for category names)

  **Acceptance Criteria**:
  - When Paul uses `category="quick"` with visual keywords in prompt, hook throws COMPETENCY VIOLATION error
  - Existing tests pass
  - New test added for category-based enforcement
  - CATEGORY_TO_AGENT mapping matches DEFAULT_CATEGORIES keys

---

- [ ] **1.2 Add plan generation gate to planner-md-only**

  **Trigger Semantics (Precise Definition)**:
  - **Case-insensitive** matching
  - **Only `role=user` messages** are checked (not assistant/system)
  - **Trigger persists for session** once detected (one trigger = multiple plan writes allowed)
  - **Search scope**: All user messages in session (not just latest)
  - **Match type**: Substring match (phrase can appear anywhere in message)

  **What to do**:
  1. Read `src/hooks/planner-md-only/index.ts` and `constants.ts`
  2. Add to `constants.ts`:
     ```typescript
     export const PLAN_TRIGGER_PHRASES = [
       "make a plan",
       "make the plan",
       "generate plan",
       "generate the plan",
       "create the plan",
       "save it",
       "save the plan",
       "write the plan",
     ]
     
     // Use relative path pattern (filePath from hook is typically relative or project-based)
     export const DRAFT_PATH_PATTERN = /[/\\]\.?(paul|sisyphus)[/\\]drafts[/\\]/i
     export const PLAN_PATH_PATTERN = /[/\\]\.?(paul|sisyphus)[/\\]plans[/\\]/i
     ```
  3. In `index.ts`, add plan generation gate in `tool.execute.before` for Write/Edit:
     ```typescript
     // After existing allowed file check, add:
     if (PLAN_PATH_PATTERN.test(filePath) && !DRAFT_PATH_PATTERN.test(filePath)) {
       // Check 1: User trigger phrase in session messages
       const hasTrigger = await checkUserTriggerPhrase(sessionID, ctx)
       
       // Check 2: Todos registered (at least 1 todo exists)
       const hasTodos = await checkTodosExist(sessionID, ctx)
       
       if (!hasTrigger) {
         throw new Error(
           `[planner-md-only] PLAN GENERATION BLOCKED: No user trigger detected.\n\n` +
           `User must say one of: ${PLAN_TRIGGER_PHRASES.join(", ")}\n\n` +
           `Current state: Interview mode. Continue gathering requirements in drafts.`
         )
       }
       
       if (!hasTodos) {
         throw new Error(
           `[planner-md-only] PLAN GENERATION BLOCKED: No todos registered.\n\n` +
           `Before writing a plan, call todowrite() to register planning tasks.\n\n` +
           `Example todos: "Generate implementation plan", "Self-review for gaps", "Timothy review"`
         )
       }
     }
     ```
  4. Implement `checkUserTriggerPhrase()`:
     ```typescript
     async function checkUserTriggerPhrase(sessionID: string, ctx: PluginInput): Promise<boolean> {
       // Use hook-message-injector to read session messages
       const messageDir = getMessageDir(sessionID)
       if (!messageDir) return false
       
       // Read all message files, filter to role=user
       // Case-insensitive substring match against PLAN_TRIGGER_PHRASES
       // Return true if any user message contains any trigger phrase
     }
     ```
  5. Implement `checkTodosExist()`:
     ```typescript
     async function checkTodosExist(sessionID: string, ctx: PluginInput): Promise<boolean> {
       const response = await ctx.client.session.todo({ path: { id: sessionID } })
       const todos = (response.data ?? response) as Todo[]
       return todos.length > 0  // At least 1 todo registered
     }
     ```
  6. Run `bun test src/hooks/planner-md-only/`

  **Must NOT do**:
  - Block writes to `.paul/drafts/` or `.sisyphus/drafts/` (always allowed)
  - Change existing file type restrictions
  - Modify delegation blocking logic
  - Require trigger phrase in LATEST message only (persists for session)

  **References**:
  - `src/hooks/planner-md-only/index.ts`
  - `src/hooks/planner-md-only/constants.ts`
  - `src/hooks/todo-continuation-enforcer.ts` (line ~15-20 for session.todo API usage)
  - `src/features/hook-message-injector/` (for getMessageDir, message reading)

  **Acceptance Criteria**:
  - Write to `.paul/plans/*.md` blocked without user trigger phrase
  - Write to `.paul/plans/*.md` blocked without todos registered
  - Write to `.paul/drafts/*.md` always allowed
  - Trigger persists: saying "make a plan" once allows multiple plan file operations
  - Existing tests pass
  - New tests added for both gates

---

- [ ] **1.3 Run existing hook tests**

  **What to do**:
  1. Run `bun test src/hooks/hierarchy-enforcer/`
  2. Run `bun test src/hooks/planner-md-only/`
  3. Fix any failures

  **Must NOT do**:
  - Delete failing tests to "pass"
  - Skip tests

  **Acceptance Criteria**:
  - All hook tests pass

---

### PHASE 2: Prompt Deduplication

---

- [ ] **2.1 Deduplicate paul.ts**

  **What to do**:
  1. Read `src/agents/paul.ts`
  2. Identify redundant rules:
     - "DO NOT implement" (3x → 1x)
     - "MUST delegate" (3x → 1x)
     - "TDD mandatory" (3x → 1x)
     - "Verify" (3x → 1x)
  3. Restructure to mention-once format:
     ```markdown
     ## 1. CORE IDENTITY
     - ROLE: Conductor. Coordinate, delegate, verify. (Hook blocks direct code)
     - TDD: Mandatory for all changes.
     - VERIFY: Subagents lie. Always verify via lsp_diagnostics, build, tests.

     ## 2. WORKFLOW
     [Streamlined TDD chain + delegation + verification - each concept once]

     ## 3. FILE OPERATIONS
     - Allowed: .sisyphus/, .paul/, read elsewhere
     - Blocked: Source code (hook enforces, error if attempted)
     ```
  4. Run `bun run typecheck`

  **Must NOT do**:
  - Remove any rules (only consolidate)
  - Change the delegation targets
  - Modify the TDD chain order

  **References**:
  - `src/agents/paul.ts`
  - `src/hooks/sisyphus-orchestrator/` (for hook error messages)

  **Acceptance Criteria**:
  - No redundant rule blocks (each rule has single canonical section, other sections may reference briefly)
  - TypeScript compiles
  - Estimated ~400 token reduction

---

- [ ] **2.2 Deduplicate planner-paul.ts**

  **What to do**:
  1. Read `src/agents/planner-paul.ts`
  2. Identify redundant rules:
     - "DO NOT execute" (4x → 1x)
     - Phase transition rules (2x → 1x)
  3. Fix todo registration behavior:
     - **Phase 1 (Interview)**: Create ONLY interview-related todos:
       ```
       - Invoke Nathan for analysis
       - Research codebase patterns
       - Ask clarifying questions
       - Update draft with findings
       ```
     - **Phase 2 (Plan Generation)**: Create plan-related todos AFTER user says "make a plan":
       ```
       - Generate implementation plan
       - Self-review for gaps
       - Timothy review
       - Fix Timothy's issues
       - Solomon test planning
       - Present summary
       ```
     - **Explicit instruction**: "Do NOT create Phase 2 todos during Phase 1. The hook will block plan file writes if you haven't registered todos yet."
  4. Restructure to consolidate redundant rules (no more than one canonical section per rule)
  5. Run `bun run typecheck`

  **Must NOT do**:
  - Remove the Phase 1→2 transition concept
  - Change the Timothy/Solomon chain
  - Create "blocked" or "cancelled" todos during Phase 1

  **References**:
  - `src/agents/planner-paul.ts`
  - `src/hooks/planner-md-only/` (for hook error messages)

  **Acceptance Criteria**:
  - No redundant rule blocks (each rule has single canonical section)
  - Phase 1 todos are only interview-related
  - Phase 2 todos created only after trigger
  - TypeScript compiles
  - Estimated ~600 token reduction

---

- [ ] **2.3 Deduplicate solomon.ts**

  **What to do**:
  1. Read `src/agents/solomon.ts`
  2. Identify redundant rules:
     - Identity constraints (3x → 1x)
     - Interview mode rules (duplicated from planner-paul)
     - Plan generation triggers (duplicated)
  3. Keep unique TDD content:
     - TDD philosophy
     - Dual test tracks (unit + E2E)
     - Thomas review chain
  4. Add `type: visual` flag instruction for E2E specs (for Joshua detection)
  5. Restructure to mention-once format
  6. Run `bun run typecheck`

  **Must NOT do**:
  - Remove TDD-specific content
  - Change the Thomas review requirement
  - Remove the Red-Green-Refactor structure

  **References**:
  - `src/agents/solomon.ts`
  - `src/hooks/planner-md-only/` (for hook error messages)

  **Acceptance Criteria**:
  - No redundant rule blocks (each rule has single canonical section)
  - Visual E2E specs include `type: visual` flag
  - TypeScript compiles
  - Estimated ~3,500 token reduction

---

### PHASE 3: Visual Test Improvements

---

- [ ] **3.1 Add visual test detection to joshua.ts**

  **What to do**:
  1. Read `src/agents/joshua.ts` to find existing Playwright invocation pattern
  2. Add visual test detection section (use same invocation pattern as existing):
     ```markdown
     ### Visual Test Detection (AUTO-HEADED)

     **When to run headed automatically:**
     | Signal | Action |
     |--------|--------|
     | Test file path contains `visual`, `ui`, `screenshot` | Add `--headed` |
     | Test name contains "visual", "layout", "screenshot" | Add `--headed` |
     | Solomon spec has `type: visual` | Add `--headed` |
     | E2E test for CSS/styling changes | Add `--headed` |

     **Command modification (use existing invocation pattern):**
     - Check Joshua's existing Playwright command format
     - Append `--headed` for visual tests
     - Example: If Joshua uses `bunx playwright test`, use `bunx playwright test --headed`
     ```
  3. Run `bun run typecheck`

  **Must NOT do**:
  - Remove existing debugging instructions
  - Make headed mode default for all tests
  - Change test execution logic
  - Change the Playwright invocation command pattern (only append `--headed`)

  **References**:
  - `src/agents/joshua.ts` (lines 145-165 for existing Playwright commands)
  - `src/agents/solomon.ts` (for spec format)

  **Acceptance Criteria**:
  - Joshua prompt includes visual test detection rules
  - Clear criteria for when to use `--headed`
  - Uses same Playwright invocation as existing Joshua commands
  - TypeScript compiles

---

- [ ] **3.2 Add visual flag to solomon.ts E2E specs**

  **What to do**:
  1. In `src/agents/solomon.ts`, update E2E spec format to include type flag:
     ```markdown
     - [ ] **E2E Test**: [test name]
       - **Type**: visual | functional  # ← Add this
       - **File**: e2e/[name].spec.ts
       - **Steps**: ...
     ```
  2. Add instruction: "For UI/CSS/layout tests, set Type: visual. Joshua will run these headed."
  3. Run `bun run typecheck`

  **Must NOT do**:
  - Change unit test spec format
  - Make all E2E tests visual
  - Remove existing spec fields

  **References**:
  - `src/agents/solomon.ts`
  - `src/agents/joshua.ts` (for detection logic)

  **Acceptance Criteria**:
  - Solomon E2E spec format includes `Type` field
  - Clear guidance on when to use `visual` type
  - TypeScript compiles

---

### PHASE 4: Verification

---

- [ ] **4.1 Run full test suite**

  **What to do**:
  1. Run `bun test`
  2. Fix any failures caused by changes
  3. Ensure all 84+ test files pass

  **Must NOT do**:
  - Delete failing tests
  - Skip tests
  - Commit with failing tests

  **Acceptance Criteria**:
  - All tests pass
  - No new test failures introduced

---

- [ ] **4.2 Run typecheck**

  **What to do**:
  1. Run `bun run typecheck`
  2. Fix any type errors

  **Must NOT do**:
  - Use `any` to bypass errors
  - Use `@ts-ignore` or `@ts-expect-error`

  **Acceptance Criteria**:
  - Zero type errors

---

- [ ] **4.3 Manual verification of hook behavior**

  **What to do**:
  1. Test hierarchy-enforcer category bypass fix:
     ```bash
     # Start OpenCode with Paul agent
     opencode --agent Paul
     
     # In session, ask Paul to delegate with category and visual keywords:
     "Use delegate_task with category='quick' to change the button's CSS color to blue"
     
     # Expected: COMPETENCY VIOLATION error mentioning frontend-ui-ux-engineer
     ```
  2. Test plan generation gate:
     ```bash
     # Start OpenCode with planner-paul agent
     opencode --agent planner-paul
     
     # Ask to create a feature without saying trigger phrase:
     "I want to add a dark mode toggle"
     
     # Try to write plan directly (agent shouldn't be able to):
     # If agent attempts Write to .paul/plans/*, expect PLAN GENERATION BLOCKED
     
     # Then say trigger phrase:
     "make a plan"
     
     # Now agent should be able to write to .paul/plans/*
     ```
  3. Document test results in session or comment

  **Must NOT do**:
  - Skip manual verification
  - Mark complete without actual testing

  **Acceptance Criteria**:
  - hierarchy-enforcer blocks `category="quick"` with visual keywords
  - planner-md-only blocks plan writes without trigger phrase
  - planner-md-only blocks plan writes without todos registered
  - Error messages include actionable guidance
  - After trigger phrase, plan writes succeed
