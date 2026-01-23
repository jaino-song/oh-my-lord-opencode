# OH MY LORD OPENCODE: ARCHITECTURE & LOGIC

> "And the Lord said: Let there be tests, and there were tests. And the tests were red, and it was good."

## 1. THE PHILOSOPHY (ZERO-TRUST ORCHESTRATION)

This fork transforms OpenCode from a "Helpful Assistant" into a **Strict Project Manager**. It assumes the LLM will be lazy, hallucinate, and cut corners. Therefore, we do not *ask* it to follow rules; we **physically prevent** it from breaking them.

**The Three Pillars of Enforcement:**
1.  **Code-Level Blocking (The Law)**: Hooks that throw `Error` to reject invalid actions.
2.  **Prompt-Level Directives (The Instructions)**: Minimalist prompts optimized for token efficiency.
3.  **Context Injection (The Knowledge)**: `AGENTS.md` and `README.md` automatically injected to provide "why".

---

## 2. THE HIERARCHY (CHAIN OF COMMAND)

The system enforces a strict separation of concerns via the `hierarchy-enforcer` hook.

### 2.1 The Three Domains (Strict Separation)

| Domain | Owner | Responsibility | Can Call | CANNOT Call |
| :--- | :--- | :--- | :--- | :--- |
| **PLANNING** | `@planner-paul` | Requirements, Research, Architecture, Test Specs | `Timothy`, `Solomon`, `Nathan`, `explore`, `librarian` | `Paul`, `worker-paul`, `Sisyphus-Junior`, `Joshua` (No Execution) |
| **EXECUTION** | `@Paul` | Formal Plan Execution, TDD Loop, Delegation | `Joshua`, `Sisyphus-Junior`, `frontend-ui-ux-engineer`, `Peter`, `John`, `explore`, `librarian` | `planner-paul`, `worker-paul`, `Timothy`, `Nathan`, `Solomon` (Strict Separation) |
| **TRIVIAL** | `@worker-paul` | Small standalone tasks (< 50 lines, single file, low risk) | `explore`, `librarian` | `Paul`, `planner-paul`, `Sisyphus-Junior` (Autonomous Execution) |

**Strict Separation Rule**: Agents CANNOT invoke agents from other domains. The user must manually switch agents (e.g., `@planner-paul` → `@Paul` → `@worker-paul`).

### 2.2 The Call Graph (Hard-Coded)

The hook `src/hooks/hierarchy-enforcer/constants.ts` defines the allowed edges in the agent graph.

```mermaid
graph TD
    User --> PlannerPaul[@planner-paul]
    User --> Paul[@Paul]
    User --> WorkerPaul[@worker-paul]

    subgraph PLANNING
    PlannerPaul --> Timothy[Timothy: Plan Reviewer]
    PlannerPaul --> Solomon[Solomon: TDD Planner]
    PlannerPaul --> Nathan[Nathan: Request Analyst]
    Solomon --> Thomas[Thomas: Spec Reviewer]
    Solomon --> Peter[Peter: Unit Test Writer]
    Solomon --> John[John: E2E Test Writer]
    end

    subgraph EXECUTION
    Paul --> Joshua[Joshua: Test Runner]
    Paul --> SisyphusJunior[Sisyphus-Junior: Backend]
    Paul --> FrontendUI[frontend-ui-ux-engineer: UI]
    Paul --> GitMaster[git-master: Git Ops]
    Paul --> Peter
    Paul --> John
    end

    subgraph TRIVIAL
    WorkerPaul[worker-paul: Autonomous]
    end

    subgraph SHARED
    PlannerPaul --> Librarian[librarian: Docs]
    Paul --> Librarian
    WorkerPaul --> Librarian
    PlannerPaul --> Explore[explore: Code Search]
    Paul --> Explore
    WorkerPaul --> Explore
    end
```

**Violation Logic:**
If `planner-paul` tries to call `Sisyphus-Junior`:
> **BLOCKED**: "HIERARCHY VIOLATION: Agent 'planner-paul' is not authorized to call 'Sisyphus-Junior'."

---

## 3. THE WORKFLOW (ENFORCED SEQUENCE)

The system enforces a strict workflow with three entry points based on task complexity.

### Workflow A: Complex Tasks (PLANNING → EXECUTION)

**Phase 1: Planning (The Architect)**
1.  **User** calls `@planner-paul` with complex task.
2.  **Planner** analyzes request (delegates to `Nathan` if needed).
3.  **Review**: Planner MUST call `Timothy` to review the plan.
4.  **TDD Prep**: Planner calls `Solomon` to generate Test Specs (`.paul/plans/*-tests.md`).
5.  **Output**: A finalized plan file in `.paul/plans/`.
6.  **Handover**: Planner tells user: **"Planning complete. Please switch to @Paul to execute this plan."**
   - ⚠️ **Planner CANNOT execute** - Strict separation enforced by hooks.

**Phase 2: Execution (The Builder)**
1.  **User** manually switches to `@Paul`.
2.  **Plan Check**: Paul reads the active plan from `.paul/plans/` (most recent `.md` file).
   - If NO plan exists → **BLOCKED**: "No formal plan found. Please switch to @planner-paul to create a plan first."
3.  **TDD Loop (Red-Green-Refactor)** - Per todo:
    *   **Step A (RED)**: Paul delegates test writing to `Peter` (unit) or `John` (E2E).
    *   **Step B (RUN)**: Paul delegates to `Joshua` (Test Runner). Result: **FAIL** (expected).
    *   **Step C (GREEN)**: Paul delegates implementation to `Sisyphus-Junior` or `frontend-ui-ux-engineer`.
        *   *Hook*: TDD enforcement checks for RED phase first. If not → **BLOCKED**.
    *   **Step D (VERIFY)**: Paul delegates to `Joshua` again. Result: **PASS**.
4.  **Completion**: Paul tries to mark task completed.
    *   *Hook*: Checks if Joshua approved recently. If no → **BLOCKED**.

### Workflow B: Trivial Tasks (AUTONOMOUS)

**When to Use**: Single file, < 50 lines, low risk (typo, comment, simple config).

1.  **User** calls `@worker-paul` with trivial task.
2.  **Trivial Check**: worker-paul verifies task is trivial.
   - If complex → **STOP**: "This requires formal planning. Please switch to @planner-paul."
3.  **Autonomous Execution**: worker-paul executes directly (no delegation, no plan required).
   - ⚠️ **worker-paul CANNOT delegate** to implementation agents - Strict separation enforced.
4.  **Completion**: worker-paul completes task and reports back.

---

## 4. THE ENFORCEMENT MECHANISMS (HOOKS)

### 4.1 `sisyphus-orchestrator` (The "No Code" Hook)
*   **Target**: `Paul`, `planner-paul`.
*   **Action**: Intercepts `Write` / `Edit` tools.
*   **Logic**: If file path is NOT in `.sisyphus/` or `.paul/` -> **Throw Error**.
*   **Impact**: Paul literally cannot write production code. He MUST delegate.

### 4.2 `hierarchy-enforcer` (The "Council" Hook)
*   **Feature 1: Call Graph** (HARD BLOCK): Enforces parent-child whitelist from `AGENT_RELATIONSHIPS`.
    *   Blocks cross-domain calls (`planner-paul` → `Paul` → `worker-paul` all BLOCKED).
*   **Feature 2: Category Validation** (HARD BLOCK - MANDATORY):
    *   All delegations MUST specify `category` parameter (except utility agents: explore, librarian, Elijah).
    *   Error if missing category: Lists available categories (unit-testing, e2e-testing, backend-implementation, etc.).
    *   Warning if category conflicts with prompt keywords (e.g., `category="unit-testing"` but prompt mentions CSS).
*   **Feature 3: Competency Routing** (ADVISORY WARNING):
    *   Scans prompts for keywords to suggest appropriate specialists:
        *   **Testing**: `test`, `jest`, `playwright`, `spec`, `mock`, `coverage` → **Recommend** `Peter`, `John`, or `Joshua`.
        *   **Visual/UI**: `css`, `style`, `color`, `background`, `border`, `margin`, `padding`, `flex`, `grid`, `animation`, `transition`, `ui`, `ux`, `responsive`, `mobile`, `tailwind` → **Recommend** `frontend-ui-ux-engineer`.
        *   **Git Ops**: `commit`, `rebase`, `squash`, `branch`, `merge`, `checkout`, `push`, `pull`, `cherry-pick` → **Recommend** `git-master`.
        *   **Research**: `docs`, `documentation`, `library`, `framework`, `how to use`, `api reference`, `official docs` → **Recommend** `librarian`.
    *   **Behavior**: Injects advisory warning (not hard block) allowing Paul to proceed if valid reason exists.
    *   **Exemptions**:
        *   `Sisyphus-Junior` exempt from UI warnings (can delegate to frontend-ui-ux-engineer internally)
        *   `git-master` exempt from UI warnings (git operations may mention UI changes)
        *   TDD warning blocks stripped before keyword scanning (prevents false positives)
*   **Feature 4: File Locking** (HARD BLOCK): Prevents parallel delegation race conditions.
    *   Extracts file paths from prompts using regex.
    *   Acquires locks before delegation, releases after completion.
    *   Blocks delegation if file already locked by another session.
*   **Feature 5: Approval Gates** (HARD BLOCK): Intercepts `todowrite(status='completed')`.
    *   If task type is "implementation" → Requires recent `Joshua` success.
    *   If task type is "plan" → Requires recent `Timothy` approval.
*   **Feature 6: TDD Warning** (ADVISORY): Intercepts delegation to `Sisyphus-Junior`.
    *   Check: Has `Joshua` run in the last **10 minutes**?
    *   If No: Injects `[SYSTEM WARNING: TDD VIOLATION DETECTED]` into the prompt.

### 4.3 `tdd-enforcement` (The "Test-First" Hook)
*   **Target**: All code file writes/edits (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`).
*   **Phase Tracking**: Tracks RED-GREEN cycle per todo (session-scoped).
*   **Logic**:
    *   Writing a test file → Transition to **RED** phase.
    *   Writing implementation code in **NONE** phase → **BLOCKED**: "TDD VIOLATION: TEST-FIRST REQUIRED".
    *   Writing implementation code in **RED** phase → Allowed, transition to **GREEN** phase.
*   **Exemptions**: Config files (`.json`, `.yaml`), documentation (`.md`), type definitions (`.d.ts`), constants (`.constants.ts`), test files themselves.
*   **Force TDD**: Schema/validation files (`.schema.ts`, `validation.ts`) ALWAYS require tests.

### 4.4 `strict-workflow` (The "Environment" Hook)
*   **Bun Only**: Blocks `npm`, `yarn`, `pnpm` commands.
*   **Commit Style**: Blocks `git commit` messages not matching Conventional Commits regex.
*   **Naming**: Blocks non-kebab-case filenames.

### 4.5 `directory-agents-injector` (The "Memory" Hook)
*   **Action**: When any agent reads a file, this hook searches up the tree for `AGENTS.md`.
*   **Effect**: Injects the project philosophy ("The Covenant") into the context window automatically.
*   **Benefit**: Allows extremely short system prompts (100 lines) because context is loaded on demand.

---

## 5. DATA STRUCTURES

### Approval State (`.sisyphus/approval_state.json`)
Tracks the "Definition of Done".
```json
{
  "approvals": [
    {
      "taskId": "call_12345",
      "approver": "Joshua",
      "timestamp": 1700000000,
      "status": "approved"
    }
  ]
}
```

### Plans (`.paul/plans/`)
*   `{feature}.md`: The Implementation Plan (created by `planner-paul`).
*   `{feature}-tests.md`: The Test Specifications (created by `Solomon`).
*   **Active Plan Detection**: Paul reads the most recent `.md` file by modification time.

### Test Results (`.sisyphus/test-results/`)
**Structured output contract** from Joshua (Test Runner).
```json
{
  "status": "PASS" | "FAIL",
  "jest": {
    "total": 10,
    "passed": 10,
    "failed": 0,
    "skipped": 0
  },
  "playwright": {
    "total": 5,
    "passed": 5,
    "failed": 0,
    "flaky": 0
  },
  "timestamp": 1700000000,
  "duration_ms": 5432,
  "failures": [
    {
      "framework": "jest",
      "testName": "should validate email",
      "filePath": "src/utils/validation.test.ts",
      "errorMessage": "Expected true, received false"
    }
  ]
}
```
*   **File naming**: `{todoId}.json` (e.g., `call_abc123.json`).
*   **Purpose**: Machine-readable results instead of parsing text output (prevents hallucination).

### File Locks (In-Memory)
**Runtime state** to prevent parallel delegation race conditions.
```typescript
{
  filePath: "src/agents/paul.ts",
  sessionID: "sess_abc123",
  taskDescription: "Sisyphus-Junior: Implement user authentication...",
  lockedAt: 1700000000
}
```
*   **Lifecycle**: Acquired before delegation, released after completion.
*   **Scope**: In-memory only (cleared on process restart).

---

## 6. STRICT MODE ENFORCEMENT SUMMARY

The system uses both **HARD BLOCKS** (errors that prevent execution) and **ADVISORY WARNINGS** (suggestions that allow proceeding with caution).

| Enforcement | Type | Mechanism | Result if Violated |
| :--- | :--- | :--- | :--- |
| **Cross-Domain Calls** | HARD BLOCK | `hierarchy-enforcer` | **BLOCKED**: "HIERARCHY VIOLATION" error |
| **Missing Category** | HARD BLOCK | `hierarchy-enforcer` | **BLOCKED**: "CATEGORY REQUIRED" error |
| **Code without Tests** | HARD BLOCK | `tdd-enforcement` | **BLOCKED**: "TDD VIOLATION: TEST-FIRST REQUIRED" |
| **Orchestrator Writing Code** | HARD BLOCK | `sisyphus-orchestrator` | **BLOCKED**: "You MUST delegate" error |
| **File Lock Conflict** | HARD BLOCK | `hierarchy-enforcer` | **BLOCKED**: "FILE LOCK CONFLICT" error |
| **Task Completion Without Approval** | HARD BLOCK | `hierarchy-enforcer` | **BLOCKED**: "APPROVAL REQUIRED" error |
| **Wrong Competency** | ADVISORY | `hierarchy-enforcer` | **WARNING**: "COMPETENCY ADVISORY" (allows proceeding) |
| **Incomplete TODOs** | ADVISORY | `todo-continuation-enforcer` | **SUGGESTION**: Continue with next task (allows stopping) |

---

## 7. LEGACY COMPATIBILITY

*   **Sisyphus (Legacy)**: This agent is whitelisted in `BYPASS_AGENTS`. It ignores all hierarchy and competency rules. Use only as a last resort or "Escape Hatch" if the strict system deadlocks.
*   **worker-paul**: Replaces the concept of "Fast Mode". For trivial tasks, use `@worker-paul` instead of trying to bypass planning.

