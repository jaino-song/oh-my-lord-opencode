# Implementation Guide - Model Configuration

**Last Updated**: 2026-01-25

## Problem Summary

The repository had incorrect model references that caused GLM 4.7 and Grok Code to not work:

### Broken Models

| Model | Issue |
|--------|--------|
| `opencode/glm-4.7-free` | Does not exist in OpenCode |
| `opencode/grok-code` | Does not exist in OpenCode |
| `google/vertex/gemini-3-*` | Wrong provider (should be `google/antigravity`) |

## Correct Model Mappings

| Agent | Old (broken) | New (working) | Provider | Purpose |
|-------|--------------|---------------|----------|---------|
| **librarian** | `opencode/glm-4.7-free` | `zai-coding-plan/glm-4.7` | Z.ai Coding Plan | Multi-repo analysis, docs research |
| **explore** | `opencode/grok-code` | `anthropic/claude-haiku-4-5` | Anthropic | Fast codebase grep |
| **git-master** | `opencode/glm-4.7-free` | `zai-coding-plan/glm-4.7` | Z.ai Coding Plan | Git operations |
| **frontend-ui-ux-engineer** | `google/vertex/gemini-3-pro-high` | `google/antigravity-gemini-3-pro-high` | Google (Antigravity) | UI/UX development |
| **document-writer** | `google/vertex/gemini-3-flash-preview` | `google/antigravity-gemini-3-flash` | Google (Antigravity) | Technical writing |
| **multimodal-looker** | `google/vertex/gemini-3-flash-preview` | `google/antigravity-gemini-3-flash` | Google (Antigravity) | Image/PDF analysis |

### Fallback Models

When no provider is available, use these free fallbacks:

| Context | Fallback Model |
|---------|---------------|
| General purpose | `opencode/big-pickle` |
| Fast exploration | `opencode/gpt-5-nano` |
| Documentation | `zai-coding-plan/glm-4.7` (requires Z.ai subscription) |

## Files Updated

### Source Code
- `src/agents/librarian.ts` - DEFAULT_MODEL changed to `zai-coding-plan/glm-4.7`
- `src/agents/explore.ts` - DEFAULT_MODEL changed to `anthropic/claude-haiku-4-5`
- `src/agents/git-master.ts` - model changed to `zai-coding-plan/glm-4.7`
- `src/agents/multimodal-looker.ts` - DEFAULT_MODEL changed to `google/gemini-3-flash-preview` (fixes antigravity validation error)
- `src/features/builtin-skills/skills.ts` - git-master skill model updated
- `src/features/token-analytics/types.ts` - MODEL_PRICING keys updated:
  - Added `anthropic/claude-haiku-4-5`
  - Added `zai-coding-plan/glm-4.7`
  - Removed `grok-code`, `Claude/glm-4.7-free`, `glm-4.7-free`

### Configuration
- `src/cli/config-manager.ts` - All fallback chains updated:
  - `opencode/glm-4.7-free` → `zai-coding-plan/glm-4.7` or `opencode/big-pickle`
  - `opencode/grok-code` → `anthropic/claude-haiku-4-5` or `opencode/gpt-5-nano`
  - Detection logic updated for new model names

### Installation
- `src/cli/install.ts` - Model display and warning messages updated

### Documentation
- `AGENTS.md` - Agent model table updated (added multimodal-looker entry)
- `src/agents/AGENTS.md` - Agent structure and models updated

## Provider Requirements

### Z.ai Coding Plan (GLM-4.7)

**Required for**: `librarian`, `git-master`, `explore` (fallback)

```bash
# Check if provider is connected
opencode provider | grep -i zai

# List available Z.ai models
opencode models zai-coding-plan
```

**Available models**:
- `zai-coding-plan/glm-4.5`
- `zai-coding-plan/glm-4.5-air`
- `zai-coding-plan/glm-4.5-flash`
- `zai-coding-plan/glm-4.5v`
- `zai-coding-plan/glm-4.6`
- `zai-coding-plan/glm-4.6v`
- `zai-coding-plan/glm-4.7`
- `zai-coding-plan/glm-4.7-flash`

### Antigravity (Google Gemini)

**Recommended for**: UI/UX work, frontend tasks

```bash
# Check if provider is connected
opencode provider | grep -i antigravity

# List available models
opencode models google | grep antigravity
```

**Available models**:
- `google/antigravity-gemini-3-flash` - Fast, good for document/multimodal
- `google/antigravity-gemini-3-pro-high` - High quality, good for frontend work
- `google/antigravity-gemini-3-pro-low` - Balanced option

### Anthropic (Haiku 4.5)

**Used for**: `explore` agent (fast codebase grep)

```bash
# List available models
opencode models anthropic | grep haiku-4-5
```

**Available models**:
- `anthropic/claude-haiku-4-5`
- `anthropic/claude-haiku-4-5-20251001`

### OpenCode (Free Models)

**Available without any subscription**:

```bash
# List all opencode models
opencode models opencode
```

**Available models**:
- `opencode/big-pickle` - Stealth model, free
- `opencode/gpt-5-nano` - Fast model, free

## How to Verify Models

### Check available models

```bash
# List all available models
opencode models

# Filter by provider
opencode models anthropic
opencode models zai-coding-plan
opencode models google
opencode models opencode

# With cost metadata
opencode models --verbose

# Refresh model cache
opencode models --refresh
```

### Check provider connection

```bash
# List all configured providers
opencode provider

# Get provider info via API
curl -s http://localhost:4096/provider

# Get config providers
curl -s http://localhost:4096/config/providers
```

### Check current configuration

```bash
# View user config
cat ~/.config/opencode/oh-my-opencode.json

# View project config
cat .opencode/oh-my-opencode.json
```

## Testing

After making model changes, verify with:

```bash
# Run type checking
bun run typecheck

# Run configuration tests
bun test config-manager
bun test migration
```

## Common Pitfalls

### ❌ Wrong provider prefix

| Wrong | Correct | Issue |
|-------|---------|--------|
| `google/vertex/gemini-3-*` | `google/antigravity-gemini-3-*` | Provider mismatch |
| `anthropic/claude-haiku-4-5` | `anthropic/claude-haiku-4-5` | Typo in provider name |

### ❌ Non-existent models

| Wrong | Why |
|-------|-------|
| `opencode/glm-4.7-free` | Model never existed |
| `opencode/grok-code` | Model never existed |
| `opencode/glm-4.7-free` | Confusion with upstream repo |

### ✅ Upstream Reference

The upstream `oh-my-opencode` repo uses `zai-coding-plan/glm-4.7` and `anthropic/claude-haiku-4-5` as primary models with proper fallback chains.

See: https://github.com/code-yeongyu/oh-my-opencode

## Model Selection Guidelines

### Fast Exploration (explore agent)
```
anthropic/claude-haiku-4-5 → opencode/gpt-5-nano
```

### Documentation/Research (librarian agent)
```
zai-coding-plan/glm-4.7 → opencode/big-pickle → anthropic/claude-sonnet-4-5
```

### Frontend/UI (frontend-ui-ux-engineer)
```
google/antigravity-gemini-3-pro-high → anthropic/claude-opus-4-5
```

### Git Operations (git-master)
```
zai-coding-plan/glm-4.7 → opencode/big-pickle → anthropic/claude-sonnet-4-5
```

## Configuration File Locations

| Location | Scope |
|----------|--------|
| `~/.config/opencode/oh-my-opencode.json` | User-level (all projects) |
| `.opencode/oh-my-opencode.json` | Project-level (current repo) |
| `~/.config/opencode/opencode.json` | Main OpenCode config |

## Troubleshooting

### Agent not working?

1. Check model name is correct
2. Verify provider is connected: `opencode provider`
3. Check model exists: `opencode models | grep <model>`
4. Check API key is configured for provider
5. Look for errors in OpenCode logs

### Need to change model temporarily?

Edit `~/.config/opencode/oh-my-opencode.json`:

```json
{
  "agents": {
    "librarian": {
      "model": "anthropic/claude-sonnet-4-5"
    }
  }
}
```

Restart OpenCode to apply changes.

## References

- **OpenCode Documentation**: https://opencode.ai/docs
- **OpenCode Zen Models**: https://opencode.ai/docs/zen
- **Upstream oh-my-opencode**: https://github.com/code-yeongyu/oh-my-opencode
- **AGENTS.md**: ./AGENTS.md
- **AGENT_CREATION_STANDARD.md**: ./src/agents/AGENT_CREATION_STANDARD.md

---

## Think Mode System

### Problem

The think-mode hook was broken for multiple providers due to incorrect model mappings. When users typed `think` in their prompt, the system tried to switch to non-existent "high variant" models.

### Root Cause

**HIGH_VARIANT_MAP** contained invalid model references:
```typescript
const HIGH_VARIANT_MAP: Record<string, string> = {
  "claude-sonnet-4-5": "claude-sonnet-4-5-high",           // ❌ Doesn't exist
  "claude-opus-4-5": "claude-opus-4-5-high",             // ❌ Doesn't exist
  "gemini-3-pro": "gemini-3-pro-high",                       // ❌ Wrong provider
  "gemini-3-flash-preview": "gemini-3-flash-preview-high",   // ❌ Doesn't exist
  "gpt-5.2": "gpt-5.2-high",                             // ❌ Doesn't exist
  // ... 14 more invalid mappings
}
```

### Fix Applied

**Strategy**: Use thinking parameters instead of model switching for most providers.

1. **Removed invalid HIGH_VARIANT_MAP entries** - Only Google Antigravity has explicit high variant models
2. **Updated getThinkingConfig()** - Special handling for Antigravity provider (uses model switching)
3. **Kept THINKING_CONFIGS** - They contain correct thinking parameters for each provider

### Current Behavior

| Provider | High Variant Strategy |
|----------|---------------------|
| **Anthropic** | Uses `thinking: { type: "enabled", budgetTokens: 64000 }` parameter |
| **OpenAI** | Uses `reasoning_effort: "high"` parameter |
| **Google (Vertex/Antigravity)** | Special handling: Antigravity switches to `google/antigravity-gemini-3-pro-high`, others use thinking parameters |
| **Amazon Bedrock** | Uses `reasoningConfig: { type: "enabled", budgetTokens: 32000 }` parameter |

### Available Models

```bash
# High variant that DOES exist:
google/antigravity-gemini-3-pro-high  ✅

# High variants that DON'T exist (use parameters instead):
anthropic/claude-sonnet-4-5-high       ❌
anthropic/claude-opus-4-5-high          ❌
google/gemini-3-pro-high                  ❌
google/gemini-3-flash-high                ❌
openai/gpt-5.2-high                     ❌
```

### Testing

After think-mode changes, verify with:

```bash
# Build
bun run build

# Type check
bun run typecheck
```

### Affected Agents

These agents now work correctly with `think` keyword:

- ✅ All Claude models (librarian, explore, etc.)
- ✅ All GPT models (oracle, Solomon, Peter, etc.)
- ✅ Google Gemini 3-flash models (document-writer, multimodal-looker) - uses thinking parameters
- ✅ Google Antigravity models (frontend-ui-ux-engineer) - switches to high variant

### Files Updated

- `src/hooks/think-mode/switcher.ts` - Fixed HIGH_VARIANT_MAP and getThinkingConfig()
- `src/agents/multimodal-looker.ts` - Changed model to `google/gemini-3-flash-preview`

---

## Agent Hierarchy and Structure

### Three-Domain Architecture

The system enforces strict separation between three agent domains:

| Domain | Agent | Use When | Cannot Do |
|--------|-------|----------|-----------|
| **PLANNING** | `@planner-paul` | Complex task needs architecture/test specs | Execute code, delegate to implementation agents |
| **EXECUTION** | `@Paul` | Formal plan exists in `.paul/plans/*.md` | Create plans, execute without plan |
| **TRIVIAL** | `@worker-paul` | Single file, < 50 lines, low risk (typo, comment, config) | Delegate to other agents, handle complex tasks |

**Key Rules (Enforcement Types):**

| Rule Type | Effect |
|-----------|---------|
| **Cross-Domain Calls** (HARD BLOCK) | `planner-paul` cannot call `Paul`, `Paul` cannot call `worker-paul`, etc. |
| **Paul Requires Plan** (HARD BLOCK) | If no plan exists in `.paul/plans/*.md`, Paul will **BLOCK** and tell you to switch to `@planner-paul` |
| **Category Required** (HARD BLOCK) | All delegations MUST specify `category` parameter (e.g., `category="unit-testing"`). |
| **TDD Mandatory** (HARD BLOCK) | HARD BLOCKS if you try to write code before tests (not warnings - actual errors). |
| **No Coding for Orchestrators** (HARD BLOCK) | Paul/planner-paul CANNOT write code directly - they MUST delegate. |
| **No Delegation for Subagents** (HARD BLOCK) | Sisyphus-Junior cannot delegate to frontend-ui-ux-engineer. Paul must orchestrate. |

**Advisory Warnings (Suggestions - Allow Proceeding):**
- **Competency routing**: Task contains UI keywords but delegated to non-specialist triggers warning (not block) - allows proceeding with caution.
- **TODO continuation**: Suggests continuing incomplete tasks - allows stopping if blocked.

### Agent Types

| Type | Role | Can Delegate? | Examples |
|------|------|---------------|----------|
| **Orchestrator** | Coordinate and delegate work | YES | Paul, Sisyphus |
| **Subagent** | Execute specialized tasks | NO | Oracle, Explore, Peter |

### Agent Categories

```typescript
type AgentCategory = "exploration" | "specialist" | "advisor" | "utility"
```

| Category | Purpose | Typical Model | Examples |
|----------|---------|---------------|----------|
| `exploration` | Search, research, discovery | FREE/CHEAP models | explore, librarian |
| `specialist` | Domain-specific implementation | Varies by domain | frontend-ui-ux, document-writer, peter, john |
| `advisor` | Consultation, review, planning | EXPENSIVE models | oracle, momus, ezra, thomas, timothy |
| `utility` | Specific utility functions | CHEAP models | multimodal-looker |

### Cost Classification

```typescript
type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE"
```

| Cost | When to Use | Model Examples |
|------|-------------|----------------|
| `FREE` | High-volume, background tasks | opencode/grok-code, opencode/glm-4.7-free |
| `CHEAP` | Standard operations | anthropic/claude-sonnet-4-5 |
| `EXPENSIVE` | Complex reasoning, critical decisions | anthropic/claude-opus-4-5, openai/gpt-5.2 |

---

## Structure Principles

### File Structure

```
oh-my-opencode/
├── src/
│   ├── agents/        # AI agents: Sisyphus, oracle, librarian, explore, etc.
│   ├── hooks/         # 22+ lifecycle hooks (PreToolUse, PostToolUse, Stop)
│   ├── tools/         # LSP, AST-Grep, session-manager, delegate-task
│   ├── features/      # Claude Code compat, background-agent, skill-mcp
│   ├── shared/        # Cross-cutting utilities
│   ├── cli/           # CLI installer, doctor checks
│   ├── mcp/           # Built-in MCPs: context7, grep_app, websearch
│   ├── config/        # Zod schema (schema.ts)
│   └── index.ts       # Main plugin entry
├── script/            # build-schema.ts, publish.ts
├── assets/            # JSON schema output
└── dist/              # Build output (ESM + .d.ts)
```

### TypeScript Naming Conventions

| Element | Convention | Example |
|---------|-------------|----------|
| **Directories** | kebab-case | `directory-agents-injector/` |
| **Factories** | `createXXXHook()`, `createXXXTool()` | `createAgentToolRestrictions()` |
| **Files** | kebab-case, co-located tests | `foo.ts` → `foo.test.ts` |
| **Types** | PascalCase interfaces, `Schema` suffix for Zod schemas | `AgentConfig`, `ModelConfigSchema` |
| **Prompts** | SCREAMING_SNAKE | `MY_AGENT_SYSTEM_PROMPT` |

### Error Handling

- Consistent `try/catch` with `async/await`
- Graceful degradation (hooks fail silently when appropriate)
- Debug logging via `process.env.*_DEBUG === "1"`

### Validation

- **Zod** for all config schemas (`src/config/schema.ts`)
- Run `bun run build:schema` after schema changes

---

## Rules

### Standard Permission Sets by Agent Type

#### Read-Only Advisor (Oracle, Momus, Ezra, Thomas)
```typescript
const restrictions = createAgentToolRestrictions([
  "write",         // Cannot write files
  "edit",          // Cannot edit files
  "task",          // Cannot manage todos
  "delegate_task", // Cannot delegate to other agents
])
```

#### Exploration Agent (Explore, Librarian)
```typescript
const restrictions = createAgentToolRestrictions([
  "write",         // Cannot write files
  "edit",          // Cannot edit files
  "task",          // Cannot manage todos
  "delegate_task", // Cannot delegate
  "call_omo_agent", // Cannot spawn other agents
])
```

#### Implementation Agent (Sisyphus-Junior, Peter, John)
```typescript
const restrictions = createAgentToolRestrictions([
  "task",          // Cannot manage todos (orchestrator does this)
  "delegate_task", // Cannot delegate (works alone)
])
// Note: CAN write/edit files, CAN call_omo_agent for explore/librarian
```

#### Orchestrator (Paul, Sisyphus)
```typescript
// Orchestrators have FULL access to delegate_task
// They typically don't need restrictions
```

### Model Selection Guidelines

#### Default Models by Category

| Category | Recommended Model | Reasoning |
|----------|-------------------|-----------|
| Exploration | `anthropic/claude-haiku-4-5` → `opencode/gpt-5-nano` | Fast, cheap, high volume |
| Specialist | `google/antigravity-gemini-3-pro-high` → `anthropic/claude-sonnet-4-5` | Good balance, domain-specific |
| Advisor | `anthropic/claude-opus-4-5` | Maximum reasoning capability |
| Orchestrator | `anthropic/claude-opus-4-5` | Maximum reasoning capability |

#### Temperature Guidelines

| Agent Type | Temperature | Reasoning |
|-------------|-------------|-----------|
| Code generation | 0.1 | Deterministic, consistent output |
| Review/Analysis | 0.1-0.2 | Consistent evaluation |
| Creative writing | 0.3-0.5 | Some variation allowed |
| Exploration | 0.1 | Consistent search patterns |

### Testing Requirements

#### Mandatory RED-GREEN-REFACTOR Cycle

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test"

describe("feature-name", () => {
  beforeEach(() => { /* setup */ })
  afterEach(() => { /* cleanup */ })

  test("should do X when Y", async () => {
    // #given - setup state
    const input = createMockInput()

    // #when - execute
    const result = await myFunction(input)

    // #then - assert
    expect(result).toBe(expected)
  })
})
```

**Rules:**
- BDD comments: `#given`, `#when`, `#then`
- Test file next to source: `foo.ts` → `foo.test.ts`
- NEVER delete failing tests to "pass"
- One test at a time, don't batch

---

## Workflow

### Agent Delegation Workflow

#### Orchestrator (Paul/Sisyphus)

```
User Request
    ↓
1. Analyze task complexity
    ↓
2. If COMPLEX → delegate to subagents in parallel
    ↓
3. Wait for all subagents to complete
    ↓
4. Synthesize results
    ↓
5. If incomplete → Continue with remaining work
```

**Key Principles:**
- Launch 3+ subagents in parallel (not sequential)
- Each subagent has clear, bounded scope
- Use proper categories when delegating
- Synthesize and verify results

#### Subagent Execution

```
Receive Task
    ↓
1. Analyze requirements
    ↓
2. Execute within scope (no delegation)
    ↓
3. Return structured results
    ↓
4. If blocked → Report issue clearly
```

### Model Fallback Chain

When primary model unavailable, use fallback chain:

```
Primary Model → Fallback 1 → Fallback 2 → Ultimate Fallback
```

**Example chains:**

| Agent | Chain |
|-------|--------|
| librarian | `zai-coding-plan/glm-4.7` → `opencode/big-pickle` → `anthropic/claude-sonnet-4-5` |
| explore | `anthropic/claude-haiku-4-5` → `opencode/gpt-5-nano` |
| oracle | `anthropic/claude-opus-4-5` → `openai/gpt-5.2` → `anthropic/claude-sonnet-4-5` |

### Task Classification Flow

```
User Request
    ↓
1. Parse intent (complexity estimation)
    ↓
2. If TRIVIAL (single file, < 50 lines, low risk)
    → Execute immediately (no planning needed)
    ↓
3. If COMPLEX (architecture, multi-file, dependencies)
    → Create formal plan (requires @planner-paul)
    → User manually switches to @Paul
    → Execute plan step-by-step
    ↓
4. Monitor progress
    → Verify completion (all tests passing, build successful)
```

### Todo Management Discipline

**NON-NEGOTIABLE:**

- 2+ steps → Create TODO list FIRST
- Mark in_progress BEFORE starting (ONE at a time)
- Mark completed IMMEDIATELY after each step
- NEVER batch completions

**No todos on multi-step work = INCOMPLETE WORK.**

### Verification Steps

After making changes, verify with:

```bash
# 1. Run type checking
bun run typecheck

# 2. Run configuration tests
bun test config-manager
bun test migration

# 3. Run build (if applicable)
bun run build

# 4. Test the actual functionality
bun test <relevant-test-pattern>
```

**Task NOT complete without:**
- lsp_diagnostics clean on changed files
- Build passes (if applicable)
- All todos marked completed

---

## Anti-Patterns

### ❌ Never Do

| Anti-Pattern | Why |
|--------------|------|
| Cross-domain calls | Breaks separation of concerns, creates circular dependencies |
| Orchestrators writing code | Violates agent hierarchy, undermines delegation system |
| Delegating without category | Makes routing impossible, creates inefficient execution |
| Writing code before tests | Violates TDD principles, catches bugs too late |
| Batching TODO completions | Hides incomplete work, loses accountability |
| Using default exports | Causes naming collisions, makes debugging harder |

### ✅ Always Do

| Best Practice | Why |
|---------------|------|
| Use category parameters | Enables intelligent routing, improves efficiency |
| Follow file naming conventions | Maintains consistency, improves discoverability |
| Write tests first (TDD) | Catches bugs early, guides implementation |
| Parallelize independent work | Reduces latency, improves user experience |
| Document agent metadata | Enables Sisyphus integration, improves auto-routing |
| Mark TODOs in_progress before starting | Provides accurate progress tracking |
| Graceful degradation | Prevents cascade failures, improves reliability |
