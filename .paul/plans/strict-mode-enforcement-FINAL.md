# Strict Mode Enforcement - FINAL Implementation Plan

> **Date**: 2026-01-20
> **Status**: Ready for Implementation
> **User Decisions**: All confirmed (Q1-Q6)

---

## User Decisions Summary

### ✅ Q1: Plan Requirement Scope
**Decision**: Paul ONLY executes with a plan. Create `worker-paul` for trivial tasks.

**Agent Roles** (Final):
- **planner-paul**: Creates formal plans (planning only, no execution)
- **Paul**: Executes formal plans (strict follower, no autonomy)
- **worker-paul**: Handles trivial tasks without planning (autonomous, no plan needed)
- **Sisyphus**: Emergency escape hatch (bypasses all rules)

### ✅ Q2: TDD Exemption Rules
**Decision**: YES - schema.ts files (Zod validation) need tests

**TDD Required**:
- Code files: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, etc.
- Schema files: `*.schema.ts` (has validation logic)

**TDD Exempt**:
- Documentation: `.md`, `.txt`
- Configs: `.json`, `.yaml`, `.env`, `package.json`, `tsconfig.json`
- Types: `*.types.ts` (pure interfaces)
- Constants: `*.constants.ts` (static data)
- Assets: `.css`, `.png`, `.jpg`, `.svg`

### ✅ Q3: Multiple Plans
**Decision**: Use most recent plan as active plan (simple, no pointer file)

```typescript
function getActivePlan(): string | null {
  const plans = readdirSync(".paul/plans")
    .filter(f => f.endsWith(".md"))
    .sort((a, b) => statSync(b).mtime - statSync(a).mtime)

  return plans[0] || null // Most recent
}
```

### ✅ Q4: Joshua Result Format
**Decision**: Option A - Write to `.sisyphus/test-results/{todoId}.json`

**Format**:
```json
{
  "status": "PASS" | "FAIL",
  "jest": { "total": 32, "passed": 32, "failed": 0 },
  "playwright": { "total": 5, "passed": 5, "failed": 0 },
  "timestamp": 1737363200000
}
```

### ✅ Q5: File Conflict Detection
**Decision**: Option A - Implement file locking system

**Behavior**: BLOCK parallel delegation on same file

**Example**:
```typescript
delegate_task(prompt="Add getUserById to user.service.ts")  // Locks file
delegate_task(prompt="Add updateUser to user.service.ts")   // ❌ BLOCKED: File locked
```

### ✅ Q6: Category System
**Decision**: Option A - Categories REQUIRED for all delegations

**Categories** (Updated):
```typescript
{
  // Testing
  "unit-testing": "Peter (Test Writer)",
  "e2e-testing": "John (E2E Test Writer)",
  "test-execution": "Joshua (Test Runner)",

  // Implementation
  "backend-implementation": "Sisyphus-Junior",
  "frontend-implementation": "frontend-ui-ux-engineer",
  "general-purpose": "Sisyphus-Junior",  // NEW (replaces "quick")

  // Remove: "quick" ❌
}
```

---

## Architecture Overview

### Agent Ecosystem (Final)

```
User
  ├─→ planner-paul (Planning only)
  │     ├─→ Nathan (Request Analyst)
  │     ├─→ Timothy (Plan Reviewer)
  │     ├─→ Solomon (TDD Planner)
  │     │     ├─→ Thomas (Test Spec Reviewer)
  │     │     ├─→ Peter (Test Writer)
  │     │     └─→ John (E2E Test Writer)
  │     ├─→ explore (Code search)
  │     └─→ librarian (Docs research)
  │
  ├─→ Paul (Execution only)
  │     ├─→ Joshua (Test Runner)
  │     ├─→ Sisyphus-Junior (Backend implementation)
  │     ├─→ frontend-ui-ux-engineer (Frontend implementation)
  │     ├─→ git-master (Git operations)
  │     ├─→ explore (Code search)
  │     └─→ librarian (Docs research)
  │
  ├─→ worker-paul (Trivial tasks, autonomous) ✨ NEW
  │     ├─→ explore (Code search)
  │     └─→ librarian (Docs research)
  │
  └─→ Sisyphus (Emergency escape hatch)
        └─→ (Bypasses all rules)
```

### Workflow Decision Tree

```
User has a task →

┌─ Is it URGENT/EMERGENCY? (production down, critical bug)
│  └→ YES: @Sisyphus (bypass all rules)
│  └→ NO: Continue
│
┌─ Is it TRIVIAL? (typo, comment, small config, single-file < 50 lines)
│  └→ YES: @worker-paul (autonomous, no plan needed)
│  └→ NO: Continue
│
┌─ Is it EXECUTION? (code changes, features, refactoring)
│  └→ YES: Need formal plan
│     ├─→ Plan exists? → @Paul (execute plan)
│     └─→ No plan? → @planner-paul (create plan first)
│  └→ NO: Continue
│
└─ Is it PLANNING? (design, architecture, unclear requirements)
   └→ YES: @planner-paul (create formal plan)
```

---

## Implementation Tasks

### Phase 1: worker-paul Agent ✅ DONE

- [x] Create `src/agents/worker-paul.ts` (copy of sisyphus-junior)
- [x] Update `src/agents/index.ts` (add worker-paul to exports)
- [ ] Update `src/hooks/hierarchy-enforcer/constants.ts` (add worker-paul relationships)
- [ ] Test worker-paul agent

### Phase 2: Core Enforcement

#### Task 2.1: sisyphus-orchestrator Hook (HARD BLOCK)
- [ ] File: `src/hooks/sisyphus-orchestrator/index.ts`
- [ ] Change: `output.message = ...` → `throw new Error(...)`
- [ ] Add: Check for `.paul/plans/*` writes → special error
- [ ] Verify: Only `.sisyphus/*` writes allowed
- [ ] Test: Paul writes code → Error thrown
- [ ] Test: Paul writes to `.paul/plans/` → Error thrown
- [ ] Test: Paul writes to `.sisyphus/` → Allowed

#### Task 2.2: TDD Exemption Patterns
- [ ] File: `src/hooks/tdd-enforcement/constants.ts` (NEW)
- [ ] Define: `CODE_FILE_PATTERNS` (TDD required)
- [ ] Define: `EXEMPT_FILE_PATTERNS` (TDD not required)
- [ ] Define: `requiresTDD(filePath: string): boolean`
- [ ] Test: `.ts` file → TDD required
- [ ] Test: `.md` file → TDD exempt
- [ ] Test: `.schema.ts` file → TDD required

#### Task 2.3: TDD Enforcement Hook (TODO-Level Tracking)
- [ ] File: `src/hooks/tdd-enforcement/index.ts`
- [ ] Add: `todoPhases` Map (todo-level, not session-level)
- [ ] Add: Test file existence check (BLOCK if no tests)
- [ ] Add: RED phase completion check (BLOCK if no RED)
- [ ] Change: Warning → Error for missing prerequisites
- [ ] Integrate: TDD exemption patterns
- [ ] Test: Implement without tests → Error
- [ ] Test: Implement without RED → Error
- [ ] Test: Implement after RED → Allowed
- [ ] Test: Exempt file (.md) → No TDD enforcement

#### Task 2.4: Testing Competency Trap
- [ ] File: `src/hooks/hierarchy-enforcer/constants.ts`
- [ ] Add: `TESTING_KEYWORDS` array
- [ ] Add: Testing competency rule to `COMPETENCY_RULES`
- [ ] Update: `CATEGORY_TO_AGENT` - remove "quick", add testing categories
- [ ] File: `src/hooks/hierarchy-enforcer/index.ts`
- [ ] Add: Testing keyword detection logic
- [ ] Test: Delegate testing to Sisyphus-Junior → Error
- [ ] Test: Delegate testing to Peter/John/Joshua → Allowed

### Phase 3: Plan System

#### Task 3.1: Active Plan Mechanism
- [ ] File: `src/shared/plan-utils.ts` (NEW)
- [ ] Create: `getActivePlan(workspaceRoot: string): string | null`
- [ ] Logic: Return most recent `.paul/plans/*.md` by mtime
- [ ] Return: Full path to active plan or null
- [ ] Test: No plans → null
- [ ] Test: Multiple plans → most recent
- [ ] Test: Single plan → that plan

#### Task 3.2: Paul System Prompt (Strict Executor)
- [ ] File: `src/agents/paul.ts`
- [ ] Remove: All "Fast Mode" / "Ad-hoc" logic
- [ ] Add: Mandatory plan check (use `getActivePlan()`)
- [ ] Add: Trivial task detection → **TELL USER** to switch to worker-paul
- [ ] Add: Complex task without plan → **TELL USER** to switch to planner-paul
- [ ] Add: **CRITICAL**: Cannot invoke planner-paul (BLOCKED by hierarchy)
- [ ] Add: **CRITICAL**: Cannot invoke Solomon/Timothy/Nathan (planning phase only)
- [ ] Add: Strict TDD workflow (RED-GREEN-REFACTOR)
- [ ] Add: Testing delegation rules (Peter/John/Joshua)
- [ ] Add: Plan follower protocol (cannot modify plans)
- [ ] Remove: Self-planning logic
- [ ] Remove: References to delegating to planner-paul
- [ ] Test: Paul with no plan → Tells user to switch to planner-paul
- [ ] Test: Paul redirects trivial tasks → Tells user to switch to worker-paul
- [ ] Test: Paul tries to delegate to planner-paul → BLOCKED by hierarchy

#### Task 3.3: planner-paul System Prompt (Redirect Trivial)
- [ ] File: `src/agents/planner-paul.ts`
- [ ] Add: Trivial task detection → **TELL USER** to switch to worker-paul
- [ ] Add: **CRITICAL**: Cannot invoke Paul (BLOCKED by hierarchy)
- [ ] Add: **CRITICAL**: Cannot invoke Sisyphus-Junior (planning only, no execution)
- [ ] Add: After planning complete → **TELL USER** to switch to Paul for execution
- [ ] Reinforce: "NEVER implement" warning
- [ ] Reinforce: "Setup execution todos" as MANDATORY final step
- [ ] Remove: Any references to delegating to Paul
- [ ] Test: planner-paul receives trivial task → Tells user to switch to worker-paul
- [ ] Test: planner-paul receives complex task → Plans normally
- [ ] Test: planner-paul completes plan → Tells user to switch to Paul
- [ ] Test: planner-paul tries to delegate to Paul → BLOCKED by hierarchy

### Phase 4: Testing Infrastructure

#### Task 4.1: Joshua Output Contract
- [ ] File: `src/agents/joshua.ts`
- [ ] Add: File output requirement to system prompt
- [ ] Format: Write to `.sisyphus/test-results/{todoId}.json`
- [ ] Schema: `{ status, jest, playwright, timestamp }`
- [ ] Test: Joshua writes result file
- [ ] Test: Result file has correct schema

#### Task 4.2: Joshua Result Reader
- [ ] File: `src/shared/test-utils.ts` (NEW)
- [ ] Create: `getTestResult(todoId: string): TestResult | null`
- [ ] Parse: JSON from `.sisyphus/test-results/{todoId}.json`
- [ ] Validate: Schema correctness
- [ ] Test: Read valid result file → success
- [ ] Test: Read missing file → null
- [ ] Test: Read invalid JSON → error

#### Task 4.3: Hook Integration
- [ ] File: `src/hooks/tdd-enforcement/index.ts`
- [ ] Replace: Text parsing with file reading
- [ ] Use: `getTestResult(todoId)` instead of parsing output
- [ ] Update: Phase advancement based on file contents
- [ ] Test: Joshua FAIL result → advance to Implementation phase
- [ ] Test: Joshua PASS result → clear dirty files, advance to Completion

### Phase 5: Parallel Delegation Safety

#### Task 5.1: File Locking System
- [ ] File: `src/hooks/file-lock-enforcer/index.ts` (NEW)
- [ ] Create: `fileLocks` Map (filepath → delegationId)
- [ ] Before delegation: Infer files from prompt (best-effort)
- [ ] Before delegation: Check if files locked → throw error
- [ ] After delegation: Release locks
- [ ] Test: Parallel delegation, different files → Allowed
- [ ] Test: Parallel delegation, same file → Blocked
- [ ] Test: Sequential delegation → Allowed

#### Task 5.2: File Inference
- [ ] File: `src/hooks/file-lock-enforcer/inference.ts` (NEW)
- [ ] Create: `inferFilesFromPrompt(prompt: string): string[]`
- [ ] Parse: File paths from prompt (regex patterns)
- [ ] Fallback: Empty array if can't infer (trust Paul)
- [ ] Test: "Implement src/user.service.ts" → ["src/user.service.ts"]
- [ ] Test: Vague prompt → []

### Phase 6: Category System

#### Task 6.1: Update Categories
- [ ] File: `src/hooks/hierarchy-enforcer/constants.ts`
- [ ] Remove: "quick" category
- [ ] Add: "unit-testing", "e2e-testing", "test-execution"
- [ ] Add: "backend-implementation", "frontend-implementation"
- [ ] Keep: "general-purpose" (replaces "quick")
- [ ] Update: `CATEGORY_TO_AGENT` mapping

#### Task 6.2: Category Validation
- [ ] File: `src/hooks/hierarchy-enforcer/index.ts`
- [ ] Add: Category requirement check (reject if missing)
- [ ] Add: Category-keyword conflict detection
- [ ] Test: Missing category → Error
- [ ] Test: Category conflicts with keywords → Error
- [ ] Test: Valid category + matching keywords → Allowed

### Phase 7: Documentation

#### Task 7.1: Update Notion Page
- [ ] Remove: All "Fast Mode" sections
- [ ] Remove: "Operating Modes" comparison table
- [ ] Add: worker-paul agent documentation
- [ ] Add: Trivial task workflow
- [ ] Update: Agent hierarchy (include worker-paul)
- [ ] Update: TDD flow (show HARD BLOCKS)
- [ ] Add: Testing delegation rules
- [ ] Add: File locking explanation
- [ ] Update: Emergency workflow (Sisyphus only)

#### Task 7.2: Update README.md
- [ ] Remove: Fast Mode references
- [ ] Add: worker-paul agent
- [ ] Add: Three-agent model (planner-paul, Paul, worker-paul)
- [ ] Update: "How It Works" section
- [ ] Add: TDD mandatory enforcement
- [ ] Add: Testing competency rules

#### Task 7.3: Update AGENTS.md
- [ ] Add: worker-paul agent details
- [ ] Update: Paul's role (strict executor)
- [ ] Update: planner-paul (planning only)
- [ ] Add: Testing agent responsibilities (Peter/John/Joshua)
- [ ] Add: TDD workflow explanation
- [ ] Add: File locking system

#### Task 7.4: Create Migration Guide
- [ ] File: `docs/MIGRATION_TO_STRICT_MODE.md` (NEW)
- [ ] Document: Changes from previous version
- [ ] Explain: worker-paul for trivial tasks
- [ ] Explain: Paul requires plans now
- [ ] Provide: Examples of each agent's use case
- [ ] Warning: Sisyphus for emergencies only

---

## Testing Strategy

### Unit Tests (per task)

Each task above has associated tests. Run after implementing each task.

### Integration Tests

#### Test Suite 1: worker-paul Workflows
- [ ] Trivial task (typo fix) → worker-paul executes autonomously
- [ ] Complex task to worker-paul → refuses, redirects to planner-paul
- [ ] worker-paul calls explore → allowed
- [ ] worker-paul tries to delegate → blocked

#### Test Suite 2: Paul Strict Execution
- [ ] Paul with no plan → error
- [ ] Paul with plan → reads plan, executes
- [ ] Paul tries to write code → error
- [ ] Paul tries to modify plan → error
- [ ] Paul delegates testing to Sisyphus-Junior → error
- [ ] Paul delegates testing to Peter → allowed

#### Test Suite 3: TDD Enforcement
- [ ] Implement without tests → error
- [ ] Implement without RED phase → error
- [ ] Implement with RED complete → allowed
- [ ] Complete todo with dirty files → error
- [ ] Complete todo after GREEN → allowed
- [ ] Exempt file (.md) → no TDD enforcement

#### Test Suite 4: Parallel Delegation
- [ ] Parallel delegation, different files → allowed
- [ ] Parallel delegation, same file → blocked
- [ ] Sequential delegation → allowed
- [ ] Parallel within same phase → allowed
- [ ] Parallel across phases (per todo) → allowed

#### Test Suite 5: End-to-End Workflows
- [ ] Full feature: planner-paul → plan → Paul → execute → complete
- [ ] Trivial task: worker-paul → execute → complete
- [ ] Emergency: Sisyphus → bypass everything → complete

---

## Risk Mitigation

### Risk 1: Breaking Existing Workflows
**Impact**: Users with existing plans may break
**Mitigation**:
- Add feature flag `STRICT_MODE_ENABLED` (default: true)
- Detect old-style plans, auto-migrate or warn
- Document migration path

### Risk 2: File Locking False Positives
**Impact**: File inference blocks valid parallel work
**Mitigation**:
- Best-effort inference, fallback to allow
- User can override with `ignore_file_locks: true` param
- Monitor false positive rate

### Risk 3: User Confusion (Three Pauls)
**Impact**: Users don't know which Paul to use
**Mitigation**:
- Clear naming: planner-paul, Paul, worker-paul
- Decision tree in docs
- Agents redirect users if wrong choice
- Error messages suggest correct agent

### Risk 4: Joshua Result File Failures
**Impact**: Hooks fail if Joshua doesn't write file
**Mitigation**:
- Joshua system prompt emphasizes MUST write file
- Fallback to text parsing if file missing
- Hook warns but allows if file read fails

---

## Success Metrics

After full implementation:

- [ ] Zero instances of Paul writing code directly
- [ ] Zero instances of implementation without tests (for code files)
- [ ] Zero instances of skipped RED phase
- [ ] 100% of testing tasks routed to Peter/John/Joshua
- [ ] Zero "Fast Mode" references in docs
- [ ] worker-paul handles >80% of trivial tasks
- [ ] File locking prevents race conditions
- [ ] User feedback: clarity improved, confusion reduced

---

## Rollout Plan

### Week 1: Core Foundation
- Phase 1: worker-paul agent ✅ DONE
- Phase 2: Core enforcement (Tasks 2.1-2.4)
- Test thoroughly before proceeding

### Week 2: Plan System & Testing
- Phase 3: Plan system (Tasks 3.1-3.3)
- Phase 4: Testing infrastructure (Tasks 4.1-4.3)
- Integration tests

### Week 3: Parallel Delegation & Categories
- Phase 5: Parallel delegation safety (Tasks 5.1-5.2)
- Phase 6: Category system (Tasks 6.1-6.2)
- Integration tests

### Week 4: Documentation & Polish
- Phase 7: Documentation (Tasks 7.1-7.4)
- End-to-end testing
- User acceptance testing
- Release

---

## Next Steps

1. **Review this plan** - Confirm all decisions are correct
2. **Prioritize**: Which phase to implement first?
3. **Execute**: Start with Phase 2 (Core Enforcement)

**Ready to proceed with implementation?**

---

*End of Final Plan*
