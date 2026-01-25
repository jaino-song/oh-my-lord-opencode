# Test Specifications: Sisyphus to Paul Migration

## Overview

This is a **REFACTORING** task - no new functionality is being added. Testing focuses on:
1. Verifying existing tests pass after renaming
2. Verifying migration mappings work for backward compatibility
3. Verifying no orphaned references remain

## Test Strategy

### 1. Regression Testing (Primary)

**Goal**: Ensure all existing tests pass after each phase.

**Verification Commands**:
```bash
bun run typecheck  # After every phase
bun test           # After Phases 2, 3, 5, 6, 9
bun run build      # After Phase 6, 10
```

**Expected Results**:
- All 84 test files pass
- No TypeScript errors
- Build succeeds

### 2. Migration Mapping Tests (Phase 8)

**File**: `src/shared/migration.test.ts`

**New Test Cases to Add**:

```typescript
describe("Sisyphus to Paul migration", () => {
  test("migrates Sisyphus agent name to Paul", () => {
    const agents = { Sisyphus: { model: "test" } }
    const migrated = migrateAgentNames(agents)
    expect(migrated["Paul"]).toBeDefined()
    expect(migrated["Sisyphus"]).toBeUndefined()
  })

  test("migrates Sisyphus-Junior to Paul-Junior", () => {
    const agents = { "Sisyphus-Junior": { model: "test" } }
    const migrated = migrateAgentNames(agents)
    expect(migrated["Paul-Junior"]).toBeDefined()
    expect(migrated["Sisyphus-Junior"]).toBeUndefined()
  })

  test("migrates sisyphus_agent config to paul_agent", () => {
    const config = { sisyphus_agent: { disabled: false } }
    migrateConfigKeys(config)
    expect(config.paul_agent).toEqual({ disabled: false })
    expect(config.sisyphus_agent).toBeUndefined()
  })

  test("chains omo → Sisyphus → Paul migration", () => {
    const agents = { omo: { model: "test" } }
    const migrated = migrateAgentNames(agents)
    expect(migrated["Paul"]).toBeDefined()
  })
})
```

### 3. Schema Validation Tests (Phase 3)

**File**: `src/config/schema.test.ts`

**Updated Test Cases**:

```typescript
describe("Paul-Junior agent override", () => {
  test("schema accepts agents['Paul-Junior']", () => {
    const config = {
      agents: {
        "Paul-Junior": {
          model: "openai/gpt-5.2",
          temperature: 0.2,
        },
      },
    }
    const result = OhMyOpenCodeConfigSchema.safeParse(config)
    expect(result.success).toBe(true)
    expect(result.data.agents?.["Paul-Junior"]).toBeDefined()
  })

  test("schema accepts paul_agent config", () => {
    const config = {
      paul_agent: {
        disabled: false,
        planner_enabled: true,
      },
    }
    const result = OhMyOpenCodeConfigSchema.safeParse(config)
    expect(result.success).toBe(true)
    expect(result.data.paul_agent).toBeDefined()
  })
})
```

### 4. Agent Creation Tests (Phase 5)

**File**: `src/agents/paul-junior.test.ts` (renamed from sisyphus-junior.test.ts)

**Updated Test Cases**:
- Rename all `createSisyphusJuniorAgentWithOverrides` → `createPaulJuniorAgentWithOverrides`
- Rename all `SISYPHUS_JUNIOR_DEFAULTS` → `PAUL_JUNIOR_DEFAULTS`
- Update test descriptions from "Sisyphus-Junior" to "Paul-Junior"

### 5. Hook Tests (Phase 2)

**File**: `src/hooks/paul-orchestrator/index.test.ts` (renamed from sisyphus-orchestrator)

**Updated Test Cases**:
- Rename `createSisyphusOrchestratorHook` → `createPaulOrchestratorHook`
- Update test descriptions
- Update mock data to use "Paul" instead of "orchestrator-sisyphus"

### 6. Final Verification (Phase 10)

**Orphaned Reference Check**:
```bash
# Should return ONLY migration.ts (intentional backward compat)
grep -ri "sisyphus" src/ --include="*.ts" | grep -v "migration" | grep -v ".test.ts"
```

**Expected**: No results (all references migrated except migration mappings)

## Test Execution Order

| Phase | Test Command | Expected Result |
|-------|--------------|-----------------|
| 0 | `bun run typecheck` | Pass (imports updated) |
| 1 | `bun run typecheck` | Pass (file deleted safely) |
| 2 | `bun test paul-junior paul-orchestrator` | Pass (renamed files work) |
| 3 | `bun test schema` | Pass (new schema names work) |
| 5 | `bun run typecheck` | Pass (registry updated) |
| 6 | `bun run build` | Pass (hooks work) |
| 8 | `bun test migration` | Pass (mappings work) |
| 9 | `bun test` | All 84 files pass |
| 10 | `bun run build && bun test` | Full verification |

## Definition of Done

- [ ] All 84 test files pass
- [ ] `bun run typecheck` has no errors
- [ ] `bun run build` succeeds
- [ ] No orphaned "sisyphus" references (except migration.ts)
- [ ] Migration mappings tested and working
