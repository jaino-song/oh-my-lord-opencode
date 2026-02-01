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

From `src/tools/delegate-task` and `src/tools/background-task`:
- `delegate_task`
- `background_output`
- `background_cancel`

Notes:
- `delegate_task` args are defined in `src/tools/delegate-task/types.ts`.

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
