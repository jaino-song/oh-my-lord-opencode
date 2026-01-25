# Paul Token Optimization Plan

## Context

Paul (orchestrator) consumes ~35,500 tokens per complex task due to:
- Verbose base prompt (~2.5-3k tokens)
- Auto-injected AGENTS.md/README.md on every file read (~6.5k tokens each)
- Full delegation results returned (~2-5k tokens per delegation)
- Full plan files loaded every turn (~2.5-6k tokens)
- Full skill files loaded per delegation (~500-2k tokens)

**Goal**: Reduce token usage by 60-70% while keeping enforcement rules intact.

## Objectives & Deliverables

### Core Objective
Reduce Paul's per-task token consumption from ~35,500 to ~10,000-12,000 tokens.

### Concrete Deliverables
1. Compressed Paul prompt (~1,500 tokens, down from ~2,500-3,000)
2. Opt-in context loading (lazy AGENTS.md/README.md injection)
3. Summarized delegation outputs by default
4. Plan caching mechanism (load once, reference by ID)
5. Skill summary system (precomputed short versions)
6. Tighter planner-paul TODO format

### Must Have
- All enforcement rules remain functional (TDD, competency, hierarchy)
- Advisory warnings still injected
- Tests pass after changes
- Build succeeds

### Must NOT Have
- Breaking changes to delegation API
- Removal of enforcement hooks
- Changes to agent hierarchy relationships

## Task Flow

```
1. Create feature branch
   ↓
2. Compress Paul prompt (parallel with 3)
3. Update planner-paul TODO template (parallel with 2)
   ↓
4. Implement lazy context loading
   ↓
5. Implement delegation output summarization
   ↓
6. Implement plan caching
   ↓
7. Implement skill summaries
   ↓
8. Run full test suite + build verification
   ↓
9. Update documentation
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3 | Independent files (paul.ts vs planner-paul.ts) |

| Task | Depends On | Reason |
|------|------------|--------|
| 4 | 1 | Needs branch created first |
| 5 | 4 | Build on lazy-load pattern |
| 6 | 4 | Build on caching pattern |
| 7 | 4 | Build on summary pattern |
| 8 | 2-7 | All changes must be complete |
| 9 | 8 | Only document after verified |

## TODOs

> Do NOT mix UI/layout work with testing/verification in the same TODO. Split UI and testing into separate TODOs.

- [ ] 1. Create feature branch

  **What to do**:
  - Create branch `feature/paul-token-optimization` from current HEAD
  - Push branch to remote

  **Must NOT do**:
  - Don't modify any files yet

  **Agent**: git-master

  **Verification**: `git branch --show-current` returns `feature/paul-token-optimization`

  **Definition of Done**:
  - [ ] Branch created locally
  - [ ] Branch pushed to remote

---

- [ ] 2. Compress Paul's base prompt

  **What to do**:
  - Edit `src/agents/paul.ts`
  - Convert verbose prose to terse bullets
  - Keep only essential rules: plan requirement, TDD phases (RED/GREEN), delegation matrix, no direct edits, verification steps
  - Add "See AGENTS.md for full policy" pointer
  - Target: ~1,500 tokens (down from ~2,500-3,000)

  **Must NOT do**:
  - Don't remove enforcement rules
  - Don't change agent name or model
  - Don't modify tool restrictions

  **Agent**: Sisyphus-Junior

  **References**:
  - `src/agents/paul.ts:18-207` - Current ORCHESTRATOR_SISYPHUS_SYSTEM_PROMPT

  **Verification**: 
  - `wc -w src/agents/paul.ts` shows ~40% reduction in word count
  - `bun run typecheck` passes

  **Definition of Done**:
  - [ ] Prompt compressed to ~1,500 tokens
  - [ ] All enforcement rules preserved as bullets
  - [ ] Typecheck passes

---

- [ ] 3. Update planner-paul TODO template

  **What to do**:
  - Edit `src/agents/planner-paul.ts`
  - Add explicit agent hints to TODO template (e.g., "Agent: frontend-ui-ux-engineer")
  - Enforce single-purpose TODOs (no mixed UI/testing/Git)
  - Keep references to paths + one-line intent only
  - Add max plan length guidance (~400 lines)

  **Must NOT do**:
  - Don't change planner's core behavior
  - Don't remove interview mode

  **Agent**: Sisyphus-Junior

  **References**:
  - `src/agents/planner-paul.ts:154-167` - Current TODO template
  - `src/agents/prometheus-prompt.ts:943-980` - Prometheus TODO template

  **Verification**: 
  - `bun run typecheck` passes

  **Definition of Done**:
  - [ ] TODO template includes agent hints
  - [ ] Single-purpose TODO rule documented
  - [ ] Max plan length guidance added
  - [ ] Typecheck passes

---

- [ ] 4. Implement lazy context loading

  **What to do**:
  - Edit `src/hooks/directory-agents-injector/index.ts`
  - Edit `src/hooks/directory-readme-injector/index.ts`
  - Add config option `lazyLoad: boolean` (default: true)
  - When lazyLoad=true: truncate to ~500 tokens with "read full file" pointer
  - When lazyLoad=false: current behavior (full injection)
  - Add helper tool `load_context(type="agents"|"readme", path="...")` in `src/tools/`

  **Must NOT do**:
  - Don't break existing injection for non-Paul agents
  - Don't remove truncation fallback

  **Agent**: Sisyphus-Junior

  **References**:
  - `src/hooks/directory-agents-injector/index.ts:83-111` - processFilePathForInjection
  - `src/hooks/directory-readme-injector/index.ts:78-106` - processFilePathForInjection
  - `src/shared/dynamic-truncator.ts` - existing truncation logic

  **Verification**: 
  - `bun test directory-agents-injector` passes
  - `bun test directory-readme-injector` passes
  - `bun run typecheck` passes

  **Definition of Done**:
  - [ ] lazyLoad config option added
  - [ ] Truncation to ~500 tokens works
  - [ ] load_context helper tool created
  - [ ] Tests pass
  - [ ] Typecheck passes

---

- [ ] 5. Implement delegation output summarization

  **What to do**:
  - Edit `src/tools/delegate-task/tools.ts`
  - Add `summarize: boolean` option (default: true)
  - When summarize=true: return `{status, files_changed, tests, errors, session_id}`
  - When summarize=false: return full output (current behavior)
  - Add "show_full" flag to retrieve full output if needed

  **Must NOT do**:
  - Don't break existing delegation flow
  - Don't remove session_id from output

  **Agent**: Sisyphus-Junior

  **References**:
  - `src/tools/delegate-task/tools.ts:745-752` - Current return format

  **Verification**: 
  - `bun test delegate-task` passes
  - `bun run typecheck` passes

  **Definition of Done**:
  - [ ] summarize option added
  - [ ] Structured summary format implemented
  - [ ] show_full flag works
  - [ ] Tests pass
  - [ ] Typecheck passes

---

- [ ] 6. Implement plan caching

  **What to do**:
  - Create `src/features/plan-cache/index.ts`
  - Load plan once per session, store in memory
  - Provide `getPlanSummary(sessionID)` returning: title, todo list (id + content + status), active todo
  - Provide `getPlanSection(sessionID, todoId)` for detailed section
  - Integrate with Paul's plan reading logic

  **Must NOT do**:
  - Don't modify plan files
  - Don't cache across sessions

  **Agent**: Sisyphus-Junior

  **References**:
  - `src/agents/paul.ts:46-65` - Plan requirement section
  - `.paul/plans/*.md` - Plan file format

  **Verification**: 
  - `bun run typecheck` passes
  - Manual test: Paul loads plan once, subsequent reads use cache

  **Definition of Done**:
  - [ ] Plan cache module created
  - [ ] getPlanSummary implemented
  - [ ] getPlanSection implemented
  - [ ] Typecheck passes

---

- [ ] 7. Implement skill summaries

  **What to do**:
  - Edit `src/features/opencode-skill-loader/skill-content.ts`
  - Add `loadSkillSummary(skillName)` function
  - Generate summaries: first 200-300 tokens + "load full skill" pointer
  - Cache summaries per session
  - Use summaries by default in delegate_task

  **Must NOT do**:
  - Don't remove full skill loading capability
  - Don't break existing skill resolution

  **Agent**: Sisyphus-Junior

  **References**:
  - `src/features/opencode-skill-loader/skill-content.ts` - Current skill loading
  - `src/tools/delegate-task/tools.ts:208-217` - Skill content injection

  **Verification**: 
  - `bun run typecheck` passes
  - Manual test: Skills load as summaries by default

  **Definition of Done**:
  - [ ] loadSkillSummary function created
  - [ ] Summary caching implemented
  - [ ] delegate_task uses summaries by default
  - [ ] Typecheck passes

---

- [ ] 8. Run full test suite and build verification

  **What to do**:
  - Run `bun test` (full suite)
  - Run `bun run typecheck`
  - Run `bun run build`
  - Fix any failures

  **Must NOT do**:
  - Don't skip failing tests
  - Don't ignore build errors

  **Agent**: Joshua (Test Runner)

  **Verification**: 
  - All tests pass
  - Build succeeds
  - No typecheck errors

  **Definition of Done**:
  - [ ] `bun test` passes
  - [ ] `bun run typecheck` passes
  - [ ] `bun run build` succeeds

---

- [ ] 9. Update documentation

  **What to do**:
  - Update `docs/paul-token-consumption-analysis.md` with results
  - Update `AGENTS.md` if prompt changes affect documented behavior
  - Update `docs/recent-changes.md` with optimization summary

  **Must NOT do**:
  - Don't add unnecessary documentation
  - Don't duplicate existing docs

  **Agent**: Sisyphus-Junior

  **Verification**: 
  - Docs reflect actual changes

  **Definition of Done**:
  - [ ] Analysis doc updated with results
  - [ ] AGENTS.md updated if needed
  - [ ] recent-changes.md updated

---

## Expected Impact

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Paul base prompt | 2,500-3,000 | ~1,500 | 40-50% |
| Context injection | 6,500/file | ~500/file | 92% |
| Delegation output | 2,000-5,000 | ~200 | 90-96% |
| Plan loading | 2,500-6,000 | ~500 (cached) | 80-92% |
| Skill loading | 500-2,000 | ~250 | 50-88% |
| **Total per task** | ~35,500 | ~10,000-12,000 | **66-72%** |

## Verification Commands

```bash
# After all changes
bun test
bun run typecheck
bun run build

# Token estimation (manual)
wc -w src/agents/paul.ts  # Should be ~40% less
```
