# TDD Test Specifications: Agent Enforcement & Prompt Deduplication

## Context

### Implementation Plan Reference
`.paul/plans/agent-enforcement-improvements.md`

### Test Strategy

**Unit Test Track (Bun Test)**
- **Framework**: `bun:test`
- **Pattern**: `src/hooks/**/*.test.ts`
- **Coverage Target**: 100% for new enforcement logic
- **Mocking Strategy**: Mock session storage, message files, and client API

**Integration Test Track**
- **Framework**: `bun:test` with real file system
- **Pattern**: Co-located with unit tests
- **Scope**: Hook behavior with actual file operations

---

## Phase 1: RED (Write Failing Tests)

> **Goal**: Define the contract through failing tests

---

### Test Suite 1: hierarchy-enforcer Category Mapping (Task 1.1)

**File**: `src/hooks/hierarchy-enforcer/index.test.ts` (NEW)

#### 1.1.1 Category-to-Agent Mapping Tests

- [ ] **Test**: should map category "quick" to Sisyphus-Junior
  - **Input**: `output.args = { category: "quick", prompt: "simple task" }`
  - **Expected**: Hook resolves category to "Sisyphus-Junior" for competency check
  - **Assertions**:
    - No error thrown (quick category with non-visual prompt is allowed)

- [ ] **Test**: should map category "visual-engineering" to frontend-ui-ux-engineer
  - **Input**: `output.args = { category: "visual-engineering", prompt: "change button color" }`
  - **Expected**: Hook resolves category to "frontend-ui-ux-engineer"
  - **Assertions**:
    - No error thrown (visual category with visual prompt is correct match)

- [ ] **Test**: should map category "ultrabrain" to ultrabrain
  - **Input**: `output.args = { category: "ultrabrain", prompt: "complex architecture" }`
  - **Expected**: Hook resolves category to "ultrabrain"
  - **Assertions**:
    - No error thrown

- [ ] **Test**: should map category "artistry" to frontend-ui-ux-engineer
  - **Input**: `output.args = { category: "artistry", prompt: "creative design" }`
  - **Expected**: Hook resolves category to "frontend-ui-ux-engineer"
  - **Assertions**:
    - No error thrown

- [ ] **Test**: should map category "most-capable" to Sisyphus-Junior
  - **Input**: `output.args = { category: "most-capable", prompt: "complex task" }`
  - **Expected**: Hook resolves category to "Sisyphus-Junior"
  - **Assertions**:
    - No error thrown

- [ ] **Test**: should map category "writing" to document-writer
  - **Input**: `output.args = { category: "writing", prompt: "write documentation" }`
  - **Expected**: Hook resolves category to "document-writer"
  - **Assertions**:
    - No error thrown

- [ ] **Test**: should map category "general" to Sisyphus-Junior
  - **Input**: `output.args = { category: "general", prompt: "general task" }`
  - **Expected**: Hook resolves category to "Sisyphus-Junior"
  - **Assertions**:
    - No error thrown

#### 1.1.2 Category-Based Competency Violation Tests

- [ ] **Test**: should throw COMPETENCY VIOLATION when Paul uses category="quick" with visual keywords
  - **Setup**: 
    - Session agent: "Paul"
    - Message storage with Paul agent
  - **Input**: 
    ```typescript
    output.args = { 
      category: "quick", 
      prompt: "change the button's CSS color to blue" 
    }
    ```
  - **Expected**: Error thrown with COMPETENCY VIOLATION
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("COMPETENCY VIOLATION")`
    - Error message contains "Visual/UI"
    - Error message contains "frontend-ui-ux-engineer"

- [ ] **Test**: should throw COMPETENCY VIOLATION when Paul uses category="general" with CSS keywords
  - **Setup**: Session agent: "Paul"
  - **Input**: 
    ```typescript
    output.args = { 
      category: "general", 
      prompt: "update the margin and padding styles" 
    }
    ```
  - **Expected**: Error thrown with COMPETENCY VIOLATION
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("COMPETENCY VIOLATION")`
    - Error message contains "frontend-ui-ux-engineer"

- [ ] **Test**: should throw COMPETENCY VIOLATION when Paul uses category="most-capable" with tailwind keywords
  - **Setup**: Session agent: "Paul"
  - **Input**: 
    ```typescript
    output.args = { 
      category: "most-capable", 
      prompt: "add tailwind classes for responsive layout" 
    }
    ```
  - **Expected**: Error thrown with COMPETENCY VIOLATION
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("COMPETENCY VIOLATION")`

- [ ] **Test**: should NOT throw when Paul uses category="visual-engineering" with visual keywords
  - **Setup**: Session agent: "Paul"
  - **Input**: 
    ```typescript
    output.args = { 
      category: "visual-engineering", 
      prompt: "change the button's CSS color to blue" 
    }
    ```
  - **Expected**: No error (correct category for visual task)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should NOT throw when Paul uses category="artistry" with visual keywords
  - **Setup**: Session agent: "Paul"
  - **Input**: 
    ```typescript
    output.args = { 
      category: "artistry", 
      prompt: "design a beautiful animation transition" 
    }
    ```
  - **Expected**: No error (artistry maps to frontend-ui-ux-engineer)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

#### 1.1.3 Unknown Category Handling Tests

- [ ] **Test**: should log warning but NOT block unknown category
  - **Setup**: Session agent: "Paul"
  - **Input**: 
    ```typescript
    output.args = { 
      category: "future-category", 
      prompt: "some task" 
    }
    ```
  - **Expected**: No error thrown (backward compatibility)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`
    - Log contains "Unknown category: future-category"

- [ ] **Test**: should skip competency check for unknown category with visual keywords
  - **Setup**: Session agent: "Paul"
  - **Input**: 
    ```typescript
    output.args = { 
      category: "unknown-category", 
      prompt: "change CSS styles" 
    }
    ```
  - **Expected**: No error (unknown category skips competency check)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

#### 1.1.4 Agent Override Tests

- [ ] **Test**: should use explicit agent over category when both provided
  - **Setup**: Session agent: "Paul"
  - **Input**: 
    ```typescript
    output.args = { 
      agent: "frontend-ui-ux-engineer",
      category: "quick", 
      prompt: "change CSS color" 
    }
    ```
  - **Expected**: No error (explicit agent takes precedence)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should check competency for explicit agent even with category
  - **Setup**: Session agent: "Paul"
  - **Input**: 
    ```typescript
    output.args = { 
      agent: "Sisyphus-Junior",
      category: "visual-engineering", 
      prompt: "change CSS color" 
    }
    ```
  - **Expected**: Error thrown (explicit agent Sisyphus-Junior with visual keywords)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("COMPETENCY VIOLATION")`

#### 1.1.5 Bypass Agent Tests

- [ ] **Test**: should skip all checks for Sisyphus (bypass agent)
  - **Setup**: Session agent: "Sisyphus"
  - **Input**: 
    ```typescript
    output.args = { 
      category: "quick", 
      prompt: "change CSS color" 
    }
    ```
  - **Expected**: No error (Sisyphus is in BYPASS_AGENTS)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

---

### Test Suite 2: planner-md-only Plan Generation Gate (Task 1.2)

**File**: `src/hooks/planner-md-only/index.test.ts` (EXTEND existing)

#### 1.2.1 User Trigger Phrase Detection Tests

- [ ] **Test**: should block plan write when no user trigger phrase in session
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with NO trigger phrases
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: Error thrown with PLAN GENERATION BLOCKED
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("PLAN GENERATION BLOCKED")`
    - Error message contains "No user trigger detected"
    - Error message contains trigger phrase examples

- [ ] **Test**: should allow plan write when user said "make a plan"
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "make a plan"
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: No error (trigger phrase detected)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should allow plan write when user said "generate the plan"
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "generate the plan"
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: No error
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should allow plan write when user said "save it"
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "save it"
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: No error
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should detect trigger phrase case-insensitively
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "MAKE THE PLAN"
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: No error
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should detect trigger phrase as substring
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "Okay, let's make a plan for this feature"
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: No error
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should NOT detect trigger phrase in assistant messages
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with assistant message: "I will make a plan"
    - NO user messages with trigger
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: Error thrown (only user messages count)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("PLAN GENERATION BLOCKED")`

- [ ] **Test**: should persist trigger across session (one trigger = multiple writes)
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "make a plan" (early in session)
  - **Input**: Multiple writes to different plan files
  - **Expected**: All writes allowed after single trigger
  - **Assertions**:
    - First write: `expect(hook["tool.execute.before"](input1, output1)).resolves.toBeUndefined()`
    - Second write: `expect(hook["tool.execute.before"](input2, output2)).resolves.toBeUndefined()`

#### 1.2.2 Todo Registration Gate Tests

- [ ] **Test**: should block plan write when no todos registered
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "make a plan"
    - Mock `ctx.client.session.todo()` to return empty array
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: Error thrown with PLAN GENERATION BLOCKED
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("PLAN GENERATION BLOCKED")`
    - Error message contains "No todos registered"
    - Error message contains "todowrite()"

- [ ] **Test**: should allow plan write when at least 1 todo exists
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "make a plan"
    - Mock `ctx.client.session.todo()` to return `[{ id: "1", content: "Generate plan", status: "pending" }]`
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: No error
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should allow plan write with multiple todos
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with user message: "make a plan"
    - Mock `ctx.client.session.todo()` to return 5 todos
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature.md" }
    ```
  - **Expected**: No error
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

#### 1.2.3 Draft Path Exemption Tests

- [ ] **Test**: should ALWAYS allow writes to .paul/drafts/ without trigger
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with NO trigger phrases
    - Mock `ctx.client.session.todo()` to return empty array
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/drafts/feature.md" }
    ```
  - **Expected**: No error (drafts always allowed)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should ALWAYS allow writes to .sisyphus/drafts/ without trigger
  - **Setup**: 
    - Session agent: "Solomon (TDD Planner)"
    - Message storage with NO trigger phrases
  - **Input**: 
    ```typescript
    output.args = { filePath: ".sisyphus/drafts/test-plan.md" }
    ```
  - **Expected**: No error
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should ALWAYS allow writes to .paul/drafts/ without todos
  - **Setup**: 
    - Session agent: "planner-paul"
    - Message storage with trigger phrase
    - Mock `ctx.client.session.todo()` to return empty array
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/drafts/feature.md" }
    ```
  - **Expected**: No error (drafts bypass todo check)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

#### 1.2.4 Path Pattern Tests

- [ ] **Test**: should apply gate to .paul/plans/ path
  - **Setup**: Session agent: "planner-paul", no trigger, no todos
  - **Input**: `output.args = { filePath: ".paul/plans/feature.md" }`
  - **Expected**: Error thrown
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("PLAN GENERATION BLOCKED")`

- [ ] **Test**: should apply gate to .sisyphus/plans/ path
  - **Setup**: Session agent: "Solomon (TDD Planner)", no trigger, no todos
  - **Input**: `output.args = { filePath: ".sisyphus/plans/test-plan.md" }`
  - **Expected**: Error thrown
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("PLAN GENERATION BLOCKED")`

- [ ] **Test**: should handle Windows backslash paths for plans
  - **Setup**: Session agent: "planner-paul", no trigger
  - **Input**: `output.args = { filePath: ".paul\\plans\\feature.md" }`
  - **Expected**: Error thrown (gate applies)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("PLAN GENERATION BLOCKED")`

- [ ] **Test**: should handle Windows backslash paths for drafts
  - **Setup**: Session agent: "planner-paul", no trigger
  - **Input**: `output.args = { filePath: ".paul\\drafts\\feature.md" }`
  - **Expected**: No error (drafts exempt)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

- [ ] **Test**: should handle nested project paths with plans
  - **Setup**: Session agent: "planner-paul", no trigger
  - **Input**: `output.args = { filePath: "my-project/.paul/plans/feature.md" }`
  - **Expected**: Error thrown (gate applies)
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("PLAN GENERATION BLOCKED")`

#### 1.2.5 Solomon Agent Tests

- [ ] **Test**: should apply gate to Solomon writing to .paul/plans/*-tests.md
  - **Setup**: 
    - Session agent: "Solomon (TDD Planner)"
    - No trigger phrase
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature-tests.md" }
    ```
  - **Expected**: Error thrown
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).rejects.toThrow("PLAN GENERATION BLOCKED")`

- [ ] **Test**: should allow Solomon to write test specs with trigger and todos
  - **Setup**: 
    - Session agent: "Solomon (TDD Planner)"
    - Message storage with user message: "create the plan"
    - Mock todos to return at least 1
  - **Input**: 
    ```typescript
    output.args = { filePath: ".paul/plans/feature-tests.md" }
    ```
  - **Expected**: No error
  - **Assertions**:
    - `expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()`

---

### Test Suite 3: Integration Tests for Hook Behavior (Task 1.3)

**File**: `src/hooks/hierarchy-enforcer/integration.test.ts` (NEW)

#### 1.3.1 End-to-End Category Enforcement

- [ ] **Test**: full flow - Paul delegates with category, hook intercepts and validates
  - **Setup**: 
    - Real message storage with Paul agent
    - Real approval state file
  - **Input**: 
    ```typescript
    {
      tool: "delegate_task",
      sessionID: "integration-test-session",
      args: { category: "quick", prompt: "change button CSS" }
    }
    ```
  - **Expected**: COMPETENCY VIOLATION error
  - **Assertions**:
    - Error thrown with correct message
    - Log contains blocked message

- [ ] **Test**: full flow - Paul delegates with correct category for visual task
  - **Setup**: 
    - Real message storage with Paul agent
    - Real approval state file
  - **Input**: 
    ```typescript
    {
      tool: "delegate_task",
      sessionID: "integration-test-session",
      args: { category: "visual-engineering", prompt: "change button CSS" }
    }
    ```
  - **Expected**: No error, delegation proceeds
  - **Assertions**:
    - No error thrown
    - TDD warning may be injected (if no recent Joshua approval)

#### 1.3.2 End-to-End Plan Generation Gate

- [ ] **Test**: full flow - planner-paul blocked from plan write without trigger
  - **Setup**: 
    - Real message storage with planner-paul agent
    - User messages without trigger phrases
    - Real todo API mock
  - **Input**: 
    ```typescript
    {
      tool: "Write",
      sessionID: "integration-test-session",
      args: { filePath: ".paul/plans/feature.md", content: "# Plan" }
    }
    ```
  - **Expected**: PLAN GENERATION BLOCKED error
  - **Assertions**:
    - Error thrown with actionable guidance
    - Log contains blocked message

- [ ] **Test**: full flow - planner-paul allowed to write plan after trigger
  - **Setup**: 
    - Real message storage with planner-paul agent
    - User message: "make a plan"
    - Real todo API mock returning 1+ todos
  - **Input**: 
    ```typescript
    {
      tool: "Write",
      sessionID: "integration-test-session",
      args: { filePath: ".paul/plans/feature.md", content: "# Plan" }
    }
    ```
  - **Expected**: No error
  - **Assertions**:
    - No error thrown
    - Log contains allowed message

---

## Phase 2: GREEN (Implement to Pass)

> **Goal**: Write minimum code to make all tests pass

### Backend Tasks

- [ ] 1. **Add CATEGORY_TO_AGENT constant**
  - **File**: `src/hooks/hierarchy-enforcer/constants.ts`
  - **Tests to Pass**: 1.1.1 (all mapping tests)
  - **Implementation**:
    ```typescript
    export const CATEGORY_TO_AGENT: Record<string, string> = {
      "quick": "Sisyphus-Junior",
      "visual-engineering": "frontend-ui-ux-engineer",
      "ultrabrain": "ultrabrain",
      "artistry": "frontend-ui-ux-engineer",
      "most-capable": "Sisyphus-Junior",
      "writing": "document-writer",
      "general": "Sisyphus-Junior",
    }
    ```

- [ ] 2. **Add category resolution to hierarchy-enforcer**
  - **File**: `src/hooks/hierarchy-enforcer/index.ts`
  - **Tests to Pass**: 1.1.2, 1.1.3, 1.1.4, 1.1.5
  - **Location**: Before competency check (around line 73)
  - **Implementation**:
    ```typescript
    const category = output.args.category as string | undefined
    let targetAgent = (output.args.agent || output.args.subagent_type || output.args.name) as string | undefined
    
    if (!targetAgent && category) {
      targetAgent = CATEGORY_TO_AGENT[category]
      if (!targetAgent) {
        log(`[${HOOK_NAME}] Unknown category: ${category}, skipping competency check`)
      }
    }
    ```

- [ ] 3. **Add PLAN_TRIGGER_PHRASES constant**
  - **File**: `src/hooks/planner-md-only/constants.ts`
  - **Tests to Pass**: 1.2.1 (all trigger phrase tests)
  - **Implementation**:
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
    
    export const DRAFT_PATH_PATTERN = /[/\\]\.?(paul|sisyphus)[/\\]drafts[/\\]/i
    export const PLAN_PATH_PATTERN = /[/\\]\.?(paul|sisyphus)[/\\]plans[/\\]/i
    ```

- [ ] 4. **Implement checkUserTriggerPhrase function**
  - **File**: `src/hooks/planner-md-only/index.ts`
  - **Tests to Pass**: 1.2.1 (all trigger phrase tests)
  - **Implementation**:
    ```typescript
    async function checkUserTriggerPhrase(sessionID: string): Promise<boolean> {
      const messageDir = getMessageDir(sessionID)
      if (!messageDir) return false
      
      // Read all message files, filter to role=user
      // Case-insensitive substring match against PLAN_TRIGGER_PHRASES
      // Return true if any user message contains any trigger phrase
    }
    ```

- [ ] 5. **Implement checkTodosExist function**
  - **File**: `src/hooks/planner-md-only/index.ts`
  - **Tests to Pass**: 1.2.2 (all todo gate tests)
  - **Implementation**:
    ```typescript
    async function checkTodosExist(sessionID: string, ctx: PluginInput): Promise<boolean> {
      const response = await ctx.client.session.todo({ path: { id: sessionID } })
      const todos = (response.data ?? response) as Todo[]
      return todos.length > 0
    }
    ```

- [ ] 6. **Add plan generation gate to tool.execute.before**
  - **File**: `src/hooks/planner-md-only/index.ts`
  - **Tests to Pass**: 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5
  - **Location**: After existing allowed file check
  - **Implementation**:
    ```typescript
    if (PLAN_PATH_PATTERN.test(filePath) && !DRAFT_PATH_PATTERN.test(filePath)) {
      const hasTrigger = await checkUserTriggerPhrase(sessionID)
      const hasTodos = await checkTodosExist(sessionID, ctx)
      
      if (!hasTrigger) {
        throw new Error(`[${HOOK_NAME}] PLAN GENERATION BLOCKED: No user trigger detected...`)
      }
      
      if (!hasTodos) {
        throw new Error(`[${HOOK_NAME}] PLAN GENERATION BLOCKED: No todos registered...`)
      }
    }
    ```

---

## Phase 3: REFACTOR (Keep Tests Green)

> **Goal**: Improve code quality while maintaining passing tests

- [ ] Extract message reading logic to shared utility
- [ ] Add debug logging for trigger phrase detection
- [ ] Optimize message file reading (cache results per session)
- [ ] Add type definitions for Todo interface if missing

**Verification**: After each refactor step, run:
- `bun test src/hooks/hierarchy-enforcer/` → All unit tests pass
- `bun test src/hooks/planner-md-only/` → All unit tests pass

---

## Verification Commands

### Unit Tests
```bash
bun test src/hooks/hierarchy-enforcer/  # Run hierarchy-enforcer tests
bun test src/hooks/planner-md-only/     # Run planner-md-only tests
bun test src/hooks/                     # Run all hook tests
```

### Full Suite
```bash
bun test                                # Run all tests
bun run typecheck                       # Type check
```

---

## Success Criteria

### RED Phase Complete When:
- [ ] All test files created:
  - `src/hooks/hierarchy-enforcer/index.test.ts`
  - Extended `src/hooks/planner-md-only/index.test.ts`
  - `src/hooks/hierarchy-enforcer/integration.test.ts`
- [ ] `bun test src/hooks/hierarchy-enforcer/` runs (and FAILS as expected)
- [ ] `bun test src/hooks/planner-md-only/` runs (and FAILS for new tests)

### GREEN Phase Complete When:
- [ ] `bun test src/hooks/hierarchy-enforcer/` → 100% pass
- [ ] `bun test src/hooks/planner-md-only/` → 100% pass
- [ ] All acceptance criteria from implementation plan met:
  - Category-based delegation is enforced
  - Plan generation requires explicit user trigger
  - Plan generation requires todos registered
  - Drafts always allowed

### REFACTOR Phase Complete When:
- [ ] Code quality improved
- [ ] All tests still pass
- [ ] No regressions introduced
- [ ] `bun run typecheck` → Zero errors

---

## Test Data Fixtures

### Message Storage Setup Helper
```typescript
function setupMessageStorage(sessionID: string, agent: string, messages?: Array<{role: string, content: string}>): void {
  testMessageDir = join(MESSAGE_STORAGE, sessionID)
  mkdirSync(testMessageDir, { recursive: true })
  
  const baseMessage = {
    agent,
    model: { providerID: "test", modelID: "test-model" },
  }
  writeFileSync(join(testMessageDir, "msg_001.json"), JSON.stringify(baseMessage))
  
  if (messages) {
    messages.forEach((msg, i) => {
      const msgContent = { ...baseMessage, role: msg.role, content: msg.content }
      writeFileSync(join(testMessageDir, `msg_${String(i + 2).padStart(3, "0")}.json`), JSON.stringify(msgContent))
    })
  }
}
```

### Mock Plugin Input Helper
```typescript
function createMockPluginInput(todoResponse: Todo[] = []) {
  return {
    client: {
      session: {
        todo: mock(() => Promise.resolve({ data: todoResponse }))
      }
    },
    directory: "/tmp/test",
  } as unknown as PluginInput
}
```

### Trigger Phrase Test Cases
```typescript
const TRIGGER_PHRASE_TEST_CASES = [
  { phrase: "make a plan", expected: true },
  { phrase: "make the plan", expected: true },
  { phrase: "generate plan", expected: true },
  { phrase: "generate the plan", expected: true },
  { phrase: "create the plan", expected: true },
  { phrase: "save it", expected: true },
  { phrase: "save the plan", expected: true },
  { phrase: "write the plan", expected: true },
  { phrase: "MAKE A PLAN", expected: true },  // case insensitive
  { phrase: "Let's make a plan for this", expected: true },  // substring
  { phrase: "I want to add a feature", expected: false },  // no trigger
  { phrase: "plan something", expected: false },  // partial match
]
```

### Category Mapping Test Cases
```typescript
const CATEGORY_MAPPING_TEST_CASES = [
  { category: "quick", expectedAgent: "Sisyphus-Junior" },
  { category: "visual-engineering", expectedAgent: "frontend-ui-ux-engineer" },
  { category: "ultrabrain", expectedAgent: "ultrabrain" },
  { category: "artistry", expectedAgent: "frontend-ui-ux-engineer" },
  { category: "most-capable", expectedAgent: "Sisyphus-Junior" },
  { category: "writing", expectedAgent: "document-writer" },
  { category: "general", expectedAgent: "Sisyphus-Junior" },
]
```

### Visual Keywords for Competency Tests
```typescript
const VISUAL_KEYWORDS = [
  "css", "style", "color", "background", "border", 
  "margin", "padding", "flex", "grid", "animation", 
  "transition", "ui", "ux", "responsive", "mobile", "tailwind"
]
```
