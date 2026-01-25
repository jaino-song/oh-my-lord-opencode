# Sisyphus to Paul Migration

## Context

### Original Request
User wants to completely delete Sisyphus and related deprecated agents, consolidating to Paul naming convention.

### Interview Summary
- **Target Naming**: Consolidate all Sisyphus components to Paul
- **Directory Migration**: .sisyphus/ → .paul/
- **Branding**: Remove all Sisyphus branding from commits

### Key Research Findings
- 74 files with 560+ Sisyphus references
- Core files: sisyphus.ts (641 lines), sisyphus-junior.ts (195 lines), sisyphus-prompt-builder.ts (360 lines)
- Hook: sisyphus-orchestrator/ (781 lines + tests)
- Directory pattern: .sisyphus/ used for plans, drafts, notepads, test-results, state files
- Branding: commit footers, co-authored-by trailers, image assets

## Objectives & Deliverables

### Core Objective
Remove all Sisyphus naming from the codebase, consolidating to Paul naming convention while maintaining backward compatibility through migration mappings.

### Concrete Deliverables
1. **Deleted Files**:
   - `src/agents/sisyphus.ts`
   - `src/agents/sisyphus-prompt-builder.ts`
   - `.github/assets/sisyphus.png`
   - `.github/assets/sisyphuslabs.png`
   - `.github/assets/orchestrator-sisyphus.png`
   - `.github/workflows/sisyphus-agent.yml`

2. **Renamed Files**:
   - `src/agents/sisyphus-junior.ts` → `src/agents/paul-junior.ts`
   - `src/agents/sisyphus-junior.test.ts` → `src/agents/paul-junior.test.ts`
   - `src/hooks/sisyphus-orchestrator/` → `src/hooks/paul-orchestrator/`

3. **Updated Schema/Config**:
   - New `PaulAgentConfigSchema` replacing `SisyphusAgentConfigSchema`
   - New `paul_agent` config key replacing `sisyphus_agent`
   - Updated agent name enums

4. **Updated Directory References**:
   - All `.sisyphus/` → `.paul/` in 46+ files

5. **Migration Support**:
   - Backward-compatible config migration
   - Legacy name mappings

### Must Have
- All tests pass after migration
- No TypeScript errors
- Backward compatibility for existing user configs
- Clean git history (atomic commits per phase)

### Must NOT Have
- Breaking changes without migration path
- Orphaned references to Sisyphus
- Deleted functionality (only naming changes)

## Task Flow

```
Phase 0: Prepare Imports (CRITICAL - prevents import breakage)
    ↓
Phase 1: Delete Legacy Files (now safe)
    ↓
Phase 2: Rename Core Files (git mv)
    ↓
Phase 3: Update Schema & Types
    ↓
Phase 4: Update Directory References
    ↓
Phase 5: Update Agent Registry & Exports
    ↓
Phase 5B: Update Tools & Commands
    ↓
Phase 6: Update Hooks
    ↓
Phase 7: Remove Branding
    ↓
Phase 8: Add Migration Mappings
    ↓
Phase 9: Update Tests
    ↓
Phase 10: Final Verification
```

## Parallelization

### Can Run in Parallel (After Phase 3)
- Phase 4 (Directory References) + Phase 5 (Agent Registry) + Phase 6 (Hooks)
- Phase 7 (Branding) + Phase 8 (Migration)

### Must Be Sequential
- Phase 1 → Phase 2 → Phase 3 (foundation)
- Phase 9 → Phase 10 (verification)

## TODOs

### Phase 0: Prepare Imports (CRITICAL - Must Run First)

- [ ] 0.1 Rename sisyphus-prompt-builder.ts to paul-prompt-builder.ts
  **Agent Hint**: git-master (git mv for history preservation)
  **What to do**:
  1. `git mv src/agents/sisyphus-prompt-builder.ts src/agents/paul-prompt-builder.ts`
  2. Update imports in `src/agents/paul.ts`:
     - Change `from "./sisyphus-prompt-builder"` → `from "./paul-prompt-builder"`
  3. Update imports in `src/agents/utils.ts`:
     - Change `from "./sisyphus-prompt-builder"` → `from "./paul-prompt-builder"`
  4. Update imports in `src/agents/index.ts`:
     - Change `from "./sisyphus-prompt-builder"` → `from "./paul-prompt-builder"`
  5. Commit: "refactor: rename sisyphus-prompt-builder to paul-prompt-builder"
  **Must NOT do**: Delete the file, only rename
  **References**: src/agents/sisyphus-prompt-builder.ts, src/agents/paul.ts, src/agents/utils.ts, src/agents/index.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] File renamed with git mv
  - [ ] All imports updated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 0.2 Remove sisyphus imports from index.ts before deletion
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/agents/index.ts`:
     - Remove `import { sisyphusAgent } from "./sisyphus"` (line 2)
     - Remove `Sisyphus: sisyphusAgent` from builtinAgents object
  2. In `src/agents/utils.ts`:
     - Remove `import { createSisyphusAgent } from "./sisyphus"` (line 4)
     - Remove all usage of `createSisyphusAgent` function
     - Remove `sisyphusConfig` variable and related code
  3. Commit: "refactor: remove sisyphus imports before deletion"
  **Must NOT do**: Delete sisyphus.ts yet (that's Phase 1)
  **References**: src/agents/index.ts, src/agents/utils.ts
  **Verification Method**: `bun run typecheck` passes (will have unused file warning, OK)
  **Definition of Done**:
  - [ ] Imports removed from index.ts
  - [ ] Imports and usage removed from utils.ts
  - [ ] Typecheck passes
  - [ ] Commit created

### Phase 1: Delete Legacy Sisyphus Files

- [ ] 1.1 Delete sisyphus.ts (now safe to delete)
  **Agent Hint**: Sisyphus-Junior (git operations)
  **What to do**:
  1. Delete `src/agents/sisyphus.ts`
  2. Commit: "chore: delete legacy sisyphus agent"
  **Must NOT do**: Delete sisyphus-junior.ts (will be renamed in Phase 2)
  **References**: src/agents/sisyphus.ts
  **Verification Method**: `bun run typecheck` passes, `ls src/agents/sisyphus*.ts` shows only sisyphus-junior files
  **Definition of Done**:
  - [ ] sisyphus.ts deleted
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 1.2 Delete Sisyphus image assets
  **Agent Hint**: Sisyphus-Junior (git operations)
  **What to do**:
  1. Delete `.github/assets/sisyphus.png`
  2. Delete `.github/assets/sisyphuslabs.png`
  3. Delete `.github/assets/orchestrator-sisyphus.png`
  4. Commit: "chore: delete sisyphus image assets"
  **Must NOT do**: Delete other assets
  **References**: .github/assets/
  **Verification Method**: `ls .github/assets/*sisyphus*` should return no files
  **Definition of Done**:
  - [ ] All 3 sisyphus images deleted
  - [ ] Commit created

- [ ] 1.3 Delete or rename sisyphus-agent.yml workflow
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. Check if `.github/workflows/sisyphus-agent.yml` exists
  2. If exists, delete it (or rename to paul-agent.yml if needed)
  3. Commit: "chore: remove sisyphus workflow"
  **Must NOT do**: Delete other workflows
  **References**: .github/workflows/
  **Verification Method**: `ls .github/workflows/*sisyphus*` should return no files
  **Definition of Done**:
  - [ ] Workflow file handled
  - [ ] Commit created

### Phase 2: Rename Core Files

- [ ] 2.1 Rename sisyphus-junior.ts to paul-junior.ts
  **Agent Hint**: git-master (git mv for history preservation)
  **What to do**:
  1. `git mv src/agents/sisyphus-junior.ts src/agents/paul-junior.ts`
  2. `git mv src/agents/sisyphus-junior.test.ts src/agents/paul-junior.test.ts`
  3. Update internal references in paul-junior.ts:
     - `SISYPHUS_JUNIOR_PROMPT` → `PAUL_JUNIOR_PROMPT`
     - `Sisyphus-Junior` → `Paul-Junior` in strings
     - `createSisyphusJuniorAgentWithOverrides` → `createPaulJuniorAgentWithOverrides`
     - `createSisyphusJuniorAgent` → `createPaulJuniorAgent`
     - `SISYPHUS_JUNIOR_DEFAULTS` → `PAUL_JUNIOR_DEFAULTS`
  4. Update test file imports and references
  5. Commit: "refactor: rename sisyphus-junior to paul-junior"
  **Must NOT do**: Change functionality, only naming
  **References**: src/agents/sisyphus-junior.ts, src/agents/sisyphus-junior.test.ts
  **Verification Method**: `bun test paul-junior` passes
  **Definition of Done**:
  - [ ] Files renamed with git mv
  - [ ] Internal references updated
  - [ ] Tests updated and passing
  - [ ] Commit created

- [ ] 2.2 Rename sisyphus-orchestrator hook to paul-orchestrator
  **Agent Hint**: git-master (git mv for history preservation)
  **What to do**:
  1. `git mv src/hooks/sisyphus-orchestrator src/hooks/paul-orchestrator`
  2. Update internal references in index.ts:
     - `HOOK_NAME = "sisyphus-orchestrator"` → `HOOK_NAME = "paul-orchestrator"`
     - `isSisyphusPath` → `isPaulPath` (function name)
     - `SisyphusOrchestratorHookOptions` → `PaulOrchestratorHookOptions`
     - `createSisyphusOrchestratorHook` → `createPaulOrchestratorHook`
  3. Update test file references
  4. Commit: "refactor: rename sisyphus-orchestrator hook to paul-orchestrator"
  **Must NOT do**: Change hook behavior
  **References**: src/hooks/sisyphus-orchestrator/
  **Verification Method**: `bun test paul-orchestrator` passes
  **Definition of Done**:
  - [ ] Directory renamed with git mv
  - [ ] Internal references updated
  - [ ] Tests updated and passing
  - [ ] Commit created

### Phase 3: Update Schema & Types

- [ ] 3.1 Update config schema
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/config/schema.ts`:
     - Rename `SisyphusAgentConfigSchema` → `PaulAgentConfigSchema`
     - Update `OhMyOpenCodeConfigSchema` to use `paul_agent` key
     - Remove "Sisyphus" from `BuiltinAgentNameSchema`
     - Remove "orchestrator-sisyphus" from `BuiltinAgentNameSchema`
     - Update `OverridableAgentNameSchema`: remove "Sisyphus", "Sisyphus-Junior", add "Paul-Junior"
     - Update `AgentOverridesSchema`: remove Sisyphus keys, add "Paul-Junior"
     - Rename `HookNameSchema` entry: "sisyphus-orchestrator" → "paul-orchestrator"
     - Rename type export: `SisyphusAgentConfig` → `PaulAgentConfig`
  2. Update `src/config/index.ts` exports
  3. Commit: "refactor: update schema from sisyphus to paul naming"
  **Must NOT do**: Change schema structure, only naming
  **References**: src/config/schema.ts, src/config/index.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Schema renamed
  - [ ] Types renamed
  - [ ] Exports updated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 3.2 Update schema tests
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/config/schema.test.ts`:
     - Update test descriptions from "Sisyphus-Junior" to "Paul-Junior"
     - Update test data to use new naming
  2. Commit: "test: update schema tests for paul naming"
  **Must NOT do**: Remove test coverage
  **References**: src/config/schema.test.ts
  **Verification Method**: `bun test schema` passes
  **Definition of Done**:
  - [ ] Tests updated
  - [ ] All tests passing
  - [ ] Commit created

### Phase 4: Update Directory References

- [ ] 4.1 Update boulder-state constants
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/features/boulder-state/constants.ts`:
     - Change `BOULDER_DIR = ".sisyphus"` → `BOULDER_DIR = ".paul"`
     - Update `PROMETHEUS_PLANS_DIR` if it references .sisyphus
  2. Update any other constants in this file
  3. Commit: "refactor: update boulder-state constants to .paul"
  **Must NOT do**: Change functionality
  **References**: src/features/boulder-state/constants.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Constants updated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 4.2 Update path validation functions
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/hooks/paul-orchestrator/index.ts` (after rename):
     - Update `isSisyphusPath` → `isPaulPath` function
     - Update regex from `.sisyphus` to `.paul`
  2. In `src/hooks/planner-md-only/constants.ts`:
     - Update `DRAFT_PATH_PATTERN` and `PLAN_PATH_PATTERN` regexes
  3. In `src/hooks/tdd-enforcement/constants.ts`:
     - Update regex patterns
  4. In `src/hooks/parallel-safety-enforcer/constants.ts`:
     - Update regex patterns
  5. Commit: "refactor: update path validation for .paul directory"
  **Must NOT do**: Break path validation logic
  **References**: Multiple hook constant files
  **Verification Method**: `bun test` passes for affected hooks
  **Definition of Done**:
  - [ ] All path patterns updated
  - [ ] Tests passing
  - [ ] Commit created

- [ ] 4.3 Update agent prompt references
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. Update `.sisyphus/` references in agent prompts:
     - `src/agents/paul-junior.ts` (after rename)
     - `src/agents/prometheus-prompt.ts`
     - `src/agents/solomon.ts`
     - `src/agents/joshua.ts`
     - `src/agents/worker-paul.ts`
     - `src/agents/timothy.ts`
     - `src/agents/ezra.ts`
     - `src/agents/momus.ts`
     - `src/agents/thomas.ts`
  2. Commit: "refactor: update agent prompts to use .paul directory"
  **Must NOT do**: Change agent behavior
  **References**: src/agents/*.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] All agent prompts updated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 4.4 Update shared utilities
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/shared/test-results.ts`:
     - Update path from `.sisyphus/test-results` to `.paul/test-results`
  2. In `src/hooks/hierarchy-enforcer/approval-state.ts`:
     - Update `APPROVAL_FILE` from `.sisyphus/approval_state.json` to `.paul/approval_state.json`
  3. In `src/hooks/ralph-loop/constants.ts`:
     - Update `DEFAULT_STATE_FILE` from `.sisyphus/ralph-loop.local.md` to `.paul/ralph-loop.local.md`
  4. Commit: "refactor: update shared utilities to use .paul directory"
  **Must NOT do**: Change file formats
  **References**: src/shared/test-results.ts, src/hooks/hierarchy-enforcer/approval-state.ts, src/hooks/ralph-loop/constants.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] All utilities updated
  - [ ] Typecheck passes
  - [ ] Commit created

### Phase 5: Update Agent Registry & Exports

- [ ] 5.1 Update agent index exports
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/agents/index.ts`:
     - Remove `import { sisyphusAgent } from "./sisyphus"`
     - Remove `Sisyphus: sisyphusAgent` from builtinAgents
     - Remove `"orchestrator-sisyphus": orchestratorSisyphusAgent` (keep Paul)
     - Update import from `./sisyphus-junior` to `./paul-junior`
     - Add `"Paul-Junior": paulJuniorAgent` to builtinAgents
     - Update type export from `./sisyphus-prompt-builder` (may need to move types)
  2. Commit: "refactor: update agent registry for paul naming"
  **Must NOT do**: Remove Paul agent
  **References**: src/agents/index.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Imports updated
  - [ ] Exports updated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 5.2 Update paul.ts exports
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/agents/paul.ts`:
     - Remove `orchestratorSisyphusAgent` export (keep only `paulAgent`)
     - Update `createOrchestratorSisyphusAgent` → `createPaulAgent` (keep as primary)
     - Remove references to sisyphus-prompt-builder types (move if needed)
  2. Commit: "refactor: consolidate paul.ts exports"
  **Must NOT do**: Change Paul's functionality
  **References**: src/agents/paul.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Exports consolidated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 5.3 Update agent utils
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/agents/utils.ts`:
     - Remove `createSisyphusAgent` import and usage
     - Update `createSisyphusJuniorAgentWithOverrides` → `createPaulJuniorAgentWithOverrides`
     - Remove Sisyphus from agent creation logic
     - Update `"Sisyphus-Junior"` references to `"Paul-Junior"`
  2. Commit: "refactor: update agent utils for paul naming"
  **Must NOT do**: Break agent creation
  **References**: src/agents/utils.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Utils updated
  - [ ] Typecheck passes
  - [ ] Commit created

### Phase 5B: Update Tools & Commands

- [ ] 5.4 Update delegate-task tool
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/tools/delegate-task/tools.ts`:
     - Update `SISYPHUS_JUNIOR_AGENT` → `PAUL_JUNIOR_AGENT`
  2. In `src/tools/delegate-task/constants.ts`:
     - Update documentation references
  3. Commit: "refactor: update delegate-task for paul naming"
  **Must NOT do**: Change delegation logic
  **References**: src/tools/delegate-task/
  **Verification Method**: `bun test delegate-task` passes
  **Definition of Done**:
  - [ ] Constants updated
  - [ ] Tests passing
  - [ ] Commit created

- [ ] 5.5 Update builtin-commands
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/features/builtin-commands/commands.ts`:
     - Update `agent: "orchestrator-sisyphus"` → `agent: "Paul"`
  2. In `src/features/builtin-commands/templates/start-work.ts`:
     - Update "Sisyphus work session" references
     - Update `.sisyphus/plans/` → `.paul/plans/`
     - Update "Orchestrator Sisyphus" references
  3. Commit: "refactor: update builtin-commands for paul naming"
  **Must NOT do**: Change command behavior
  **References**: src/features/builtin-commands/
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Commands updated
  - [ ] Templates updated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 5.6 Update CLI files
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/cli/install.ts`:
     - Update `sisyphusModel` variable name
     - Update "Sisyphus" display text
  2. In `src/cli/index.ts`:
     - Update "Sisyphus" references in help text
  3. In `src/cli/config-manager.ts`:
     - Update `agents["Sisyphus"]` references
  4. Commit: "refactor: update CLI for paul naming"
  **Must NOT do**: Break CLI functionality
  **References**: src/cli/
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] CLI files updated
  - [ ] Typecheck passes
  - [ ] Commit created

### Phase 6: Update Hooks

- [ ] 6.1 Update hooks index exports
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/hooks/index.ts`:
     - Update export from `./sisyphus-orchestrator` to `./paul-orchestrator`
     - Rename `createSisyphusOrchestratorHook` → `createPaulOrchestratorHook`
  2. Commit: "refactor: update hooks index for paul naming"
  **Must NOT do**: Remove hook functionality
  **References**: src/hooks/index.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Exports updated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 6.2 Update main index.ts
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/index.ts`:
     - Update import from `createSisyphusOrchestratorHook` to `createPaulOrchestratorHook`
     - Update `isSisyphusEnabled` → `isPaulEnabled` (or remove if not needed)
     - Update hook creation calls
  2. Commit: "refactor: update main index for paul naming"
  **Must NOT do**: Break plugin initialization
  **References**: src/index.ts
  **Verification Method**: `bun run build` passes
  **Definition of Done**:
  - [ ] Main index updated
  - [ ] Build passes
  - [ ] Commit created

- [ ] 6.3 Update hierarchy-enforcer
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/hooks/hierarchy-enforcer/constants.ts`:
     - Update `BYPASS_AGENTS` to remove "Sisyphus"
     - Update category mappings from "Sisyphus-Junior" to "Paul-Junior"
     - Update `ALLOWED_CHILDREN` mappings
  2. In `src/hooks/hierarchy-enforcer/index.ts`:
     - Update agent name checks
  3. Commit: "refactor: update hierarchy-enforcer for paul naming"
  **Must NOT do**: Break hierarchy enforcement
  **References**: src/hooks/hierarchy-enforcer/
  **Verification Method**: `bun test hierarchy-enforcer` passes
  **Definition of Done**:
  - [ ] Constants updated
  - [ ] Index updated
  - [ ] Tests passing
  - [ ] Commit created

- [ ] 6.4 Update auto-update-checker
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/hooks/auto-update-checker/index.ts`:
     - Update toast messages from "Sisyphus" to "Paul" or remove
     - Update `isSisyphusEnabled` → `isPaulEnabled`
  2. In `src/hooks/auto-update-checker/types.ts`:
     - Update `isSisyphusEnabled` → `isPaulEnabled`
  3. Commit: "refactor: update auto-update-checker for paul naming"
  **Must NOT do**: Break update checking
  **References**: src/hooks/auto-update-checker/
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Messages updated
  - [ ] Types updated
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 6.5 Update plugin-handlers
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/plugin-handlers/config-handler.ts`:
     - Update `isSisyphusEnabled` → `isPaulEnabled`
     - Update `sisyphus_agent` config references → `paul_agent`
     - Update agent name references
  2. Commit: "refactor: update plugin-handlers for paul naming"
  **Must NOT do**: Break config handling
  **References**: src/plugin-handlers/config-handler.ts
  **Verification Method**: `bun run typecheck` passes
  **Definition of Done**:
  - [ ] Config handler updated
  - [ ] Typecheck passes
  - [ ] Commit created

### Phase 7: Remove Branding

- [ ] 7.1 Remove Sisyphus commit branding
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/features/opencode-skill-loader/skill-content.ts`:
     - Remove "Ultraworked with [Sisyphus]" section
     - Remove "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>" section
     - Update commit message templates
  2. In `src/config/schema.ts`:
     - Update `GitMasterConfigSchema` comments to remove Sisyphus references
  3. Commit: "chore: remove sisyphus branding from commits"
  **Must NOT do**: Break git-master skill
  **References**: src/features/opencode-skill-loader/skill-content.ts
  **Verification Method**: `bun test skill-content` passes
  **Definition of Done**:
  - [ ] Branding removed
  - [ ] Tests passing
  - [ ] Commit created

### Phase 8: Add Migration Mappings

- [ ] 8.1 Update migration mappings
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. In `src/shared/migration.ts`:
     - Add `Sisyphus` → `Paul` mapping
     - Add `Sisyphus-Junior` → `Paul-Junior` mapping
     - Add `sisyphus_agent` → `paul_agent` config migration
     - Keep existing `omo` → `Sisyphus` mappings (chain: omo → Sisyphus → Paul)
  2. Commit: "feat: add sisyphus to paul migration mappings"
  **Must NOT do**: Break existing migrations
  **References**: src/shared/migration.ts
  **Verification Method**: `bun test migration` passes
  **Definition of Done**:
  - [ ] Mappings added
  - [ ] Tests passing
  - [ ] Commit created

### Phase 9: Update Tests

- [ ] 9.1 Update remaining test files
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. Search for remaining "Sisyphus" references in test files
  2. Update test descriptions and assertions
  3. Update mock data and fixtures
  4. Files to check:
     - `src/tools/delegate-task/tools.test.ts`
     - `src/hooks/keyword-detector/index.test.ts`
     - `src/hooks/start-work/index.test.ts`
     - `src/hooks/planner-md-only/index.test.ts`
     - `src/features/boulder-state/storage.test.ts`
     - `src/features/background-agent/manager.test.ts`
     - `src/features/task-toast-manager/manager.test.ts` (8 refs to Sisyphus-Junior)
     - `src/features/claude-code-session-state/state.test.ts` (3 refs)
     - `src/features/context-injector/injector.test.ts` (1 ref)
     - `src/shared/migration.test.ts`
     - `src/agents/utils.test.ts`
  5. Commit: "test: update remaining tests for paul naming"
  **Must NOT do**: Reduce test coverage
  **References**: All test files
  **Verification Method**: `bun test` all tests pass
  **Definition of Done**:
  - [ ] All test files updated
  - [ ] All tests passing
  - [ ] Commit created

### Phase 10: Final Verification

- [ ] 10.1 Run full test suite
  **Agent Hint**: Joshua (Test Runner)
  **What to do**:
  1. Run `bun test` - all tests must pass
  2. Run `bun run typecheck` - no type errors
  3. Run `bun run build` - build succeeds
  4. Search for any remaining "sisyphus" references (case-insensitive)
  5. Document any intentional remaining references (e.g., migration mappings)
  **Must NOT do**: Skip any verification step
  **References**: Entire codebase
  **Verification Method**: All commands succeed, no orphaned references
  **Definition of Done**:
  - [ ] All tests pass
  - [ ] Typecheck passes
  - [ ] Build succeeds
  - [ ] No orphaned Sisyphus references
  - [ ] Final commit: "chore: complete sisyphus to paul migration"

- [ ] 10.2 Update AGENTS.md documentation
  **Agent Hint**: document-writer
  **What to do**:
  1. Update AGENTS.md to reflect new naming:
     - Remove Sisyphus from agent table
     - Update Paul-Junior entry
     - Update directory references
  2. Commit: "docs: update AGENTS.md for paul naming"
  **Must NOT do**: Remove important documentation
  **References**: AGENTS.md
  **Verification Method**: Documentation is accurate
  **Definition of Done**:
  - [ ] AGENTS.md updated
  - [ ] Commit created
