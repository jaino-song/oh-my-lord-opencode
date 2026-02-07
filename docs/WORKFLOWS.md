# User Workflows (v4.2)

How to use oh-my-lord-opencode for different task types.

---

## Quick Start

Pick an agent via `@agent-name`. Three main agents are user-selectable:

| Agent | When to Use |
|-------|-------------|
| `@planner-paul` | Complex tasks needing formal plans |
| `@Paul` | After planner-paul creates a plan |
| `@worker-paul` | Trivial/small standalone tasks |

**Key Change (v4.2)**: planner-paul no longer auto-delegates. User manually switches agents.

---

## Workflow 1: Complex Feature (v4.2)

For features requiring architecture, multiple files, or business logic.

```
User: @planner-paul Build user authentication with JWT

planner-paul (auto-continues through all phases):
  Phase 0: Nathan analyzes (uses explore/librarian for impact)
           → Non-trivial detected → AUTO-CONTINUE
  Phase 1: Research (parallel explore/librarian)
  Phase 2: Creates plan in .paul/plans/auth.md
  Phase 3: Review chain (ALL MANDATORY):
           1. Elijah deep review - security/perf/arch (loop until PASS)
           2. Ezra deep review (loop until PASS)
           3. Solomon creates test specs
           4. Thomas TDD review (loop until approved)
  Phase 4: Sets up EXEC:: todos
           → "Plan ready. Switch to @Paul to execute." → STOPS

User: @Paul

Paul:
  1. Reads plan from .paul/plans/
  2. TDD Loop for each task:
     - Peter/John write tests
     - Joshua runs tests (RED - fail expected)
     - Paul-Junior/frontend implements
     - Joshua runs tests (GREEN - pass)
  3. Reports completion
```

**Duration**: Minutes to hours depending on complexity

---

## Workflow 2: Trivial Task (v4.2)

For small changes: typos, comments, simple configs, isolated file edits.

```
User: @planner-paul Fix typo in README.md

planner-paul:
  Phase 0: Nathan analyzes (checks downstream dependencies)
           → Trivial detected (isolated file, no deps)
           → "Switch to @worker-paul for faster execution." → STOPS

User: @worker-paul Fix typo in README.md

worker-paul:
  1. Fixes typo directly
  2. Verifies with lsp_diagnostics
  3. Reports completion
```

**Duration**: Seconds

**Note (v4.2)**: Triviality is now impact-based, not LOC-based. A 5-line change to a shared utility used by 50 files is NOT trivial.

---

## Workflow 3: Direct Trivial (Escape Hatch)

Skip routing for known-trivial tasks.

```
User: @worker-paul Fix typo in README.md

worker-paul:
  1. Fixes typo directly
  2. Reports completion
```

**When to use**: When you know the task is trivial and want to skip Nathan analysis.

---

## Workflow 4: Research Only

For exploration without implementation.

```
User: @planner-paul How does the authentication system work?

planner-paul:
  1. Fires explore agents to search codebase
  2. Fires librarian for docs lookup
  3. Synthesizes findings
  4. Reports without creating a plan
```

---

## Workflow 5: Resume Interrupted Work (v4.2)

If a session was interrupted:

```
User: @planner-paul continue

planner-paul:
  1. Checks for existing plan in .paul/plans/
  2. If found: "Plan ready at .paul/plans/X.md. Switch to @Paul to execute."
  3. If not found: asks what you want to do

User: @Paul (to continue execution)
```

**Note (v4.2)**: planner-paul does NOT auto-delegate. User must switch to @Paul manually.

---

## Common Commands (v4.2)

| Command | Purpose |
|---------|---------|
| `@planner-paul <task>` | Start planning for complex task |
| `@Paul` | Execute existing plan |
| `@worker-paul <task>` | Quick trivial task (standalone) |
| `@planner-paul continue` | Check for existing plan |

---

## Task Complexity Guide (v4.2 - Impact-Based)

| Complexity | Indicators | Agent |
|------------|------------|-------|
| Trivial | Isolated file, no downstream deps, no shared code | `@worker-paul` |
| Non-Trivial | Any shared code, components, 3+ dependents | `@planner-paul` → `@Paul` |

**Impact indicators** (checked by Nathan via explore/librarian):
- Files with 3+ downstream dependents = NOT trivial
- Shared utilities/hooks = NOT trivial
- Components (require visual verification) = NOT trivial
- Core business logic = NOT trivial

---

## TDD Enforcement

For code changes, TDD is mandatory:

1. **RED**: Tests written, tests fail
2. **GREEN**: Implementation written, tests pass
3. **REFACTOR**: Clean up, verify build

Attempting to write code without tests will be BLOCKED.

Note: TDD enforcement is file-pattern-based (see `src/hooks/tdd-enforcement/constants.ts`).

---

## Tips (v4.2)

1. **Start with planner-paul** - Let Nathan analyze impact first
2. **Be specific** - Clear requirements = better plans
3. **Trust the review chain** - Elijah + Ezra + Thomas ensure quality
4. **Switch agents manually** - planner-paul stops after planning
5. **Use worker-paul for isolated fixes** - Only for files with no dependents
6. **Check .paul/plans/** - Plans are saved for reference

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "HIERARCHY VIOLATION" | Wrong agent called. Let planner-paul route. |
| "TDD VIOLATION" | Write tests first, then implement. |
| "No plan found" | Use @planner-paul to create a plan first. |
| Task too complex for worker-paul | Use @planner-paul instead. |
