---
name: plan-execution
description: "Guidance for executing formal implementation plans with proper verification and delegation."
---

# Plan Execution Guide

## Overview

Plans are created by the `planner` agent and executed by the `executor` agent. This separation ensures:
- Proper analysis before implementation
- Clear task breakdown
- TDD compliance
- Quality verification

## Plan Structure

```markdown
# Feature Name Implementation Plan

## Context
- What problem are we solving?
- What are the requirements?

## Architecture
- Component design
- Data flow
- Integration points

## Test Specifications
- Unit test cases
- E2E test cases
- Edge cases

## Implementation Tasks
1. [ ] Task 1 (verification: test X passes)
2. [ ] Task 2 (verification: build succeeds)

## Parallelization Groups
- Group A: [Task 1, Task 2] (can run in parallel)
- Group B: [Task 3] (depends on Group A)
```

## Execution Workflow

### 1. Load Plan
```bash
# Find most recent plan
ls -t .paul/plans/*.md | head -1
```

### 2. Verify Prerequisites
- All dependencies available
- Test environment ready
- No conflicting changes

### 3. Execute Tasks

For each task:

#### Step A: RED Phase
1. Delegate test writing:
   - `Task(agent="unit-test-writer", prompt="...")`
   - `Task(agent="e2e-test-writer", prompt="...")`
2. Run tests: `Task(agent="test-runner")`
3. Verify tests FAIL

#### Step B: GREEN Phase
1. Delegate implementation:
   - `Task(agent="backend-impl", prompt="...")`
   - `Task(agent="frontend-impl", prompt="...")`
2. Run tests: `Task(agent="test-runner")`
3. Verify tests PASS

#### Step C: Verification
1. Run build: `bun run build`
2. Run linter: `bun run lint`
3. Verify no regressions

### 4. Mark Complete
Only mark task complete when:
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Verification method satisfied
- [ ] No TODO comments left

## Delegation Patterns

### Sequential (Default)
```
Task 1 -> Task 2 -> Task 3
```
Use when tasks depend on each other.

### Parallel
```
Task 1 ─┬─> Task 3
Task 2 ─┘
```
Use when tasks are independent (different files, no shared state).

### Conditional
```
if (condition) {
  Task A
} else {
  Task B
}
```
Use when approach depends on discovery.

## Error Handling

### Test Failures
1. Read failure message carefully
2. Check if test is correct (not implementation)
3. Fix implementation to match test
4. Never modify test to match implementation (unless test is wrong)

### Build Failures
1. Check TypeScript errors
2. Fix type mismatches
3. Ensure imports are correct
4. Re-run build

### Blocked Tasks
1. Document blocker
2. Skip to next independent task
3. Return to blocked task later
4. Ask for help if stuck

## Best Practices

1. **One Task at a Time**: Keep exactly one task `in_progress`
2. **Verify Everything**: Don't trust agent output, verify yourself
3. **Small Commits**: Commit after each task completion
4. **Document Issues**: Note any deviations from plan
