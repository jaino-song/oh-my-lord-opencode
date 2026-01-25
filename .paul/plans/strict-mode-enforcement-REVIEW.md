# Strict Mode Enforcement Plan - Architectural Review

> **Date**: 2026-01-20
> **Purpose**: Critical review before implementation
> **Reviewer**: Pre-implementation analysis

---

## CRITICAL ISSUES FOUND

### 🚨 ISSUE #1: Phase Gate System Conflicts with Parallelism

**Problem**: The phase-gate-enforcer design uses SESSION-LEVEL phase tracking:

```typescript
const sessionPhases = new Map<string, PhaseState>()
// ^ ONE phase state per session
```

**Impact**: This PREVENTS parallel delegation across todos.

**Scenario**:
```
Todo A: "Implement user service" → Currently in Phase 4 (Implementation)
Todo B: "Implement auth service" → Wants to start Phase 2 (Test Writing)

Session state: currentPhase = Phase.IMPLEMENTATION

Todo B tries to write tests → BLOCKED
Error: "Current phase: Implementation. Cannot write tests."
```

**User Requirement**: "todo-completion-based for parallel delegation"

**Conflict**: Session-level phases make parallelism impossible.

---

### ✅ SOLUTION #1: Todo-Level Phase Tracking

**Revised Design**: Track phases PER-TODO, not per-session.

```typescript
interface TodoPhaseState {
  todoId: string
  currentPhase: Phase
  testFilesWritten: string[]  // Which test files for THIS todo
  redPhaseComplete: boolean   // RED phase for THIS todo
  greenPhaseComplete: boolean // GREEN phase for THIS todo
  dirtyFiles: string[]        // Files modified by THIS todo
}

const todoPhases = new Map<string, TodoPhaseState>()
// ^ ONE phase state per TODO
```

**Workflow**:
```
Session starts:
  Todo A: Phase 2 (Test Writing)
  Todo B: Phase 2 (Test Writing)
  ↓
Paul delegates in parallel:
  delegate_task(agent="Peter", prompt="Write tests for user service", todoId="todo-a")
  delegate_task(agent="Peter", prompt="Write tests for auth service", todoId="todo-b")
  ↓
Both advance independently:
  Todo A: Phase 3 (RED) → Phase 4 (Implementation) → Phase 5 (GREEN) → Complete
  Todo B: Phase 3 (RED) → Phase 4 (Implementation) → Phase 5 (GREEN) → Complete
```

**Key Change**: Each todo has its own RED-GREEN-REFACTOR cycle, tracked independently.

**Requirement**: delegate_task needs a `todoId` parameter (or we infer from context).

---

### 🚨 ISSUE #2: Plan Requirement Too Strict

**Problem**: Plan says Paul CANNOT execute without `.paul/plans/*.md` existing.

**Impact**: Breaks non-execution tasks.

**Broken Scenarios**:
```
User: "@Paul What does the getUserById function do?"
Paul: "No plan found. Please invoke @planner-paul first."
❌ Wrong - this is a QUESTION, not execution

User: "@Paul Search the codebase for authentication patterns"
Paul: "No plan found. Please invoke @planner-paul first."
❌ Wrong - this is RESEARCH, not execution

User: "@Paul Explain the project architecture"
Paul: "No plan found. Please invoke @planner-paul first."
❌ Wrong - this is DOCUMENTATION, not execution
```

**User Requirement**: Paul should answer questions without a plan.

---

### ✅ SOLUTION #2: Execution vs Non-Execution Tasks

**Revised Logic**: Paul checks task type FIRST, then enforces plan requirement.

```typescript
// In Paul's system prompt:

## 1. TASK CLASSIFICATION (ALWAYS DO THIS FIRST)

Classify the user's request:

**Type A: QUESTION** (No plan needed)
- Explaining code, functions, architecture
- Answering "what/why/how" questions
- Providing information
→ Answer directly, no plan required

**Type B: RESEARCH** (No plan needed)
- Finding patterns in codebase (explore)
- Looking up documentation (librarian)
- Investigating issues
→ Delegate to research agents, no plan required

**Type C: EXECUTION** (Plan REQUIRED)
- Implementing features
- Fixing bugs (with code changes)
- Refactoring code
- Adding tests
→ CHECK: Does plan exist? If NO → Reject

## 2. EXECUTION WORKFLOW (Only for Type C)

If task is Type C (Execution):
  1. Check if plan exists in .paul/plans/
  2. If NO plan → REJECT with: "This is an execution task. Please invoke @planner-paul to create a plan first."
  3. If plan exists → Read plan, read todos, execute
```

**Exemptions List**:
- Questions (reading/explaining code)
- Research (explore, librarian)
- Non-code modifications (documentation, configs, assets)

**Open Question**: Should "fix typo in README" need a plan?
- My take: NO - documentation changes don't need formal plans
- But you may want: YES - ALL file modifications need plans

**User Decision Needed**: Where is the line for "execution task"?

---

### 🚨 ISSUE #3: TDD for Non-Code Files

**Problem**: Plan says "NO EXCEPTIONS" - even docs/configs follow TDD.

**Impact**: Absurd workflows.

**Example**:
```
Task: "Fix typo in README.md (change 'teh' to 'the')"

With NO EXCEPTIONS:
1. delegate_task(agent="Peter", prompt="Write Jest test for README typo fix")
   → Peter: "How do I test a typo fix??"
2. delegate_task(agent="Joshua", prompt="Run tests")
   → Joshua: "No tests for README exist"
3. delegate_task(agent="Sisyphus-Junior", prompt="Fix typo")
4. delegate_task(agent="Joshua", prompt="Run tests again")
   → Joshua: "Still no tests for README"

❌ This makes no sense.
```

**User Requirement**: "None. Paul must follow each step strictly."

**Conflict**: Does "strictly" mean "even for README typos"?

---

### ✅ SOLUTION #3: TDD Exemption List

**Revised Enforcement**: TDD is mandatory for CODE files, optional for NON-CODE files.

**Code Files** (TDD REQUIRED):
```typescript
const CODE_FILE_PATTERNS = [
  /\.tsx?$/,     // TypeScript/TSX
  /\.jsx?$/,     // JavaScript/JSX
  /\.py$/,       // Python
  /\.go$/,       // Go
  /\.rs$/,       // Rust
  /\.java$/,     // Java
  /\.cpp$|\.c$/, // C/C++
]
```

**Non-Code Files** (TDD EXEMPT):
```typescript
const EXEMPT_FILE_PATTERNS = [
  /\.md$/,           // Markdown
  /\.json$/,         // JSON configs
  /\.ya?ml$/,        // YAML configs
  /\.env/,           // Environment files
  /\.txt$/,          // Text files
  /\.css$/,          // Stylesheets (unless testing visual regression)
  /\.(png|jpg|svg)/, // Assets
  /package\.json$/,  // Package manifest
  /tsconfig\.json$/, // TypeScript config
]
```

**Special Cases**:
```typescript
// Schema/Type files: NEED TESTS if they have logic
const CONDITIONAL_FILES = [
  /\.schema\.ts$/,    // Zod schemas → Needs tests (validation logic)
  /\.types\.ts$/,     // Type definitions → No tests (just types)
  /\.constants\.ts$/, // Constants → No tests (static data)
  /\.config\.ts$/,    // Configs → Depends (logic? yes, data? no)
]
```

**Enforcement Logic**:
```typescript
function requiresTDD(filePath: string): boolean {
  // Check exemptions first
  if (EXEMPT_FILE_PATTERNS.some(p => p.test(filePath))) {
    return false
  }

  // Check code patterns
  if (CODE_FILE_PATTERNS.some(p => p.test(filePath))) {
    return true
  }

  // Check conditional
  if (CONDITIONAL_FILES.some(p => p.test(filePath))) {
    // Ask user or analyze file content
    return hasLogic(filePath)
  }

  return false // Default: no TDD
}
```

**User Decision Needed**:
- Should package.json changes need tests?
- Should tsconfig.json changes need tests?
- Should schema.ts files need tests?

My recommendation: **YES for schemas** (they have validation logic), **NO for configs**.

---

### 🚨 ISSUE #4: Testing Category vs Competency Overlap

**Problem**: Two enforcement mechanisms for the same thing.

**Scenario 1**: Paul uses correct category
```typescript
delegate_task(
  category="unit-testing",  // ✓ Category routes to Peter
  prompt="Write tests"
)
// Does competency keyword check still run?
// Is it redundant?
```

**Scenario 2**: Paul uses wrong category
```typescript
delegate_task(
  category="general-purpose",  // Category routes to Sisyphus-Junior
  prompt="Write unit tests"    // Keywords detect "tests"
)
// Competency check catches it ✓
```

**Question**: Should categories be REQUIRED or OPTIONAL?

---

### ✅ SOLUTION #4: Categories as Primary, Keywords as Fallback

**Design Decision**:

1. **If category provided → Trust category** (skip keyword check)
   - Assumes Paul knows what he's doing
   - Faster (no keyword parsing)

2. **If no category → Run keyword check**
   - Competency trap catches misrouting
   - Safer fallback

3. **If category conflicts with keywords → BLOCK**
   - Example: category="backend-implementation" + prompt contains "css"
   - Error: "Category says backend, but keywords say UI. Use correct category."

**Implementation**:
```typescript
const targetAgent = output.args.agent ?? CATEGORY_TO_AGENT[output.args.category]

// If category provided, validate it matches keywords
if (output.args.category) {
  const promptKeywords = extractKeywords(output.args.prompt)
  const categoryAgent = CATEGORY_TO_AGENT[output.args.category]

  // Check for conflicts
  for (const rule of COMPETENCY_RULES) {
    if (promptKeywords.some(k => rule.keywords.includes(k))) {
      if (!rule.requiredAgents.includes(categoryAgent)) {
        throw new Error(
          `CATEGORY-KEYWORD CONFLICT\n` +
          `Category: ${output.args.category} → ${categoryAgent}\n` +
          `Keywords detected: ${rule.category} → ${rule.requiredAgents.join(", ")}\n` +
          `These conflict. Use the correct category.`
        )
      }
    }
  }
}
```

**User Decision Needed**: Should we enforce category ALWAYS, or allow `delegate_task(agent="Peter")` without category?

---

### 🚨 ISSUE #5: Multiple Plans Ambiguity

**Problem**: What if `.paul/plans/` has multiple plan files?

```
.paul/plans/
├── user-authentication.md
├── payment-integration.md
└── dashboard-redesign.md
```

**Question**: Which plan should Paul follow?

**Options**:
1. **Require explicit plan reference**: `@Paul execute user-authentication.md`
2. **Use most recent plan**: Check file modification time
3. **Enforce single plan rule**: Only ONE plan file allowed at a time
4. **User specifies via environment**: Set `ACTIVE_PLAN=user-authentication.md`

**Current Plan**: Doesn't address this.

---

### ✅ SOLUTION #5: Active Plan Mechanism

**Design**: Use a "pointer" file to track active plan.

```
.paul/active-plan.txt
```
Contains: `user-authentication.md`

**Workflow**:
```
1. planner-paul creates plan: user-authentication.md
2. planner-paul writes to active-plan.txt: "user-authentication.md"
3. Paul reads active-plan.txt to know which plan to execute
4. User can switch plans: echo "payment-integration.md" > .paul/active-plan.txt
```

**Enforcement**:
```typescript
function getActivePlan(workspaceRoot: string): string | null {
  const activePlanPath = join(workspaceRoot, ".paul/active-plan.txt")

  if (!existsSync(activePlanPath)) {
    return null // No active plan
  }

  const planName = readFileSync(activePlanPath, "utf-8").trim()
  const planPath = join(workspaceRoot, ".paul/plans", planName)

  if (!existsSync(planPath)) {
    throw new Error(`Active plan "${planName}" not found`)
  }

  return planPath
}

// In Paul's workflow:
const activePlan = getActivePlan(ctx.directory)
if (!activePlan) {
  throw new Error("No active plan. Invoke @planner-paul to create one.")
}
```

**Alternative**: Use most recent plan (simpler, but less explicit).

**User Decision Needed**: Which approach?

---

### 🚨 ISSUE #6: Joshua Result Parsing

**Problem**: How do hooks know if Joshua returned PASS or FAIL?

**Current Design**: Hook needs to parse Joshua's text output.

**Issue**: Joshua is an LLM agent. Output is unstructured text, not JSON.

**Example Joshua Outputs**:
```
"All tests passed! ✓"
"5 tests failed. See details above."
"Test suite: PASS (32 tests, 0 failures)"
"❌ Tests failed with 3 errors"
```

**Challenge**: Hooks need reliable parsing.

---

### ✅ SOLUTION #6: Structured Joshua Output Contract

**Design**: Joshua MUST return structured data in a known format.

**Option A: JSON Block**
```markdown
Joshua output:

... test results ...

```json
{
  "status": "PASS",
  "totalTests": 32,
  "passed": 32,
  "failed": 0
}
```
```

**Option B: Status Header**
```markdown
[TEST-STATUS: PASS]

... test results ...
```

**Option C: File Output**
```
Joshua writes to: .sisyphus/test-results/{todoId}.json
Hook reads file instead of parsing text
```

**Recommendation**: Option C (file output) is most reliable.

**Implementation**:
```typescript
// In Joshua's system prompt:
After running tests, write results to:
.sisyphus/test-results/{TODO_ID}.json

Format:
{
  "status": "PASS" | "FAIL",
  "jest": { "total": 32, "passed": 32, "failed": 0 },
  "playwright": { "total": 5, "passed": 5, "failed": 0 },
  "timestamp": 1234567890
}

// In hook:
function getJoshuaResult(todoId: string): TestResult {
  const resultPath = join(ctx.directory, `.sisyphus/test-results/${todoId}.json`)
  return JSON.parse(readFileSync(resultPath, "utf-8"))
}
```

**User Decision Needed**: Should Joshua write to file, or should hooks parse text?

---

### 🚨 ISSUE #7: File Conflict Detection for Parallel Delegation

**Problem**: Plan says "parallel delegation allowed if no file conflicts."

**Question**: How do we detect file conflicts?

**Challenge**: We don't know what files a delegation will modify until AFTER it completes.

**Scenarios**:
```
Parallel delegation:
  delegate_task(prompt="Implement user service")  → modifies src/user.service.ts
  delegate_task(prompt="Implement auth service")  → modifies src/auth.service.ts
✓ No conflict

Parallel delegation:
  delegate_task(prompt="Add getUserById to user service")  → modifies src/user.service.ts
  delegate_task(prompt="Add updateUser to user service")   → modifies src/user.service.ts
❌ CONFLICT - both modify same file
```

**Options**:
1. **No detection** - Let it happen, git will catch merge conflicts
2. **File locking** - Track "files in use" per delegation
3. **Prompt parsing** - Extract file names from prompts (unreliable)
4. **Manual specification** - Require Paul to specify: `modifies=["src/user.service.ts"]`

---

### ✅ SOLUTION #7: File Locking System

**Design**: Track which files are "locked" by active delegations.

```typescript
const fileLocks = new Map<string, string>() // filepath → delegationId

// Before delegation
if (toolName === "delegate_task") {
  const modifiedFiles = inferFilesFromPrompt(output.args.prompt) // Best-effort

  for (const file of modifiedFiles) {
    if (fileLocks.has(file)) {
      throw new Error(
        `FILE CONFLICT DETECTED\n` +
        `File: ${file}\n` +
        `Currently locked by: ${fileLocks.get(file)}\n` +
        `Cannot run parallel delegations on same file.`
      )
    }
  }

  // Lock files
  for (const file of modifiedFiles) {
    fileLocks.set(file, input.callID)
  }
}

// After delegation completes
function unlockFiles(delegationId: string) {
  for (const [file, id] of fileLocks.entries()) {
    if (id === delegationId) {
      fileLocks.delete(file)
    }
  }
}
```

**Fallback**: If we can't infer files, allow the delegation (trust Paul).

**User Decision Needed**: Is file locking necessary, or trust git?

---

### 🚨 ISSUE #8: Emergency/Hotfix Workflow

**Problem**: Strict plan requirement blocks emergency fixes.

**Scenario**:
```
3am: Production is down
User: "@Paul Emergency fix: Disable the broken payment endpoint"

Paul: "No plan found. Please invoke @planner-paul to create a plan first."

User: "There's no time! Production is DOWN!"
```

**User's Answer**: "Use @Sisyphus for emergencies"

**Clarification**: Is Sisyphus the ONLY escape hatch? Or should Paul have emergency mode?

---

### ✅ SOLUTION #8: Document Sisyphus as Emergency Escape

**Design**: Keep strict enforcement, document Sisyphus as emergency tool.

**Documentation**:
```markdown
## Emergency Procedures

If production is down or immediate action needed:

1. Use @Sisyphus (bypasses ALL rules)
2. Sisyphus can:
   - Write code directly
   - Skip tests
   - Skip planning
   - Violate any constraint

3. After emergency resolved:
   - Create proper plan with @planner-paul
   - Add tests retroactively
   - Document the hotfix

⚠️ Sisyphus is ONLY for emergencies. Use sparingly.
```

**No changes needed to enforcement** - Sisyphus already bypasses everything.

---

## Summary of Required Refinements

### Critical (MUST FIX before implementation):

1. ✅ **Phase tracking**: Change from SESSION-level to TODO-level
   - Each todo has independent RED-GREEN cycle
   - Enables parallel delegation across todos

2. ✅ **Plan requirement**: Add exemptions for non-execution tasks
   - Questions/research don't need plans
   - Only code execution requires plans

3. ✅ **TDD exemptions**: Define code vs non-code files
   - TDD for .ts/.tsx/.js/.jsx/.py, etc.
   - No TDD for .md/.json/.yaml/configs

4. ✅ **Multiple plans**: Add active plan mechanism
   - .paul/active-plan.txt pointer file
   - OR enforce single plan rule

5. ✅ **Joshua results**: Define structured output format
   - File-based results (.sisyphus/test-results/)
   - OR structured JSON block in text

### Important (SHOULD FIX):

6. ✅ **Category vs keywords**: Clarify enforcement priority
   - Category = primary, keywords = fallback

7. ✅ **File conflicts**: Add file locking or document as unsupported
   - Locking system for safety
   - OR trust git to handle conflicts

### Nice-to-Have (CAN FIX LATER):

8. ✅ **Emergency workflow**: Document Sisyphus as escape hatch
   - No code changes needed

---

## Questions for User

### Q1: Plan Requirement Scope
Should these tasks need a plan:
- [ ] Fix typo in README.md
- [ ] Update package.json version
- [ ] Add TODO comment in code
- [ ] Answer "What does this function do?"

**My recommendation**: Only CODE EXECUTION needs plans.

### Q2: TDD Exemption Rules
Should TDD be required for:
- [ ] schema.ts files (Zod schemas with validation)
- [ ] types.ts files (pure TypeScript interfaces)
- [ ] constants.ts files (static data)
- [ ] package.json changes
- [ ] tsconfig.json changes

**My recommendation**: YES for schemas (logic), NO for types/constants/configs.

### Q3: Multiple Plans
How should Paul handle multiple plan files:
- [ ] A: Active plan pointer (.paul/active-plan.txt)
- [ ] B: Most recent plan (by modification time)
- [ ] C: Enforce single plan rule (error if >1 plan exists)
- [ ] D: User specifies: `@Paul execute plan-name.md`

**My recommendation**: Option A (explicit pointer file).

### Q4: Joshua Result Format
How should Joshua report results:
- [ ] A: Write JSON to .sisyphus/test-results/{todoId}.json
- [ ] B: Include JSON block in text output
- [ ] C: Use status header: `[TEST-STATUS: PASS]`
- [ ] D: Hooks parse unstructured text (risky)

**My recommendation**: Option A (file output - most reliable).

### Q5: File Conflict Detection
For parallel delegation:
- [ ] A: Implement file locking system (safe)
- [ ] B: No detection, trust git (simple)
- [ ] C: Require manual file specification
- [ ] D: Disable parallel delegation (safest)

**My recommendation**: Option B (trust git) or Option A (file locking).

### Q6: Category System
Should categories be:
- [ ] A: Required for all delegations
- [ ] B: Optional (keywords as fallback)
- [ ] C: Remove categories, keywords only

**My recommendation**: Option A (required) for clarity.

---

## Revised Implementation Order

Based on criticality:

### Phase 1: Core Enforcement (Critical)
1. sisyphus-orchestrator: Hard block code writes ✓
2. tdd-enforcement: Hard block without tests + RED (with TODO-level tracking)
3. hierarchy-enforcer: Testing competency trap ✓
4. Define TDD exemption patterns ✓

### Phase 2: Plan System (Critical)
1. Implement active plan mechanism
2. Update Paul: Add task classification (execution vs non-execution)
3. Update Paul: Plan requirement only for execution tasks

### Phase 3: Testing Infrastructure (Critical)
1. Define Joshua output contract (file-based results)
2. Update Joshua system prompt
3. Update hooks to read Joshua results from files

### Phase 4: Parallel Delegation (Important)
1. Implement TODO-level phase tracking
2. Add file locking system (or document as unsupported)
3. Test parallel delegation workflows

### Phase 5: Polish (Nice-to-Have)
1. Remove Fast Mode from docs
2. Update category system
3. Add emergency procedures to docs

---

**READY FOR USER REVIEW**

Please answer Q1-Q6 above so I can finalize the implementation plan.
