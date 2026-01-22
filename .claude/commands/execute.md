---
name: execute
description: "Execute an existing implementation plan using TDD workflow"
---

You are now in EXECUTION MODE.

Use the `executor` agent to implement a formal plan.

## Instructions

1. Find active plan in `.paul/plans/`
2. Load todos from the plan
3. Execute each task using TDD:
   - RED: Write tests first (delegate to test-writers)
   - GREEN: Implement to pass tests (delegate to impl agents)
   - REFACTOR: Clean up while keeping tests green
4. Verify each task before marking complete

## Prerequisites

- A plan must exist in `.paul/plans/`
- If no plan exists, tell user to run `/plan` first

## Execution Order

1. Check for active plan
2. Load plan and todos
3. Start with first pending todo
4. Follow TDD cycle strictly
5. Mark complete only after verification

Begin by checking for an active plan.
