# Oh My Lord OpenCode

> A TDD-first fork of [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) with mandatory Test-Driven Development workflow and biblical agent naming.

[![Based on oh-my-opencode](https://img.shields.io/badge/based%20on-oh--my--opencode-blue?style=flat-square)](https://github.com/code-yeongyu/oh-my-opencode)

## What Changed

This fork introduces a **mandatory TDD workflow** with a team of specialized agents named after biblical figures. The key difference: **code cannot be written without tests being planned first**.

### Agent Changes

| Original | This Fork | Role |
|----------|-----------|------|
| `orchestrator-sisyphus` | **Paul** | Master orchestrator - delegates everything, writes nothing |
| `Prometheus` (planner) | **planner-paul** | Implementation planner - gathers requirements, creates work plans |
| *(new)* | **Solomon** | TDD planner - plans tests BEFORE implementation |
| *(new)* | **Timothy** | Plan reviewer for planner-paul |
| *(new)* | **Thomas** | TDD plan reviewer - "Doubting Thomas" who verifies test specs |
| *(new)* | **Peter** | Jest unit test writer |
| *(new)* | **John** | Playwright E2E test writer |
| *(new)* | **Joshua** | Test runner - executes both Jest and Playwright |

### Why Biblical Names?

- **Paul**: The apostle who coordinated communities and delegated to Timothy, Titus, and others - perfect for an orchestrator
- **Solomon**: Known for wisdom and judgment - ideal for planning tests that define correct behavior
- **Thomas**: "Doubting Thomas" who needed to verify before believing - reviews plans to ensure quality
- **Peter & John**: The disciples who worked together - one writes unit tests, one writes E2E tests
- **Joshua**: Led the Israelites into the promised land - leads code into the "green" promised land of passing tests
- **Timothy**: Paul's trusted companion - reviews Paul's plans

## Why It Was Changed

### Problem with Original

The original oh-my-opencode is excellent, but TDD was **optional**. Developers could (and often did) skip writing tests, leading to:
- Bugs caught late in development
- Regression issues
- Code that's hard to refactor safely

### Solution: TDD as Default

In this fork:

1. **TDD is NON-NEGOTIABLE** for all code changes
2. **Paul never writes code** - all changes go through `delegate_task()`
3. **Both Jest AND Playwright** must pass before completion
4. **Clear exemptions** for non-code tasks (questions, docs, config)

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 1: IMPLEMENTATION PLANNING                    │
│                                                                  │
│  User Request                                                    │
│       ↓                                                          │
│  planner-paul ─── Interview Mode                                 │
│       │           (requirements, deliverables, tasks)            │
│       ↓                                                          │
│  Timothy reviews implementation plan                             │
│       ↓                                                          │
│  Implementation Plan Ready → .paul/plans/{name}.md               │
└─────────────────────────────────────────────────────────────────┘
                ↓ (auto-trigger)
┌─────────────────────────────────────────────────────────────────┐
│                PHASE 2: TEST PLANNING                            │
│                                                                  │
│  Solomon ← AUTO-TRIGGERED by planner-paul                        │
│       │                                                          │
│       │   Reads: .paul/plans/{name}.md                           │
│       ↓                                                          │
│  Solomon ─── Interview Mode (TEST-SPECIFIC)                      │
│       │      "Edge cases? Coverage? Browsers?"                   │
│       ↓                                                          │
│  Thomas reviews test specifications                              │
│       ↓                                                          │
│  Test Specifications Ready → .paul/plans/{name}-tests.md         │
└─────────────────────────────────────────────────────────────────┘
                ↓ (user switches to Paul)
┌─────────────────────────────────────────────────────────────────┐
│                PHASE 3: EXECUTION (Paul orchestrates)            │
│                                                                  │
│  Paul auto-detects .paul/plans/ on startup                       │
│       ↓                                                          │
│  ┌───────────────────────┐   ┌───────────────────────────┐      │
│  │ UNIT TEST TRACK       │   │ E2E TEST TRACK            │      │
│  │                       │   │                           │      │
│  │ 1. Peter (writes)     │   │ 1. John (writes)          │      │
│  │     ↓                 │   │     ↓                     │      │
│  │ 2. Sisyphus-Junior    │   │ 2. Sisyphus-Junior-visual │      │
│  │    (implements)       │   │    (implements)           │      │
│  │     ↓                 │   │     ↓                     │      │
│  │ 3. Joshua (verifies)  │   │ 3. Joshua (verifies)      │      │
│  └───────────────────────┘   └───────────────────────────┘      │
│              ↓                          ↓                        │
│            Both must PASS → REFACTOR → Done ✓                    │
└─────────────────────────────────────────────────────────────────┘
```

### TDD Exemptions

The **only** cases where TDD is skipped:

- Pure documentation changes (README, comments only)
- Config file changes with NO code impact
- Answering questions about the codebase
- Research/exploration tasks with no implementation output

Everything else requires TDD. No exceptions.

## Agent Visibility

Only 3 agents are visible in the `@` menu:

| Agent | Purpose |
|-------|---------|
| `Sisyphus` | Combined planner + implementer (legacy mode) |
| `Paul` | Master orchestrator with TDD workflow |
| `planner-paul` | Implementation planner |

All other agents (Solomon, Thomas, Peter, John, Joshua, etc.) are **hidden** and invoked automatically by the orchestrator.

## Plan Locations

```
.paul/
├── plans/
│   ├── {name}.md           # Implementation plan (planner-paul)
│   └── {name}-tests.md     # Test specifications (Solomon)
└── drafts/
    └── {name}.md           # Interview drafts (planner-paul)
```

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
| Paul | claude-sonnet-4-5 | Master orchestrator |
| planner-paul | claude-opus-4-5 | Implementation planning |
| Solomon | claude-opus-4-5 | TDD test planning |
| Thomas | claude-sonnet-4-5 | Plan review |
| Timothy | claude-sonnet-4-5 | Plan review |
| Peter | claude-sonnet-4-5 | Jest unit tests |
| John | claude-sonnet-4-5 | Playwright E2E tests |
| Joshua | claude-sonnet-4-5 | Test execution |
| oracle | gpt-5.2 | Architecture & debugging |
| explore | grok-code | Codebase exploration |
| librarian | glm-4.7-free | Documentation research |

## Key Enforcements

### 1. Paul Never Writes Code

```
Paul MUST delegate ALL code changes via delegate_task()
- No "simple" exceptions
- No "quick fixes" exceptions
- Every line of code goes through a subagent
```

### 2. Both Test Types Required

```
Joshua runs BOTH:
- Jest (unit tests)
- Playwright (E2E tests)

BOTH must pass. No skipping.
```

### 3. TDD is Default

```
User says "just code it" → TDD anyway
User says "skip tests" → Explain why TDD matters, proceed with TDD
User REPEATEDLY insists → Then (and only then) skip
```

## Architecture Reference

See [`docs/agent-architecture.yaml`](docs/agent-architecture.yaml) for the complete architecture specification including:

- Agent hierarchy and roles
- TDD workflow phases
- Gap handling protocols
- Plan formats and examples
- Context features and hooks

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
