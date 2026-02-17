# Tool Reference

This is the comprehensive list of tools the plugin registers.

Authoritative sources:
- Built-in tools: `src/tools/index.ts` (`builtinTools`)
- Extra tools registered in plugin: `src/index.ts` (`tool: { ... }`)

## Tools Registered

### Code Intelligence (LSP)

From `src/tools/lsp`:
- `lsp_goto_definition`
- `lsp_find_references`
- `lsp_symbols`
- `lsp_diagnostics`
- `lsp_prepare_rename`
- `lsp_rename`

### AST Tools

From `src/tools/ast-grep`:
- `ast_grep_search`
- `ast_grep_replace`

### Search

From `src/tools/grep` and `src/tools/glob`:
- `grep`
- `glob`

### Session History

From `src/tools/session-manager`:
- `session_list`
- `session_read`
- `session_search`
- `session_info`

### Delegation / Background

From `src/tools/delegate-task`, `src/tools/background-task`, and `src/tools/signal-done`:
- `delegate_task`
- `background_output`
- `background_cancel`
- `signal_done`
- `execute_phase`

Notes:
- `delegate_task` args are defined in `src/tools/delegate-task/types.ts`.
- `delegate_task` supports `output_format: "summary" | "full"` (default: `summary`). `summary` truncates long outputs; use `full` for long plan/spec outputs.
- `signal_done` is called by subagents to explicitly signal completion to the orchestrator.
- `execute_phase` reads `EXEC::` todos and executes one phase at a time; task-level `(Skills: ...)` metadata overrides phase-level `skills` argument.
- `execute_phase` also supports `(Contracts: ...)`, `(Files: ...)`, and `(TODO-IDs: ...)` metadata: contract refs are injected into delegated prompts, and tasks fail if listed TODO/FIXME anchors remain in listed files.
- `execute_phase` now validates machine-readable contract blocks (`schemaVersion: "contracts-v1"`) first, then falls back to markdown contract parsing; includes preflight validation, file-scope enforcement, contract acceptance checks, and automatic frontend conformance checks.
- File-scope enforcement uses delegated tool traces first and then applies a git-diff snapshot fallback to catch newly introduced file edits per task.
- Frontend conformance enforcement mode is configurable via `execute_phase.frontend_conformance_mode` (`strict` | `normal` | `off`).
- Contract schema reference and templates: `docs/CONTRACTS_V1.md`.

### Explore/Librarian Spawner

From `src/tools/call-paul-agent`:
- `call_paul_agent`

This tool only supports spawning `explore` and `librarian`.

Many prompts/templates mention `call_omo_agent` (legacy name). In this plugin, the active spawner tool is `call_paul_agent`.

### Skills and Commands

From `src/tools/skill`, `src/tools/skill-mcp`, `src/tools/slashcommand`:
- `skill`
- `skill_mcp`
- `slashcommand`

### Terminal and Multimodal

From `src/tools/interactive-bash` and `src/tools/look-at`:
- `interactive_bash`
- `look_at`

### Analytics

From `src/features/token-analytics`:
- `token_report`
