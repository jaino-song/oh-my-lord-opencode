# User Workflows

How to use oh-my-lord-opencode for different task types.

---

## Quick Start

You can explicitly pick an agent via `@agent-name`, or let OpenCode use the plugin’s default.

Default agent selection is set by the plugin config handler (`src/plugin-handlers/config-handler.ts`):
- If `Paul` is enabled: default agent is `Paul`.
- If `Paul` is disabled: default agent is `planner-paul`.

Recommended workflows:
- Planning-first: `@planner-paul <request>`
- Orchestrator-first: `@Paul <request>`
- Trivial one-off: `@worker-paul <request>`
- Minimal prompt: `@Saul <request>`

---

## Workflow 1: Complex Feature

For features requiring architecture, multiple files, or business logic.

```
User: @planner-paul Build user authentication with JWT

planner-paul:
  1. Invokes Nathan to analyze complexity
  2. Researches codebase patterns (explore, librarian)
  3. Asks clarifying questions if needed
  4. Creates plan in .paul/plans/auth.md
  5. Gets plan reviewed by Timothy
  6. Creates test specs via Solomon
  7. Delegates to Paul

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

## Workflow 2: Trivial Task

For small changes: typos, comments, simple configs, single-file edits.

```
User: @planner-paul Fix typo in README.md

planner-paul:
  1. Invokes Nathan to analyze
  2. Nathan detects: trivial task
  3. Delegates to worker-paul

worker-paul:
  1. Fixes typo directly
  2. Verifies with lsp_diagnostics
  3. Reports completion
```

**Duration**: Seconds

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

## Workflow 5: Resume Interrupted Work

If a session was interrupted:

```
User: @planner-paul continue

planner-paul:
  1. Checks for existing plan in .paul/plans/
  2. If found: delegates to Paul to continue
  3. If not found: asks what you want to do
```

---

## Common Commands

| Command | Purpose |
|---------|---------|
| `@planner-paul <task>` | Start any task (recommended) |
| `@worker-paul <task>` | Quick trivial task (escape hatch) |
| `@planner-paul continue` | Resume interrupted work |
| `@planner-paul make a plan` | Force plan generation |

---

## Task Complexity Guide

| Complexity | Indicators | Route |
|------------|------------|-------|
| Trivial | Single file, <30 LOC, typos, comments | worker-paul |
| Simple | 1-2 files, clear requirements | worker-paul or Paul |
| Medium | Multiple files, some architecture | Paul (with plan) |
| Complex | New feature, business logic, tests needed | Paul (with plan) |

---

## TDD Enforcement

For code changes, TDD is mandatory:

1. **RED**: Tests written, tests fail
2. **GREEN**: Implementation written, tests pass
3. **REFACTOR**: Clean up, verify build

Attempting to write code without tests will be BLOCKED.

Note: TDD enforcement is file-pattern-based (see `src/hooks/tdd-enforcement/constants.ts`).

---

## Tips

1. **Let planner-paul route** - Don't guess which agent to use
2. **Be specific** - Clear requirements = better plans
3. **Trust the process** - TDD enforcement exists for quality
4. **Use worker-paul for quick fixes** - Skip planning overhead for trivial tasks
5. **Check .paul/plans/** - Plans are saved for reference

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "HIERARCHY VIOLATION" | Wrong agent called. Let planner-paul route. |
| "TDD VIOLATION" | Write tests first, then implement. |
| "No plan found" | Use @planner-paul to create a plan first. |
| Task too complex for worker-paul | Use @planner-paul instead. |
