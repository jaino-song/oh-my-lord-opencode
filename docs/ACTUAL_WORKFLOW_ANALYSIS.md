# Oh My Lord OpenCode - ACTUAL Workflow Analysis
> Generated: 2026-01-20
> Source: Code analysis of v3.0.0-beta.8

## CRITICAL DISCREPANCIES BETWEEN DOCS AND REALITY

### 1. Agent Hierarchy - ACTUAL vs DOCUMENTED

**ACTUAL** (from `src/hooks/hierarchy-enforcer/constants.ts`):

```
User
  ├─→ Paul (can call almost everyone)
  ├─→ planner-paul (planning specialist)
  └─→ Sisyphus (legacy bypass agent)

Paul can call:
  ├─→ Joshua (Test Runner)
  ├─→ Sisyphus-Junior / ultrabrain
  ├─→ frontend-ui-ux-engineer
  ├─→ git-master
  ├─→ explore, librarian
  ├─→ Elijah (Deep Reasoning Advisor)
  ├─→ Solomon (TDD Planner) ← DIRECT ACCESS!
  ├─→ Peter (Test Writer) ← DIRECT ACCESS!
  ├─→ John (E2E Test Writer) ← DIRECT ACCESS!
  ├─→ planner-paul ← Can ask for planning help
  ├─→ Timothy (Implementation Plan Reviewer)
  └─→ Nathan (Request Analyst)

planner-paul can call:
  ├─→ Nathan (Request Analyst)
  ├─→ Timothy (Implementation Plan Reviewer)
  ├─→ Solomon (TDD Planner)
  ├─→ explore
  ├─→ librarian
  └─→ background-agent

Solomon (TDD Planner) can call:
  ├─→ Thomas (TDD Plan Consultant)
  ├─→ Peter (Test Writer)
  └─→ John (E2E Test Writer)
```

**DOCUMENTED** (Notion page claims):
- "Paul cannot call Solomon directly"
- "Solomon is only called by planner-paul"
- "Strict phase hierarchy: Planning → TDD Planning → Execution"

**REALITY**: Paul has **direct access** to Solomon, Peter, and John. The "strict phase" model is OPTIONAL, not mandatory.

---

### 2. Operating Modes - ACTUAL vs DOCUMENTED

**ACTUAL**:
- **Default Mode (Fast)**: User → Paul → Paul decides next steps
  - Paul can call Solomon directly for quick TDD planning
  - Paul can call Peter/John directly to write tests
  - Paul can delegate to planner-paul if needed
  - No mandatory planning phase

- **Formal Planning Mode (Strict)**: User → planner-paul → (plan) → Paul
  - User explicitly invokes `@planner-paul`
  - planner-paul creates plan with Timothy review
  - planner-paul calls Solomon for test specs
  - planner-paul creates todo list for Paul
  - User switches to Paul for execution

**DOCUMENTED** (Notion claims):
- Two modes: "Strict Mode (Plan Exists)" vs "Fast Mode (No Plan)"
- Suggests modes are detected automatically
- Claims different hierarchy rules per mode

**REALITY**: Modes are USER-INITIATED, not detected. The hierarchy rules are the SAME in both modes (from the same constants.ts). The difference is just workflow entry point:
- **Fast Mode**: Start with `@Paul`
- **Formal Mode**: Start with `@planner-paul`

---

### 3. TDD Enforcement - ACTUAL vs DOCUMENTED

**ACTUAL** (from `src/hooks/tdd-enforcement/index.ts`):

The hook tracks "dirty files" (modified code files) and:
1. **Warns** (not blocks) when Paul delegates to implementation agents without recent Joshua run
2. **Blocks** todo completion if dirty files exist
3. **Clears** dirty state when Joshua runs

**Enforcement Logic**:
```typescript
// WARNING (not blocking):
if (delegating to Sisyphus-Junior/ultrabrain/frontend) {
  if (!hasRecentJoshuaRun(last 10 minutes)) {
    inject_warning("[TDD VIOLATION DETECTED]")
    // But still allows the call!
  }
}

// BLOCKING:
if (todowrite with status=completed) {
  if (hasDirtyFiles()) {
    throw Error("Cannot complete todo with unverified changes")
  }
}
```

**DOCUMENTED** (Notion claims):
- "TDD is NON-NEGOTIABLE"
- "Code cannot be written without tests being planned first"
- "Joshua MUST run after implementation" (implies blocking)

**REALITY**: TDD is **strongly encouraged** via warnings and todo-completion blocks, but **not strictly enforced** at delegation time. You CAN delegate implementation without running Joshua first—you just get a warning and can't mark the todo as done until Joshua passes.

---

### 4. Orchestrator Code Prohibition - ACTUAL vs DOCUMENTED

**ACTUAL** (from `src/hooks/sisyphus-orchestrator/index.ts`):

```typescript
// Paul/orchestrator-sisyphus can write to:
✓ .sisyphus/* (plans, notepads, approval state)
✓ .paul/* (drafts, plans)
✗ Everything else (triggers warning, not hard block)

// Warning injected if writing outside allowed paths:
"You are an ORCHESTRATOR, not an IMPLEMENTER.
You should DELEGATE implementation work..."
```

**Hook Action**: `INJECT WARNING MESSAGE` (does not throw Error)

**DOCUMENTED** (Notion claims):
- "Paul literally cannot write production code" (implies hard block)
- "No Direct Code by Paul - Paul delegates ALL code tasks - No exceptions"

**REALITY**: The hook **injects a warning message**, it doesn't **throw an error**. Paul is strongly discouraged but technically CAN write code (he'll just get scolded repeatedly).

---

### 5. Competency Routing - ACTUAL vs DOCUMENTED

**ACTUAL** (from `src/hooks/hierarchy-enforcer/index.ts`):

**STRICT (Throws Error)**:
- Visual/UI keywords → MUST delegate to `frontend-ui-ux-engineer`
- Git operations → MUST delegate to `git-master`
- Documentation research → MUST delegate to `librarian`

Keywords triggering Visual/UI block:
`["css", "style", "color", "background", "border", "margin", "padding", "flex", "grid", "animation", "transition", "ui", "ux", "responsive", "mobile", "tailwind"]`

**DOCUMENTED**: Mentioned in docs but not prominently featured as a core enforcement mechanism.

**REALITY**: This is one of the **hardest** enforcements in the system. If Paul's delegation prompt contains "css" and he's not delegating to frontend-ui-ux-engineer, the call is BLOCKED.

---

### 6. Review Gates - ACTUAL vs DOCUMENTED

**ACTUAL** (from `src/hooks/hierarchy-enforcer/index.ts`):

Approval requirements for todo completion:
```typescript
APPROVAL_REQUIREMENTS = {
  "implement": ["Joshua (Test Runner)"],
  "refactor": ["Joshua (Test Runner)"],
  "fix": ["Joshua (Test Runner)"],
  "visual": ["frontend-ui-ux-engineer"],
  "plan review": ["Timothy (Implementation Plan Reviewer)"],
  "spec review": ["Thomas (TDD Plan Consultant)"]
}
```

**Logic**: When Paul marks a todo as "completed", if the todo content contains keywords like "implement", the hook checks if Joshua has run recently. If not, it BLOCKS completion.

**DOCUMENTED** (Notion claims):
- "Timothy GATE (Phase 1)"
- "Thomas GATE (Phase 2)"
- "Joshua GATE (Phase 3)"
- Implies these are blocking gates in a sequential workflow

**REALITY**: These are **todo completion** requirements, not phase transition gates. Paul can skip around freely, but when marking todos complete, the hook verifies that the right approver ran.

---

### 7. Planner Constraints - ACTUAL vs DOCUMENTED

**ACTUAL** (from `src/hooks/planner-md-only/`):

**planner-paul** and **Solomon** are subject to:
1. **File Write Restriction**: Can only write `.md` files
2. **Delegation Whitelist**: Can only delegate to specific agents (Nathan, Timothy, Solomon, Thomas, Peter, John, explore, librarian)
3. **Bash Command Restriction**: Only safe read-only commands (ls, cat, grep, find, etc.)
4. **Hard Block on Implementation Delegation**: Cannot delegate to Sisyphus-Junior, Paul, ultrabrain

**Solomon's Allowed Delegates** (from constants.ts):
```typescript
ALLOWED_DELEGATE_TARGETS = [
  "Nathan (Request Analyst)",
  "Timothy (Implementation Plan Reviewer)",
  "Solomon (TDD Planner)",
  "Thomas (TDD Plan Consultant)",
  "Peter (Test Writer)",
  "John (E2E Test Writer)",
  "explore",
  "librarian",
  "background-agent"
]
```

**DOCUMENTED**: Claims planner-paul "MUST NOT invoke other agents directly" and "Cannot delegate implementation"

**REALITY**: The docs are partially right—planners CANNOT delegate to implementation agents (Sisyphus-Junior, Paul, etc.), but they CAN delegate to consultants (Nathan, Timothy), test specialists (Solomon, Thomas, Peter, John), and research agents (explore, librarian).

---

## ACTUAL WORKFLOW (CANONICAL)

### Workflow A: Fast Mode (Default)

```
1. User invokes @Paul with a task
2. Paul analyzes the request
3. Paul chooses one of:

   Option A1: Simple Implementation (No Planning)
   ├─→ Paul: Create TodoWrite list
   ├─→ Paul: delegate_task(agent="Solomon") → Get test specs
   ├─→ Paul: delegate_task(agent="Peter/John") → Write tests
   ├─→ Paul: delegate_task(agent="Joshua") → Run tests (FAIL - RED)
   ├─→ Paul: delegate_task(agent="Sisyphus-Junior") → Implement
   │   └─→ (Warning injected if no recent Joshua run)
   ├─→ Paul: delegate_task(agent="Joshua") → Run tests (PASS - GREEN)
   └─→ Paul: Mark todo complete
       └─→ (Blocked if dirty files remain)

   Option A2: Complex Implementation (Self-Directed Planning)
   ├─→ Paul: "Let me create a plan first"
   ├─→ Paul: Write plan to .paul/plans/{name}.md (allowed)
   ├─→ Paul: delegate_task(agent="Timothy") → Review plan
   ├─→ Paul: delegate_task(agent="Solomon") → Test specs
   ├─→ Paul: Create TodoWrite list from plan
   └─→ (Continue as Option A1)

   Option A3: Delegated Planning
   ├─→ Paul: delegate_task(agent="planner-paul") → Create formal plan
   ├─→ planner-paul runs (see Workflow B)
   ├─→ Paul: Read plan, read todos
   └─→ Paul: Execute todos (same as Option A1)
```

### Workflow B: Formal Planning Mode

```
1. User invokes @planner-paul with a task
2. planner-paul runs automatic analysis:
   ├─→ delegate_task(agent="Nathan") → Analyze request
   └─→ Nathan returns: Intent, Guardrails, Scope, Questions

3. planner-paul enters Interview Phase:
   ├─→ Fire parallel research agents (explore, librarian)
   ├─→ Update draft at .paul/drafts/{name}.md
   ├─→ Ask clarifying questions
   └─→ Repeat until requirements clear

4. planner-paul generates plan (when user says "make a plan"):
   ├─→ Register Phase 2 todos (plan generation, review, test specs)
   ├─→ Write plan to .paul/plans/{name}.md
   ├─→ Self-review for gaps
   ├─→ delegate_task(agent="Timothy") → Review plan
   ├─→ Fix Timothy's issues
   ├─→ delegate_task(agent="Solomon") → Create test specs
   │   └─→ Solomon writes .paul/plans/{name}-tests.md
   │   └─→ Solomon calls Thomas for review
   │   └─→ Solomon calls Peter/John to write actual test files
   └─→ Setup Execution Todos (MANDATORY FINAL STEP):
       ├─→ Read plan's ## TODOs section
       ├─→ Extract each item with context & verification
       ├─→ Append final QA todo
       └─→ Use TodoWrite to create execution list for Paul

5. Handoff to User:
   planner-paul: "Planning complete. Switch to @Paul for execution."

6. User invokes @Paul:
   ├─→ Paul reads plan at .paul/plans/{name}.md
   ├─→ Paul reads todos (already created by planner-paul)
   └─→ Paul executes todos (same as Workflow A, Option A1)
```

---

## ENFORCEMENT SUMMARY

| Enforcement | Type | Consequence |
|-------------|------|-------------|
| **Hierarchy Violations** | HARD BLOCK | Error thrown, call rejected |
| **Competency Violations** (Visual→non-frontend) | HARD BLOCK | Error thrown, call rejected |
| **Planner Writing Code Files** | HARD BLOCK | Error thrown, write rejected |
| **Planner Delegating to Implementation** | HARD BLOCK | Error thrown, delegation rejected |
| **Paul Writing Code** | SOFT WARNING | Warning message injected, allowed |
| **Implementation Without Recent Tests** | SOFT WARNING | Warning injected, allowed |
| **Todo Completion With Dirty Files** | HARD BLOCK | Error thrown, completion rejected |
| **Missing Required Approval for Todo** | HARD BLOCK | Error thrown, completion rejected |

---

## KEY INSIGHTS

1. **Paul is Extremely Flexible**: Can call almost anyone, can plan or execute, can go fast or slow.
2. **planner-paul is Strict READ-ONLY**: Cannot code, cannot delegate implementation, only .md files.
3. **TDD is "Encouraged" Not "Mandatory"**: Warnings, not blocks, for skipping tests during implementation.
4. **Competency Rules are Ironclad**: Visual/UI/Git/Docs MUST go to specialists—no exceptions.
5. **Approval System is Todo-Based**: Not phase-based. You can work out of order, but can't complete todos without right approvals.
6. **Sisyphus is the Escape Hatch**: Bypasses ALL rules. Use only if system deadlocks.

---

## RECOMMENDATIONS FOR DOCUMENTATION REWRITE

1. **Stop Claiming Hard TDD Enforcement**: Say "TDD-encouraged" or "TDD-verified", not "TDD-mandatory"
2. **Emphasize Paul's Flexibility**: He's a "universal orchestrator", not a rigid workflow engine
3. **Clarify Mode Selection**: User chooses mode by starting with @Paul (fast) or @planner-paul (formal)
4. **Promote Competency Rules**: These are the REAL hard constraints, not the phase model
5. **Show Actual Hierarchy**: Use the constants.ts relationships, not an idealized version
6. **Explain Approval System**: It gates todo completion, not phase transitions
7. **Acknowledge Soft vs Hard**: Be clear about warnings vs errors

---

*End of Analysis*
