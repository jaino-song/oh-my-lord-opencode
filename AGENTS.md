# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-17
**Package:** oh-my-lord-opencode (OpenCode plugin)

## QUICK REFERENCE

```bash
bun install              # Install dependencies (bun only - never npm/yarn)
bun run typecheck        # Type check only
bun run build            # ESM + declarations + schema
bun test                 # Run all tests (84 test files)
bun test <pattern>       # Run single test: bun test todo-continuation
bun test --watch         # Watch mode
```

## DOCS SYNC CONTRACT (REQUIRED)

If you change the system structure (agents/hooks/tools/features/config), you MUST update the canonical docs.

What counts as a “structure change”:
- Agent registry/visibility/prompt wiring: `src/agents/*`, `src/agents/utils.ts`
- Hook inventory/ordering/enforcement: `src/hooks/*`, `src/index.ts`
- Tool inventory/registration: `src/tools/*`, `src/index.ts`
- Config schema/behavior: `src/config/schema.ts`, `src/plugin-config.ts`, `src/plugin-handlers/config-handler.ts`
- Skills/commands/MCP loaders: `src/features/*`, `src/mcp/*`
- CLI commands/behavior: `src/cli/*`

Docs that must stay correct:
- `docs/*.md` (canonical)
- `llms.txt` (LLM-friendly index; must include all `docs/*.md`)
- `structure.md` (pointer only; keep minimal to avoid drift)

Verification (must pass):
- `bun test docs-sync`


## DEVELOPMENT SETUP

### Prerequisites
- **Bun** (latest) - The only supported package manager
- **TypeScript 5.7.3+** - For type checking and declarations
- **OpenCode 1.0.150+** - For testing the plugin

### Local Development

```bash
# Clone and install
git clone https://github.com/jaino-song/oh-my-lord-opencode.git
cd oh-my-lord-opencode
bun install

# Build the project
bun run build
```

### Testing Changes Locally

After making changes, test your local build in OpenCode:

1. Build the project: `bun run build`

2. Update OpenCode config (`~/.config/opencode/opencode.json`):
   ```json
   {
     "plugin": [
       "file:///absolute/path/to/oh-my-lord-opencode/dist/index.js"
     ]
   }
   ```
   > Remove `"oh-my-lord-opencode"` from plugin array to avoid conflicts with npm version.

3. Restart OpenCode to load changes

4. Verify plugin loaded via agent availability or startup messages

## OVERVIEW

Multi-model agent orchestration plugin for OpenCode. Implements Claude Code/AmpCode features with GPT-5.2, Claude, Gemini, Grok models. 11 LSP tools, AST-Grep, MCP integrations (context7, websearch, grep_app).

## STRUCTURE

```
oh-my-lord-opencode/
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

## CODE STYLE

### TypeScript
- **Strict mode**: All `strict` compiler options enabled
- **Types**: Use `bun-types` (NOT @types/node)
- **Module**: ESM only (`"type": "module"`)
- **Imports**: Named exports preferred, avoid default exports
- **Optional props**: Use `?` extensively for optional interface properties
- **Dynamic objects**: `Record<string, unknown>` for flexible configs

### Naming
- **Directories**: kebab-case (`directory-agents-injector/`)
- **Factories**: `createXXXHook()`, `createXXXTool()` pattern
- **Files**: kebab-case, co-located tests (`*.test.ts`)
- **Types**: PascalCase interfaces, `Schema` suffix for Zod schemas

### Error Handling
- Consistent `try/catch` with `async/await`
- Graceful degradation (hooks fail silently when appropriate)
- Debug logging via `process.env.*_DEBUG === "1"`

### Validation
- **Zod** for all config schemas (`src/config/schema.ts`)
- Run `bun run build:schema` after schema changes

## TESTING (TDD)

**Mandatory RED-GREEN-REFACTOR cycle:**

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

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add agent | `src/agents/` | Create .ts, add to `builtinAgents` in index.ts |
| Add hook | `src/hooks/` | Create dir with `createXXXHook()`, export from index.ts |
| Add tool | `src/tools/` | Dir with index/types/constants/tools.ts |
| Add MCP | `src/mcp/` | Create config, add to index.ts and types.ts |
| Add skill | `src/features/builtin-skills/` | Create skill dir with SKILL.md |
| Config schema | `src/config/schema.ts` | Zod schema, run `bun run build:schema` |

## AGENT MODELS

| Agent | Model | Purpose |
|-------|-------|---------|
| Paul | anthropic/claude-opus-4-5 | **Plan Executor** - Executes formal plans only (requires `.paul/plans/*.md`). User-selectable via @Paul. |
| planner-paul | anthropic/claude-opus-4-5 | **Plan Creator (v4.2)** - Creates formal plans with auto-continue workflow. Always uses Ezra + Thomas. User switches to @Paul after. |
| worker-paul | anthropic/claude-opus-4-5 | **Trivial Task Handler** - Standalone agent for small tasks. User-selectable via @worker-paul. |
| Solomon | anthropic/claude-opus-4-5 | TDD test planning (called by planner-paul) |
| Timothy | anthropic/claude-sonnet-4-5 | Quick plan reviewer (simple plans, <30s) |
| Ezra | anthropic/claude-opus-4-5 | Deep plan reviewer (complex plans, confidence scoring) |
| Nathan | anthropic/claude-opus-4-5 | Request analyst (called by planner-paul) |
| Joshua | openai/gpt-5.2 | Test runner (called by Paul) |
| Peter | openai/gpt-5.2-codex | Unit test writer (called by Solomon or Paul) |
| John | openai/gpt-5.2-codex | E2E test writer (called by Solomon or Paul) |
| Paul-Junior | anthropic/claude-opus-4-5 | Backend implementation (called by Paul, NO delegation) |
| frontend-ui-ux-engineer | gemini-3-pro-preview | UI implementation (called by Paul for UI work) |
| git-master | zai-coding-plan/glm-4.7 | Git operations (called by Paul) |
| Sisyphus | claude-opus-4-5 | **Legacy escape hatch** - Bypasses all rules (use only if system deadlocks) |
| oracle | gpt-5.2 | High-IQ debugging, architecture |
| librarian | zai-coding-plan/glm-4.7 | Multi-repo analysis, docs |
| explore | anthropic/claude-haiku-4-5 | Fast codebase exploration |
| multimodal-looker | google/antigravity-gemini-3-flash | Image/PDF analysis |
| document-writer | gemini-3-pro-preview | Technical docs |

## THREE-DOMAIN ARCHITECTURE (v4.2)

**The system enforces strict separation between three agent domains:**

| Domain | Agent | User Selectable | Use When |
|--------|-------|-----------------|----------|
| **PLANNING** | `@planner-paul` | ✅ Yes | Complex tasks needing formal plans |
| **EXECUTION** | `@Paul` | ✅ Yes | After planner-paul creates a plan |
| **TRIVIAL** | `@worker-paul` | ✅ Yes | Small tasks (isolated files, no deps) |

**Workflow (v4.2 - Auto-Continue):**

```
User → @planner-paul
    ↓
Phase 0: Nathan analysis (impact-based triviality via explore/librarian)
    ↓
    trivial? → "Switch to @worker-paul" → STOP
    ↓
    non-trivial? → AUTO-CONTINUE (no user gate)
    ↓
Phase 1: Research (parallel explore/librarian)
    ↓
Phase 2: Plan Generation → .paul/plans/{name}.md
    ↓
Phase 3: Review Chain (ALL MANDATORY):
    1. Ezra deep review (loop until PASS)
    2. Solomon test planning → {name}-tests.md
    3. Thomas TDD review (loop until approved)
    ↓
Phase 4: Setup EXEC:: todos
    ↓
"Plan ready. Switch to @Paul to execute." → STOP
```

**Manual Agent Switching:**
- planner-paul does NOT delegate to Paul/worker-paul
- User manually switches via `@Paul` or `@worker-paul` after planning

**Key Rules (Enforcement Types):**
- **Cross-Domain Calls** (HARD BLOCK): `Paul` cannot call `planner-paul`, `worker-paul` cannot call `Paul`, etc.
- **Paul Requires Plan** (HARD BLOCK): If no plan exists in `.paul/plans/*.md`, Paul will **BLOCK** and tell you to switch to `@planner-paul`.
- **Category Required** (HARD BLOCK): All delegations MUST specify `category` parameter (e.g., `category="unit-testing"`).
- **TDD Mandatory** (HARD BLOCK): HARD BLOCKS if you try to write code before tests (not warnings - actual errors).
- **No Coding for Orchestrators** (HARD BLOCK): Paul/planner-paul CANNOT write code directly - they MUST delegate.
- **No Delegation for Subagents** (HARD BLOCK): Sisyphus-Junior cannot delegate to frontend-ui-ux-engineer. Paul must orchestrate.
- **Competency Routing** (ADVISORY WARNING): Wrong specialist for task triggers warning (not block) - allows proceeding with caution.

## ENFORCEMENT MODEL

The system uses two types of enforcement:

### HARD BLOCKS (Errors - Prevent Execution)
These violations **throw errors** and stop execution:
1. Cross-domain calls (Paul → planner-paul, worker-paul → Paul, etc.)
2. Missing category parameter in delegations
3. Code written without tests first (TDD violation)
4. Orchestrators writing code directly (must delegate)
5. File lock conflicts (parallel delegation on same file)
6. Task completion without approval (no Joshua/Ezra approval)

### ADVISORY WARNINGS (Suggestions - Allow Proceeding)
These violations **inject warnings** but allow proceeding:
1. **Competency routing**: Task contains UI keywords but delegated to non-specialist
   - Example: CSS changes delegated to Sisyphus-Junior triggers warning
   - Paul can proceed if there's valid reason (e.g., Sisyphus-Junior → frontend-ui-ux-engineer internally)

**Why Advisory Warnings?**
- Prevents deadlocks on edge cases (e.g., "commit UI changes" has both Git + UI keywords)
- Allows Paul to make informed decisions
- Still provides guidance without being overly restrictive

## CLARIFICATION FEATURE

Subagents (paul-junior, frontend-ui-ux-engineer) can request clarification from orchestrators when they encounter ambiguity.

**Format**:
```
[needs_clarification]
question: <question>
options:
a) <option 1>
b) <option 2>
context: <context>
recommendation: <a or b>
[/needs_clarification]
```

**Rules**:
- Max 3 clarification rounds per delegation
- Background tasks skip clarification (warning logged)
- Orchestrator answers from context first, escalates to user if needed

## ANTI-PATTERNS

**Build & Package:**
- NEVER use npm/yarn (bun only)
- NEVER use @types/node (use bun-types)
- NEVER `bun publish` directly (GitHub Actions workflow_dispatch only)
- NEVER bump version locally (CI managed)

**Code:**
- NEVER use year 2024 in prompts (use current year)
- NEVER use temperature > 0.3 for code agents
- NEVER trust agent self-reports (always verify)
- NEVER use Bash file ops (mkdir/touch/rm) for file creation in code

**Workflow (HARD BLOCKS - Will Throw Errors):**
- NEVER skip TODO creation for multi-step tasks
- NEVER batch TODO completions (mark done immediately)
- NEVER mark tasks complete without verification
- NEVER separate test from implementation (same commit)
- NEVER use Paul without a formal plan (use @planner-paul first) - **BLOCKED**
- NEVER use planner-paul for trivial tasks (use @worker-paul)
- NEVER try to bypass TDD enforcement (tests must come first) - **BLOCKED**
- NEVER delegate without category parameter - **BLOCKED**
- NEVER cross domain boundaries (planner-paul → Paul, Paul → worker-paul) - **BLOCKED**

**Workflow (ADVISORY - Will Warn But Allow):**
- AVOID delegating UI tasks to non-specialists (use frontend-ui-ux-engineer or Sisyphus-Junior)
- AVOID delegating testing tasks to non-test agents (prefer Peter/John/Joshua)
- AVOID delegating git operations to non-git agents (prefer git-master)
- AVOID delegating research to non-research agents (prefer librarian)
- CONSIDER continuing incomplete TODOs (but can stop if blocked)

## DEPLOYMENT

**GitHub Actions workflow_dispatch only:**

1. Commit & push changes
2. Trigger: `gh workflow run publish -f bump=patch`

## COMPLEXITY HOTSPOTS

| File | Lines | Focus |
|------|-------|-------|
| `src/agents/orchestrator-sisyphus.ts` | 1485 | Orchestrator, 7-section delegation |
| `src/agents/prometheus-prompt.ts` | 991 | Planning agent, interview mode |
| `src/features/background-agent/manager.ts` | 928 | Task lifecycle, concurrency |
| `src/hooks/sisyphus-orchestrator/index.ts` | 684 | Main orchestration hook |

## NOTES

- **OpenCode**: Requires >= 1.0.150
- **Config**: `~/.config/opencode/oh-my-lord-opencode.json` or `.opencode/oh-my-lord-opencode.json`
- **JSONC**: Config supports comments and trailing commas
- **Trusted deps**: @ast-grep/cli, @ast-grep/napi, @code-yeongyu/comment-checker
- **CI**: Parallel test/typecheck, auto-commit schema on master
