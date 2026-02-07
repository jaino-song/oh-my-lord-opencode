# Oh My Lord OpenCode

> A strict TDD enforcement plugin for OpenCode with **Hub-and-Spoke Architecture**, **Token Optimization**, and biblical agent naming.

[![License](https://img.shields.io/badge/license-SUL--1.0-blue?style=flat-square)](LICENSE.md)

## What is Oh My Lord OpenCode?

Oh My Lord OpenCode is a batteries-included OpenCode plugin that provides advanced AI capabilities beyond standard OpenCode:

### Key Features

- **Multi-Model Orchestration**: Seamlessly switch between GPT-5.2, Claude, and Gemini models
- **Strict TDD Enforcement**: HARD BLOCKS for code-before-tests violations with RED-GREEN-REFACTOR workflow
- **Hub-and-Spoke Architecture**: Eliminates nested delegation, reducing token bloat by ~87%
- **20+ Specialized Agents**: From planning to testing, research to git operations
- **11 LSP Tools**: Full language server integration with intelligent completion
- **Built-in MCPs**: Context7 (1000+ libraries), Grep.app (500K+ repos), Exa AI web search
- **Real-time Token Analytics**: Track usage and costs across all agents and sessions
- **Toast Notifications**: Live workflow visibility with delegation events

### How It Works

**Three-Agent System** handles different task types:

| Agent | Use Case |
|--------|----------|
| **planner-paul** | Complex features, new architecture, multi-file changes |
| **Paul** | Execute formal plans from `.paul/plans/` |
| **worker-paul** | Small tasks (< 10 lines), single file, low risk |

**Workflow**: `@planner-paul` creates plan → `/hit-it` switches to `@Paul` for execution

### Architecture Benefits

**Hub-and-Spoke** pattern means:
- **Hubs** (Paul, planner-paul, worker-paul) delegate to specialists
- **Spokes** (specialists) NEVER delegate to other spokes
- Result: No token bloat from nested chains, clear visibility

### Token Efficiency

Oh My Lord OpenCode optimizes token usage:
- **Lazy Loading**: Agent docs loaded only when needed
- **Summarized Outputs**: Structured JSON + SUMMARY instead of verbose markdown
- **Context Hygiene**: Hubs stay lightweight (~12k tokens)

**Result**: ~87% reduction compared to traditional delegation

## Releases

| Version | Description |
|---------|-------------|
| [v0.14.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.14.0) | `/hit-it` command, mandatory todos, rate-limit detection |
| [v0.13.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.13.0) | Automatic retry with fallback models |
| [v0.12.1](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.12.1) | Timothy model migration, toast branding |
| [v0.12.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.12.0) | Structured outputs, 65% token reduction |
| [v0.11.2](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.2) | Approval system fix |
| [v0.11.1](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.1) | Paul migration, hierarchy enforcer |
| [v0.11.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.0) | v3.1 agents, toast notifications |

## Agent Overview

### Core Agents

| Agent | Role | Description |
|--------|------|-------------|
| **Paul** | Main execution orchestrator - handles everything directly |
| **planner-paul** | Planning orchestrator - creates formal implementation plans |
| **worker-paul** | Trivial task handler - autonomous execution of small changes |

### Specialist Agents

| Agent | Domain | Description |
|--------|---------|-------------|
| **Nathan** | Request Analyst - analyzes requirements and task complexity |
| **Timothy** | Plan Reviewer - reviews implementation plans for clarity |
| **Solomon** | TDD Planner - designs comprehensive test strategies |
| **Thomas** | TDD Reviewer - audits test specifications |
| **Elijah** | Deep Reasoning Advisor - plan reviews (security/perf/arch) + execution debugging |
| **Ezra** | Alternative Plan Reviewer - provides plan quality feedback |
| **Peter** | Test Writer - creates Jest unit tests |
| **John** | E2E Test Writer - creates Playwright end-to-end tests |
| **Joshua** | Test Runner - executes tests and verifies results |
| **Paul-Junior** | Backend/Logic - focused implementation without delegation |
| **frontend-ui-ux-engineer** | UI/CSS/React - visual interface implementation |
| **git-master** | Git Operations - version control and workflows |
| **Saul** | Advanced Git Operations - rebase, squash, bisect |
| **ultrabrain** | Complex Logic - algorithms, security, architecture |
| **librarian** | Multi-repo Research - documentation and codebase research |
| **explore** | Fast Navigation - quick codebase exploration |
| **multimodal-looker** | Visual Analysis - image/PDF/diagram interpretation |
| **document-writer** | Documentation - technical writing and API docs |

## Tools & Integrations

- **11 LSP Tools**: Full language server integration
- **AST-Grep**: Structural code search and refactoring
- **Session Management**: History tracking and search
- **Built-in MCPs**:
  - Context7 (1000+ library docs)
  - Grep.app (500K+ GitHub repos)
  - Exa AI web search
  - n8n workflow automation
- **Token Analytics**: Real-time usage and cost tracking

## License

[SUL-1.0](LICENSE.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Acknowledgments

Built with:
- [OpenCode SDK](https://github.com/opencode-ai/sdk) - Plugin framework
- [Bun](https://bun.sh/) - JavaScript runtime
- [AST-Grep](https://ast-grep.github.io/) - Structural code search
- [Zod](https://zod.dev/) - Schema validation
- [TypeScript](https://www.typescriptlang.org/) - Type safety

**Made with ❤️ by Oh My Lord OpenCode team**
