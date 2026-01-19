# Agent Consolidation Refactor

## Context

### Original Request
Refactor oh-my-opencode agent system to consolidate orchestrators and planners, deprecate legacy agents while keeping Sisyphus as backup, enforce TDD at the system level, and unify plan locations.

### Interview Summary
**Key Decisions**:
- Keep Sisyphus as BACKUP orchestrator (not fully deprecated)
- Paul is PRIMARY orchestrator, planner-paul is PRIMARY planner
- Nathan is for planner-paul ONLY, not available to Paul (enforced via prompts)
- TDD enforcement via hooks (SOFT REMINDERS, not hard blocks)
- Primary plans go to `.paul/` directory; `.sisyphus/` remains for backup workflow

**Research Findings**:
- 78 Oracle references in 14 files need updating to Elijah
- 44 Metis references in 9 files need updating to Nathan
- Momus references need updating to Ezra
- `orchestrator-sisyphus.ts` creates `paulAgent` (confusing naming, will be renamed to `paul.ts`)
- Two plan locations exist: `.paul/` (primary) and `.sisyphus/` (backup for Sisyphus)

### Architecture Clarification: Paul vs Sisyphus

| File | Agent Created | Role |
|------|---------------|------|
| `orchestrator-sisyphus.ts` (rename to `paul.ts`) | `paulAgent` | PRIMARY orchestrator with TDD enforcement |
| `sisyphus.ts` | `sisyphusAgent` | BACKUP orchestrator (legacy, less strict) |

**Why the confusing naming?** Paul evolved FROM Sisyphus. The file was originally `orchestrator-sisyphus.ts` but now creates the Paul agent. Renaming to `paul.ts` clarifies this.

**Agent Access Control (enforced via PROMPTS, not code)**:
- **Paul's prompt** (orchestrator-sisyphus.ts): Lists ALL agents as available for delegation
- **planner-paul's prompt** (planner-paul.ts): EXPLICITLY FORBIDS implementation delegation - line 103-124 lists allowed vs forbidden delegations
- **No code changes needed**: Access control is already in the prompts

**Why .sisyphus/ remains**: The Prometheus/Sisyphus workflow uses `.sisyphus/plans/`. Since Sisyphus is kept as a backup, `.sisyphus/` remains functional. New work uses `.paul/`.

---

## Work Objectives

### Core Objective
Consolidate the agent system to have one clear primary path (Paul/planner-paul) while keeping Sisyphus as a functional backup, and enforce TDD at the system level.

### Concrete Deliverables
- Updated `index.ts` with correct agent exports
- `@deprecated` JSDoc on legacy agents (Prometheus, Oracle, Metis, Momus)
- All Oracle references replaced with Elijah
- All Metis references replaced with Nathan
- All Momus references replaced with Ezra
- New TDD enforcement hook
- Renamed `paul.ts` (from `orchestrator-sisyphus.ts`)
- Updated imports throughout codebase

### Definition of Done
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] Paul can invoke all agents via delegate_task() (verified via prompt inspection)
- [ ] planner-paul can invoke planning agents only (verified via prompt inspection: Nathan, Timothy, Solomon, Thomas, Ezra, explore, librarian)
- [ ] TDD hook REMINDS about test specs before code writes (soft reminder, not hard block)
- [ ] TDD hook REMINDS to run Joshua after code writes (soft reminder)
- [ ] Primary plans saved to `.paul/plans/` (`.sisyphus/` remains for backup)

### Test Spec Naming Convention (for TDD hook)
- Test specs are stored at: `.paul/plans/{feature-name}-tests.md`
- Code files are NOT directly mapped to test specs (feature-level, not file-level)
- The TDD hook checks if ANY test spec exists in `.paul/plans/`, not a specific one
- This is a SOFT REMINDER system, not a strict enforcement

### Must Have
- Sisyphus remains functional as backup
- Paul has full delegate_task() access to ALL agents
- planner-paul has delegate_task() access to PLANNING agents only
- TDD enforcement via hooks
- Clean typecheck and tests

### Must NOT Have (Guardrails)
- DO NOT delete any agent files (keep for reference/backup)
- DO NOT change agent behavior beyond deprecation
- DO NOT break existing Sisyphus workflow (backup path)
- DO NOT give Paul access to Nathan (Nathan is planner-paul only)
- DO NOT give planner-paul access to implementation agents (ultrabrain, visual-engineering, etc.)

---

## Task Flow

```
Phase 1: Deprecate Legacy Agents (parallel)
    ├── Task 1: Add @deprecated to oracle.ts
    ├── Task 2: Add @deprecated to metis.ts
    ├── Task 3: Add @deprecated to momus.ts
    └── Task 4: Add @deprecated to prometheus-prompt.ts

Phase 2: Update Agent References (sequential per file, parallel across files)
    ├── Task 5: Update sisyphus.ts (Oracle → Elijah)
    ├── Task 6: Update sisyphus-prompt-builder.ts (Oracle → Elijah)
    ├── Task 7: Update prometheus-prompt.ts (Metis → Nathan, Momus → Ezra)
    ├── Task 8: Update plan-prompt.ts (Metis → Nathan)
    ├── Task 9: Update ezra.ts (Oracle → Elijah)
    └── Task 10: Update thomas.ts (Metis → Nathan)

Phase 3: Update Exports and Registration (sequential)
    ├── Task 11: Update index.ts agent exports
    ├── Task 12: Update utils.ts agent sources
    └── Task 13: Update types.ts BuiltinAgentName

Phase 4: Create TDD Enforcement Hook (independent)
    └── Task 14: Create tdd-enforcement hook

Phase 5: File Rename (sequential, last)
    ├── Task 15: Rename orchestrator-sisyphus.ts to paul.ts
    └── Task 16: Update all imports referencing renamed file

Phase 6: Verification
    └── Task 17: Run typecheck and tests
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 2, 3, 4 | Independent files, no conflicts |
| B | 5, 6, 7, 8, 9, 10 | Can run in parallel (different files) |
| C | 14 | Independent of other tasks |

| Task | Depends On | Reason |
|------|------------|--------|
| 11-13 | 1-10 | Exports depend on updated agents |
| 15 | 11-13 | Rename after exports updated |
| 16 | 15 | Update imports after rename |
| 17 | All | Final verification |

---

## TODOs

> Paul decides which agent handles each task. Do NOT specify agents.

- [ ] 1. Add @deprecated JSDoc to oracle.ts

  **What to do**:
  - Add `@deprecated Use Elijah (Deep Reasoning Advisor) instead` JSDoc to file header
  - Add deprecation warning comment at top of ORACLE_SYSTEM_PROMPT
  - Keep all functionality intact (backup purposes)

  **Must NOT do**:
  - Do NOT delete the file
  - Do NOT change agent behavior
  - Do NOT remove exports

  **Parallelizable**: YES (with 2, 3, 4)

  **References**:
  - `src/agents/oracle.ts` - Target file
  - `src/agents/elijah.ts:7` - Example deprecation pattern

  **Acceptance Criteria**:
  - [ ] @deprecated JSDoc present
  - [ ] File still exports oracleAgent
  - [ ] Typecheck passes

---

- [ ] 2. Add @deprecated JSDoc to metis.ts

  **What to do**:
  - Add `@deprecated Use Nathan (Request Analyst) instead` JSDoc to file header
  - Add deprecation warning comment at top of METIS_SYSTEM_PROMPT
  - Keep all functionality intact (backup purposes)

  **Must NOT do**:
  - Do NOT delete the file
  - Do NOT change agent behavior
  - Do NOT remove exports

  **Parallelizable**: YES (with 1, 3, 4)

  **References**:
  - `src/agents/metis.ts` - Target file
  - `src/agents/nathan.ts:25` - Example deprecation pattern

  **Acceptance Criteria**:
  - [ ] @deprecated JSDoc present
  - [ ] File still exports metisAgent
  - [ ] Typecheck passes

---

- [ ] 3. Add @deprecated JSDoc to momus.ts

  **What to do**:
  - Add `@deprecated Use Ezra (Plan Reviewer) instead` JSDoc to file header
  - Keep all functionality intact (backup purposes)

  **Must NOT do**:
  - Do NOT delete the file
  - Do NOT change agent behavior
  - Do NOT remove exports

  **Parallelizable**: YES (with 1, 2, 4)

  **References**:
  - `src/agents/momus.ts` - Target file
  - `src/agents/ezra.ts` - Replacement agent

  **Acceptance Criteria**:
  - [ ] @deprecated JSDoc present
  - [ ] File still exports momusAgent
  - [ ] Typecheck passes

---

- [ ] 4. Add @deprecated JSDoc to prometheus-prompt.ts

  **What to do**:
  - Add `@deprecated Use planner-paul instead` JSDoc to file header
  - Add deprecation warning at top of PROMETHEUS_SYSTEM_PROMPT
  - Keep all functionality intact (Sisyphus backup path)

  **Must NOT do**:
  - Do NOT delete the file
  - Do NOT change agent behavior
  - Do NOT remove exports

  **Parallelizable**: YES (with 1, 2, 3)

  **References**:
  - `src/agents/prometheus-prompt.ts` - Target file
  - `src/agents/planner-paul.ts` - Replacement agent

  **Acceptance Criteria**:
  - [ ] @deprecated JSDoc present
  - [ ] File still exports PROMETHEUS_SYSTEM_PROMPT
  - [ ] Typecheck passes

---

- [ ] 5. Update sisyphus.ts: Replace Oracle with Elijah

  **What to do**:
  - Replace all "Oracle" references with "Elijah (Deep Reasoning Advisor)"
  - Replace `delegate_task(agent="oracle"` with `delegate_task(agent="Elijah (Deep Reasoning Advisor)"`
  - Update prompt text mentioning Oracle consultation
  - Update buildOracleSection import/usage if present

  **Must NOT do**:
  - Do NOT change core Sisyphus behavior
  - Do NOT remove Oracle entirely (keep as fallback mention)

  **Parallelizable**: YES (with 6, 7, 8, 9, 10)

  **References**:
  - `src/agents/sisyphus.ts:34, 147, 194, 200, 395-396` - Oracle references
  - `src/agents/elijah.ts` - Elijah agent definition

  **Acceptance Criteria**:
  - [ ] No "oracle" references except in deprecated fallback comments
  - [ ] All delegate_task calls use "Elijah (Deep Reasoning Advisor)"
  - [ ] Typecheck passes

---

- [ ] 6. Update sisyphus-prompt-builder.ts: Replace Oracle with Elijah

  **What to do**:
  - Rename `buildOracleSection` to `buildElijahSection`
  - Update function to reference Elijah instead of Oracle
  - Update agent name check from "oracle" to "Elijah (Deep Reasoning Advisor)"
  - Update exported section content

  **Must NOT do**:
  - Do NOT break existing sisyphus.ts imports

  **Parallelizable**: YES (with 5, 7, 8, 9, 10)

  **References**:
  - `src/agents/sisyphus-prompt-builder.ts:143, 260-286, 341` - Oracle references
  - `src/agents/elijah.ts` - Elijah prompt metadata

  **Acceptance Criteria**:
  - [ ] Function renamed to buildElijahSection
  - [ ] All Oracle references updated
  - [ ] Typecheck passes

---

- [ ] 7. Update prometheus-prompt.ts: Replace Metis with Nathan, Momus with Ezra

  **What to do**:
  - Replace all "Metis" references with "Nathan (Request Analyst)"
  - Replace all "Momus" references with "Ezra (Plan Reviewer)"
  - Replace all "Oracle" references with "Elijah (Deep Reasoning Advisor)"
  - Update delegate_task calls to use new agent names

  **Must NOT do**:
  - Do NOT change the core planning workflow
  - Do NOT remove the file (still needed for Sisyphus backup)

  **Parallelizable**: YES (with 5, 6, 8, 9, 10)

  **References**:
  - `src/agents/prometheus-prompt.ts:13, 211-212, 249, 452-454, 569, 582, 588, 597-648` - Metis/Oracle refs
  - `src/agents/nathan.ts` - Nathan agent definition
  - `src/agents/ezra.ts` - Ezra agent definition

  **Acceptance Criteria**:
  - [ ] No Metis references (except deprecated comments)
  - [ ] No Momus references (except deprecated comments)
  - [ ] No Oracle references (except deprecated comments)
  - [ ] Typecheck passes

---

- [ ] 8. Update plan-prompt.ts: Replace Metis with Nathan

  **What to do**:
  - Replace all "Metis" references with "Nathan (Request Analyst)"
  - Update delegate_task calls to use Nathan

  **Must NOT do**:
  - Do NOT change planning logic

  **Parallelizable**: YES (with 5, 6, 7, 9, 10)

  **References**:
  - `src/agents/plan-prompt.ts:7, 70-96` - Metis references

  **Acceptance Criteria**:
  - [ ] No Metis references
  - [ ] Typecheck passes

---

- [ ] 9. Update ezra.ts: Replace Oracle with Elijah

  **What to do**:
  - Replace "Oracle" escalation recommendations with "Elijah"
  - Update EZRA_SYSTEM_PROMPT Oracle references

  **Must NOT do**:
  - Do NOT change Ezra's review behavior

  **Parallelizable**: YES (with 5, 6, 7, 8, 10)

  **References**:
  - `src/agents/ezra.ts:22, 104-105, 188-202, 257, 325` - Oracle references

  **Acceptance Criteria**:
  - [ ] No Oracle references
  - [ ] Elijah escalation recommendations
  - [ ] Typecheck passes

---

- [ ] 10. Update thomas.ts: Replace Metis with Nathan

  **What to do**:
  - Replace "Metis" references with appropriate agent or remove if not needed
  - Update any delegate_task calls

  **Must NOT do**:
  - Do NOT change Thomas's TDD review behavior

  **Parallelizable**: YES (with 5, 6, 7, 8, 9)

  **References**:
  - `src/agents/thomas.ts:18, 325` - Metis references

  **Acceptance Criteria**:
  - [ ] No Metis references
  - [ ] Typecheck passes

---

- [ ] 11. Update index.ts: Configure agent exports

  **What to do**:
  - Keep all agent exports (nothing deleted)
  - Add deprecation comments to legacy agent exports:
    ```typescript
    // DEPRECATED: Use "Elijah (Deep Reasoning Advisor)" instead
    oracle: oracleAgent,
    // DEPRECATED: Use "Nathan (Request Analyst)" instead  
    "Metis (Plan Consultant)": metisAgent,
    // DEPRECATED: Use "Ezra (Plan Reviewer)" instead
    "Momus (Plan Reviewer)": momusAgent,
    ```
  - Ensure Paul and planner-paul are properly exported

  **Must NOT do**:
  - Do NOT remove any exports (keep for backup)
  - Do NOT break existing import paths

  **Parallelizable**: NO (depends on 1-10)

  **References**:
  - `src/agents/index.ts` - Target file

  **Acceptance Criteria**:
  - [ ] All agents still exported
  - [ ] Deprecation comments added
  - [ ] Typecheck passes

---

- [ ] 12. Update utils.ts: Configure agent sources and metadata

  **What to do**:
  - Keep all agent sources (nothing deleted)
  - Add deprecation comments to legacy agent sources
  - Ensure createPaulAgent and createPlannerPaulAgent are properly configured

  **Must NOT do**:
  - Do NOT remove any agent sources
  - Do NOT break createBuiltinAgents()

  **Parallelizable**: NO (depends on 1-10)

  **References**:
  - `src/agents/utils.ts:5, 11, 43, 49, 70` - Agent sources

  **Acceptance Criteria**:
  - [ ] All agents still creatable
  - [ ] Deprecation comments added
  - [ ] Typecheck passes

---

- [ ] 13. Update types.ts: Update BuiltinAgentName type

  **What to do**:
  - Keep all agent names in union type
  - Add JSDoc deprecation comments to legacy names

  **Must NOT do**:
  - Do NOT remove any names from union

  **Parallelizable**: NO (depends on 1-10)

  **References**:
  - `src/agents/types.ts:61, 67` - BuiltinAgentName type

  **Acceptance Criteria**:
  - [ ] All agent names in union
  - [ ] Deprecation comments added
  - [ ] Typecheck passes

---

- [ ] 14. Create TDD enforcement hook (SOFT REMINDERS ONLY)

  **What to do**:
  - Create new directory: `src/hooks/tdd-enforcement/`
  - Create `index.ts` with PreToolUse and PostToolUse hooks
  - PreToolUse: REMIND about test specs (DO NOT BLOCK)
  - PostToolUse: REMIND to invoke Joshua (DO NOT AUTO-INVOKE)
  - Add to hooks/index.ts exports
  - Register in main plugin

  **Code file detection** (`isCodeFile` function):
  - INCLUDE: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.java`, `.cpp`, `.c`, `.rs`
  - EXCLUDE: `.md`, `.json`, `.yaml`, `.yml`, `.toml`, `.env`, `.gitignore`, `.css`, `.scss`
  - Pattern: `/\.(ts|tsx|js|jsx|py|go|java|cpp|c|rs)$/`

  **Hook logic**:
  ```typescript
  const CODE_FILE_PATTERN = /\.(ts|tsx|js|jsx|py|go|java|cpp|c|rs)$/;
  
  function isCodeFile(filePath: string): boolean {
    return CODE_FILE_PATTERN.test(filePath);
  }
  
  // PreToolUse: SOFT REMINDER about test specs
  if (isCodeFile(filePath) && (tool === "write" || tool === "edit")) {
    // Check if ANY .paul/plans/*-tests.md exists
    const testSpecsExist = await glob(".paul/plans/*-tests.md").length > 0;
    if (!testSpecsExist) {
      // INJECT REMINDER (not block):
      // "[TDD REMINDER] No test specs found in .paul/plans/. Consider using Solomon to create test specs first."
    }
  }
  
  // PostToolUse: SOFT REMINDER about Joshua
  if (isCodeFile(filePath) && (tool === "write" || tool === "edit")) {
    // INJECT REMINDER (not auto-invoke):
    // "[TDD REMINDER] Code changed. Run Joshua (Test Runner) to verify tests pass: delegate_task(agent='Joshua (Test Runner)', ...)"
  }
  ```

  **Must NOT do**:
  - Do NOT hard-block writes (SOFT REMINDER ONLY)
  - Do NOT auto-invoke Joshua (REMIND ONLY)
  - Do NOT interfere with .md, .json, config file writes
  - Do NOT apply to files outside src/ directory

  **Parallelizable**: YES (independent of other tasks)

  **References**:
  - `src/hooks/planner-md-only/` - Example hook structure
  - `src/hooks/index.ts` - Hook registration
  - `src/agents/joshua.ts` - Joshua agent

  **Acceptance Criteria**:
  - [ ] Hook directory created with index.ts
  - [ ] `isCodeFile()` function correctly identifies code files
  - [ ] PreToolUse injects reminder (not block) when no test specs exist
  - [ ] PostToolUse injects reminder (not auto-invoke) after code changes
  - [ ] Hook registered in hooks/index.ts
  - [ ] Typecheck passes
  - [ ] Does not break existing workflows

---

- [ ] 15. Rename orchestrator-sisyphus.ts to paul.ts

  **What to do**:
  - Rename file: `src/agents/orchestrator-sisyphus.ts` → `src/agents/paul.ts`
  - Keep all exports and functionality identical

  **Must NOT do**:
  - Do NOT change any code inside the file
  - Do NOT break exports

  **Parallelizable**: NO (depends on 11-13)

  **References**:
  - `src/agents/orchestrator-sisyphus.ts` - Source file

  **Acceptance Criteria**:
  - [ ] File renamed to paul.ts
  - [ ] All exports still work
  - [ ] Typecheck passes

---

- [ ] 16. Update all imports referencing renamed file

  **What to do**:
  - Find all files importing from `./orchestrator-sisyphus` or `./orchestrator-sisyphus.ts`
  - Update to import from `./paul` or `./paul.ts`
  - Update any barrel exports in index.ts

  **Must NOT do**:
  - Do NOT change the imported symbols
  - Do NOT break any functionality

  **Parallelizable**: NO (depends on 15)

  **References**:
  - Run `grep -r "orchestrator-sisyphus" src/` to find all imports

  **Acceptance Criteria**:
  - [ ] No imports from orchestrator-sisyphus
  - [ ] All imports from paul.ts
  - [ ] Typecheck passes

---

- [ ] 17. Run typecheck and tests

  **What to do**:
  - Run `bun run typecheck` - must pass with 0 errors
  - Run `bun test` - all tests must pass
  - Fix any failures

  **Must NOT do**:
  - Do NOT skip failing tests
  - Do NOT ignore type errors

  **Parallelizable**: NO (depends on all previous tasks)

  **References**:
  - `package.json` - Scripts

  **Acceptance Criteria**:
  - [ ] `bun run typecheck` exits 0
  - [ ] `bun test` exits 0
  - [ ] No regressions

---

## Success Criteria

### Final Checklist
- [ ] All "Must Have" present:
  - [ ] Sisyphus functional as backup
  - [ ] Paul has full delegate_task() access
  - [ ] planner-paul has planning-only delegate_task() access
  - [ ] TDD enforcement hook active
  - [ ] Clean typecheck and tests
- [ ] All "Must NOT Have" absent:
  - [ ] No deleted agent files
  - [ ] No broken Sisyphus workflow
  - [ ] No Paul access to Nathan
  - [ ] No planner-paul access to implementation agents
