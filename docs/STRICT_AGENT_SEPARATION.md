# Strict Agent Separation Rules

> **Critical Design Principle**: Agents NEVER invoke each other across domains. They TELL THE USER to switch manually.

---

## The Three Domains

### Domain 1: Planning (planner-paul)
**Purpose**: Create formal implementation plans

**Can Call**:
- Nathan (Request Analyst)
- Timothy (Plan Reviewer)
- Solomon (TDD Planner)
  - Solomon → Thomas (Test Spec Reviewer)
  - Solomon → Peter (write test files)
  - Solomon → John (write E2E test files)
- explore (code search)
- librarian (docs research)

**CANNOT Call**:
- ❌ Paul (execution domain)
- ❌ Sisyphus-Junior (execution agent)
- ❌ worker-paul (different domain)

**What to do instead**: Tell user "Planning complete. Please switch to @Paul to execute this plan."

---

### Domain 2: Execution (Paul)
**Purpose**: Execute formal plans from planner-paul

**Can Call**:
- Joshua (Test Runner)
- Peter (write tests during execution)
- John (write E2E tests during execution)
- Sisyphus-Junior (implementation)
- frontend-ui-ux-engineer (UI implementation)
- git-master (git operations)
- Elijah (deep reasoning)
- explore (code search)
- librarian (docs research)

**CANNOT Call**:
- ❌ planner-paul (planning domain)
- ❌ Solomon (planning phase only - called by planner-paul)
- ❌ Timothy (plan reviewer - called by planner-paul)
- ❌ Nathan (request analyst - called by planner-paul)
- ❌ worker-paul (different domain)

**What to do instead**:
- If no plan exists: Tell user "No plan found. Please switch to @planner-paul to create a formal plan first."
- If task is trivial: Tell user "This is a trivial task. Please switch to @worker-paul for faster execution."

---

### Domain 3: Autonomous Trivial Tasks (worker-paul)
**Purpose**: Handle small standalone tasks without formal planning

**Can Call**:
- explore (code search)
- librarian (docs research)

**CANNOT Call**:
- ❌ Paul (execution domain)
- ❌ planner-paul (planning domain)
- ❌ Sisyphus-Junior (worker-paul executes directly, no delegation)
- ❌ Peter/John/Joshua (trivial tasks don't need formal TDD)

**What to do instead**:
- If task is complex: Tell user "This task requires formal planning. Please switch to @planner-paul to create a plan."

---

## Enforcement Mechanism

### Hierarchy Enforcer Hook

The `hierarchy-enforcer` hook **HARD BLOCKS** unauthorized calls:

```typescript
// Example violation:
Paul → delegate_task(agent="planner-paul", ...)

// Hook throws error:
❌ HIERARCHY VIOLATION: Agent 'Paul' is not authorized to call 'planner-paul'.
Allowed delegates for Paul: Joshua, Sisyphus-Junior, frontend-ui-ux-engineer, ...
Please follow the strict chain of command.
```

### Agent System Prompts

Each agent's prompt explicitly states what they CANNOT do:

**planner-paul**:
```
⚠️⚠️⚠️ CRITICAL: YOU CANNOT INVOKE PAUL ⚠️⚠️⚠️

After planning complete:
1. Tell user: "Planning complete. Please switch to @Paul to execute this plan."
2. Do NOT attempt to delegate to Paul (you cannot)
3. Wait for user to switch agents manually
```

**Paul**:
```
⚠️⚠️⚠️ CRITICAL: YOU CANNOT INVOKE planner-paul ⚠️⚠️⚠️

If no plan exists:
1. Tell user: "No plan found. Please switch to @planner-paul to create a plan first."
2. Do NOT attempt to delegate to planner-paul (you cannot)
3. Wait for user to switch agents manually
```

**worker-paul**:
```
⚠️⚠️⚠️ CRITICAL: YOU CANNOT INVOKE OTHER PAULS ⚠️⚠️⚠️

If task is complex:
1. Tell user: "This task requires formal planning. Please switch to @planner-paul."
2. Do NOT attempt to delegate to planner-paul (you cannot)
3. Do NOT attempt to delegate to Paul (you cannot)
4. Wait for user to switch agents manually
```

---

## Why Strict Separation?

### Problem with Cross-Domain Invocation

If Paul could invoke planner-paul:
1. **Confusion**: User loses control of workflow
2. **Infinite loops**: planner-paul → Paul → planner-paul → ...
3. **Unclear responsibility**: Who owns the plan?
4. **State management**: Which agent's todo list is active?

### Solution: Manual Switching

By requiring manual switches:
1. **User control**: User decides when to switch phases
2. **Clear boundaries**: Planning vs Execution vs Trivial
3. **No loops**: Agents cannot call each other
4. **Explicit handoff**: User sees "Planning done, switch to @Paul"

---

## User Workflows

### Workflow 1: Complex Feature (Planning → Execution)

```
User: "@planner-paul Build a user authentication system"
  ↓
planner-paul: (creates plan, calls Nathan/Timothy/Solomon)
  ↓
planner-paul: "Planning complete. Please switch to @Paul to execute this plan."
  ↓
User: "@Paul Execute the authentication plan"
  ↓
Paul: (reads plan, executes todos, calls Joshua/Sisyphus-Junior)
  ↓
Paul: "Plan execution complete. All tests passing."
```

### Workflow 2: Trivial Task (worker-paul)

```
User: "@worker-paul Fix typo in README: change 'teh' to 'the'"
  ↓
worker-paul: (directly fixes typo, no plan needed)
  ↓
worker-paul: "Typo fixed. README.md updated."
```

### Workflow 3: Wrong Agent (Redirection)

```
User: "@Paul Build a user authentication system"
  ↓
Paul: (checks for plan, finds none)
  ↓
Paul: "No plan found. This is a complex task requiring formal planning.
       Please switch to @planner-paul to create a plan first."
  ↓
User: "@planner-paul Build a user authentication system"
  ↓
(Now in correct workflow)
```

---

## Testing Strict Separation

### Test 1: Paul Cannot Invoke planner-paul
```typescript
// Setup: Paul tries to delegate to planner-paul
delegate_task(agent="planner-paul", prompt="Create a plan for X")

// Expected: BLOCKED by hierarchy-enforcer
// Error: "HIERARCHY VIOLATION: Agent 'Paul' is not authorized to call 'planner-paul'."
```

### Test 2: planner-paul Cannot Invoke Paul
```typescript
// Setup: planner-paul tries to delegate to Paul
delegate_task(agent="Paul", prompt="Execute this task")

// Expected: BLOCKED by hierarchy-enforcer
// Error: "HIERARCHY VIOLATION: Agent 'planner-paul' is not authorized to call 'Paul'."
```

### Test 3: worker-paul Cannot Invoke Paul
```typescript
// Setup: worker-paul tries to delegate to Paul
delegate_task(agent="Paul", prompt="Execute this complex task")

// Expected: BLOCKED by hierarchy-enforcer
// Error: "HIERARCHY VIOLATION: Agent 'worker-paul' is not authorized to call 'Paul'."
```

### Test 4: Agents Redirect Users
```typescript
// Setup: Paul receives complex task with no plan
User: "@Paul Build authentication system"

// Expected: Paul tells user to switch
Paul: "No plan found. Please switch to @planner-paul to create a plan first."

// NOT expected: Paul delegates to planner-paul (blocked)
```

---

## Summary

**Golden Rule**: Agents operate in SEPARATE DOMAINS. They NEVER cross domains. They TELL USERS to switch.

**Enforcement**:
1. System prompts explicitly forbid cross-domain calls
2. Hierarchy-enforcer hook HARD BLOCKS unauthorized calls
3. Agents tell users to switch manually

**Result**:
- Clear boundaries
- User control
- No confusion
- No infinite loops
- Predictable workflows

---

*End of Document*
