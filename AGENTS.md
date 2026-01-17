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
| Sisyphus | claude-opus-4-5 | Primary orchestrator, extended thinking |
| oracle | gpt-5.2 | High-IQ debugging, architecture |
| librarian | glm-4.7-free | Multi-repo analysis, docs |
| explore | grok-code | Fast codebase exploration |
| frontend-ui-ux-engineer | gemini-3-pro-preview | UI generation |
| document-writer | gemini-3-pro-preview | Technical docs |

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

**Workflow:**
- NEVER skip TODO creation for multi-step tasks
- NEVER batch TODO completions (mark done immediately)
- NEVER mark tasks complete without verification
- NEVER separate test from implementation (same commit)

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
