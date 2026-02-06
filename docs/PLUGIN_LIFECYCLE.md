# Plugin Lifecycle (How It Runs)

This document describes what `src/index.ts` wires into OpenCode: tools, hooks, skills, commands, MCP servers, and the config handler.

## Startup and Config

`src/index.ts`:
- Calls `startTmuxCheck()`
- Loads plugin config via `loadPluginConfig(...)` (`src/plugin-config.ts`)
- Computes `disabledHooks` and `isHookEnabled(hookName)`

Managers created at runtime:
- `BackgroundManager` (`src/features/background-agent`)
- `TaskToastManager` (`src/features/task-toast-manager`)
- `TokenAnalyticsManager` (`src/features/token-analytics`)
- `SkillMcpManager` (`src/features/skill-mcp-manager`)

## Tools Registered

The plugin returns tools under `tool: { ... }` in `src/index.ts`.

This includes:
- Base tools: `src/tools/index.ts` (`builtinTools`)
- Background tools: `background_output`, `background_cancel`
- Delegation: `delegate_task`
- Explore/librarian spawner: `call_paul_agent`
- Skills: `skill`, `skill_mcp`
- Commands: `slashcommand`
- Terminal/multimodal: `interactive_bash`, `look_at`
- Analytics: `token_report`

See `docs/TOOLS.md`.

## Tool Hook Pipeline Ordering

In `src/index.ts`, the plugin wires hooks in a specific order.

### tool.execute.before order
1. `claude-code-hooks`
2. `non-interactive-env`
3. `comment-checker`
4. `directory-agents-injector`
5. `directory-readme-injector`
6. `rules-injector`
7. `planner-md-only`
8. `tdd-enforcement`
9. `strict-workflow`
10. `hierarchy-enforcer`
11. `parallel-safety-enforcer`
12. `paul-orchestrator`

### tool.execute.after order
1. `claude-code-hooks`
2. `tool-output-truncator`
3. `context-window-monitor`
4. `comment-checker`
5. `directory-agents-injector`
6. `directory-readme-injector`
7. `plan-summary-injector`
8. `rules-injector`
9. `empty-task-response-detector`
10. `agent-usage-reminder`
11. `interactive-bash-session`
12. `edit-error-recovery`
13. `delegate-task-retry`
14. `paul-orchestrator`
15. `tdd-enforcement`
16. `strict-workflow`
17. `hierarchy-enforcer`
18. `parallel-safety-enforcer`
19. `task-resume-info`
20. `token-analytics`

See `docs/HOOKS.md`.

## Event Pipeline

The plugin handles OpenCode events in `src/index.ts` via `event: async (input) => { ... }`.

Examples of event consumers:
- `auto-update-checker`
- `session-notification`
- `background-notification`
- `todo-continuation-enforcer`
- `context-window-monitor`
- `directory-agents-injector` / `directory-readme-injector`
- `rules-injector`
- `paul-orchestrator`
- `token-analytics`

## Config Handler (Agents/Skills/Commands/MCP Wiring)

The plugin uses `createConfigHandler(...)` (`src/plugin-handlers/config-handler.ts`) as the OpenCode `config:` callback.

That handler merges and installs:
- Built-in agents (via `createBuiltinAgents(...)`)
- Claude Code agents (if enabled)
- Claude Code commands + built-in commands
- Skills from multiple sources
- MCP server configs (built-in + loaded)
