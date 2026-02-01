# Feature Modules

This document maps `src/features/*` modules and their roles.

## Core Runtime

- `background-agent`: background sessions (task lifecycle, concurrency, cleanup)
- `boulder-state`: persisted state storage for long-running workflows
- `task-toast-manager`: toast notifications for tasks
- `token-analytics`: token usage tracking + `token_report` tool
- `agent-context`: resolves parent/current agent for a session

## Context Collection / Injection

- `context-injector`: registers and injects context (used by message transforms)
- `hook-message-injector`: message metadata + nearest-message lookup

## Skills

- `builtin-skills`: built-in skills (templates + optional embedded MCP config)
- `opencode-skill-loader`: discovers and merges skills from multiple paths
- `skill-mcp-manager`: manages MCP servers declared by skills

## Commands

- `builtin-commands`: built-in command templates
- `claude-code-command-loader`: loads Claude Code commands from `.claude/commands` paths

## Claude Code Compatibility

- `claude-code-agent-loader`: loads Claude Code agents from `.claude/agents` paths
- `claude-code-mcp-loader`: loads `.mcp.json` and transforms to OpenCode format
- `claude-code-plugin-loader`: loads installed Claude Code plugins and extracts components
- `claude-code-session-state`: tracks per-session agent state

Note: Claude Code hook execution compatibility is implemented as a hook (`src/hooks/claude-code-hooks`), not a feature module.
