# Oh My Lord OpenCode

> The best AI agent harness — a batteries-included OpenCode plugin with **multi-model orchestration**, **strict TDD enforcement**, **30+ lifecycle hooks**, and biblical agent naming.

[![Latest Release](https://img.shields.io/github/v/release/jaino-song/oh-my-lord-opencode?style=flat-square&color=blue)](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.21.0)
[![License](https://img.shields.io/badge/license-SUL--1.0-blue?style=flat-square)](LICENSE.md)

## What is Oh My Lord OpenCode?

Oh My Lord OpenCode transforms [OpenCode](https://github.com/opencode-ai/opencode) into a strict, multi-model AI project manager. It orchestrates 20+ specialized agents across Claude, GPT-5.2, Gemini 3, and GLM-4.7 — enforcing TDD workflows, delegation hierarchies, and code quality at the hook level.

### Core Philosophy: Zero-Trust Orchestration

LLMs cut corners. Rather than relying on prompt instructions alone, oh-my-lord-opencode **prevents** rule-breaking via code-level hooks that throw errors. Prompts can be ignored — thrown errors cannot.

## Key Features

- **Multi-Model Orchestration** — Seamlessly switch between Claude (Opus/Sonnet/Haiku), GPT-5.2, Gemini 3 Pro, and GLM-4.7 within a single workflow
- **Strict TDD Enforcement** — HARD BLOCKS for code-before-tests violations with mandatory RED-GREEN-REFACTOR cycle
- **30+ Lifecycle Hooks** — Code-level enforcement for hierarchy, TDD, workflow, context injection, recovery, and more
- **Three-Domain Architecture** — Strict separation between Planning, Execution, and Trivial task domains
- **25+ Built-in Tools** — LSP (6), AST-Grep (2), search (2), session management (4), delegation (5), skills (3), terminal, multimodal, analytics
- **Built-in MCPs** — Context7 (1000+ library docs), Grep.app (500K+ GitHub repos), Exa AI web search
- **Automated Review Chain** — Mandatory multi-stage plan validation: Elijah (security/perf/arch) → Ezra (quality) → Solomon (test planning) → Thomas (TDD audit)
- **Real-time Token Analytics** — Track usage and costs across all agents and sessions
- **Background Execution** — Parallel sub-agent delegation with concurrency up to 10 tasks
- **Claude Code Compatibility** — Loads `.claude/` agents, commands, hooks, MCP configs, and plugins
- **Toast Notifications** — Live workflow visibility with delegation events and agent transitions

## How It Works

### Three-Agent System

| Agent | Use Case | Model |
|-------|----------|-------|
| `@planner-paul` | Complex features, new architecture, multi-file changes | Claude Opus 4 |
| `@Paul` | Execute formal plans from `.paul/plans/` | Claude Opus 4 |
| `@worker-paul` | Small standalone tasks, quick fixes | Claude Opus 4 |

### Workflow (v4.2 — Auto-Continue)

```
User → @planner-paul "Build user authentication with JWT"
    |
    Phase 0: Nathan impact analysis (via explore/librarian)
    |         trivial? → "Switch to @worker-paul" → STOP
    |         non-trivial? → AUTO-CONTINUE (no user gate)
    |
    Phase 1: Research (parallel explore/librarian scouts)
    |
    Phase 2: Plan generation → .paul/plans/{name}.md
    |
    Phase 3: Mandatory review chain:
    |         1. Elijah — security/perf/arch (35-item checklist, loop until PASS)
    |         2. Ezra — deep plan review (confidence scoring, loop until PASS)
    |         3. Solomon — test planning (comprehensive test specs)
    |         4. Thomas — TDD audit (loop until approved)
    |
    Phase 4: EXEC:: todos with agent/skill/contract metadata
    |
    → "Plan ready. Switch to @Paul to execute." → STOP

User → @Paul
    |
    1. Reads plan, executes via execute_phase
    2. TDD loop per task: Peter/John write tests → Joshua runs (RED) → Paul-Junior/frontend implements → Joshua runs (GREEN)
    3. Elijah --verify-plan (post-implementation verification)
    4. Reports completion
```

### Architecture: Zero-Trust Enforcement

```
                    ┌─────────────────┐
                    │  planner-paul   │  Planning domain
                    │  (plans only)   │
                    └────────┬────────┘
                             │ user switches manually
                    ┌────────┴────────┐
                    │                 │
            ┌───────▼──────┐  ┌──────▼───────┐
            │     Paul     │  │ worker-paul  │  Execution / Trivial
            │ (orchestrate)│  │ (standalone) │
            └───────┬──────┘  └──────────────┘
                    │
    ┌───────┬───────┼───────┬───────┐
    ▼       ▼       ▼       ▼       ▼
 Testing  Impl   Research  Git   Review
```

**Key rules (enforced by hooks, not prompts):**
- Cross-domain calls are **HARD BLOCKED** (Paul cannot call planner-paul, worker-paul cannot call Paul)
- Orchestrators **cannot write code** — they must delegate to specialists
- Subagents **cannot delegate** to other subagents — only hubs orchestrate
- Code without tests is **HARD BLOCKED** — TDD enforcement throws errors
- Wrong specialist for task type triggers **advisory warnings**

## Agent Roster

### Core Orchestrators

| Agent | Model | Role |
|-------|-------|------|
| **planner-paul** | Claude Opus 4 | Creates formal implementation plans with mandatory review chain |
| **Paul** | Claude Opus 4 | Executes plans — delegates to specialists, never implements directly |
| **worker-paul** | Claude Opus 4 | Autonomous executor for standalone tasks (scales with complexity) |
| **Saul** | Claude Sonnet 4.5 | Bare model — minimal prompt, no framework overhead |

### Planning Assistants

| Agent | Model | Role |
|-------|-------|------|
| **Nathan** | Claude Opus 4 | Request analyst — impact-based triviality detection |
| **Elijah** | Claude Opus 4 | Deep reasoning advisor — security/perf/arch reviews (35-item checklist) |
| **Ezra** | Claude Opus 4 | Plan reviewer — confidence scoring and quality feedback |
| **Solomon** | Claude Opus 4 | TDD planner — comprehensive test strategy design |
| **Thomas** | Claude Sonnet 4.5 | TDD reviewer — audits test specifications |
| **Timothy** | Claude Sonnet 4.5 | Quick plan reviewer (used by Paul mid-execution) |

### Implementation Specialists

| Agent | Model | Role |
|-------|-------|------|
| **Paul-Junior** | Claude Opus 4 | Backend/logic implementation (no delegation allowed) |
| **frontend-ui-ux-engineer** | Gemini 3 Pro | UI/UX implementation — CSS, React, visual interfaces |
| **ultrabrain** | OpenAI o1 | Hard logic — algorithms, security-critical, architecture |

### Testing Agents

| Agent | Model | Role |
|-------|-------|------|
| **Joshua** | GLM-4.7 | Test runner — executes tests, reports pass/fail |
| **Peter** | GLM-4.7 | Unit test writer (Jest/Bun test) |
| **John** | GLM-4.7 | E2E test writer (Playwright) |

### Research & Utility

| Agent | Model | Role |
|-------|-------|------|
| **explore** | Claude Haiku 4.5 | Fast codebase navigation and search |
| **librarian** | GLM-4.7 | Multi-repo analysis and documentation lookup |
| **git-master** | GLM-4.7 | Git operations — atomic commits, workflows |
| **document-writer** | Gemini 3 Flash | Technical documentation generation |
| **multimodal-looker** | Gemini 3 Flash | Image/PDF/diagram analysis |

## Tools (25+)

| Category | Tools | Description |
|----------|-------|-------------|
| **LSP** (6) | `lsp_goto_definition`, `lsp_find_references`, `lsp_symbols`, `lsp_diagnostics`, `lsp_prepare_rename`, `lsp_rename` | IDE-grade code intelligence |
| **AST-Grep** (2) | `ast_grep_search`, `ast_grep_replace` | Structural code search/rewrite across 25+ languages |
| **Search** (2) | `grep`, `glob` | Timeout-safe content and file pattern search |
| **Session** (4) | `session_list`, `session_read`, `session_search`, `session_info` | History navigation and retrieval |
| **Delegation** (5) | `delegate_task`, `call_paul_agent`, `execute_phase`, `background_output`, `background_cancel` | Agent orchestration and parallel execution |
| **Skills** (3) | `skill`, `skill_mcp`, `slashcommand` | Extensible skill system with embedded MCP support |
| **Terminal** | `interactive_bash` | Tmux session management for TUI apps |
| **Multimodal** | `look_at` | PDF, image, and diagram analysis |
| **Analytics** | `token_report` | Real-time token usage and cost tracking |
| **Completion** | `signal_done` | Subagent completion signaling |

## Hooks (30+)

The primary enforcement layer. Hooks intercept tool calls, events, and messages — throwing errors for violations.

### Enforcement Hooks

| Hook | Type | Purpose |
|------|------|---------|
| `hierarchy-enforcer` | Hard block | Three-domain agent architecture, cross-domain call prevention |
| `tdd-enforcement` | Hard block | RED-GREEN-REFACTOR cycle, dirty file tracking |
| `strict-workflow` | Hard block | Bun-only package management, Conventional Commits |
| `parallel-safety-enforcer` | Hard block | File conflict prevention in parallel tasks |
| `planner-md-only` | Hard block | Restricts planners to `.paul/` markdown files |
| `paul-orchestrator` | Advisory | Orchestrator role enforcement (delegate, don't implement) |

### Context Injection Hooks

| Hook | Purpose |
|------|---------|
| `directory-agents-injector` | Auto-injects `AGENTS.md` from subdirectories |
| `directory-readme-injector` | Auto-injects `README.md` from subdirectories |
| `rules-injector` | Conditional rule injection from `.claude/rules/` |
| `plan-summary-injector` | Plan progress summaries for Paul |
| `compaction-context-injector` | Preserves critical context across session compaction |

### Recovery Hooks

| Hook | Purpose |
|------|---------|
| `session-recovery` | Auto-recovers from crashes, corruption, interrupted states |
| `anthropic-context-window-limit-recovery` | Preemptive compaction at 85% context usage |
| `edit-error-recovery` | Catches Edit tool mistakes, forces corrective action |
| `delegate-task-retry` | Parses delegation errors, provides retry guidance |

### Workflow Hooks

| Hook | Purpose |
|------|---------|
| `todo-notification` | OS notifications for todo progress |
| `delegation-notification` | Agent-specific toasts with approval recording |
| `hit-it` | `/hit-it` command to switch from planning to execution |
| `auto-slash-command` | Detects `/command` patterns in prompts |
| `clarification-handler` | Bidirectional orchestrator-subagent conversation |
| `signal-done-enforcer` | Ensures subagents call `signal_done` before stopping |
| `comment-checker` | Prevents AI-generated slop and excessive comments |
| `context-window-monitor` | Prevents "context anxiety" — reminds agents of remaining context |

## Built-in MCPs

| MCP | Description |
|-----|-------------|
| **Context7** | Documentation for 1000+ libraries — query docs inline |
| **Grep.app** | Search across 500K+ public GitHub repositories |
| **Exa AI** | Web search with clean, LLM-ready content |

Also supports:
- **Claude Code MCP loading** — reads `.mcp.json` configs
- **Skill-embedded MCP** — skills can declare their own MCP servers

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest) — the only supported runtime
- [OpenCode](https://github.com/opencode-ai/opencode) — the host CLI
- TypeScript 5.7.3+

### Installation

```bash
# Install from GitHub release
# Add to your OpenCode configuration:
# ~/.config/opencode/config.json
{
  "plugin": [
    "oh-my-lord-opencode"
  ]
}
```

### Development

```bash
git clone https://github.com/jaino-song/oh-my-lord-opencode.git
cd oh-my-lord-opencode
bun install

bun run build            # ESM + declarations + schema
bun run typecheck        # Strict TypeScript checking
bun test                 # Run full test suite (84+ test files)
bun test <pattern>       # Run specific tests
```

### Configuration

Config file: `~/.config/opencode/oh-my-lord-opencode.json` or `.opencode/oh-my-lord-opencode.json`

Supports JSONC (comments and trailing commas).

## Project Structure

```
oh-my-lord-opencode/
├── src/
│   ├── agents/        # 20+ AI agents with model configs
│   ├── hooks/         # 30+ lifecycle hooks (enforcement layer)
│   ├── tools/         # 25+ tools (LSP, AST-Grep, delegation, etc.)
│   ├── features/      # Background agents, skills, Claude Code compat
│   ├── shared/        # Cross-cutting utilities
│   ├── cli/           # CLI installer and doctor checks
│   ├── mcp/           # Built-in MCPs (Context7, Grep.app, Exa)
│   ├── config/        # Zod schema for plugin configuration
│   └── index.ts       # Main plugin entry point
├── docs/              # Canonical documentation (14 files)
├── script/            # Build and publish scripts
├── assets/            # JSON schema output
└── dist/              # Build output (ESM + .d.ts)
```

## Releases

| Version | Date | Highlights |
|---------|------|------------|
| [v0.21.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.21.0) | 2026-02-11 | **Latest** — worker-paul v3.5 autonomous executor, `--override` enforcement, scaled investigation |
| [v0.20.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.20.0) | 2026-02-07 | Mandatory Elijah review in planning chain, `--plan-review` and `--verify-plan` modes |
| [v0.19.2](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.19.2) | 2026-02-06 | Model upgrades (GPT-5.3-codex), universal explore/librarian access |
| [v0.19.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.19.0) | 2026-02-06 | Direct bash execution for Paul agents, deprecated agent cleanup |
| [v0.18.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.18.0) | 2026-02-05 | Removed truncation bottlenecks, concurrency 3→10, mandatory scout policy |
| [v0.17.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.17.0) | 2026-02-03 | Boulder continuation, 7-section compaction summaries, deprecated agent removal |
| [v0.16.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.16.0) | 2026-02-02 | planner-paul v4.2 auto-continue workflow, manual agent switching |
| [v0.15.2](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.15.2) | 2026-02-01 | Canonicalized docs, clarification handler, category presets |
| [v0.15.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.15.0) | 2026-02-01 | Agent model updates (GLM-4.7, Sonnet 4.5), reasoning effort config |
| [v0.14.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.14.0) | 2026-01-30 | `/hit-it` command, mandatory todos, rate-limit detection |
| [v0.13.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.13.0) | 2026-01-29 | Automatic retry with fallback models |
| [v0.12.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.12.0) | 2026-01-28 | Structured outputs, 65% token reduction |
| [v0.11.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.0) | 2026-01-27 | v3.1 agents, toast notifications, hierarchy enforcer |

## Documentation

Full documentation lives in [`docs/`](docs/):

| Document | Description |
|----------|-------------|
| [AGENTS.md](docs/AGENTS.md) | Complete agent reference with models and call graph |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, enforcement mechanisms, data structures |
| [HOOKS.md](docs/HOOKS.md) | All 30+ hooks with behavior details |
| [TOOLS.md](docs/TOOLS.md) | Tool registry and usage notes |
| [WORKFLOWS.md](docs/WORKFLOWS.md) | User workflows for different task types |
| [FEATURES.md](docs/FEATURES.md) | Feature module reference |
| [MCP.md](docs/MCP.md) | MCP integration (built-in, Claude Code, skill-embedded) |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Config schema and options |
| [CLI.md](docs/CLI.md) | CLI installer and doctor commands |
| [CONTRACTS_V1.md](docs/CONTRACTS_V1.md) | Machine-readable contract schema for plan execution |

## License

[Sustainable Use License 1.0 (SUL-1.0)](LICENSE.md)

## Acknowledgments

Built with:
- [OpenCode](https://github.com/opencode-ai/opencode) — Plugin host framework
- [Bun](https://bun.sh/) — JavaScript runtime
- [AST-Grep](https://ast-grep.github.io/) — Structural code search
- [Zod](https://zod.dev/) — Schema validation
- [TypeScript](https://www.typescriptlang.org/) — Type safety
