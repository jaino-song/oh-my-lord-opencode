# Bug Fixes: Migration Issues

## Context

### Original Request
Fix all 5 bugs discovered during the Sisyphus→Paul migration.

### Key Research Findings
- Bug #1: Case-sensitive agent name lookup in hierarchy-enforcer
- Bug #2: TODO approval blocks even for completed tasks
- Bug #3a: Think-mode HIGH_VARIANT_MAP gutted in refactor
- Bug #3b: Skill-content watermark injection incomplete
- Bug #3c: Paul-junior tool safety permission merging broken

## Objectives & Deliverables

### Core Objective
Fix all identified bugs so that tests pass and the system works correctly.

### Concrete Deliverables
1. `src/hooks/hierarchy-enforcer/index.ts` - Fixed agent name matching
2. `src/hooks/hierarchy-enforcer/index.ts` - Extended TODO approval workarounds
3. `src/hooks/think-mode/switcher.ts` - Restored HIGH_VARIANT_MAP
4. `src/features/opencode-skill-loader/skill-content.ts` - Fixed watermark injection
5. `src/agents/paul-junior.ts` - Fixed tool safety permissions

### Must Have
- All 5 bugs fixed
- Tests pass (reduce from 31 failures to near 0)
- No regressions

### Must NOT Have
- Breaking changes to existing functionality
- Removal of backward compatibility

## Task Flow

```
Bug #1 (hierarchy-enforcer name matching)
    ↓
Bug #2 (TODO approval workarounds)
    ↓
Bug #3a (think-mode HIGH_VARIANT_MAP) [HIGH PRIORITY - 25 test failures]
    ↓
Bug #3b (skill-content watermark) [4 test failures]
    ↓
Bug #3c (paul-junior permissions) [2 test failures]
    ↓
Final verification: bun test
```

## Parallelization

All bugs can be fixed in parallel as they're in different files.

## TODOs

- [ ] 1. Fix hierarchy-enforcer agent name matching
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. Open `src/hooks/hierarchy-enforcer/index.ts`
  2. Around line 139, change:
     ```typescript
     const allowedTargets = AGENT_RELATIONSHIPS[currentAgent] || []
     ```
     To:
     ```typescript
     // Case-insensitive lookup for AGENT_RELATIONSHIPS
     const relationshipKey = Object.keys(AGENT_RELATIONSHIPS).find(
       k => k.toLowerCase() === currentAgent.toLowerCase()
     )
     const allowedTargets = relationshipKey ? AGENT_RELATIONSHIPS[relationshipKey] : []
     ```
  3. Around lines 141-144, update the matching logic:
     ```typescript
     const isAllowed = allowedTargets.some(allowed => {
       const normalizedAllowed = normalizeAgentName(allowed)
       return normalizedAllowed === normalizedTarget || 
              normalizedAllowed?.includes(normalizedTarget!) ||
              normalizedTarget?.includes(normalizedAllowed!)
     })
     ```
  **Must NOT do**: Change the AGENT_RELATIONSHIPS data structure
  **References**: src/hooks/hierarchy-enforcer/index.ts, src/hooks/hierarchy-enforcer/constants.ts
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Case-insensitive lookup implemented
  - [ ] Bidirectional partial matching added
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 2. Extend TODO approval workaround patterns
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. Open `src/hooks/hierarchy-enforcer/index.ts`
  2. Find lines 222-227 (existing workaround)
  3. Replace with extended patterns:
     ```typescript
     // Skip approval for tasks marked as done (workaround for approval detection bug)
     // Extended patterns to catch more completion indicators
     if (content.includes("- done") || 
         content.includes("done but") ||
         content.includes("- verified") ||
         content.includes("- complete") ||
         content.includes("[done]") ||
         content.includes("✅") ||
         content.includes("completed in previous") ||
         content.match(/\bdone\s*$/i) ||
         content.match(/\bcomplete\s*$/i)) {
       const shortTask = todo.content.slice(0, 40) + (todo.content.length > 40 ? "..." : "")
       await showToast(client, "✅ Task completed", shortTask, "success", 2000)
       continue
     }
     ```
  **Must NOT do**: Remove existing patterns
  **References**: src/hooks/hierarchy-enforcer/index.ts
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Extended patterns added
  - [ ] Typecheck passes
  - [ ] Commit created

- [ ] 3. Fix think-mode HIGH_VARIANT_MAP regression (25 test failures)
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. Run `bun test think-mode 2>&1 | head -100` to see failures
  2. Read `src/hooks/think-mode/switcher.test.ts` to understand expected mappings
  3. Read `src/hooks/think-mode/index.test.ts` for integration expectations
  4. Open `src/hooks/think-mode/switcher.ts`
  5. Find the HIGH_VARIANT_MAP (or equivalent) and restore all model mappings
  6. Expected mappings to add:
     - Claude: claude-3-5-sonnet, claude-3-opus, claude-sonnet-4, etc.
     - GPT: gpt-4, gpt-4-turbo, gpt-5, gpt-5.1, gpt-5.2
     - Gemini: gemini-pro, gemini-flash, gemini-3-pro
     - Support version dots (5.2) and hyphens (5-2)
     - Support prefixes: vertex_ai/, openai/, github-copilot/
  **Must NOT do**: Change the function signatures
  **References**: src/hooks/think-mode/switcher.ts, src/hooks/think-mode/*.test.ts
  **Verification Method**: `bun test think-mode`
  **Definition of Done**:
  - [ ] HIGH_VARIANT_MAP restored with all model mappings
  - [ ] Tests pass (target: 0 failures)
  - [ ] Commit created

- [ ] 4. Fix skill-content watermark injection (4 test failures)
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. Run `bun test skill-content 2>&1 | head -50` to see failures
  2. Read `src/features/opencode-skill-loader/skill-content.test.ts`
  3. Read `src/features/opencode-skill-loader/skill-content.ts`
  4. Fix the watermark injection logic to match test expectations:
     - Inject footer when enabled (default: true)
     - Inject co-author when enabled (default: true)
     - Handle config being undefined (use defaults)
  **Must NOT do**: Change the config schema
  **References**: src/features/opencode-skill-loader/skill-content.ts
  **Verification Method**: `bun test skill-content`
  **Definition of Done**:
  - [ ] Watermark injection logic fixed
  - [ ] Tests pass (target: 0 failures)
  - [ ] Commit created

- [ ] 5. Fix paul-junior tool safety permissions (2 test failures)
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  1. Run `bun test paul-junior 2>&1 | head -50` to see failures
  2. Read `src/agents/paul-junior.test.ts` to understand expected behavior
  3. Read `src/agents/paul-junior.ts` and `src/shared/permission-compat.ts`
  4. Fix the permission merging so that:
     - `task` and `delegate_task` remain BLOCKED after overrides
     - `call_omo_agent` is ALLOWED
  5. The issue is likely in how permissions are merged in `createPaulJuniorAgentWithOverrides`
  **Must NOT do**: Change the blocked tools list
  **References**: src/agents/paul-junior.ts, src/shared/permission-compat.ts
  **Verification Method**: `bun test paul-junior`
  **Definition of Done**:
  - [ ] Permission merging fixed
  - [ ] Tests pass (target: 0 failures)
  - [ ] Commit created

- [ ] 6. Final verification
  **Agent Hint**: Joshua (Test Runner)
  **What to do**:
  1. Run `bun test` - all tests should pass (or have minimal unrelated failures)
  2. Run `bun run typecheck` - no type errors
  3. Run `bun run build` - build succeeds
  **Must NOT do**: Skip verification
  **References**: Entire codebase
  **Verification Method**: All commands succeed
  **Definition of Done**:
  - [ ] All tests pass
  - [ ] Typecheck passes
  - [ ] Build succeeds
  - [ ] Final commit: "fix: resolve all migration-related bugs"
