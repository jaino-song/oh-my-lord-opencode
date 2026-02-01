# Repo Map

This is a holistic map of the codebase (directories, registries, and primary entry points).

## Top-Level

```
oh-my-lord-opencode/
├── src/                      # Plugin implementation (TypeScript)
│   ├── index.ts              # Plugin entry: tools, hooks, event pipeline
│   ├── agents/               # Built-in agents and prompt builders
│   ├── hooks/                # Lifecycle hooks (enforcement, injection, recovery)
│   ├── tools/                # Tool implementations (LSP, AST, delegation, etc.)
│   ├── features/             # Feature modules (Claude Code compat, skills, background)
│   ├── mcp/                  # Built-in remote MCP server configs
│   ├── config/               # Zod schema + types
│   ├── plugin-config.ts      # Loads JSONC config (user + project) and merges
│   ├── plugin-handlers/      # OpenCode config handler (agent/tool/hook wiring)
│   ├── plugin-state.ts       # Model context limit cache / plugin state
│   ├── shared/               # Shared utilities (merge, permissions, paths, logging)
│   └── cli/                  # bunx CLI (install/doctor/run)
├── docs/                     # This documentation
├── assets/                   # Generated schema output
└── dist/                     # Build output
```

## Code Registries (The “Source of Truth” Lists)

- Agents registry: `src/agents/index.ts` (exports `builtinAgents`)
- Agents builder/visibility/overrides: `src/agents/utils.ts` (`createBuiltinAgents`, `USER_SELECTABLE_AGENTS`)
- Hooks registry: `src/hooks/index.ts` (exports hook factories)
- Tools registry: `src/tools/index.ts` (exports `builtinTools` + tool factories)
- Built-in MCPs registry: `src/mcp/index.ts` (`createBuiltinMcps`)
- Config schema: `src/config/schema.ts`
- JSONC config loader: `src/plugin-config.ts`
- OpenCode config handler: `src/plugin-handlers/config-handler.ts`

## Execution Map (High-Level)

```
OpenCode loads plugin
  └─ src/index.ts (OhMyOpenCodePlugin)
       ├─ loadPluginConfig(...)            (src/plugin-config.ts)
       ├─ construct tools                  (src/tools/*)
       ├─ construct hooks                  (src/hooks/*)
       ├─ config handler                   (src/plugin-handlers/config-handler.ts)
       └─ wire event + tool pipelines
```
