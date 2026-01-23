# Oh My Lord OpenCode

> A strict TDD enforcement fork of [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) with three-domain architecture, mandatory Test-Driven Development, and biblical agent naming.

[![Based on oh-my-opencode](https://img.shields.io/badge/based%20on-oh--my--opencode-blue?style=flat-square)](https://github.com/code-yeongyu/oh-my-opencode)

## What Changed

This fork introduces **HARD BLOCKS** for TDD violations (not warnings) with a strict three-domain architecture. The key differences:

1. **Code cannot be written without tests first** - HARD BLOCKED by hooks
2. **Three separate agent domains** - Planning, Execution, Trivial (strict separation enforced)
3. **Mandatory categories** - All delegations require category parameter
4. **File locking** - Prevents parallel delegation race conditions

### Agent Changes

| Original | This Fork | Role |
|----------|-----------|------|
| `orchestrator-sisyphus` | **Paul** | **Strict Plan Executor** - Executes formal plans ONLY (requires `.paul/plans/*.md`) |
| `Prometheus` (planner) | **planner-paul** | **Plan Creator** - Requirements, architecture, test specs (CANNOT execute) |
| *(new)* | **worker-paul** | **Trivial Task Handler** - Autonomous execution for small tasks (< 50 lines, single file) |
| *(new)* | **Solomon** | TDD planner - Plans tests BEFORE implementation |
| *(new)* | **Timothy** | Plan reviewer for planner-paul |
| *(new)* | **Nathan** | Request analyst for planner-paul |
| *(new)* | **Thomas** | TDD plan reviewer - "Doubting Thomas" who verifies test specs |
| *(new)* | **Peter** | Jest unit test writer |
| *(new)* | **John** | Playwright E2E test writer |
| *(new)* | **Joshua** | Test runner - Executes tests, writes structured JSON results |

### Why Biblical Names?

- **Paul**: The apostle who coordinated communities and delegated to Timothy, Titus, and others - perfect for an orchestrator
- **Solomon**: Known for wisdom and judgment - ideal for planning tests that define correct behavior
- **Thomas**: "Doubting Thomas" who needed to verify before believing - reviews plans to ensure quality
- **Peter & John**: The disciples who worked together - one writes unit tests, one writes E2E tests
- **Joshua**: Led the Israelites into the promised land - leads code into the "green" promised land of passing tests
- **Timothy**: Paul's trusted companion - reviews Paul's plans

## Why It Was Changed

### Problem with Original

The original oh-my-opencode is excellent, but TDD was **optional** and enforcement used **warnings** (which LLMs ignore). Developers could skip writing tests, leading to:
- Bugs caught late in development
- Regression issues
- Code that's hard to refactor safely
- LLMs hallucinating "all tests passed" when they actually failed

### Solution: Strict Mode Enforcement

In this fork:

1. **TDD is HARD BLOCKED** - Not warnings, actual errors that prevent code execution
2. **Three-domain separation** - Planning, Execution, Trivial (strict boundaries enforced by hooks)
3. **Paul requires formal plans** - Cannot execute without `.paul/plans/*.md` file
4. **Mandatory categories** - All delegations need `category` parameter
5. **File locking** - Prevents race conditions in parallel delegations
6. **Structured test results** - Machine-readable JSON (not parsed text)

## How It Works

### Three-Domain Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER (Entry Point)                         │
│                              ↓                                    │
│            Is task trivial? (typo, comment, simple config)        │
│                   ↙                         ↘                     │
│               YES                              NO                 │
│                ↓                                ↓                 │
│    ┌────────────────────┐          ┌─────────────────────┐       │
│    │   TRIVIAL DOMAIN   │          │   PLANNING DOMAIN   │       │
│    │   @worker-paul     │          │   @planner-paul     │       │
│    │                    │          │                     │       │
│    │ • Executes directly│          │ • Nathan (analyst) │       │
│    │ • No delegation    │          │ • Timothy (reviewer)│       │
│    │ • No plan needed   │          │ • Solomon (TDD)     │       │
│    │ • < 50 lines       │          │   - Peter (unit)    │       │
│    │ • Single file      │          │   - John (E2E)      │       │
│    │                    │          │ • Creates plan      │       │
│    └────────────────────┘          └─────────────────────┘       │
│             ↓                                ↓                    │
│        ✅ DONE                   Plan → .paul/plans/*.md          │
│                                            ↓                      │
│                              USER MANUALLY SWITCHES               │
│                                            ↓                      │
│                         ┌──────────────────────────┐              │
│                         │   EXECUTION DOMAIN       │              │
│                         │   @Paul                  │              │
│                         │                          │              │
│                         │ • Reads plan file        │              │
│                         │ • TDD Loop (per todo):   │              │
│                         │   1. Peter/John (RED)    │              │
│                         │   2. Joshua (verify FAIL)│              │
│                         │   3. Sisyphus-Junior     │              │
│                         │      (GREEN)             │              │
│                         │   4. Joshua (verify PASS)│              │
│                         │ • Writes nothing         │              │
│                         │ • Delegates everything   │              │
│                         └──────────────────────────┘              │
│                                   ↓                               │
│                              ✅ DONE                               │
└──────────────────────────────────────────────────────────────────┘
```

### TDD Exemptions

TDD is **HARD BLOCKED** for code files, but **exempted** for:

- **Documentation**: `.md`, `.txt`, `README` files
- **Configuration**: `.json`, `.yaml`, `tsconfig.json`, `package.json`
- **Type definitions**: `.d.ts`, `.types.ts` (pure types, no logic)
- **Constants**: `.constants.ts` (static data, no logic)
- **Test files**: `*.test.ts`, `*.spec.ts` (tests don't need tests)

**Force TDD** even for:
- **Schema files**: `.schema.ts`, `validation.ts` (contain validation logic)

Everything else requires TDD. No exceptions.

## Agent Visibility

Only 4 agents are visible in the `@` menu:

| Agent | Purpose | Use When |
|-------|---------|----------|
| `Paul` | **Strict Plan Executor** | Formal plan exists in `.paul/plans/*.md` |
| `planner-paul` | **Plan Creator** | Complex task needs architecture/test specs |
| `worker-paul` | **Trivial Task Handler** | Single file, < 50 lines, low risk (typo, comment, config) |
| `Sisyphus` | **Legacy escape hatch** | System deadlocks (use as last resort) |

All other agents (Solomon, Timothy, Nathan, Thomas, Peter, John, Joshua, etc.) are **hidden** and invoked automatically by the orchestrators.

## Data Locations

```
.paul/
├── plans/
│   ├── {name}.md           # Implementation plan (planner-paul)
│   └── {name}-tests.md     # Test specifications (Solomon)
└── drafts/
    └── {name}.md           # Interview drafts (planner-paul)

.sisyphus/
├── approval_state.json     # Approval tracking (hierarchy-enforcer)
└── test-results/
    └── {todoId}.json       # Structured test results (Joshua)
```

**File Locks**: In-memory only (prevents parallel delegation race conditions)

## Installation

```bash
# Clone this fork
git clone https://github.com/jaino-song/oh-my-lord-opencode.git
cd oh-my-lord-opencode

# Install dependencies
bun install

# Build
bun run build
```

### Local Development

Update your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": [
    "file:///absolute/path/to/oh-my-lord-opencode/dist/index.js"
  ]
}
```

## Agent Models

| Agent | Model | Purpose |
|-------|-------|---------|
| **Paul** | claude-sonnet-4-5 | **Strict Plan Executor** - Executes formal plans only |
| **planner-paul** | claude-opus-4-5 | **Plan Creator** - Requirements, architecture, test specs |
| **worker-paul** | claude-sonnet-4-5 | **Trivial Task Handler** - Autonomous for small tasks |
| Solomon | gpt-5.2-codex-high | TDD test planning (called by planner-paul) |
| Timothy | gemini-3-pro-high | Plan reviewer (called by planner-paul) |
| Nathan | gpt-5.2-high | Request analyst (called by planner-paul) |
| Thomas | claude-sonnet-4-5 | TDD plan reviewer (called by Solomon) |
| Peter | gpt-5.2-codex-high | Jest unit test writer (called by Solomon or Paul) |
| John | gpt-5.2-codex-high | Playwright E2E test writer (called by Solomon or Paul) |
| Joshua | gpt-5.2 | Test runner (called by Paul) |
| Sisyphus-Junior | claude-sonnet-4-5 | Backend implementation (called by Paul) |
| frontend-ui-ux-engineer | gemini-3-pro-preview | UI implementation (called by Paul) |
| git-master | opencode/glm-4.7-free | Git operations (called by Paul) |
| oracle | gpt-5.2 | Architecture & debugging |
| explore | grok-code | Codebase exploration |
| librarian | glm-4.7-free | Documentation research |

## Key Enforcements

### 1. Orchestrators Never Write Code (HARD BLOCK)

```
Paul/planner-paul MUST delegate ALL code changes via delegate_task()
- Attempted Write/Edit → BLOCKED: "You MUST delegate implementation to subagents"
- No exceptions (even for .sisyphus/ or .paul/ files)
- Every line of code goes through a specialist
```

### 2. TDD is MANDATORY (HARD BLOCK)

```
Writing code without tests first → BLOCKED with error:
"TDD VIOLATION: TEST-FIRST REQUIRED"

Correct workflow (ENFORCED):
1. Write tests (Peter/John)
2. Run tests - FAIL expected (Joshua)
3. Implement code (Sisyphus-Junior)
4. Run tests - PASS required (Joshua)
```

### 3. Category Required for Delegations (HARD BLOCK)

```
Missing category → BLOCKED with error:
"CATEGORY REQUIRED: All delegations must specify a category parameter"

Example: delegate_task(
  category="unit-testing",  // ✅ MANDATORY
  agent="Peter (Test Writer)",
  prompt="Write tests for UserService"
)
```

### 4. Strict Domain Separation (HARD BLOCK)

```
Cross-domain calls → BLOCKED with error:
"HIERARCHY VIOLATION: Agent 'planner-paul' is not authorized to call 'Paul'"

Domain boundaries:
- planner-paul CANNOT call Paul (user must manually switch)
- Paul CANNOT call planner-paul (user must manually switch)
- worker-paul CANNOT call Paul or planner-paul (autonomous only)
```

### 5. Paul Requires Formal Plans (HARD BLOCK)

```
Paul execution without plan → BLOCKED with message:
"No formal plan found. Please switch to @planner-paul to create a plan first."

Active plan detection:
- Most recent .md file in .paul/plans/ by modification time
- Paul reads plan on startup
```

### 6. Competency Routing (ADVISORY WARNING)

```
Wrong specialist for task → WARNING (not blocked):
"[COMPETENCY ADVISORY] Task contains visual/UI keywords but delegated to non-specialist.
Consider using frontend-ui-ux-engineer for UI work."

Allows Paul to proceed if there's valid reason
- UI work can flow through Sisyphus-Junior → frontend-ui-ux-engineer
- TDD warning blocks stripped during keyword scanning (prevents false positives)
- Git operations exempt from UI warnings
```

### 7. TODO Continuation (ADVISORY SUGGESTION)

```
Incomplete tasks remain → SUGGESTION (not forced):
"[ADVISORY] Incomplete tasks remain. Consider continuing with next task."

Allows Paul to:
- Skip blocked tasks that require user input
- Report status and wait for manual intervention
- Prevent infinite loops on stuck tasks
```

## Architecture Reference

**Detailed Documentation**:
- [`docs/OH_MY_LORD_ARCHITECTURE.md`](docs/OH_MY_LORD_ARCHITECTURE.md) - Complete architecture, hooks, enforcement mechanisms
- [`docs/MIGRATION_TO_STRICT_MODE.md`](docs/MIGRATION_TO_STRICT_MODE.md) - Migration guide from v2.0 to v3.0 (Strict Mode)
- [`AGENTS.md`](AGENTS.md) - Agent models, three-domain architecture, anti-patterns

**Key Topics**:
- Three-domain separation (Planning, Execution, Trivial)
- TDD enforcement mechanisms (HARD BLOCKS, not warnings)
- Hook system (hierarchy-enforcer, tdd-enforcement, sisyphus-orchestrator)
- Category validation and competency traps
- File locking for parallel delegation safety

## Credits

Based on [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) by [@code-yeongyu](https://github.com/code-yeongyu).

This fork adds mandatory TDD workflow with biblical agent naming while preserving all the excellent features of the original:
- Background agents
- LSP tools
- Context injection
- Compaction preservation
- And much more

## License

Same as original oh-my-opencode - [SUL-1.0](LICENSE.md)
