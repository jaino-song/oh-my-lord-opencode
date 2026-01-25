# Legacy Naming Cleanup: oh-my-opencode → oh-my-lord-opencode + omo → paul

## Context

### Original Request
Full cleanup of legacy naming references as part of the Sisyphus→Paul migration continuation:
1. Rename `oh-my-opencode` → `oh-my-lord-opencode` (58 matches in 19 files)
2. Rename `omo` abbreviation → `paul` (22 matches in 11 files)

### Interview Summary
- User confirmed "Full cleanup (Recommended)" option
- This is a continuation of the completed Sisyphus→Paul migration (26 commits)
- Branch: `feature/sisyphus-to-paul-migration`

### Key Research Findings
- **58 matches** of `oh-my-opencode` in 19 files (package name, CLI messages, config paths)
- **22 matches** of `omo` in 11 files (tool names, session prefixes, XML tags)
- **592 matches** of `opencode` - these are **legitimate** SDK imports and platform references (DO NOT CHANGE)

## Objectives & Deliverables

### Core Objective
Complete the naming migration by replacing all legacy `oh-my-opencode` and `omo` references with the new naming convention.

### Concrete Deliverables
1. All `oh-my-opencode` strings → `oh-my-lord-opencode`
2. `src/tools/call-omo-agent/` directory → `src/tools/call-paul-agent/`
3. All `omo-session`, `omo-dev` → `paul-session`, `paul-dev`
4. All `OMO_SESSION_PREFIX` → `PAUL_SESSION_PREFIX`
5. All `<omo-env>` → `<paul-env>`
6. All `createCallOmoAgent` → `createCallPaulAgent`
7. All invalid agent model names fixed:
   - `openai/gpt-5.2-high` → `openai/gpt-5.2` (nathan.ts)
   - `google/gemini-3-*` → `google/antigravity-gemini-3-*` (timothy, frontend-ui-ux-engineer, multimodal-looker, document-writer)
   - Note: `openai/gpt-5.2-codex` models are VALID and unchanged
8. All tests passing (1333+ tests)

### Must Have
- All string replacements complete
- Directory rename complete
- All exports updated
- All tests passing
- Build succeeds

### Must NOT Have
- ❌ DO NOT change `@opencode-ai/plugin` or `@opencode-ai/sdk` imports
- ❌ DO NOT change `opencode.json` platform config file references
- ❌ DO NOT change `~/.config/opencode/` directory paths
- ❌ DO NOT change `opencode/big-pickle` or other model names
- ❌ DO NOT change GitHub links to `sst/opencode` repository
- ❌ DO NOT change `opencode-antigravity-auth` or `opencode-notifier` plugin names (external packages)

## Task Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Rename call-omo-agent directory → call-paul-agent            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Update exports in src/tools/index.ts + src/index.ts          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Replace omo → paul in constants/session names                │
│    (OMO_SESSION_PREFIX, omo-session, omo-dev, <omo-env>)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Replace oh-my-opencode → oh-my-lord-opencode                 │
│    (PACKAGE_NAME, CLI messages, config paths, comments)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Update migration mappings (add backward compat)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Fix invalid agent model names                                │
│    (gpt-5.2-high → gpt-5.2, gemini-* → antigravity-gemini-*)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Run tests + typecheck + build                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Commit changes                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Parallelization

**Group A (Can run in parallel):**
- Task 3: omo → paul constants
- Task 4: oh-my-opencode → oh-my-lord-opencode strings
- Task 6: Fix agent model names

**Sequential:**
- Task 1 → Task 2 (directory rename before export update)
- Task 5 after Tasks 3-4 (migration mappings depend on knowing all changes)
- Task 7-8 after all changes complete

## TODOs

> Paul decides agent assignment.
> Do NOT mix UI/layout work with testing/verification in the same TODO.
> Include a short Agent Hint line.

### TODO 1: Rename call-omo-agent directory to call-paul-agent

**Agent Hint**: Paul-Junior (git operations)
**What to do**:
1. `git mv src/tools/call-omo-agent src/tools/call-paul-agent`
2. Inside the renamed directory, rename any files if needed (check for `omo` in filenames)
3. Update all internal imports within the directory

**Must NOT do**:
- Do not delete the directory and recreate (use git mv to preserve history)

**References**:
- `src/tools/call-omo-agent/` (current location)
- `src/tools/call-omo-agent/tools.ts`
- `src/tools/call-omo-agent/index.ts`

**Verification Method**: `ls -la src/tools/call-paul-agent/ && git status`

**Definition of Done**:
- [ ] Directory renamed via git mv
- [ ] No `call-omo-agent` directory exists
- [ ] `call-paul-agent` directory exists with all files

---

### TODO 2: Update tool exports and usages

**Agent Hint**: Paul-Junior
**What to do**:
1. `src/tools/index.ts` (line 46):
   - Change `export { createCallOmoAgent } from "./call-omo-agent"` → `export { createCallPaulAgent } from "./call-paul-agent"`

2. `src/index.ts`:
   - Line 66: `createCallOmoAgent,` → `createCallPaulAgent,`
   - Line 267: `const callOmoAgent = createCallOmoAgent(ctx, backgroundManager);` → `const callPaulAgent = createCallPaulAgent(ctx, backgroundManager);`
   - Update any usage of `callOmoAgent` variable to `callPaulAgent`

3. `src/tools/call-paul-agent/tools.ts` (after directory rename):
   - Rename function `createCallOmoAgent` → `createCallPaulAgent`

4. `src/tools/call-paul-agent/types.ts`:
   - `CallOmoAgentArgs` → `CallPaulAgentArgs`
   - `CallOmoAgentSyncResult` → `CallPaulAgentSyncResult`

5. `src/tools/call-paul-agent/index.ts`:
   - Update export to `createCallPaulAgent`

**Must NOT do**:
- Do not change unrelated exports

**References**:
- `src/tools/index.ts` (line 46)
- `src/index.ts` (lines 66, 267)
- `src/tools/call-omo-agent/tools.ts`
- `src/tools/call-omo-agent/types.ts`
- `src/tools/call-omo-agent/index.ts`

**Verification Method**: `bun run typecheck`

**Definition of Done**:
- [ ] Export path updated to `./call-paul-agent`
- [ ] Export name updated to `createCallPaulAgent`
- [ ] All type names updated (CallOmoAgentArgs → CallPaulAgentArgs)
- [ ] src/index.ts usages updated
- [ ] Typecheck passes

---

### TODO 3: Replace omo → paul in constants and session names

**Agent Hint**: Paul-Junior
**What to do**:
1. `src/hooks/interactive-bash-session/constants.ts`:
   - `OMO_SESSION_PREFIX = "omo-"` → `PAUL_SESSION_PREFIX = "paul-"`
   - Update the system reminder message

2. `src/hooks/interactive-bash-session/index.ts`:
   - Update comments referencing `omo-x`
   - Update any usage of `OMO_SESSION_PREFIX`

3. `src/tools/interactive-bash/tools.ts`:
   - `sessionName = "omo-session"` → `sessionName = "paul-session"`

4. `src/tools/interactive-bash/constants.ts`:
   - `omo-dev` → `paul-dev` in examples

5. `src/agents/utils.ts`:
   - `<omo-env>` → `<paul-env>`
   - `</omo-env>` → `</paul-env>`

6. `src/tools/call-paul-agent/tools.ts` (after rename):
   - Rename function `createCallOmoAgent` → `createCallPaulAgent`
   - Update any internal references

7. Update test files:
   - `src/shared/external-plugin-detector.test.ts`: `omo-test-` → `paul-test-`
   - `src/tools/session-manager/storage.test.ts`: `omo-test-session-manager` → `paul-test-session-manager`

**Must NOT do**:
- Do not change `src/shared/migration.ts` mappings (those are intentional backward compat)
- Do not change `src/shared/migration.test.ts` test assertions for old names

**References**:
- `src/hooks/interactive-bash-session/constants.ts`
- `src/hooks/interactive-bash-session/index.ts`
- `src/tools/interactive-bash/tools.ts`
- `src/tools/interactive-bash/constants.ts`
- `src/agents/utils.ts`

**Verification Method**: `grep -r "\bomo\b" src --include="*.ts" | grep -v migration | grep -v test`

**Definition of Done**:
- [ ] All `omo-session` → `paul-session`
- [ ] All `omo-dev` → `paul-dev`
- [ ] All `OMO_SESSION_PREFIX` → `PAUL_SESSION_PREFIX`
- [ ] All `<omo-env>` → `<paul-env>`
- [ ] Function renamed to `createCallPaulAgent`
- [ ] Only migration.ts and its tests retain `omo` references

---

### TODO 4: Replace oh-my-opencode → oh-my-lord-opencode

**Agent Hint**: Paul-Junior
**What to do**:
1. `src/cli/config-manager.ts`:
   - `PACKAGE_NAME = "oh-my-opencode"` → `PACKAGE_NAME = "oh-my-lord-opencode"`
   - Schema URL: `oh-my-opencode/master/assets/oh-my-opencode.schema.json` → `oh-my-lord-opencode/master/assets/oh-my-lord-opencode.schema.json`

2. `src/cli/install.ts`:
   - All CLI messages: "Adding oh-my-opencode plugin..." → "Adding oh-my-lord-opencode plugin..."
   - GitHub star link: `code-yeongyu/oh-my-opencode` → `jaino-song/oh-my-lord-opencode`

3. `src/cli/doctor/checks/*.ts`:
   - "Run: bunx oh-my-opencode install" → "Run: bunx oh-my-lord-opencode install"

4. `src/cli/get-local-version/formatter.ts`:
   - "oh-my-opencode Version Information" → "oh-my-lord-opencode Version Information"
   - "bun update oh-my-opencode" → "bun update oh-my-lord-opencode"

5. `src/shared/external-plugin-detector.ts`:
   - All conflict warning messages

6. `src/shared/system-directive.ts`:
   - Comment references

7. `src/tools/lsp/config.ts`:
   - Config file path references (but keep `oh-my-lord-opencode.json` as the actual filename)

8. `src/tools/lsp/utils.ts`:
   - Error message about configuring LSP

9. `src/features/claude-code-plugin-loader/types.ts`:
   - Comment reference

10. Update test files with assertions about package name

**Must NOT do**:
- Do not change `@opencode-ai/plugin` imports
- Do not change `opencode.json` references (platform config)
- Do not change `~/.config/opencode/` paths
- Do not change external plugin names (`opencode-notifier`, `opencode-antigravity-auth`)

**References**:
- All 19 files with `oh-my-opencode` matches

**Verification Method**: `grep -r "oh-my-opencode" src --include="*.ts" | wc -l` (should be 0)

**Definition of Done**:
- [ ] All `oh-my-opencode` → `oh-my-lord-opencode`
- [ ] GitHub repo links updated
- [ ] Schema URL updated
- [ ] No `oh-my-opencode` strings remain (except in migration backward compat if any)

---

### TODO 5: Add backward compatibility mappings

**Agent Hint**: Paul-Junior
**What to do**:
1. `src/shared/migration.ts`:
   - Add mapping for `call-omo-agent` → `call-paul-agent` if tool name migration is needed
   - Verify existing `omo: "Paul"` mapping is correct

2. Ensure old config files with `oh-my-opencode` references still work (if applicable)

**Must NOT do**:
- Do not remove existing backward compat mappings

**References**:
- `src/shared/migration.ts`
- `src/shared/migration.test.ts`

**Verification Method**: `bun test migration`

**Definition of Done**:
- [ ] Migration mappings updated if needed
- [ ] Migration tests pass

---

### TODO 6: Fix invalid agent model names

**Agent Hint**: Paul-Junior
**What to do**:
Fix invalid model name formats in agent default configurations:

**Background on GPT-5.2 models:**
- GPT-5.2 uses `reasoningEffort` parameter instead of model suffixes
- Valid: `openai/gpt-5.2` or `openai/gpt-5.2-codex` + `reasoningEffort: "low"|"medium"|"high"`
- Invalid: `openai/gpt-5.2-high` (the `-high` suffix doesn't exist)

1. **OpenAI models** - Fix invalid `-high` suffix:
   - `src/agents/nathan.ts` line 28: `openai/gpt-5.2-high` → `openai/gpt-5.2`
   - Note: nathan.ts already has `reasoningEffort: "high"` set correctly on line 279

2. **Gemini models** - Use `antigravity-` prefix:
   - `src/agents/timothy.ts`: `google/gemini-3-pro-high` → `google/antigravity-gemini-3-pro-high`
   - `src/agents/frontend-ui-ux-engineer.ts`: `google/gemini-3-pro-preview` → `google/antigravity-gemini-3-pro-high`
   - `src/agents/multimodal-looker.ts`: `google/gemini-3-flash-preview` → `google/antigravity-gemini-3-flash`
   - `src/agents/document-writer.ts`: `google/gemini-3-flash-preview` → `google/antigravity-gemini-3-flash`

3. **Update test files** with new model names:
   - `src/agents/nathan.test.ts`: Update assertions from `openai/gpt-5.2-high` to `openai/gpt-5.2`
   - `src/agents/utils.test.ts`: Update assertions for `google/antigravity-gemini-3-pro-high`

**Must NOT do**:
- Do not change `openai/gpt-5.2-codex` models (these are valid)
- Do not change `reasoningEffort` settings (they are already correct)
- Do not change models that are already correct (e.g., `openai/gpt-5.2` in oracle.ts, ezra.ts)

**References**:
- `src/cli/config-manager.ts` lines 324-348 (correct model format examples)
- GPT-5.2 reasoningEffort: "low" | "medium" | "high" (controls thinking depth)

**Verification Method**: `bun test nathan timothy frontend-ui-ux-engineer utils`

**Definition of Done**:
- [ ] `gpt-5.2-high` → `gpt-5.2` (nathan.ts only - reasoningEffort already set)
- [ ] `gemini-3-pro-high` → `antigravity-gemini-3-pro-high`
- [ ] `gemini-3-pro-preview` → `antigravity-gemini-3-pro-high`
- [ ] `gemini-3-flash-preview` → `antigravity-gemini-3-flash`
- [ ] `gpt-5.2-codex` models unchanged (solomon, peter, john, thomas, elijah)
- [ ] Related tests updated and passing

---

### TODO 7: Run full test suite and build

**Agent Hint**: Joshua (Test Runner)
**What to do**:
1. Run `bun test` - all 1333+ tests should pass
2. Run `bun run typecheck` - no type errors
3. Run `bun run build` - build succeeds

**Must NOT do**:
- Do not skip failing tests
- Do not modify tests to make them pass (fix the source code instead)

**References**:
- `package.json` scripts

**Verification Method**: 
```bash
bun test && bun run typecheck && bun run build
```

**Definition of Done**:
- [ ] All tests pass (1333+)
- [ ] Typecheck clean
- [ ] Build succeeds

---

### TODO 8: Commit all changes

**Agent Hint**: git-master
**What to do**:
1. Stage all changes: `git add -A`
2. Commit with message: `refactor: complete legacy naming cleanup and fix agent model names`
3. Verify commit: `git log -1 --stat`

**Must NOT do**:
- Do not push (user will decide when to push)
- Do not amend previous commits

**References**:
- Git history on `feature/sisyphus-to-paul-migration` branch

**Verification Method**: `git status && git log -1`

**Definition of Done**:
- [ ] All changes committed
- [ ] Commit message follows convention
- [ ] Working tree clean

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking SDK imports | Low | High | Explicit guardrails: DO NOT change `@opencode-ai/*` |
| Missing a reference | Medium | Low | Grep verification after each task |
| Test failures | Medium | Medium | Run full test suite before commit |
| Breaking backward compat | Low | Medium | Keep migration.ts mappings |

## Notes

- This is a **mechanical refactoring** task - no business logic changes
- All changes are string replacements and directory renames
- The migration.ts file intentionally keeps old names for backward compatibility
- External plugin names (`opencode-notifier`, `opencode-antigravity-auth`) are NOT ours to rename
