# Paul Token Consumption Analysis

## Problem Statement

Paul (orchestrator) consumes significant tokens even when delegating tasks to subagents, causing unnecessary context window usage.

## Applied Optimizations

- Compressed Paul prompt to a minimal rule set (~1,500 tokens).
- Lazy-loaded AGENTS.md/README.md: only inject when those files are read directly.
- Aggressively truncated AGENTS.md and README.md injections to ~500 tokens each when loaded.
- Delegation outputs now default to summaries (~300 tokens) with `output_format="full"` opt-in.
- Skill content is summarized to ~300 tokens before injection.
- Plan progress reads are cached by mtime to avoid repeated parsing.
- Plan file reads in Paul sessions are summarized to a TODO list view.

## Root Causes Identified

### 1. Base System Prompt Size

**File**: `src/agents/paul.ts`
- **Lines**: ~120 (post-compression)
- **Actual prompt**: terse bullet rules
- **Estimated tokens**: ~1,500 tokens

**Content breakdown**:
- Core identity and constraints (40 lines)
- Plan requirement rules (20 lines)
- TDD workflow (RED-GREEN-REFACTOR) (30 lines)
- Delegation rules (30 lines)
- TODO discipline (20 lines)
- File operation rules (15 lines)
- Verification obsession (15 lines)
- Redirection protocol (15 lines)
- Available agents list (15 lines)

**Issue**: The prompt is comprehensive but verbose. Every Paul interaction loads this full context.

### 2. Auto-Injected Context Files

#### Directory AGENTS.md Injection
**Hook**: `src/hooks/directory-agents-injector/index.ts`
- **Trigger**: Only when `AGENTS.md` is read directly
- **Behavior**: Injects the requested `AGENTS.md` (no directory walk)
- **Root AGENTS.md**: truncated to ~500 tokens
- **Subdirectory AGENTS.md**: truncated to ~500 tokens
- **Caching**: Per-session, but resets on compaction

**Example injection**:
```
[Directory Context: /Users/jaino/Development/oh-my-lord-opencode/src/agents/AGENTS.md]
<full AGENTS.md content>
```

#### Directory README.md Injection
**Hook**: `src/hooks/directory-readme-injector/index.ts`
- **Trigger**: Only when `README.md` is read directly
- **Behavior**: Injects the requested `README.md` (no directory walk)
- **Root README.md**: truncated to ~500 tokens
- **Subdirectory READMEs**: truncated to ~500 tokens

**Issue**: If Paul reads 3 files in different directories, it can inject 6+ context files (3 AGENTS.md + 3 README.md).

### 3. Dynamic Truncation (Mitigation)

**File**: `src/shared/dynamic-truncator.ts`
- **Purpose**: Truncates injected content based on context window usage
- **Behavior**: Monitors session token usage, reduces injection size when approaching limits
- **Limitation**: Still injects full content when context is available

### 4. Delegation Overhead

**File**: `src/tools/delegate-task/tools.ts`

**Per delegation, Paul's context includes**:
1. **Skill content** (if `skills` parameter used): ~300 tokens per skill (summarized)
2. **Category prompt appends**: 100-300 tokens per category
3. **System directives**: TDD warnings, competency advisories (~200 tokens each)
4. **Delegation result**: Summary output (~300 tokens)

**Example delegation flow**:
```
Paul reads plan file (500 tokens)
  → Injects AGENTS.md (~500 tokens)
  → Injects README.md (~500 tokens)
  → Delegates to Sisyphus-Junior with skill (~300 tokens)
  → Receives result (~300 tokens)
  → Total: ~2,100 tokens for one delegation
```

### 5. Plan File Reading

**Location**: `.paul/plans/*.md`
- **Size**: Typically 200-500 lines (~2,500-6,000 tokens)
- **Frequency**: Read once at start, but stays in context
- **Issue**: Large plans with detailed references consume significant tokens
- **Optimization**:
  - Plan progress cached by mtime
  - Paul receives a summarized plan view (title + TODO list) instead of full content

## Token Consumption Breakdown (Estimated)

| Component | Tokens | Frequency | Total Impact |
|-----------|--------|-----------|--------------|
| Paul's base prompt | ~1,500 | Every message | Medium |
| Root AGENTS.md | ~500 | Per file read | Medium |
| Root README.md | ~500 | Per file read | Medium |
| Subdirectory AGENTS.md | ~500 | Per file read | Medium |
| Subdirectory README.md | ~500 | Per file read | Medium |
| Plan file | 2,500-6,000 | Once per session | Medium |
| Skill content | ~300 | Per delegation | Medium |
| Category appends | 100-300 | Per delegation | Low |
| System directives | 200-500 | Per delegation | Low |
| Delegation results | ~300 | Per delegation | Medium |

**Worst-case scenario** (Paul reads 3 files, delegates 2 tasks):
- Base prompt: 3,000
- AGENTS.md injections: 9,000 (3 files × 3,000)
- README.md injections: 10,500 (3 files × 3,500)
- Plan file: 4,000
- Skills: 3,000 (2 delegations × 1,500)
- Delegation results: 600 (2 × 300)
- **Total**: ~12,000-14,000 tokens (plan size dominates)

## Recommendations

### High Impact (Immediate)

1. **Lazy-load context files**
   - Don't inject AGENTS.md/README.md automatically
   - Only inject when Paul explicitly asks for context
   - Add a tool: `load_context(type="agents"|"readme", path="...")`

2. **Compress Paul's base prompt**
   - Remove redundant examples
   - Use bullet points instead of paragraphs
   - Move detailed rules to a separate reference file
   - Target: Reduce from 2,500 to 1,500 tokens

3. **Summarize delegation results**
   - Don't return full subagent output to Paul
   - Return structured summary: `{ status, files_changed, tests_passed, errors }`
   - Target: Reduce from 2,000 to 200 tokens per delegation

### Medium Impact

4. **Cache plan file separately**
   - Load plan once, store in session metadata
   - Don't re-inject on every message
   - Use plan ID to reference specific todos

5. **Optimize skill loading**
   - Pre-process skills to extract only relevant sections
   - Don't load full skill files (can be 2,000+ tokens)
   - Use skill summaries for delegation

6. **Smarter truncation**
   - Truncate AGENTS.md/README.md more aggressively
   - Keep only the first 500 tokens of each
   - Add "read full file" suggestion if needed

### Low Impact (Nice to have)

7. **Delegation batching**
   - Group multiple delegations into one context
   - Reduce repeated prompt overhead

8. **Context window monitoring**
   - Add telemetry to track actual token usage
   - Identify which components consume most tokens
   - Optimize based on real data

## Implementation Priority

1. **Phase 1** (Quick wins):
   - Compress Paul's base prompt (1-2 hours)
   - Summarize delegation results (2-3 hours)

2. **Phase 2** (Structural changes):
   - Lazy-load context files (4-6 hours)
   - Cache plan file separately (2-3 hours)

3. **Phase 3** (Optimization):
   - Optimize skill loading (3-4 hours)
   - Smarter truncation (2-3 hours)

## Expected Impact

**Current**: ~35,500 tokens per complex task
**After Phase 1**: ~20,000 tokens (43% reduction)
**After Phase 2**: ~12,000 tokens (66% reduction)
**After Phase 3**: ~8,000 tokens (77% reduction)

This would allow Paul to handle 4-5x more complex tasks within the same context window.
