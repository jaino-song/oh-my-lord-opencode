# TDD Test Specifications: Agent Consolidation Refactor

## Context

### Original Request
Test specifications for the agent consolidation refactor that deprecates legacy agents (Oracle, Metis, Momus, Prometheus), updates references to new agents (Elijah, Nathan, Ezra), creates a TDD enforcement hook, and renames `orchestrator-sisyphus.ts` to `paul.ts`.

### Implementation Plan Reference
`.paul/plans/agent-consolidation.md`

### Test Strategy Overview
This is a **refactoring task** - the primary goal is to ensure **no regressions** while making the changes. Tests focus on:
1. Deprecation markers are present but functionality preserved
2. Agent references correctly updated
3. TDD enforcement hook works correctly (SOFT REMINDERS only)
4. File rename doesn't break imports/exports

---

## Test Strategy

### Unit Test Track (Bun Test)
- **Framework**: `bun:test`
- **Pattern**: `src/**/*.test.ts` (co-located with source)
- **Coverage Target**: 100% for new TDD hook, verification for existing agents
- **Mocking Strategy**: Mock file system for hook tests, mock session state

### Test File Naming Convention
Following existing patterns in the codebase:
- Hook tests: `src/hooks/{hook-name}/index.test.ts`
- Agent tests: `src/agents/{agent-name}.test.ts`

---

## Phase 1: RED (Write Failing Tests)

> **Goal**: Define the contract through failing tests

### Test Suite 1: Deprecation Markers (Tasks 1-4)

#### Test File: `src/agents/oracle.test.ts` (UPDATE EXISTING)

- [ ] **Test**: oracle.ts should have @deprecated JSDoc comment
  - **File**: `src/agents/oracle.test.ts`
  - **Input**: Read `ORACLE_SYSTEM_PROMPT` export
  - **Expected**: File content contains `@deprecated` JSDoc
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/oracle.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/@deprecated.*Use Elijah/i)
    ```

- [ ] **Test**: oracle.ts should still export oracleAgent
  - **File**: `src/agents/oracle.test.ts`
  - **Input**: Import `oracleAgent` from module
  - **Expected**: Export exists and is valid AgentConfig
  - **Assertions**:
    ```typescript
    // #given
    import { oracleAgent } from "./oracle"
    
    // #then
    expect(oracleAgent).toBeDefined()
    expect(oracleAgent.prompt).toBeDefined()
    expect(oracleAgent.model).toBeDefined()
    ```

- [ ] **Test**: ORACLE_SYSTEM_PROMPT should contain deprecation warning
  - **File**: `src/agents/oracle.test.ts`
  - **Input**: Import `ORACLE_SYSTEM_PROMPT`
  - **Expected**: Prompt text includes deprecation notice
  - **Assertions**:
    ```typescript
    // #given
    import { ORACLE_SYSTEM_PROMPT } from "./oracle"
    
    // #then
    expect(ORACLE_SYSTEM_PROMPT).toMatch(/deprecated|use elijah/i)
    ```

#### Test File: `src/agents/metis.test.ts` (NEW)

- [ ] **Test**: metis.ts should have @deprecated JSDoc comment
  - **File**: `src/agents/metis.test.ts`
  - **Input**: Read file content
  - **Expected**: Contains `@deprecated Use Nathan` JSDoc
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/metis.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/@deprecated.*Use Nathan/i)
    ```

- [ ] **Test**: metis.ts should still export metisAgent
  - **File**: `src/agents/metis.test.ts`
  - **Input**: Import `metisAgent`
  - **Expected**: Export exists and is valid
  - **Assertions**:
    ```typescript
    // #given
    import { metisAgent } from "./metis"
    
    // #then
    expect(metisAgent).toBeDefined()
    expect(metisAgent.prompt).toBeDefined()
    ```

- [ ] **Test**: METIS_SYSTEM_PROMPT should contain deprecation warning
  - **File**: `src/agents/metis.test.ts`
  - **Input**: Import `METIS_SYSTEM_PROMPT`
  - **Expected**: Prompt includes deprecation notice
  - **Assertions**:
    ```typescript
    // #given
    import { METIS_SYSTEM_PROMPT } from "./metis"
    
    // #then
    expect(METIS_SYSTEM_PROMPT).toMatch(/deprecated|use nathan/i)
    ```

#### Test File: `src/agents/momus.test.ts` (UPDATE EXISTING)

- [ ] **Test**: momus.ts should have @deprecated JSDoc comment
  - **File**: `src/agents/momus.test.ts`
  - **Input**: Read file content
  - **Expected**: Contains `@deprecated Use Ezra` JSDoc
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/momus.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/@deprecated.*Use Ezra/i)
    ```

- [ ] **Test**: momus.ts should still export momusAgent
  - **File**: `src/agents/momus.test.ts`
  - **Input**: Import `momusAgent`
  - **Expected**: Export exists
  - **Assertions**:
    ```typescript
    // #given
    import { momusAgent } from "./momus"
    
    // #then
    expect(momusAgent).toBeDefined()
    ```

#### Test File: `src/agents/prometheus-prompt.test.ts` (UPDATE EXISTING)

- [ ] **Test**: prometheus-prompt.ts should have @deprecated JSDoc comment
  - **File**: `src/agents/prometheus-prompt.test.ts`
  - **Input**: Read file content
  - **Expected**: Contains `@deprecated Use planner-paul` JSDoc
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/prometheus-prompt.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/@deprecated.*Use planner-paul/i)
    ```

- [ ] **Test**: PROMETHEUS_SYSTEM_PROMPT should still be exported
  - **File**: `src/agents/prometheus-prompt.test.ts`
  - **Input**: Import `PROMETHEUS_SYSTEM_PROMPT`
  - **Expected**: Export exists
  - **Assertions**:
    ```typescript
    // #given
    import { PROMETHEUS_SYSTEM_PROMPT } from "./prometheus-prompt"
    
    // #then
    expect(PROMETHEUS_SYSTEM_PROMPT).toBeDefined()
    expect(typeof PROMETHEUS_SYSTEM_PROMPT).toBe("string")
    ```

---

### Test Suite 2: Agent Reference Updates (Tasks 5-10)

#### Test File: `src/agents/sisyphus.test.ts` (NEW)

- [ ] **Test**: sisyphus.ts should reference Elijah instead of Oracle
  - **File**: `src/agents/sisyphus.test.ts`
  - **Input**: Read file content
  - **Expected**: Contains "Elijah", no active "Oracle" references (except deprecated comments)
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/sisyphus.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/Elijah.*Deep Reasoning Advisor/i)
    // Oracle should only appear in deprecated/comment context
    const oracleMatches = fileContent.match(/delegate_task.*oracle/gi)
    expect(oracleMatches).toBeNull()
    ```

- [ ] **Test**: sisyphus.ts delegate_task calls should use Elijah
  - **File**: `src/agents/sisyphus.test.ts`
  - **Input**: Read file content
  - **Expected**: delegate_task uses "Elijah (Deep Reasoning Advisor)"
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/sisyphus.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/delegate_task.*Elijah.*Deep Reasoning Advisor/i)
    ```

#### Test File: `src/agents/sisyphus-prompt-builder.test.ts` (NEW)

- [ ] **Test**: buildElijahSection function should exist (renamed from buildOracleSection)
  - **File**: `src/agents/sisyphus-prompt-builder.test.ts`
  - **Input**: Import from module
  - **Expected**: `buildElijahSection` is exported
  - **Assertions**:
    ```typescript
    // #given
    import { buildElijahSection } from "./sisyphus-prompt-builder"
    
    // #then
    expect(buildElijahSection).toBeDefined()
    expect(typeof buildElijahSection).toBe("function")
    ```

- [ ] **Test**: buildOracleSection should NOT exist (removed)
  - **File**: `src/agents/sisyphus-prompt-builder.test.ts`
  - **Input**: Check exports
  - **Expected**: `buildOracleSection` is not exported
  - **Assertions**:
    ```typescript
    // #given
    import * as exports from "./sisyphus-prompt-builder"
    
    // #then
    expect(exports).not.toHaveProperty("buildOracleSection")
    ```

- [ ] **Test**: buildElijahSection should reference Elijah agent
  - **File**: `src/agents/sisyphus-prompt-builder.test.ts`
  - **Input**: Call `buildElijahSection` with mock agents
  - **Expected**: Output contains Elijah references
  - **Assertions**:
    ```typescript
    // #given
    import { buildElijahSection } from "./sisyphus-prompt-builder"
    const mockAgents = [{ name: "Elijah (Deep Reasoning Advisor)", description: "test" }]
    
    // #when
    const result = buildElijahSection(mockAgents)
    
    // #then
    expect(result).toMatch(/Elijah/i)
    ```

#### Test File: `src/agents/prometheus-prompt.test.ts` (UPDATE)

- [ ] **Test**: prometheus-prompt.ts should reference Nathan instead of Metis
  - **File**: `src/agents/prometheus-prompt.test.ts`
  - **Input**: Read `PROMETHEUS_SYSTEM_PROMPT`
  - **Expected**: Contains "Nathan", no active "Metis" references
  - **Assertions**:
    ```typescript
    // #given
    import { PROMETHEUS_SYSTEM_PROMPT } from "./prometheus-prompt"
    
    // #then
    expect(PROMETHEUS_SYSTEM_PROMPT).toMatch(/Nathan.*Request Analyst/i)
    // Metis should only appear in deprecated context
    expect(PROMETHEUS_SYSTEM_PROMPT).not.toMatch(/delegate_task.*Metis/i)
    ```

- [ ] **Test**: prometheus-prompt.ts should reference Ezra instead of Momus
  - **File**: `src/agents/prometheus-prompt.test.ts`
  - **Input**: Read `PROMETHEUS_SYSTEM_PROMPT`
  - **Expected**: Contains "Ezra", no active "Momus" references
  - **Assertions**:
    ```typescript
    // #given
    import { PROMETHEUS_SYSTEM_PROMPT } from "./prometheus-prompt"
    
    // #then
    expect(PROMETHEUS_SYSTEM_PROMPT).toMatch(/Ezra.*Plan Reviewer/i)
    expect(PROMETHEUS_SYSTEM_PROMPT).not.toMatch(/delegate_task.*Momus/i)
    ```

- [ ] **Test**: prometheus-prompt.ts should reference Elijah instead of Oracle
  - **File**: `src/agents/prometheus-prompt.test.ts`
  - **Input**: Read `PROMETHEUS_SYSTEM_PROMPT`
  - **Expected**: Contains "Elijah", no active "Oracle" references
  - **Assertions**:
    ```typescript
    // #given
    import { PROMETHEUS_SYSTEM_PROMPT } from "./prometheus-prompt"
    
    // #then
    expect(PROMETHEUS_SYSTEM_PROMPT).toMatch(/Elijah.*Deep Reasoning Advisor/i)
    expect(PROMETHEUS_SYSTEM_PROMPT).not.toMatch(/delegate_task.*oracle/i)
    ```

#### Test File: `src/agents/plan-prompt.test.ts` (NEW)

- [ ] **Test**: plan-prompt.ts should reference Nathan instead of Metis
  - **File**: `src/agents/plan-prompt.test.ts`
  - **Input**: Read file content
  - **Expected**: Contains "Nathan", no "Metis" references
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/plan-prompt.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/Nathan/i)
    expect(fileContent).not.toMatch(/Metis/i)
    ```

#### Test File: `src/agents/ezra.test.ts` (UPDATE EXISTING)

- [ ] **Test**: ezra.ts should reference Elijah for escalation instead of Oracle
  - **File**: `src/agents/ezra.test.ts`
  - **Input**: Read `EZRA_SYSTEM_PROMPT`
  - **Expected**: Escalation recommendations mention Elijah
  - **Assertions**:
    ```typescript
    // #given
    import { EZRA_SYSTEM_PROMPT } from "./ezra"
    
    // #then
    expect(EZRA_SYSTEM_PROMPT).toMatch(/Elijah/i)
    expect(EZRA_SYSTEM_PROMPT).not.toMatch(/Oracle/i)
    ```

#### Test File: `src/agents/thomas.test.ts` (NEW)

- [ ] **Test**: thomas.ts should not reference Metis
  - **File**: `src/agents/thomas.test.ts`
  - **Input**: Read file content
  - **Expected**: No "Metis" references
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/thomas.ts", "utf-8")
    
    // #then
    expect(fileContent).not.toMatch(/Metis/i)
    ```

---

### Test Suite 3: Export and Type Updates (Tasks 11-13)

#### Test File: `src/agents/index.test.ts` (NEW)

- [ ] **Test**: index.ts should export all agents including deprecated ones
  - **File**: `src/agents/index.test.ts`
  - **Input**: Import `builtinAgents`
  - **Expected**: All agents present in exports
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #then - New agents
    expect(builtinAgents["Paul"]).toBeDefined()
    expect(builtinAgents["planner-paul"]).toBeDefined()
    expect(builtinAgents["Elijah (Deep Reasoning Advisor)"]).toBeDefined()
    expect(builtinAgents["Nathan (Request Analyst)"]).toBeDefined()
    expect(builtinAgents["Ezra (Plan Reviewer)"]).toBeDefined()
    
    // #then - Legacy agents still present (for backup)
    expect(builtinAgents["oracle"]).toBeDefined()
    expect(builtinAgents["Metis (Plan Consultant)"]).toBeDefined()
    expect(builtinAgents["Momus (Plan Reviewer)"]).toBeDefined()
    expect(builtinAgents["Sisyphus"]).toBeDefined()
    ```

- [ ] **Test**: index.ts should have deprecation comments for legacy agents
  - **File**: `src/agents/index.test.ts`
  - **Input**: Read file content
  - **Expected**: Deprecation comments present
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/index.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/DEPRECATED.*oracle.*Elijah/i)
    expect(fileContent).toMatch(/DEPRECATED.*Metis.*Nathan/i)
    expect(fileContent).toMatch(/DEPRECATED.*Momus.*Ezra/i)
    ```

#### Test File: `src/agents/utils.test.ts` (UPDATE EXISTING)

- [ ] **Test**: createBuiltinAgents should create all agents
  - **File**: `src/agents/utils.test.ts`
  - **Input**: Call `createBuiltinAgents()`
  - **Expected**: Returns all agents including deprecated
  - **Assertions**:
    ```typescript
    // #given
    import { createBuiltinAgents } from "./utils"
    
    // #when
    const agents = createBuiltinAgents()
    
    // #then
    expect(agents).toHaveProperty("Paul")
    expect(agents).toHaveProperty("oracle")
    expect(agents).toHaveProperty("Elijah (Deep Reasoning Advisor)")
    ```

#### Test File: `src/agents/types.test.ts` (NEW)

- [ ] **Test**: BuiltinAgentName type should include all agent names
  - **File**: `src/agents/types.test.ts`
  - **Input**: Type check with valid agent names
  - **Expected**: All names are valid BuiltinAgentName
  - **Assertions**:
    ```typescript
    // #given
    import type { BuiltinAgentName } from "./types"
    
    // #then - Type assertions (compile-time check)
    const paul: BuiltinAgentName = "Paul"
    const oracle: BuiltinAgentName = "oracle"
    const elijah: BuiltinAgentName = "Elijah (Deep Reasoning Advisor)"
    const nathan: BuiltinAgentName = "Nathan (Request Analyst)"
    const ezra: BuiltinAgentName = "Ezra (Plan Reviewer)"
    const metis: BuiltinAgentName = "Metis (Plan Consultant)"
    const momus: BuiltinAgentName = "Momus (Plan Reviewer)"
    
    expect(paul).toBeDefined()
    expect(oracle).toBeDefined()
    ```

---

### Test Suite 4: TDD Enforcement Hook (Task 14) - CRITICAL

#### Test File: `src/hooks/tdd-enforcement/index.test.ts` (NEW)

##### isCodeFile Function Tests

- [ ] **Test**: isCodeFile should return true for TypeScript files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/components/Button.ts"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/components/Button.ts")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for TSX files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/components/Button.tsx"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/components/Button.tsx")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for JavaScript files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/utils/helper.js"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/utils/helper.js")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for JSX files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/components/App.jsx"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/components/App.jsx")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for Python files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"scripts/deploy.py"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("scripts/deploy.py")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for Go files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"cmd/main.go"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("cmd/main.go")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for Java files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/main/java/App.java"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/main/java/App.java")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for C++ files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/engine.cpp"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/engine.cpp")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for C files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/main.c"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/main.c")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return true for Rust files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/lib.rs"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/lib.rs")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should return false for Markdown files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"README.md"`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("README.md")
    
    // #then
    expect(result).toBe(false)
    ```

- [ ] **Test**: isCodeFile should return false for JSON files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"package.json"`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("package.json")
    
    // #then
    expect(result).toBe(false)
    ```

- [ ] **Test**: isCodeFile should return false for YAML files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `".github/workflows/ci.yml"`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile(".github/workflows/ci.yml")
    
    // #then
    expect(result).toBe(false)
    ```

- [ ] **Test**: isCodeFile should return false for CSS files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/styles/main.css"`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/styles/main.css")
    
    // #then
    expect(result).toBe(false)
    ```

- [ ] **Test**: isCodeFile should return false for SCSS files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/styles/main.scss"`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/styles/main.scss")
    
    // #then
    expect(result).toBe(false)
    ```

- [ ] **Test**: isCodeFile should return false for .env files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `".env.local"`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile(".env.local")
    
    // #then
    expect(result).toBe(false)
    ```

- [ ] **Test**: isCodeFile should return false for TOML files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"Cargo.toml"`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("Cargo.toml")
    
    // #then
    expect(result).toBe(false)
    ```

##### PreToolUse Hook Tests

- [ ] **Test**: PreToolUse should inject reminder when writing code file without test specs
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Setup**: No `.paul/plans/*-tests.md` files exist
  - **Input**: Write tool with `filePath: "src/service.ts"`
  - **Expected**: `output.message` contains TDD reminder
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, message: undefined }
    // Mock: no test specs exist
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toMatch(/TDD REMINDER/i)
    expect(output.message).toMatch(/No test specs found/i)
    expect(output.message).toMatch(/Solomon/i)
    ```

- [ ] **Test**: PreToolUse should inject reminder when editing code file without test specs
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Setup**: No `.paul/plans/*-tests.md` files exist
  - **Input**: Edit tool with `filePath: "src/service.ts"`
  - **Expected**: `output.message` contains TDD reminder
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Edit", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, message: undefined }
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toMatch(/TDD REMINDER/i)
    ```

- [ ] **Test**: PreToolUse should NOT inject reminder when test specs exist
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Setup**: `.paul/plans/feature-tests.md` exists
  - **Input**: Write tool with `filePath: "src/service.ts"`
  - **Expected**: `output.message` is undefined (no reminder)
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, message: undefined }
    // Mock: test specs exist
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toBeUndefined()
    ```

- [ ] **Test**: PreToolUse should NOT inject reminder for non-code files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Write tool with `filePath: "README.md"`
  - **Expected**: `output.message` is undefined
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "README.md" }, message: undefined }
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toBeUndefined()
    ```

- [ ] **Test**: PreToolUse should NOT inject reminder for JSON config files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Write tool with `filePath: "tsconfig.json"`
  - **Expected**: `output.message` is undefined
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "tsconfig.json" }, message: undefined }
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toBeUndefined()
    ```

- [ ] **Test**: PreToolUse should NOT block writes (soft reminder only)
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Write tool with code file, no test specs
  - **Expected**: Does NOT throw error, only injects message
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, message: undefined }
    
    // #when / #then
    await expect(hook["tool.execute.before"](input, output)).resolves.not.toThrow()
    ```

- [ ] **Test**: PreToolUse should NOT affect Read tool
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Read tool with `filePath: "src/service.ts"`
  - **Expected**: `output.message` is undefined
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Read", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, message: undefined }
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toBeUndefined()
    ```

##### PostToolUse Hook Tests

- [ ] **Test**: PostToolUse should inject Joshua reminder after writing code file
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Write tool completed with `filePath: "src/service.ts"`
  - **Expected**: `output.message` contains Joshua reminder
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, result: "success" }
    
    // #when
    await hook["tool.execute.after"](input, output)
    
    // #then
    expect(output.message).toMatch(/TDD REMINDER/i)
    expect(output.message).toMatch(/Joshua.*Test Runner/i)
    expect(output.message).toMatch(/delegate_task/i)
    ```

- [ ] **Test**: PostToolUse should inject Joshua reminder after editing code file
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Edit tool completed with `filePath: "src/service.ts"`
  - **Expected**: `output.message` contains Joshua reminder
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Edit", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, result: "success" }
    
    // #when
    await hook["tool.execute.after"](input, output)
    
    // #then
    expect(output.message).toMatch(/TDD REMINDER/i)
    expect(output.message).toMatch(/Joshua/i)
    ```

- [ ] **Test**: PostToolUse should NOT inject reminder for non-code files
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Write tool completed with `filePath: "README.md"`
  - **Expected**: `output.message` is undefined
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "README.md" }, result: "success" }
    
    // #when
    await hook["tool.execute.after"](input, output)
    
    // #then
    expect(output.message).toBeUndefined()
    ```

- [ ] **Test**: PostToolUse should NOT auto-invoke Joshua (reminder only)
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Write tool completed with code file
  - **Expected**: No delegate_task call made, only message injected
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, result: "success" }
    const delegateTaskSpy = mock(() => {})
    
    // #when
    await hook["tool.execute.after"](input, output)
    
    // #then
    expect(delegateTaskSpy).not.toHaveBeenCalled()
    expect(output.message).toMatch(/delegate_task/) // Suggests but doesn't execute
    ```

##### Hook Registration Tests

- [ ] **Test**: TDD enforcement hook should be exported from hooks/index.ts
  - **File**: `src/hooks/index.test.ts` (NEW or UPDATE)
  - **Input**: Import from hooks/index.ts
  - **Expected**: `createTddEnforcementHook` is exported
  - **Assertions**:
    ```typescript
    // #given
    import { createTddEnforcementHook } from "./index"
    
    // #then
    expect(createTddEnforcementHook).toBeDefined()
    expect(typeof createTddEnforcementHook).toBe("function")
    ```

---

### Test Suite 5: File Rename (Tasks 15-16)

#### Test File: `src/agents/paul.test.ts` (NEW - after rename)

- [ ] **Test**: paul.ts should export paulAgent
  - **File**: `src/agents/paul.test.ts`
  - **Input**: Import from `./paul`
  - **Expected**: `paulAgent` is exported
  - **Assertions**:
    ```typescript
    // #given
    import { paulAgent } from "./paul"
    
    // #then
    expect(paulAgent).toBeDefined()
    expect(paulAgent.prompt).toBeDefined()
    ```

- [ ] **Test**: paul.ts should export orchestratorSisyphusAgent (alias)
  - **File**: `src/agents/paul.test.ts`
  - **Input**: Import from `./paul`
  - **Expected**: `orchestratorSisyphusAgent` is exported (for backward compat)
  - **Assertions**:
    ```typescript
    // #given
    import { orchestratorSisyphusAgent } from "./paul"
    
    // #then
    expect(orchestratorSisyphusAgent).toBeDefined()
    ```

- [ ] **Test**: orchestrator-sisyphus.ts should NOT exist after rename
  - **File**: `src/agents/paul.test.ts`
  - **Input**: Check file system
  - **Expected**: File does not exist
  - **Assertions**:
    ```typescript
    // #given
    import { existsSync } from "node:fs"
    
    // #then
    expect(existsSync("src/agents/orchestrator-sisyphus.ts")).toBe(false)
    ```

#### Test File: `src/agents/index.test.ts` (UPDATE)

- [ ] **Test**: index.ts should import from paul.ts not orchestrator-sisyphus.ts
  - **File**: `src/agents/index.test.ts`
  - **Input**: Read file content
  - **Expected**: Import from `./paul`
  - **Assertions**:
    ```typescript
    // #given
    import { readFileSync } from "node:fs"
    const fileContent = readFileSync("src/agents/index.ts", "utf-8")
    
    // #then
    expect(fileContent).toMatch(/from ["']\.\/paul["']/)
    expect(fileContent).not.toMatch(/from ["']\.\/orchestrator-sisyphus["']/)
    ```

---

### Test Suite 6: Verification (Task 17)

#### Test File: Integration Tests

- [ ] **Test**: bun run typecheck should pass
  - **File**: N/A (CLI verification)
  - **Command**: `bun run typecheck`
  - **Expected**: Exit code 0
  - **Assertions**:
    ```bash
    bun run typecheck
    # Exit code should be 0
    ```

- [ ] **Test**: bun test should pass
  - **File**: N/A (CLI verification)
  - **Command**: `bun test`
  - **Expected**: All tests pass
  - **Assertions**:
    ```bash
    bun test
    # All tests should pass
    ```

---

## Phase 2: GREEN (Implement to Pass)

> **Goal**: Write minimum code to make all tests pass

### Implementation Order

1. **Tasks 1-4** (Parallel): Add @deprecated JSDoc to legacy agents
   - Tests to Pass: Deprecation marker tests
   
2. **Tasks 5-10** (Parallel): Update agent references
   - Tests to Pass: Reference update tests
   
3. **Tasks 11-13** (Sequential): Update exports and types
   - Tests to Pass: Export and type tests
   
4. **Task 14** (Independent): Create TDD enforcement hook
   - Tests to Pass: All TDD hook tests (isCodeFile, PreToolUse, PostToolUse)
   
5. **Tasks 15-16** (Sequential): File rename
   - Tests to Pass: paul.ts export tests, import update tests
   
6. **Task 17**: Run verification
   - Tests to Pass: typecheck, bun test

---

## Phase 3: REFACTOR (Keep Tests Green)

> **Goal**: Improve code quality while maintaining passing tests

- [ ] Ensure consistent deprecation comment format across all files
- [ ] Verify no duplicate agent registrations
- [ ] Clean up any unused imports after reference updates
- [ ] Ensure TDD hook has proper error handling

**Verification**: After each refactor step, run:
- `bun run typecheck` - All type checks pass
- `bun test` - All tests pass

---

## Verification Commands

### Unit Tests
```bash
bun test src/agents/oracle.test.ts
bun test src/agents/metis.test.ts
bun test src/agents/momus.test.ts
bun test src/agents/prometheus-prompt.test.ts
bun test src/hooks/tdd-enforcement/index.test.ts
bun test src/agents/index.test.ts
bun test  # Run all tests
```

### Type Check
```bash
bun run typecheck
```

---

## Success Criteria

### RED Phase Complete When:
- [ ] All test files created/updated
- [ ] `bun test` runs (and FAILS as expected for new tests)

### GREEN Phase Complete When:
- [ ] `bun test` - 100% pass
- [ ] `bun run typecheck` - 0 errors
- [ ] All deprecation markers present
- [ ] All agent references updated
- [ ] TDD hook functional (soft reminders)
- [ ] File rename complete

### REFACTOR Phase Complete When:
- [ ] Code quality improved
- [ ] All tests still pass
- [ ] No regressions introduced

---

## Test Coverage Summary

| Area | Unit Tests | Notes |
|------|------------|-------|
| Deprecation (Tasks 1-4) | 12 tests | JSDoc + export verification |
| References (Tasks 5-10) | 10 tests | Agent name updates |
| Exports (Tasks 11-13) | 5 tests | Index, utils, types |
| TDD Hook (Task 14) | 35 tests | isCodeFile, PreToolUse, PostToolUse, edge cases |
| File Rename (Tasks 15-16) | 4 tests | paul.ts exports, import updates |
| Behavioral Tests | 8 tests | Agent resolution, delegation behavior |
| **Total** | **74 tests** | |

---

## Thomas Review Feedback Applied

### Issues Addressed:

1. **Added Behavioral Tests** (Test Suite 7): Tests that verify actual agent behavior, not just file contents
2. **Added Edge Cases** (Test Suite 4 expanded): Missing directory, malformed paths, concurrent operations
3. **Improved Test Setup Documentation**: Explicit mock setup instructions for each test
4. **Added Functional Agent Tests**: Verify agents work after refactoring

---

## Test Suite 7: Behavioral Tests (NEW - Per Thomas Review)

> **Goal**: Test actual behavior, not just file contents

### Test File: `src/agents/agent-resolution.test.ts` (NEW)

#### Agent Resolution Behavior

- [ ] **Test**: builtinAgents should resolve "Elijah (Deep Reasoning Advisor)" to valid agent
  - **File**: `src/agents/agent-resolution.test.ts`
  - **Input**: Access `builtinAgents["Elijah (Deep Reasoning Advisor)"]`
  - **Expected**: Returns valid AgentConfig with prompt and model
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #when
    const agent = builtinAgents["Elijah (Deep Reasoning Advisor)"]
    
    // #then
    expect(agent).toBeDefined()
    expect(agent.prompt).toBeDefined()
    expect(agent.prompt.length).toBeGreaterThan(100)
    expect(agent.model).toBeDefined()
    expect(agent.mode).toBe("subagent")
    ```

- [ ] **Test**: builtinAgents should resolve deprecated "oracle" to valid agent (backup)
  - **File**: `src/agents/agent-resolution.test.ts`
  - **Input**: Access `builtinAgents["oracle"]`
  - **Expected**: Returns valid AgentConfig (still functional for backup)
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #when
    const agent = builtinAgents["oracle"]
    
    // #then
    expect(agent).toBeDefined()
    expect(agent.prompt).toBeDefined()
    expect(agent.model).toBeDefined()
    // Deprecated but still functional
    ```

- [ ] **Test**: Nathan agent should have Request Analyst behavior in prompt
  - **File**: `src/agents/agent-resolution.test.ts`
  - **Input**: Access Nathan agent prompt
  - **Expected**: Prompt contains request analysis behavior
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #when
    const agent = builtinAgents["Nathan (Request Analyst)"]
    
    // #then
    expect(agent.prompt.toLowerCase()).toMatch(/request.*analy|clarif|interview/)
    expect(agent.prompt.toLowerCase()).toMatch(/question|understand/)
    ```

- [ ] **Test**: Ezra agent should have Plan Reviewer behavior in prompt
  - **File**: `src/agents/agent-resolution.test.ts`
  - **Input**: Access Ezra agent prompt
  - **Expected**: Prompt contains plan review behavior
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #when
    const agent = builtinAgents["Ezra (Plan Reviewer)"]
    
    // #then
    expect(agent.prompt.toLowerCase()).toMatch(/review|plan|verify|check/)
    expect(agent.prompt.toLowerCase()).toMatch(/okay|reject|approve/)
    ```

#### Agent Delegation Behavior

- [ ] **Test**: Paul agent prompt should include Elijah in available agents
  - **File**: `src/agents/agent-resolution.test.ts`
  - **Input**: Access Paul agent prompt
  - **Expected**: Prompt mentions Elijah as available for delegation
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #when
    const paulAgent = builtinAgents["Paul"]
    
    // #then
    expect(paulAgent.prompt).toMatch(/Elijah.*Deep Reasoning Advisor/i)
    expect(paulAgent.prompt).toMatch(/delegate_task/i)
    ```

- [ ] **Test**: Paul agent prompt should NOT include Oracle in active delegation list
  - **File**: `src/agents/agent-resolution.test.ts`
  - **Input**: Access Paul agent prompt
  - **Expected**: Oracle not in active delegation (may be in deprecated comments)
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #when
    const paulAgent = builtinAgents["Paul"]
    
    // #then
    // Oracle should not appear as an active delegation target
    // (may appear in deprecated comments)
    const delegationSection = paulAgent.prompt.match(/available.*agents?.*:[\s\S]*?(?=##|$)/i)?.[0] || ""
    expect(delegationSection.toLowerCase()).not.toMatch(/\boracle\b/)
    ```

- [ ] **Test**: planner-paul agent should include Nathan but NOT implementation agents
  - **File**: `src/agents/agent-resolution.test.ts`
  - **Input**: Access planner-paul agent prompt
  - **Expected**: Nathan available, ultrabrain/visual-engineering NOT available
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #when
    const plannerPaul = builtinAgents["planner-paul"]
    
    // #then
    expect(plannerPaul.prompt).toMatch(/Nathan.*Request Analyst/i)
    // Should NOT have implementation agents
    expect(plannerPaul.prompt.toLowerCase()).not.toMatch(/ultrabrain/)
    expect(plannerPaul.prompt.toLowerCase()).not.toMatch(/visual-engineering/)
    ```

- [ ] **Test**: Sisyphus agent should still function as backup orchestrator
  - **File**: `src/agents/agent-resolution.test.ts`
  - **Input**: Access Sisyphus agent
  - **Expected**: Valid agent with orchestration capabilities
  - **Assertions**:
    ```typescript
    // #given
    import { builtinAgents } from "./index"
    
    // #when
    const sisyphus = builtinAgents["Sisyphus"]
    
    // #then
    expect(sisyphus).toBeDefined()
    expect(sisyphus.prompt).toBeDefined()
    expect(sisyphus.prompt.toLowerCase()).toMatch(/orchestrat|coordinat|delegate/)
    ```

---

## Test Suite 4 (Extended): TDD Hook Edge Cases

> **Goal**: Cover boundary conditions and error scenarios

### Additional Edge Case Tests

#### File System Edge Cases

- [ ] **Test**: PreToolUse should handle missing .paul/plans/ directory gracefully
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Setup**: `.paul/plans/` directory does NOT exist
  - **Input**: Write tool with code file
  - **Expected**: Injects reminder (treats as no test specs)
  - **Assertions**:
    ```typescript
    // #given
    // Mock: .paul/plans/ directory does not exist
    const mockGlob = mock(() => { throw new Error("ENOENT") })
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, message: undefined }
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toMatch(/TDD REMINDER/i)
    // Should not throw, should gracefully handle missing directory
    ```

- [ ] **Test**: PreToolUse should handle glob operation failure gracefully
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Setup**: Glob operation throws error
  - **Input**: Write tool with code file
  - **Expected**: Does not crash, injects reminder
  - **Assertions**:
    ```typescript
    // #given
    // Mock: glob throws unexpected error
    const mockGlob = mock(() => { throw new Error("Permission denied") })
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, message: undefined }
    
    // #when / #then
    await expect(hook["tool.execute.before"](input, output)).resolves.not.toThrow()
    ```

#### Path Edge Cases

- [ ] **Test**: isCodeFile should handle absolute paths
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"/Users/dev/project/src/service.ts"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("/Users/dev/project/src/service.ts")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should handle Windows-style paths
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"C:\\Users\\dev\\project\\src\\service.ts"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("C:\\Users\\dev\\project\\src\\service.ts")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should handle paths with spaces
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"src/my component/Button.tsx"`
  - **Expected**: `true`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("src/my component/Button.tsx")
    
    // #then
    expect(result).toBe(true)
    ```

- [ ] **Test**: isCodeFile should handle empty string
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `""`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("")
    
    // #then
    expect(result).toBe(false)
    ```

- [ ] **Test**: isCodeFile should handle path with no extension
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"Makefile"`
  - **Expected**: `false`
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("Makefile")
    
    // #then
    expect(result).toBe(false)
    ```

- [ ] **Test**: isCodeFile should handle double extensions
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: `"service.test.ts"`
  - **Expected**: `true` (still a .ts file)
  - **Assertions**:
    ```typescript
    // #given
    import { isCodeFile } from "./index"
    
    // #when
    const result = isCodeFile("service.test.ts")
    
    // #then
    expect(result).toBe(true)
    ```

#### Hook Input Edge Cases

- [ ] **Test**: PreToolUse should handle missing filePath in args
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Write tool with no filePath
  - **Expected**: Does not crash, no reminder injected
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: {}, message: undefined }
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toBeUndefined()
    ```

- [ ] **Test**: PreToolUse should handle null filePath
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Write tool with `filePath: null`
  - **Expected**: Does not crash, no reminder injected
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: "Write", sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: null }, message: undefined }
    
    // #when
    await hook["tool.execute.before"](input, output)
    
    // #then
    expect(output.message).toBeUndefined()
    ```

- [ ] **Test**: PreToolUse should handle undefined tool name
  - **File**: `src/hooks/tdd-enforcement/index.test.ts`
  - **Input**: Input with undefined tool
  - **Expected**: Does not crash
  - **Assertions**:
    ```typescript
    // #given
    const hook = createTddEnforcementHook(mockPluginInput)
    const input = { tool: undefined, sessionID: "test-session", callID: "call-1" }
    const output = { args: { filePath: "src/service.ts" }, message: undefined }
    
    // #when / #then
    await expect(hook["tool.execute.before"](input, output)).resolves.not.toThrow()
    ```

---

## Test Setup Requirements

### Mock Setup Instructions

For TDD Hook tests, use the following mock setup pattern:

```typescript
import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test"
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

describe("tdd-enforcement hook", () => {
  const TEST_DIR = "/tmp/test-tdd-enforcement"
  const PAUL_PLANS_DIR = join(TEST_DIR, ".paul", "plans")
  
  function createMockPluginInput() {
    return {
      client: {},
      directory: TEST_DIR,
    } as never
  }
  
  beforeEach(() => {
    // Create test directory structure
    mkdirSync(PAUL_PLANS_DIR, { recursive: true })
  })
  
  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(TEST_DIR, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })
  
  // Helper to create test spec file
  function createTestSpec(name: string) {
    writeFileSync(join(PAUL_PLANS_DIR, `${name}-tests.md`), "# Test Spec")
  }
  
  // Helper to remove all test specs
  function removeAllTestSpecs() {
    rmSync(PAUL_PLANS_DIR, { recursive: true, force: true })
  }
  
  // ... tests go here
})
```

### File System Mocking for Edge Cases

For tests that need to simulate file system errors:

```typescript
import { mock } from "bun:test"

// Mock glob to simulate missing directory
const mockGlobNoDir = mock(() => {
  const error = new Error("ENOENT: no such file or directory")
  ;(error as any).code = "ENOENT"
  throw error
})

// Mock glob to simulate permission error
const mockGlobPermissionDenied = mock(() => {
  const error = new Error("EACCES: permission denied")
  ;(error as any).code = "EACCES"
  throw error
})
```
