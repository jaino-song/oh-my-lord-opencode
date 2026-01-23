# MIGRATION TO STRICT MODE

**Date**: 2026-01-21
**Version**: v3.0 (Strict Mode Enforcement)

This guide helps you migrate from the previous version (v2.0) to the new Strict Mode architecture.

---

## TL;DR - What Changed?

**REMOVED**:
- ❌ **"Fast Mode"** - No longer exists
- ❌ **Self-Directed Paul** - Paul cannot plan autonomously anymore
- ❌ **Flexible Hierarchy** - All cross-domain calls are now HARD BLOCKED
- ❌ **TDD Warnings** - Now HARD BLOCKS (not warnings)

**ADDED**:
- ✅ **worker-paul** - New agent for trivial tasks (replaces "Fast Mode")
- ✅ **Mandatory Categories** - All delegations require `category` parameter
- ✅ **File Locking** - Prevents parallel delegation race conditions
- ✅ **Structured Test Results** - Machine-readable JSON from Joshua
- ✅ **Todo-Level TDD Tracking** - RED-GREEN cycle per todo (not global)
- ✅ **Category Validation** - Warns if category conflicts with prompt keywords

---

## Before vs After

### v2.0 (Previous)

```typescript
// User could use Paul directly for small tasks
User: "@Paul, fix the typo in README.md"
Paul: *executes directly in "Fast Mode"*

// Paul could self-plan
User: "@Paul, add user authentication"
Paul: *creates own plan, executes it*

// Warnings for TDD violations (not blocking)
Paul: *writes code without tests*
System: [WARNING: TDD VIOLATION]
Paul: *continues anyway*

// No category requirement
Paul: delegate_task(
  agent="Sisyphus-Junior",
  prompt="implement auth"
)
```

### v3.0 (Strict Mode)

```typescript
// Trivial tasks go to worker-paul
User: "@worker-paul, fix the typo in README.md"
worker-paul: *executes directly*

// Complex tasks require planning first
User: "@planner-paul, add user authentication"
planner-paul: *creates formal plan*
planner-paul: "Planning complete. Please switch to @Paul to execute."
User: "@Paul, execute the plan"
Paul: *reads plan, executes via TDD*

// HARD BLOCKS for TDD violations
Paul: *tries to write code without tests*
System: [BLOCKED] TDD VIOLATION: TEST-FIRST REQUIRED
Paul: *cannot proceed until tests exist*

// Category is MANDATORY
Paul: delegate_task(
  agent="Sisyphus-Junior",
  prompt="implement auth"
)
System: [BLOCKED] CATEGORY REQUIRED
Paul: delegate_task(
  category="backend-implementation",  // ✅ Required
  agent="Sisyphus-Junior",
  prompt="implement auth"
)
```

---

## Migration Steps

### Step 1: Understand the Three Domains

You now have **three entry points** instead of two:

| Old Workflow | New Workflow |
|--------------|--------------|
| `@Paul` (Fast Mode) for quick fixes | `@worker-paul` for trivial tasks |
| `@planner-paul` → `@Paul` (Strict Mode) for complex tasks | Same (still exists) |

**Decision Tree**:
```
Is the task trivial? (single file, < 50 lines, low risk)
├─ YES → Use @worker-paul
└─ NO → Complex task
    └─ Use @planner-paul (creates plan) → @Paul (executes plan)
```

### Step 2: Add Categories to All Delegations

**Before**:
```typescript
delegate_task(
  agent="Peter (Test Writer)",
  prompt="Write unit tests for UserService"
)
```

**After**:
```typescript
delegate_task(
  category="unit-testing",  // ✅ MANDATORY
  agent="Peter (Test Writer)",
  prompt="Write unit tests for UserService"
)
```

**Available Categories**:
- Testing: `"unit-testing"`, `"e2e-testing"`, `"test-execution"`
- Implementation: `"backend-implementation"`, `"frontend-implementation"`, `"general-purpose"`
- Legacy: `"visual-engineering"`, `"ultrabrain"`, `"artistry"`, `"most-capable"`, `"writing"`, `"general"`

**Exemptions** (no category needed):
- `explore`, `librarian`, `background-agent`, `Elijah (Deep Reasoning Advisor)`

### Step 3: Adjust TDD Workflow

**OLD Behavior** (Warnings):
```
Paul writes code → System warns → Paul continues anyway
```

**NEW Behavior** (HARD BLOCKS):
```
Paul writes code → System BLOCKS with error → Paul MUST write tests first
```

**Correct Workflow**:
```typescript
// 1. RED: Write tests first
delegate_task(
  category="unit-testing",
  agent="Peter (Test Writer)",
  prompt="Write tests for authenticate()"
)

// 2. Run tests (should FAIL)
delegate_task(
  category="test-execution",
  agent="Joshua (Test Runner)",
  prompt="Run unit tests"
)
// Result: FAIL (expected)

// 3. GREEN: Implement code
delegate_task(
  category="backend-implementation",
  agent="Sisyphus-Junior",
  prompt="Implement authenticate() to make tests pass"
)

// 4. Verify tests PASS
delegate_task(
  category="test-execution",
  agent="Joshua (Test Runner)",
  prompt="Run unit tests"
)
// Result: PASS ✅
```

### Step 4: Understand Strict Separation

**Cross-domain calls are now BLOCKED**:

| Attempted Call | Result |
|----------------|--------|
| `planner-paul` → `Paul` | ❌ BLOCKED: "HIERARCHY VIOLATION" |
| `planner-paul` → `Sisyphus-Junior` | ❌ BLOCKED: "HIERARCHY VIOLATION" |
| `Paul` → `planner-paul` | ❌ BLOCKED: "HIERARCHY VIOLATION" |
| `Paul` → `worker-paul` | ❌ BLOCKED: "HIERARCHY VIOLATION" |
| `worker-paul` → `Paul` | ❌ BLOCKED: "HIERARCHY VIOLATION" |
| `worker-paul` → `Sisyphus-Junior` | ❌ BLOCKED: "HIERARCHY VIOLATION" |

**What to do instead**:
```
planner-paul finishes plan
  ↓
planner-paul tells USER: "Planning complete. Please switch to @Paul."
  ↓
USER manually switches: "@Paul"
  ↓
Paul reads plan and executes
```

### Step 5: Update Prompts

**OLD**: Refer to "Fast Mode" or ask Paul to plan
```
"@Paul, plan and implement user authentication"
```

**NEW**: Use the correct agent for each phase
```
# Phase 1: Planning
"@planner-paul, create a plan for user authentication"

# Phase 2: Execution (after planner-paul finishes)
"@Paul, execute the plan"
```

**For trivial tasks**:
```
"@worker-paul, fix typo in README.md line 42"
```

---

## Common Errors and Fixes

### Error 1: "CATEGORY REQUIRED"

**Error**:
```
[hierarchy-enforcer] CATEGORY REQUIRED: All delegations must specify a category parameter.
You attempted to delegate to: 'Sisyphus-Junior' without a category.
```

**Fix**:
```diff
- delegate_task(agent="Sisyphus-Junior", prompt="implement feature")
+ delegate_task(category="backend-implementation", agent="Sisyphus-Junior", prompt="implement feature")
```

### Error 2: "TDD VIOLATION: TEST-FIRST REQUIRED"

**Error**:
```
[tdd-enforcement] TDD VIOLATION: TEST-FIRST REQUIRED
You attempted to write implementation code without tests:
File: src/services/user.service.ts
```

**Fix**:
```typescript
// Step 1: Write tests FIRST
delegate_task(category="unit-testing", agent="Peter (Test Writer)", prompt="Write tests for UserService")

// Step 2: THEN write implementation
delegate_task(category="backend-implementation", agent="Sisyphus-Junior", prompt="Implement UserService")
```

### Error 3: "HIERARCHY VIOLATION"

**Error**:
```
[hierarchy-enforcer] HIERARCHY VIOLATION: Agent 'planner-paul' is not authorized to call 'Sisyphus-Junior'.
Allowed delegates for planner-paul: Timothy, Solomon, Nathan, explore, librarian.
```

**Fix**:
- Don't try to delegate from `planner-paul` to implementation agents
- Instead: Finish planning, tell user to switch to `@Paul`, let Paul delegate to implementation

### Error 4: "No formal plan found"

**Error**:
```
Paul: "No formal plan found. This requires planning. Please switch to @planner-paul to create a plan first."
```

**Fix**:
```
# Step 1: Create plan
"@planner-paul, create a plan for this task"

# Step 2: Execute plan (after planner-paul finishes)
"@Paul, execute the plan"
```

### Error 5: "FILE LOCK CONFLICT"

**Error**:
```
[hierarchy-enforcer] FILE LOCK CONFLICT: Cannot delegate this task because files are already being modified.
Locked files:
  - src/agents/paul.ts (locked by sess_abc123 for: Sisyphus-Junior: Refactor Paul agent...)
```

**Fix**:
- Wait for the current delegation to complete
- OR modify a different file
- This prevents two agents from editing the same file simultaneously

---

## What No Longer Works

### ❌ Self-Directed Paul
```typescript
// OLD (v2.0): Paul could plan autonomously
User: "@Paul, add authentication"
Paul: *creates plan, executes it*

// NEW (v3.0): BLOCKED
User: "@Paul, add authentication"
Paul: "No formal plan found. Please switch to @planner-paul to create a plan first."
```

### ❌ Fast Mode
```typescript
// OLD (v2.0): Paul automatically enters "Fast Mode" for quick tasks
User: "@Paul, fix typo in README"
Paul: *executes directly without plan*

// NEW (v3.0): Use worker-paul instead
User: "@worker-paul, fix typo in README"
worker-paul: *executes directly*
```

### ❌ TDD Bypass
```typescript
// OLD (v2.0): Could ignore TDD warnings
Paul: *writes code without tests*
System: [WARNING]
Paul: *continues anyway*

// NEW (v3.0): HARD BLOCKED
Paul: *writes code without tests*
System: [BLOCKED] TDD VIOLATION: TEST-FIRST REQUIRED
Paul: *cannot proceed*
```

---

## Benefits of Strict Mode

1. **Predictable Behavior**: No more guessing which mode Paul is in
2. **Enforced Quality**: TDD is mandatory, not optional
3. **Clear Separation**: Planning vs Execution vs Trivial tasks are distinct
4. **No Race Conditions**: File locking prevents parallel edit conflicts
5. **Machine-Readable Results**: Structured JSON from Joshua (no parsing hallucinations)
6. **Category Validation**: Catch delegation mistakes early

---

## Quick Reference

### Agent Selection Matrix

| Task Type | Agent | Example |
|-----------|-------|---------|
| Complex feature (needs architecture) | `@planner-paul` | "Add user authentication with OAuth" |
| Execute existing plan | `@Paul` | "Execute the authentication plan" |
| Typo fix | `@worker-paul` | "Fix typo in README.md line 42" |
| Comment addition | `@worker-paul` | "Add JSDoc comment to calculateTotal()" |
| Simple config change | `@worker-paul` | "Change port from 3000 to 4000 in config.ts" |

### Category Cheat Sheet

```typescript
// Testing
category="unit-testing"      → Peter (Test Writer)
category="e2e-testing"        → John (E2E Test Writer)
category="test-execution"     → Joshua (Test Runner)

// Implementation
category="backend-implementation"   → Sisyphus-Junior
category="frontend-implementation"  → frontend-ui-ux-engineer
category="general-purpose"          → Sisyphus-Junior

// No category needed
explore, librarian, background-agent, Elijah
```

---

## Need Help?

If you encounter issues during migration:

1. **Check the error message** - All blocks include actionable guidance
2. **Review AGENTS.md** - Updated with strict mode rules
3. **Read OH_MY_LORD_ARCHITECTURE.md** - Complete technical documentation
4. **Use Sisyphus** (escape hatch) - Only if the strict system deadlocks (last resort)

---

**Version History**:
- **v3.0** (2026-01-21): Strict Mode - Three domains, mandatory TDD, category validation
- **v2.0** (Previous): Dual-mode (Fast/Strict), flexible hierarchy
