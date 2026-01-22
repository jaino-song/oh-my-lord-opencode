# Migration Plan: oh-my-lord-opencode → Native Claude Code

## Executive Summary

**Goal**: Migrate Paul ecosystem from custom TypeScript-based agents to native Claude Code plugins architecture for **83%+ token reduction**.

**Scope**: Paul ecosystem only (Paul, planner-paul, worker-paul, and related agents)
**Out of Scope**: Legacy agents (Sisyphus, metis, momus, thomas, oracle, ezra, etc.)

**Branch**: `feature/native-claude-code-migration`

**Status**: Phase 1 COMPLETE

---

## Scope Definition

### IN SCOPE (Active Paul Ecosystem)

| Current Agent | Native Equivalent | Status |
|---------------|-------------------|--------|
| `Paul` | `executor.md` | ✅ Created |
| `planner-paul` | `planner.md` | ✅ Created |
| `worker-paul` | `quick-fix.md` | ✅ Created |
| `Sisyphus-Junior` | `backend-impl.md` | ✅ Created |
| `frontend-ui-ux-engineer` | `frontend-impl.md` | ✅ Created |
| `Joshua` | `test-runner.md` | ✅ Created |
| `Peter` | `unit-test-writer.md` | ✅ Created |
| `John` | `e2e-test-writer.md` | ✅ Created |
| `Solomon` | `tdd-planner.md` | ✅ Created |
| `Timothy` | `plan-reviewer.md` | ✅ Created |
| `Nathan` | `request-analyzer.md` | ✅ Created |
| `Elijah` | `deep-reasoning.md` | ✅ Created |

### OUT OF SCOPE (Legacy - Ignored)

- `Sisyphus` (legacy orchestrator)
- `metis`, `momus`, `thomas`, `oracle` (unused)
- `ezra`, `document-writer`, `multimodal-looker` (unused)
- `jest-test-runner` (superseded by Joshua)
- `librarian`, `git-master`, `explore` (use native tools)

---

## Current Progress

### Phase 1: Foundation ✅ COMPLETE

Created native structure in `.claude/`:

```
.claude/
├── agents/
│   ├── executor.md          ✅ (~80 lines, ~600 tokens)
│   ├── planner.md           ✅ (~70 lines, ~500 tokens)
│   ├── quick-fix.md         ✅ (~60 lines, ~400 tokens)
│   ├── backend-impl.md      ✅ (~70 lines, ~500 tokens)
│   ├── frontend-impl.md     ✅ (~70 lines, ~500 tokens)
│   ├── test-runner.md       ✅ (~60 lines, ~400 tokens)
│   ├── unit-test-writer.md  ✅ (~70 lines, ~500 tokens)
│   ├── e2e-test-writer.md   ✅ (~70 lines, ~500 tokens)
│   ├── tdd-planner.md       ✅ (~60 lines, ~400 tokens)
│   ├── plan-reviewer.md     ✅ (~60 lines, ~400 tokens)
│   ├── request-analyzer.md  ✅ (~60 lines, ~400 tokens)
│   └── deep-reasoning.md    ✅ (~60 lines, ~400 tokens)
├── hooks/
│   └── hooks.json           ✅ All enforcement hooks defined
├── scripts/
│   ├── hierarchy-check.sh   ✅ Agent validation
│   ├── tdd-check.sh         ✅ TDD phase enforcement
│   ├── planner-restrict.sh  ✅ Planner write restriction
│   ├── executor-restrict.sh ✅ Executor write restriction
│   ├── session-context.sh   ✅ Session start context
│   └── track-test-results.sh✅ Test result tracking
├── skills/
│   ├── tdd-workflow/
│   │   └── SKILL.md         ✅ TDD guidance
│   └── plan-execution/
│       └── SKILL.md         ✅ Plan execution guidance
├── commands/
│   ├── plan.md              ✅ /plan command
│   ├── execute.md           ✅ /execute command
│   └── quick.md             ✅ /quick command
├── state/
│   └── .gitkeep             ✅ Runtime state directory
└── settings.json            ✅ Configuration
```

**Token Comparison (Estimated)**:

| Component | Old (TypeScript) | New (Native) | Savings |
|-----------|-----------------|--------------|---------|
| Paul | 2,500 tokens | 600 tokens | 76% |
| planner-paul | 2,200 tokens | 500 tokens | 77% |
| worker-paul | 1,800 tokens | 400 tokens | 78% |
| All 12 agents | ~14,000 tokens | ~5,500 tokens | **61%** |

---

## Next Phases

### Phase 2: Parallel Testing (Next)

**Goal**: Run native agents alongside TypeScript agents to validate behavior

**Tasks**:
1. [ ] Test `executor` agent delegation flow
2. [ ] Test `planner` agent plan creation
3. [ ] Test `quick-fix` agent for trivial tasks
4. [ ] Verify hierarchy enforcement scripts work
5. [ ] Verify TDD phase tracking works
6. [ ] Compare token consumption

### Phase 3: Hook Migration

**Goal**: Disable TypeScript hooks, use native hooks.json

**Hooks to Disable**:
- `directory-agents-injector` (DELETE - major token savings)
- `directory-readme-injector` (DELETE - major token savings)
- `hierarchy-enforcer` (replaced by hooks.json + script)
- `tdd-enforcement` (replaced by hooks.json + script)
- `planner-md-only` (replaced by hooks.json + script)
- `sisyphus-orchestrator` (replaced by hooks.json + script)

**Hooks to KEEP**:
- `parallel-safety-enforcer` (no native equivalent)
- `edit-error-recovery` (useful, native doesn't have)

### Phase 4: Tool Migration

**Goal**: Remove custom tools, use native equivalents

**Remove**:
- `delegate_task` → native `Task` tool
- `glob` → native `Glob`
- `grep` → native `Grep`
- `look-at` → native `Read`
- `skill` → native `Skill`

**Keep as MCP**:
- `lsp` (valuable for diagnostics)
- `ast-grep` (valuable for refactoring)

### Phase 5: Cleanup

**Goal**: Remove TypeScript agent code, keep only native

**Delete**:
- `src/agents/paul.ts`
- `src/agents/planner-paul.ts`
- `src/agents/worker-paul.ts`
- `src/agents/sisyphus-junior.ts`
- `src/agents/frontend-ui-ux-engineer.ts`
- `src/agents/joshua.ts`
- `src/agents/peter.ts`
- `src/agents/john.ts`
- `src/agents/solomon.ts`
- `src/agents/timothy.ts`
- `src/agents/nathan.ts`
- `src/agents/elijah.ts`

**Keep (Legacy, out of scope)**:
- `src/agents/sisyphus.ts`
- Other legacy agents (not actively used)

---

## Rollback Strategy

This migration is on a separate branch: `feature/native-claude-code-migration`

**To rollback**:
```bash
git checkout dev
```

**To test native system**:
```bash
git checkout feature/native-claude-code-migration
```

---

## Token Impact Summary

| Phase | Status | Savings |
|-------|--------|---------|
| Phase 1 (Foundation) | ✅ COMPLETE | Baseline set |
| Phase 2 (Parallel Test) | 🔄 Next | Verify behavior |
| Phase 3 (Hook Migration) | ⏳ Pending | -60% (no auto-injection) |
| Phase 4 (Tool Migration) | ⏳ Pending | -10% (native tools) |
| Phase 5 (Cleanup) | ⏳ Pending | Final structure |

**Expected Final Savings**: 75-83% token reduction

---

## Files Created

```
.claude/agents/executor.md
.claude/agents/planner.md
.claude/agents/quick-fix.md
.claude/agents/backend-impl.md
.claude/agents/frontend-impl.md
.claude/agents/test-runner.md
.claude/agents/unit-test-writer.md
.claude/agents/e2e-test-writer.md
.claude/agents/tdd-planner.md
.claude/agents/plan-reviewer.md
.claude/agents/request-analyzer.md
.claude/agents/deep-reasoning.md
.claude/hooks/hooks.json
.claude/scripts/hierarchy-check.sh
.claude/scripts/tdd-check.sh
.claude/scripts/planner-restrict.sh
.claude/scripts/executor-restrict.sh
.claude/scripts/session-context.sh
.claude/scripts/track-test-results.sh
.claude/skills/tdd-workflow/SKILL.md
.claude/skills/plan-execution/SKILL.md
.claude/commands/plan.md
.claude/commands/execute.md
.claude/commands/quick.md
.claude/settings.json
.claude/state/.gitkeep
```

---

*Updated: 2026-01-22*
*Branch: feature/native-claude-code-migration*
*Phase 1: COMPLETE*
