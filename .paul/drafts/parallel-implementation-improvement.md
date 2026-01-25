# Draft: Parallel Implementation Improvement for Paul

## Summary
Two improvements identified:
1. Enable parallel Sisyphus-Junior execution for independent tasks
2. Fix loophole: Allow planners to call Elijah (Deep Reasoning Advisor)

---

## Issue 1: Parallel Implementation Support

### Problem
Paul only parallelizes research (explore/librarian). Implementation tasks are always sequential, even when independent.

### Analysis Results

| Risk Area | Severity | Finding |
|-----------|----------|---------|
| File Locking | HIGH | No file-level locking exists |
| Concurrency Limits | MEDIUM | Default: 5 per model, configurable |
| Cross-file Verification | HIGH | lsp_diagnostics is single-file only |
| Rollback | CRITICAL | No rollback on partial failure |

### Proposed Solution

Add to `src/agents/paul.ts` prompt:

```markdown
### Parallel Implementation Rule (SAFE VERSION)

**Pre-conditions for parallel execution:**
1. Tasks must modify DIFFERENT files (no overlap)
2. Tasks must not have import/export dependencies
3. Maximum 3 parallel implementation tasks (conservative limit)

**Verification after parallel completion:**
1. Run `lsp_diagnostics` on ALL changed files
2. Run `bun run build` (catches cross-file issues)
3. Run `bun test` (catches behavioral regressions)
4. If ANY verification fails → treat ALL parallel tasks as suspect

**Do NOT parallelize:**
- Tasks modifying same file
- Tasks with shared imports/exports
- Tasks touching shared state (context, stores)
- More than 3 tasks at once
```

---

## Issue 2: Elijah Not Callable by Planners (LOOPHOLE)

### Problem
`planner-md-only` hook blocks planners from calling Elijah, but Elijah is a **consultation agent** (read-only analysis), not an implementation agent.

### Evidence
```
Error: [planner-md-only] DELEGATION BLOCKED: Planner agent 'planner-paul' 
attempted to delegate implementation to 'Elijah (Deep Reasoning Advisor)'.
```

### Fix Required
Edit `src/hooks/planner-md-only/constants.ts`:

```typescript
// Whitelist of allowed delegate targets
export const ALLOWED_DELEGATE_TARGETS = [
  // Analysis & Research
  "Nathan (Request Analyst)",
  "explore",
  "librarian",
  
  // Deep Reasoning & Consultation  <-- ADD THIS SECTION
  "Elijah (Deep Reasoning Advisor)",
  
  // Planning & Review
  "Timothy (Implementation Plan Reviewer)",
  "Solomon (TDD Planner)",
  "Thomas (TDD Plan Consultant)",
  "Ezra (Plan Reviewer)",
]
```

### Rationale
Elijah's modes are all read-only consultation:
- `--debug`: Root cause analysis
- `--architecture`: Architecture decisions
- `--security`: Threat modeling
- `--performance`: Performance analysis
- `--stuck`: Fresh perspective

None of these involve implementation.

---

## Execution Order

1. **Fix Elijah loophole** (quick, no dependencies)
2. **Add parallel implementation guidance** (requires careful prompt editing)
3. **Run tests** to verify no regressions

---

## Open Questions

1. Should we add a hook to enforce the "different files" rule for parallel tasks?
2. Should we add memory/token monitoring beyond concurrency limits?
3. Should parallel failures trigger automatic git stash for recovery?

---

**Status**: Ready for Paul to execute. Switch to Paul and say "execute the draft".
