# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-17
**Package:** oh-my-opencode (OpenCode plugin)

## QUICK REFERENCE

```bash
bun install              # Install dependencies (bun only - never npm/yarn)
bun run typecheck        # Type check only
bun run build            # ESM + declarations + schema
bun test                 # Run all tests (84 test files)
bun test <pattern>       # Run single test: bun test todo-continuation
bun test --watch         # Watch mode
```

## DEVELOPMENT SETUP

### Prerequisites
- **Bun** (latest) - The only supported package manager
- **TypeScript 5.7.3+** - For type checking and declarations
- **OpenCode 1.0.150+** - For testing the plugin

### Local Development

```bash
# Clone and install
git clone https://github.com/code-yeongyu/oh-my-opencode.git
cd oh-my-opencode
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
       "file:///absolute/path/to/oh-my-opencode/dist/index.js"
     ]
   }
   ```
   > Remove `"oh-my-opencode"` from plugin array to avoid conflicts with npm version.

3. Restart OpenCode to load changes

4. Verify plugin loaded via agent availability or startup messages

## OVERVIEW

Multi-model agent orchestration plugin for OpenCode. Implements Claude Code/AmpCode features with GPT-5.2, Claude, Gemini, Grok models. 11 LSP tools, AST-Grep, MCP integrations (context7, websearch, grep_app).

## STRUCTURE

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
| Paul | anthropic/claude-sonnet-4-5 | **Strict Plan Executor** - Executes formal plans only (requires `.paul/plans/*.md`) |
| planner-paul | anthropic/claude-opus-4-5 | **Plan Creator** - Requirements analysis, architecture, test specs (CANNOT execute) |
| worker-paul | anthropic/claude-sonnet-4-5 | **Trivial Task Handler** - Autonomous execution for small tasks (< 50 lines, single file, low risk) |
| Solomon | gpt-5.2-codex-high | TDD test planning (called by planner-paul) |
| Timothy | google/gemini-3-pro-high | Implementation plan reviewer (called by planner-paul) |
| Nathan | openai/gpt-5.2-high | Request analyst (called by planner-paul) |
| Joshua | openai/gpt-5.2 | Test runner (called by Paul) |
| Peter | openai/gpt-5.2-codex-high | Unit test writer (called by Solomon or Paul) |
| John | openai/gpt-5.2-codex-high | E2E test writer (called by Solomon or Paul) |
| Sisyphus-Junior | anthropic/claude-sonnet-4-5 | Backend implementation (called by Paul, NO delegation) |
| frontend-ui-ux-engineer | gemini-3-pro-preview | UI implementation (called by Paul for UI work) |
| git-master | opencode/glm-4.7-free | Git operations (called by Paul) |
| Sisyphus | claude-opus-4-5 | **Legacy escape hatch** - Bypasses all rules (use only if system deadlocks) |
| oracle | gpt-5.2 | High-IQ debugging, architecture |
| librarian | glm-4.7-free | Multi-repo analysis, docs |
| explore | grok-code | Fast codebase exploration |
| document-writer | gemini-3-pro-preview | Technical docs |

## THREE-DOMAIN ARCHITECTURE (STRICT MODE)

**The system enforces strict separation between three agent domains:**

| Domain | Agent | Use When | Cannot Do |
|--------|-------|----------|-----------|
| **PLANNING** | `@planner-paul` | Complex task needs architecture/test specs | Execute code, delegate to implementation agents |
| **EXECUTION** | `@Paul` | Formal plan exists in `.paul/plans/*.md` | Create plans, execute without plan |
| **TRIVIAL** | `@worker-paul` | Single file, < 50 lines, low risk (typo, comment, config) | Delegate to other agents, handle complex tasks |

**Workflow:**

1. **Complex Tasks**: User → `@planner-paul` (creates plan) → User manually switches → `@Paul` (executes plan)
2. **Trivial Tasks**: User → `@worker-paul` (executes immediately)

**Key Rules (Enforcement Types):**
- **Cross-Domain Calls** (HARD BLOCK): `planner-paul` cannot call `Paul`, `Paul` cannot call `worker-paul`, etc.
- **Paul Requires Plan** (HARD BLOCK): If no plan exists in `.paul/plans/*.md`, Paul will **BLOCK** and tell you to switch to `@planner-paul`.
- **Category Required** (HARD BLOCK): All delegations MUST specify `category` parameter (e.g., `category="unit-testing"`).
- **TDD Mandatory** (HARD BLOCK): HARD BLOCKS if you try to write code before tests (not warnings - actual errors).
- **No Coding for Orchestrators** (HARD BLOCK): Paul/planner-paul CANNOT write code directly - they MUST delegate.
- **No Delegation for Subagents** (HARD BLOCK): Sisyphus-Junior cannot delegate to frontend-ui-ux-engineer. Paul must orchestrate.
- **Competency Routing** (ADVISORY WARNING): Wrong specialist for task triggers warning (not block) - allows proceeding with caution.
- **TODO Continuation** (ADVISORY SUGGESTION): Suggests continuing incomplete tasks - allows stopping if blocked.

## ENFORCEMENT MODEL

The system uses two types of enforcement:

### HARD BLOCKS (Errors - Prevent Execution)
These violations **throw errors** and stop execution:
1. Cross-domain calls (planner-paul → Paul, Paul → planner-paul, worker-paul → Paul)
2. Missing category parameter in delegations
3. Code written without tests first (TDD violation)
4. Orchestrators writing code directly (must delegate)
5. File lock conflicts (parallel delegation on same file)
6. Task completion without approval (no Joshua/Timothy approval)

### ADVISORY WARNINGS (Suggestions - Allow Proceeding)
These violations **inject warnings** but allow proceeding:
1. **Competency routing**: Task contains UI keywords but delegated to non-specialist
   - Example: CSS changes delegated to Sisyphus-Junior triggers warning
   - Paul can proceed if there's valid reason (e.g., Sisyphus-Junior → frontend-ui-ux-engineer internally)
2. **TODO continuation**: Incomplete tasks remain after completing one
   - Suggests continuing with next task
   - Paul can stop and report if task is blocked or requires user input

**Why Advisory Warnings?**
- Prevents deadlocks on edge cases (e.g., "commit UI changes" has both Git + UI keywords)
- Allows Paul to make informed decisions
- Prevents infinite loops on stuck tasks
- Still provides guidance without being overly restrictive

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
- **Config**: `~/.config/opencode/oh-my-opencode.json` or `.opencode/oh-my-opencode.json`
- **JSONC**: Config supports comments and trailing commas
- **Trusted deps**: @ast-grep/cli, @ast-grep/napi, @code-yeongyu/comment-checker
- **CI**: Parallel test/typecheck, auto-commit schema on master
