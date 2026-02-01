# MCP (Model Context Protocol)

This plugin supports MCP in three ways.

## 1) Built-in Remote MCP Servers

Defined in `src/mcp/` and created via `createBuiltinMcps(...)`:
- `websearch`
- `context7`
- `grep_app`

These are remote MCP configs (URL + optional headers).

## 2) Claude Code MCP Loading

Claude Code `.mcp.json` files are loaded (if enabled) via `src/features/claude-code-mcp-loader`.

## 3) Skill-Embedded MCP

Skills may embed MCP server configs (frontmatter). Runtime manager:
- `src/features/skill-mcp-manager`

Tool to invoke MCP from a loaded skill:
- `skill_mcp`
