# Migration Plan: oh-my-lord-opencode → Native Claude Code

## Executive Summary

**Goal**: Migrate Paul ecosystem from custom TypeScript-based agents to native Claude Code plugins architecture for **83%+ token reduction**.

**Scope**: Paul ecosystem only (Paul, planner-paul, worker-paul, and related agents)
**Out of Scope**: Legacy agents (Sisyphus, metis, momus, thomas, oracle, ezra, etc.)

**Branch**: `feature/native-claude-code-migration`

**Status**: ALL PHASES COMPLETE

---

## Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation - Create .claude/ structure | ✅ COMPLETE |
| Phase 2 | Parallel Testing - Verify native agents | ✅ COMPLETE |
| Phase 3 | Hook Migration - Disable TS hooks | ✅ COMPLETE |
| Phase 4 | Tool Migration - Document tool status | ✅ COMPLETE |
| Phase 5 | Cleanup - Archive/document retired code | ✅ COMPLETE |

---

## Scope Definition

### IN SCOPE (Active Paul Ecosystem)

| Current Agent | Native Equivalent | Status |
|---------------|-------------------|--------|
| `Paul` | `executor.md` | ✅ Created & TS Disabled |
| `planner-paul` | `planner.md` | ✅ Created & TS Disabled |
| `worker-paul` | `quick-fix.md` | ✅ Created & TS Disabled |
| `Sisyphus-Junior` | `backend-impl.md` | ✅ Created & TS Disabled |
| `frontend-ui-ux-engineer` | `frontend-impl.md` | ✅ Created & TS Disabled |
| `Joshua` | `test-runner.md` | ✅ Created & TS Disabled |
| `Peter` | `unit-test-writer.md` | ✅ Created & TS Disabled |
| `John` | `e2e-test-writer.md` | ✅ Created & TS Disabled |
| `Solomon` | `tdd-planner.md` | ✅ Created & TS Disabled |
| `Timothy` | `plan-reviewer.md` | ✅ Created & TS Disabled |
| `Nathan` | `request-analyzer.md` | ✅ Created & TS Disabled |
| `Elijah` | `deep-reasoning.md` | ✅ Created & TS Disabled |

### OUT OF SCOPE (Legacy - Kept As-Is)

- `Sisyphus` (legacy orchestrator)
- `metis`, `momus`, `thomas`, `oracle` (unused)
- `ezra`, `document-writer`, `multimodal-looker` (unused)
- `jest-test-runner` (superseded by Joshua)
- `librarian`, `git-master`, `explore` (use native tools)

---

## What Was Created

### Native Agents (12 files, ~5,500 tokens total)
```
.claude/agents/
├── executor.md          # Replaces Paul (~600 tokens)
├── planner.md           # Replaces planner-paul (~500 tokens)
├── quick-fix.md         # Replaces worker-paul (~400 tokens)
├── backend-impl.md      # Replaces Sisyphus-Junior (~500 tokens)
├── frontend-impl.md     # Replaces frontend-ui-ux-engineer (~500 tokens)
├── test-runner.md       # Replaces Joshua (~400 tokens)
├── unit-test-writer.md  # Replaces Peter (~500 tokens)
├── e2e-test-writer.md   # Replaces John (~500 tokens)
├── tdd-planner.md       # Replaces Solomon (~400 tokens)
├── plan-reviewer.md     # Replaces Timothy (~400 tokens)
├── request-analyzer.md  # Replaces Nathan (~400 tokens)
└── deep-reasoning.md    # Replaces Elijah (~400 tokens)
```

### Enforcement Scripts (6 files)
```
.claude/scripts/
├── hierarchy-check.sh      # Agent hierarchy validation
├── tdd-check.sh           # TDD phase enforcement
├── planner-restrict.sh    # Planner write restrictions
├── executor-restrict.sh   # Executor delegation enforcement
├── session-context.sh     # Session start context
└── track-test-results.sh  # Test result tracking
```

### Skills & Commands
```
.claude/skills/
├── tdd-workflow/SKILL.md
└── plan-execution/SKILL.md

.claude/commands/
├── plan.md
├── execute.md
└── quick.md
```

### Configuration
```
.claude/hooks/hooks.json       # Native hook definitions
.claude/settings.json          # Plugin settings
.opencode/oh-my-lord-opencode.jsonc  # Disabled hooks/agents config
```

---

## What Was Disabled (via .opencode/oh-my-lord-opencode.jsonc)

### Disabled Hooks (Token Savings)
1. `directory-agents-injector` - Saves ~3,000-5,000 tokens/read
2. `directory-readme-injector` - Saves ~3,500-5,500 tokens/read
3. `hierarchy-enforcer` - Replaced by native script
4. `tdd-enforcement` - Replaced by native script
5. `planner-md-only` - Replaced by native script
6. `sisyphus-orchestrator` - Replaced by native script
7. `todo-continuation-enforcer` - Replaced by native SessionStart
8. `compaction-context-injector` - Replaced by native PreCompact
9. `keyword-detector` - Replaced by native agent descriptions

### Disabled Agents
All Paul ecosystem agents disabled in favor of native .claude/agents/

### Kept Hooks (No Native Equivalent)
- `parallel-safety-enforcer` - File locking
- `edit-error-recovery` - Retry failed edits
- `background-notification` - Useful notifications

---

## Token Impact Summary

| Component | Old (TypeScript) | New (Native) | Savings |
|-----------|-----------------|--------------|---------|
| Agent prompts | ~14,000 tokens | ~5,500 tokens | **61%** |
| Auto-injection | ~6,000-10,000/read | 0 | **100%** |
| Enforcement | ~500 tokens inline | 0 (external) | **100%** |
| **Complex task** | ~32,500 tokens | ~5,500 tokens | **83%** |

---

## How to Use

### Test Native System
```bash
git checkout feature/native-claude-code-migration
# Use Claude Code normally - native agents will be used
```

### Rollback to TypeScript System
```bash
git checkout dev
# Original TypeScript agents will be used
```

### Verify Hierarchy Enforcement
```bash
echo "executor" > .claude/state/current-agent.txt
TOOL_INPUT='{"subagent_type": "backend-impl"}' bash .claude/scripts/hierarchy-check.sh
# Expected: ALLOWED: executor -> backend-impl
```

---

## Commits

1. `26a6019` - Phase 1: Foundation (native structure)
2. `3b01957` - Phase 3: Hook Migration (disable TS hooks)
3. `fa78a97` - Phase 4: Tool Migration (documentation)
4. `TBD` - Phase 5: Cleanup (this commit)

---

## Next Steps (Post-Migration)

1. **Production Testing**: Test native agents in real workflows
2. **Token Benchmarking**: Measure actual token consumption
3. **File Cleanup**: Consider deleting TypeScript agent files after validation
4. **MCP Extraction**: Move `lsp` and `ast-grep` to standalone MCP servers

---

*Completed: 2026-01-22*
*Branch: feature/native-claude-code-migration*
*All Phases: COMPLETE*
