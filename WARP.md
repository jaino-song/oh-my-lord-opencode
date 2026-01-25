# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Core commands and workflows

### Installation and setup
- Install dependencies (Bun only): `bun install`
- This project assumes:
  - Bun as the only package manager
  - TypeScript 5.7.3+ with `bun-types`
  - ESM-only modules (`"type": "module"` in `package.json`)

### Build
- Standard build (plugin + CLI + schema):
  - `bun run build`
    - Bundles `src/index.ts` to ESM in `dist/`
    - Bundles CLI (`src/cli/index.ts`) to `dist/cli/`
    - Emits type declarations via `tsc --emitDeclarationOnly`
    - Regenerates the JSON schema via `bun run build:schema`
- Schema-only build (after changing config schema in `src/config/schema.ts`):
  - `bun run build:schema`
- Full build including native binaries (rarely needed in day‑to‑day editing):
  - `bun run build:all` (runs `build` then `build:binaries`)
- Clean build output:
  - `bun run clean` (removes `dist/`)

### Type checking and "linting"
- There is no separate lint script; TypeScript strict mode is the primary static check:
  - `bun run typecheck`

### Tests
- Test runner is Bun’s built-in test harness (no separate Jest script):
  - Run all tests: `bun test`
  - Run a subset by pattern (file or test name): `bun test <pattern>`
    - Example: `bun test todo-continuation`
  - Watch mode: `bun test --watch`
- Tests are colocated with source files as `*.test.ts`. When adding new logic, add or adjust the nearest `*.test.ts` rather than creating an unstructured tests directory.

### CLI usage
- This package exposes a CLI binary:
  - `bunx oh-my-lord-opencode <command>`
- Important subcommands (see `src/cli/`):
  - `install` – interactive installer and initial setup
  - `doctor` – environment and configuration diagnostics
  - `run` – launches an OpenCode session with the plugin, enforcing TODO and background-task rules
  - `get-local-version` – reports the locally installed plugin version

### Testing the plugin inside OpenCode
- Build the plugin:
  - `bun run build`
- Point OpenCode at the built plugin (update `~/.config/opencode/opencode.json`):
  - Set `plugin` to `"file:///absolute/path/to/oh-my-lord-opencode/dist/index.js"`
  - Ensure any npm-installed `oh-my-opencode` plugin is removed from the `plugin` array to avoid conflicts
- Restart OpenCode to load the new build.

## High-level architecture

### Top-level layout
- `src/index.ts`
  - The main OpenCode plugin entry. Wires together hooks, tools, features, configuration handling, and background managers.
  - Returns the plugin’s tool map (`builtinTools`, background tools, `delegate_task`, `skill`, `skill_mcp`, `slashcommand`, `interactive_bash`, etc.) and binds all runtime hooks to event handlers.
- `src/agents/`
  - Defines all AI agents and their prompts, including the orchestrator and specialist agents.
  - Important concepts:
    - **Paul** – master orchestrator (internally based on `orchestrator-sisyphus`) that delegates work to sub‑agents and is TDD‑aware.
    - **planner-paul** – implementation planner for Paul (defined in the architecture spec; some implementation tasks are still pending).
    - **Solomon** – TDD test planner that produces unit/E2E test specifications.
    - **Thomas** – TDD plan consultant reviewing implementation and test plans.
    - **Peter** – Jest/Bun-style unit test writer (produces `*.test.ts` / `*.spec.ts`).
    - **John** – Playwright-style E2E test writer.
    - **Joshua** – unified test runner agent that runs both unit and E2E suites.
    - Specialist consultants such as `oracle`, `explore`, `librarian`, `frontend-ui-ux-engineer`, `document-writer`, `multimodal-looker`.
  - Agent registration and model defaults live in `src/agents/index.ts`, `src/agents/types.ts`, and `src/agents/utils.ts`.
- `src/hooks/`
  - 20+ lifecycle hooks that intercept or modify behavior at various stages:
    - Orchestration (`sisyphus-orchestrator` / Paul’s runtime bridge)
    - Context-window management and compaction (`anthropic-context-window-limit-recovery`, `context-window-monitor`, `preemptive-compaction`)
    - TODO enforcement (`todo-continuation-enforcer`, `start-work`, task-resume tooling)
    - Directory and rules injectors (`directory-agents-injector`, `directory-readme-injector`, `rules-injector`)
    - Safety and UX hooks (`comment-checker`, `thinking-block-validator`, `edit-error-recovery`, `delegate-task-retry`, `non-interactive-env`)
    - Behavior bridges to existing Claude Code hooks (`claude-code-hooks` related hooks)
  - All hooks are instantiated and conditionally enabled in `src/index.ts` based on plugin config.
- `src/tools/`
  - Implements concrete tools exposed to agents:
    - LSP client and tools (`lsp/`) for diagnostics, rename/prepareRename, etc.
    - AST-grep tools (`ast-grep/`) with both NAPI and CLI backends.
    - Search utilities (`grep/`, `glob/`).
    - Background task orchestration (`background-task/`, `sisyphus-task/`).
    - Session tools (`session-manager/`) for reading and querying OpenCode session history.
    - Multimodal and shell integration (`look-at`, `interactive-bash`).
    - Skill loader and MCP tools (`skill/`, `skill-mcp/`, `slashcommand`).
  - All tools are exported from `src/tools/index.ts` and then surfaced from `src/index.ts` in the `tool` map.
- `src/features/`
  - Higher-level feature modules and compatibility layers:
    - Claude Code compatibility loaders for agents, commands, MCPs, and plugins.
    - Background agent manager, task toast notifications.
    - Built-in skills (e.g., Git workflows, Playwright, frontend/UX helpers).
    - Skill–MCP integration and dynamic discovery of skills from OpenCode and Claude.
    - Context injector that aggregates rules, README, AGENTS.md, and other context sources.
- `src/shared/`
  - Cross-cutting utilities: config path resolution, JSONC parsing, deep-merge utilities, dynamic truncation, version and permission helpers, session cursors, logging, file utilities, and model sanitization.
  - Any new cross-cutting behavior should go here instead of being re‑implemented in agents or hooks.
- `src/cli/`
  - Commander-based CLI that backs `oh-my-lord-opencode`:
    - `install` TUI, `doctor` health checks, `run` launcher, and local-version helpers.
    - Uses `ConfigManager` under the hood for JSONC parsing and configuration merging.
- `docs/agent-architecture.yaml`
  - Canonical, machine- and human-readable description of the agent hierarchy, TDD workflow, plan formats, and configuration conventions.
  - When you make substantive changes to agents, the TDD flow, or plan locations, you should treat this file as a **source of truth** and keep it synchronized with the code.

### TDD-first agent architecture (conceptual overview)
- The repository enforces a **TDD‑first workflow** at the agent level:
  1. **Implementation planning** – `planner-paul` gathers requirements and produces implementation plans in `.paul/plans/{name}.md`, with mandatory review from `Thomas` (and optional `Momus`).
  2. **Test planning** – `Solomon` reads implementation plans, interviews for test‑specific details, and writes test specifications to `.paul/plans/{name}-tests.md`, again reviewed by `Thomas` (and optionally `Momus`).
  3. **Execution** – `Paul` orchestrates:
     - Test writing (RED): delegates to `Peter` (unit tests) and `John` (E2E tests).
     - Implementation (GREEN): delegates to `Sisyphus-Junior-*` agents by category (backend, frontend, quick fixes, etc.).
     - Verification and refactor: delegates test execution to `Joshua` and refactoring back to Sisyphus-Junior while keeping tests green.
- The architecture described in `docs/agent-architecture.yaml` is more detailed than the current implementation in some areas (e.g., `planner-paul` is still marked as pending work). When editing agents or hooks, align code changes with that spec and update both sides where necessary.

## Project-specific rules for WARP

These rules codify existing project documentation (AGENTS.md files, README, and the architecture spec). When acting in this repo, WARP should honor them.

### Tooling and language
- **Bun only** – never introduce npm or Yarn workflows; rely on `bun install`, `bun run <script>`, and `bun test`.
- **Types** – use `bun-types` only; do not add `@types/node` or other Node typings.
- **Modules** – ESM everywhere. Avoid CommonJS patterns and `require`.
- **Exports** – prefer named exports; avoid adding new default exports.
- **Main entry** – do not export functions from `src/index.ts` other than the plugin itself and the re‑exported config types. OpenCode treats all exports as plugin instances.

### Testing and TDD
- **TDD is non‑negotiable** for new or changed behavior:
  - Follow **RED → GREEN → REFACTOR**.
  - Add or update `*.test.ts` files next to the code you touch.
  - Use BDD‑style comments in tests (`#given`, `#when`, `#then`) as documented in the project rules.
- When modifying orchestrator or agent behavior related to code changes (e.g., Paul, Solomon, Peter, John, Joshua, Sisyphus-Junior):
  - Preserve the high‑level TDD flow described in `docs/agent-architecture.yaml`.
  - Keep “Paul never writes code” semantics – Paul should orchestrate via `delegate_task` rather than inlining edits.
- When test or plan locations change (e.g., `.paul/plans/**`, `.sisyphus/plans/**`), update both code and `docs/agent-architecture.yaml` so they stay consistent.

### Hooks, tools, and shared utilities
- **Hooks**
  - Avoid heavy or blocking work in `PreToolUse` / `tool.execute.before` hooks; these run on every tool call.
  - Prefer adding lightweight, composable hooks under `src/hooks/` and wiring them through `src/index.ts` instead of embedding behavior in multiple places.
- **Tools**
  - Do not introduce synchronous filesystem operations in tools; use async APIs.
  - For AST‑related operations, prefer `@ast-grep/napi` and the existing `ast-grep` utilities instead of raw `spawn` calls.
  - Always add timeouts and error handling around external processes or long‑running operations (LSP, AST‑grep, CLI tools).
- **Shared utilities**
  - Use `shared` helpers for cross‑cutting behavior:
    - Config paths (`getClaudeConfigDir`, `getOpenCodeConfigDir`)
    - JSONC parsing (`parseJsonc` / `parseJsoncSafe`) instead of `JSON.parse` on user configs
    - Deep merges (`deepMerge`) for configuration layers
    - Token‑aware truncation (`dynamicTruncate`) for large tool outputs
    - Version checks (`isOpenCodeVersionAtLeast`) instead of ad‑hoc string comparisons

### Release and packaging
- Do **not** bump `version` in `package.json` or add publish scripts; versioning and publishing are handled by CI.
- Do **not** call `bun publish` from this repo; publishing is intended to be done via the existing GitHub Actions workflows.

### Prompt and model constraints
- When editing agent prompts or model configuration:
  - Keep temperature for code‑oriented agents at or below 0.3.
  - Avoid hard‑coding the year 2024 in prompts; refer to the current year or keep prompts time‑neutral.
  - Respect existing agent model choices unless there is a strong, documented reason to change them (and then update `docs/agent-architecture.yaml` accordingly).

### Workflow expectations for multi-step changes
- For any change that spans multiple logical steps (new feature, non‑trivial refactor, new agent/hook/tool):
  - Maintain an explicit TODO/task breakdown (this aligns with both the repository’s own agent workflows and Warp’s internal TODO tooling).
  - Keep tests and implementation in the same logical change: do not “fix” failing tests by deleting or commenting them out.

## Complexity hotspots
- Some files are intentionally dense and should be modified carefully and incrementally:
  - `src/agents/orchestrator-sisyphus.ts` (Paul orchestrator)
  - `src/agents/prometheus-prompt.ts` / planner‑style prompts
  - `src/features/background-agent/manager.ts`
  - `src/hooks/sisyphus-orchestrator/index.ts`
- When editing these, prefer small, well‑tested changes over large rewrites, and cross‑check behavior against `docs/agent-architecture.yaml` and the relevant `AGENTS.md` knowledge-base file for that directory.