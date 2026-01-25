# Draft: Sisyphus to Paul Migration

## Requirements & Decisions

### User Decisions (Confirmed)
1. **Target Naming**: Consolidate to Paul
   - Sisyphus → Paul (already exists as alias)
   - Sisyphus-Junior → Paul-Junior (new name)
   - orchestrator-sisyphus → Paul (consolidate)
   
2. **Directory Migration**: .sisyphus/ → .paul/
   - Migrate all subdirectories: plans/, drafts/, notepads/, test-results/
   - Migrate state files: boulder.json, approval_state.json, ralph-loop.local.md
   
3. **Commit Branding**: Remove entirely
   - Remove "Ultraworked with Sisyphus" footer
   - Remove "Co-authored-by: Sisyphus" trailer

## Research Findings

### Files to Delete (Sisyphus-specific)
1. `src/agents/sisyphus.ts` (641 lines) - Legacy orchestrator, replaced by Paul
2. `src/agents/sisyphus-prompt-builder.ts` (360 lines) - Only used by sisyphus.ts
3. `src/hooks/sisyphus-orchestrator/` directory - Rename to paul-orchestrator/
4. `.github/assets/sisyphus.png` - Sisyphus logo
5. `.github/assets/sisyphuslabs.png` - SisyphusLabs logo
6. `.github/assets/orchestrator-sisyphus.png` - Orchestrator diagram
7. `.github/workflows/sisyphus-agent.yml` - Workflow file

### Files to Rename
1. `src/agents/sisyphus-junior.ts` → `src/agents/paul-junior.ts`
2. `src/agents/sisyphus-junior.test.ts` → `src/agents/paul-junior.test.ts`
3. `src/hooks/sisyphus-orchestrator/` → `src/hooks/paul-orchestrator/`

### Schema/Config Changes (src/config/schema.ts)
- `SisyphusAgentConfigSchema` → `PaulAgentConfigSchema`
- `SisyphusAgentConfig` type → `PaulAgentConfig`
- `sisyphus_agent` config key → `paul_agent`
- Remove "Sisyphus" from BuiltinAgentNameSchema
- Remove "Sisyphus-Junior" from OverridableAgentNameSchema (add "Paul-Junior")
- Remove "orchestrator-sisyphus" (keep only "Paul")
- Rename "sisyphus-orchestrator" hook → "paul-orchestrator"

### Agent Registry Changes (src/agents/index.ts)
- Remove `Sisyphus: sisyphusAgent` export
- Remove `"orchestrator-sisyphus": orchestratorSisyphusAgent` (keep Paul)
- Add `"Paul-Junior": paulJuniorAgent`

### Directory Path Changes (46+ files)
All references to `.sisyphus/` must change to `.paul/`:
- `.sisyphus/plans/` → `.paul/plans/`
- `.sisyphus/drafts/` → `.paul/drafts/`
- `.sisyphus/notepads/` → `.paul/notepads/`
- `.sisyphus/test-results/` → `.paul/test-results/`
- `.sisyphus/boulder.json` → `.paul/boulder.json`
- `.sisyphus/approval_state.json` → `.paul/approval_state.json`
- `.sisyphus/ralph-loop.local.md` → `.paul/ralph-loop.local.md`

### Branding Changes
- `src/features/opencode-skill-loader/skill-content.ts`:
  - Remove "Ultraworked with [Sisyphus]" section
  - Remove "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>" section
- `src/config/schema.ts`:
  - `GitMasterConfigSchema.commit_footer` - change default behavior
  - `GitMasterConfigSchema.include_co_authored_by` - change default behavior

### Migration Mappings (src/shared/migration.ts)
- Add new mappings: `Sisyphus` → `Paul`, `Sisyphus-Junior` → `Paul-Junior`
- Add config migration: `sisyphus_agent` → `paul_agent`
- Keep backward compatibility for existing user configs

## Scope Boundaries

### IN SCOPE
- Delete sisyphus.ts and sisyphus-prompt-builder.ts
- Rename sisyphus-junior.ts → paul-junior.ts
- Rename sisyphus-orchestrator hook → paul-orchestrator
- Update all .sisyphus/ references to .paul/
- Update schema/config for Paul naming
- Remove Sisyphus branding from commits
- Add migration mappings for backward compatibility
- Update all tests
- Delete Sisyphus image assets

### OUT OF SCOPE
- Changing Paul's functionality or prompt
- Modifying the TDD workflow
- Changing the three-domain architecture
- Updating external documentation (README, etc.) - separate task

## Open Questions
1. Should we keep `orchestrator-sisyphus` as a deprecated alias for Paul? (Recommend: No, clean break)
2. Should migration auto-rename user's .sisyphus/ directories? (Recommend: No, document manual migration)

## Impact Analysis

### High Impact (Core Functionality)
- 74 files with 560+ Sisyphus references
- Agent registry and exports
- Config schema and types
- Hook system

### Medium Impact (Tests)
- 15+ test files with Sisyphus references
- Test fixtures and mocks

### Low Impact (Documentation/Assets)
- 3 image files to delete
- 1 workflow file to delete/rename
- Internal documentation strings
