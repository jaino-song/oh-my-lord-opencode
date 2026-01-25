# Draft: Prompt Deduplication & Hook Enforcement (v4 - Full Agent Analysis)

## Problem Statement
1. **planner-paul violated workflow rules** - Rules in prompt, not enforced by hooks
2. **Solomon has the SAME vulnerability** - Identical trigger rules, no enforcement
3. **Paul has redundant rules** - Says same thing 3x when hooks enforce it

---

## Scope

### IN SCOPE (Modified)
- `planner-paul.ts` - Deduplicate + hook enforcement
- `solomon.ts` - Deduplicate + hook enforcement  
- `paul.ts` - Deduplicate (mention once principle)
- `planner-md-only` hook - Add plan generation gate

### OUT OF SCOPE (per user request)
- ~~sisyphus.ts~~ - No changes
- ~~prometheus-prompt.ts~~ - Deprecated, no changes

### EXAMINED BUT NO CHANGES NEEDED
- `timothy.ts` - Clean, focused (278 lines)
- `thomas.ts` - Clean, focused (337 lines)
- `nathan.ts` - Clean, focused (300 lines)
- `peter.ts` - Reference material (668 lines)
- `john.ts` - Reference material (806 lines)
- `joshua.ts` - Clean, focused (602 lines)
- `elijah.ts` - Clean, focused (300+ lines)

---

## Supporting Agents Analysis

### Agents That Are Well-Designed (No Changes)

| Agent | Lines | Role | Assessment |
|-------|-------|------|------------|
| **Timothy** | 278 | Plan reviewer | ✅ Clean. Single-purpose. READ-ONLY enforced via tool restrictions. |
| **Thomas** | 337 | TDD plan consultant | ✅ Clean. Single-purpose. READ-ONLY enforced via tool restrictions. |
| **Nathan** | 300 | Request analyst | ✅ Clean. Unique pre-planning role. No redundancy. |
| **Elijah** | 300+ | Deep reasoning advisor | ✅ Clean. 5 modes well-structured. READ-ONLY enforced. |
| **Joshua** | 602 | Test runner | ✅ Clean. Focus on execution. Edit denied via permissions. |

### Agents With Reference Material (Minor Optimization Only)

| Agent | Lines | Content Type | Assessment |
|-------|-------|--------------|------------|
| **Peter** | 668 | Jest patterns | ⚠️ Has closing `<system-reminder>` that repeats constraints (lines 611-620). Reference patterns are useful, not redundant. |
| **John** | 806 | Playwright patterns | ⚠️ Same pattern - closing `<system-reminder>` repeats constraints (lines 749-758). Reference patterns are useful. |

**Note**: Peter and John have comprehensive pattern references that serve as "cheat sheets" for test writing. These aren't redundant - they're intentional reference material.

### Why No Hook Enforcement Needed for Supporting Agents

| Agent | Why No Hook Needed |
|-------|-------------------|
| Timothy, Thomas, Nathan, Elijah | Already READ-ONLY via tool restrictions (`edit: "deny"`) |
| Peter, John | Write test files (allowed), not source code |
| Joshua | Only runs tests (`edit: "deny"`) |

The enforcement gap is in the **orchestration layer** (Paul, planner-paul, Solomon), not the **worker layer**.

---

## Critical Issues (Orchestration Layer Only)

### Issue 1: Plan Generation Trigger (NO ENFORCEMENT)

| Agent | Rule | Lines | Hook Enforces? |
|-------|------|-------|----------------|
| planner-paul | "Only generate when user says 'make a plan'" | 32 | ❌ NO |
| Solomon | "Only generate when user says 'make a plan'" | 121-129 | ❌ NO |

### Issue 2: Paul Delegation Violation for Frontend Tasks (HOOK BUG)

| Rule | What Paul Did | What Paul Should Do | Enforced? |
|------|---------------|---------------------|-----------|
| "Frontend/Visual → frontend-ui-ux-engineer" | `category="quick"` → Sisyphus-Junior | `subagent_type="frontend-ui-ux-engineer"` | ❌ **HOOK EXISTS BUT BYPASSED** |

**Root Cause**: `hierarchy-enforcer` hook only checks `agent/subagent_type/name`, not `category`. When `category="quick"` is used, `targetAgent` is undefined and competency check is skipped entirely.

### Issue 3: Playwright Tests Not Running Headed for Visual Changes

| Expected | Actual | Impact |
|----------|--------|--------|
| John writes E2E → Joshua runs `--headed` | Tests run headless or not at all | No visual verification for UI changes |

### Issue 2: Todo Registration Before Plan (NO ENFORCEMENT)

| Agent | Rule | Lines | Hook Enforces? |
|-------|------|-------|----------------|
| planner-paul | "Register todos before plan" | 37 | ❌ NO |
| Solomon | "Register todos before plan" | 253-269 | ❌ NO |

### Issue 3: Redundant Rule Repetition

| Agent | Rule | Occurrences | Hook Enforces? |
|-------|------|-------------|----------------|
| Paul | "DO NOT implement" | 3x (L23, L45, L76) | ✅ `sisyphus-orchestrator` |
| Paul | "MUST delegate" | 3x (L25, L45, L76) | ✅ `sisyphus-orchestrator` |
| planner-paul | "DO NOT execute" | 4x (L7-8, L12-14, L16-17, L103-107) | ✅ `planner-md-only` |
| Solomon | Identity constraints | 3x | ✅ `planner-md-only` |

---

## Proposed Changes

### Part 1: Hook Enforcement (Critical)

**File**: `src/hooks/planner-md-only/index.ts`

```typescript
// New logic for plan generation gate
if (PLAN_PATH_PATTERN.test(filePath)) {
  // Check 1: User trigger phrase detected?
  const hasTrigger = await checkUserTriggerPhrase(sessionID, ctx)
  
  // Check 2: Todos registered?
  const hasTodos = await checkTodosExist(sessionID, ctx)
  
  if (!hasTrigger) {
    throw new Error(
      `[planner-md-only] PLAN GENERATION BLOCKED: No user trigger.\n` +
      `User must say: "make a plan", "generate plan", "save it"\n` +
      `Current: Interview mode. Continue in drafts.`
    )
  }
  
  if (!hasTodos) {
    throw new Error(
      `[planner-md-only] PLAN GENERATION BLOCKED: No todos registered.\n` +
      `Must call todowrite() before creating plan file.`
    )
  }
}
```

**File**: `src/hooks/planner-md-only/constants.ts`

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

export const DRAFT_PATH_PATTERN = /\.(paul|sisyphus)\/drafts\//
export const PLAN_PATH_PATTERN = /\.(paul|sisyphus)\/plans\//
```

### Part 2: Prompt Deduplication

#### paul.ts (102 → ~70 lines, 33% savings)

**Remove redundant mentions of:**
- "DO NOT implement" (keep 1 of 3)
- "MUST delegate" (keep 1 of 3)
- "TDD mandatory" (keep 1 of 3)
- "Verify" (keep 1 of 3)

**Proposed structure:**
```markdown
## 1. CORE IDENTITY
- ROLE: Conductor. Coordinate, delegate, verify. (Hook blocks direct code)
- TDD: Mandatory. Verify: Always. (Subagents lie)

## 2. WORKFLOW
[Streamlined TDD chain + delegation + verification]

## 3. FILE OPERATIONS
- Allowed: .sisyphus/, .paul/, read elsewhere
- Blocked: Source code (hook error)
```

#### planner-paul.ts (133 → ~80 lines, 40% savings)

**Remove redundant mentions of:**
- "DO NOT execute" (keep 1 of 4)
- "Non-negotiable" constraints (keep 1)

**Proposed structure:**
```markdown
## 1. CORE IDENTITY
- ROLE: Planner for Paul. No execution. (Hook-enforced)

## 2. WORKFLOW
### Phase 0: Nathan (auto)
### Phase 1: Interview (default)
- Transition: User says "make a plan" (hook-enforced)

### Phase 2: Plan Generation
- Requires: User trigger + Todos (hook-enforced)

### Phase 3: Review Chain
Timothy → Solomon

## 3. PLAN STRUCTURE
[Keep existing]
```

#### solomon.ts (824 → ~500 lines, 40% savings)

**Remove redundant mentions of:**
- Identity constraints (keep 1 of 3)
- Interview mode rules (keep 1)
- Plan generation triggers (keep 1)

**Proposed structure:**
```markdown
## 1. CORE IDENTITY  
- ROLE: TDD Planner. No execution. (Hook-enforced)

## 2. TDD PHILOSOPHY
[Keep - unique to Solomon]

## 3. DUAL TEST TRACKS
[Keep - unique to Solomon]

## 4. WORKFLOW
[Streamlined, single mention of triggers]

## 5. TDD PLAN STRUCTURE
[Keep - unique to Solomon]
```

---

## Token Savings Summary

### Primary Targets (Orchestration Layer)

| Agent | Current | After | Savings |
|-------|---------|-------|---------|
| paul.ts | ~1,200 | ~800 | 33% |
| planner-paul.ts | ~1,500 | ~900 | 40% |
| solomon.ts | ~10,000 | ~6,000 | 40% |
| **Total** | **~12,700** | **~7,700** | **~5,000 (39%)** |

### Supporting Agents (No Changes)

| Agent | Lines | Status |
|-------|-------|--------|
| timothy.ts | 278 | ✅ Clean |
| thomas.ts | 337 | ✅ Clean |
| nathan.ts | 300 | ✅ Clean |
| peter.ts | 668 | ✅ Reference material |
| john.ts | 806 | ✅ Reference material |
| joshua.ts | 602 | ✅ Clean |
| elijah.ts | 300+ | ✅ Clean |

---

## Files to Modify (Final List)

### HIGH PRIORITY (Critical Enforcement Gaps)

| File | Action |
|------|--------|
| `src/hooks/planner-md-only/index.ts` | Add plan generation gate (user trigger + todos check) |
| `src/hooks/planner-md-only/constants.ts` | Add trigger phrases, path patterns |
| `src/hooks/hierarchy-enforcer/index.ts` | **FIX**: Add category → agent mapping before competency check |
| `src/hooks/hierarchy-enforcer/constants.ts` | Add CATEGORY_TO_AGENT mapping |

### MEDIUM PRIORITY (Prompt Deduplication)

| File | Action |
|------|--------|
| `src/agents/paul.ts` | Deduplicate (3x → 1x) |
| `src/agents/planner-paul.ts` | Deduplicate + fix todo structure (no blocked todos in Phase 1) |
| `src/agents/solomon.ts` | Deduplicate + add `type: visual` flag for E2E specs |
| `src/agents/joshua.ts` | Add visual test detection + auto-headed mode |

### Summary of Changes

| Category | Files | Impact |
|----------|-------|--------|
| Plan trigger enforcement | 2 | Blocks premature plan generation |
| Delegation enforcement fix | 2 | Catches category-based visual task bypass |
| Prompt deduplication | 4 | ~5,000 token savings (39%) |
| Visual test improvements | 2 | Auto-headed for UI verification |

---

## Additional Finding #1: Paul Delegation Violation (CRITICAL HOOK GAP)

### Problem
Paul used `category="quick"` (which delegates to Sisyphus-Junior) for a CSS/frontend change instead of using `subagent_type="frontend-ui-ux-engineer"` as required by Paul's own rules.

### Evidence
```typescript
// What Paul did (WRONG):
delegate_task(category="quick", ...)  // → Sisyphus-Junior

// What Paul should have done (CORRECT):
delegate_task(subagent_type="frontend-ui-ux-engineer", ...)
```

### Root Cause Analysis (CRITICAL)

The `hierarchy-enforcer` hook EXISTS with competency rules, but has a **critical gap**:

```typescript
// hierarchy-enforcer/index.ts line 73
const targetAgent = (output.args.agent || output.args.subagent_type || output.args.name)

// Line 77-130: Competency check
if (targetAgent && !BYPASS_AGENTS.includes(currentAgent)) {
  // Check happens here...
  // BUT when category="quick" is used:
  // - output.args.agent = undefined
  // - output.args.subagent_type = undefined  
  // - output.args.name = undefined
  // So targetAgent is UNDEFINED and this entire block is SKIPPED!
}
```

**The hook doesn't check `category` parameter at all!**

When Paul uses `category="quick"`:
1. `targetAgent` is undefined
2. Competency check is skipped
3. Category resolves to Sisyphus-Junior AFTER the hook runs
4. Wrong agent executes the visual task

### Fix Required

**In `hierarchy-enforcer/index.ts`:**

```typescript
// BEFORE competency check, resolve category to target agent
const category = output.args.category as string | undefined
let targetAgent = (output.args.agent || output.args.subagent_type || output.args.name) as string | undefined

// Map category to agent for competency checking
if (!targetAgent && category) {
  const CATEGORY_TO_AGENT: Record<string, string> = {
    "quick": "Sisyphus-Junior",
    "visual-engineering": "frontend-ui-ux-engineer",
    "ultrabrain": "ultrabrain",
    // ...
  }
  targetAgent = CATEGORY_TO_AGENT[category]
}

// NOW the competency check will catch visual keywords with category="quick"
```

This is a **HIGH PRIORITY** fix because the enforcement mechanism exists but doesn't work for category-based delegation.

---

## Additional Finding #2: Playwright Tests Not Running Headed

### Problem
When Paul tests frontend changes, Joshua doesn't automatically run Playwright in headed mode. Visual changes require visual verification, but tests run headless by default.

### Analysis of Joshua's Prompt

Joshua's prompt mentions `--headed` only in debugging section (line 421):
```bash
# Debugging section - manual use
npx playwright test --headed
```

**No automatic detection** to use `--headed` for frontend/visual tests.

### Expected Behavior
For frontend/visual changes:
1. John writes E2E tests
2. Joshua detects it's a visual test (keywords, file path, or metadata)
3. Joshua runs with `--headed` flag automatically
4. Visual verification occurs

### Actual Behavior
- Joshua runs all tests headless by default
- No detection for visual/frontend test type
- No automatic `--headed` for UI tests

### Fix Required

**In `joshua.ts`, add visual test detection:**

```typescript
### Visual Test Detection (AUTO-HEADED)

**When to run headed automatically:**
| Signal | Action |
|--------|--------|
| Test file in \`e2e/visual/\` or \`e2e/ui/\` | Add \`--headed\` |
| Test name contains "visual", "screenshot", "layout" | Add \`--headed\` |
| Solomon spec marked as \`type: "visual"\` | Add \`--headed\` |
| Frontend file changed (*.css, *.tsx with className) | Add \`--headed\` |

**Command modification:**
\`\`\`bash
# Normal E2E
npx playwright test e2e/auth.spec.ts

# Visual E2E (auto-detected)
npx playwright test e2e/visual/layout.spec.ts --headed
\`\`\`
```

**In Solomon's output for visual tests:**
```markdown
- [ ] **E2E Test**: Visual layout verification
  - **Type**: visual  # ← Add this flag
  - **Run Mode**: headed  # ← Explicit instruction
```

---

## Additional Finding #3: Todo Structure Issue

### Problem
planner-paul creates a "Generate implementation plan" todo during Phase 1 (interview), but marks it as blocked/cancelled. This triggers `todo-continuation-enforcer` to keep firing system directives for "incomplete" todos.

### Root Cause
Todos should only be created for **actionable** tasks. A blocked task is not actionable.

### Fix
**In planner-paul prompt**: Change todo registration behavior:
- **Phase 1 (Interview)**: Only create todos for research/interview tasks
- **Phase 2 (Plan Generation)**: Create plan generation todos AFTER user triggers it

**Current (wrong):**
```
Interview starts → Create all todos including "Generate plan (blocked)"
```

**Proposed (correct):**
```
Interview starts → Create only interview todos
User says "make a plan" → Create plan generation todos
```

This ensures `todo-continuation-enforcer` only sees actionable incomplete todos.

---

## Open Questions
None - Ready for plan generation.
