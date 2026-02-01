# Hook Reference

This plugin is hook-driven. Hooks are the primary enforcement layer: they intercept tools, events, and message transforms.

Authoritative sources:
- Hook exports: `src/hooks/index.ts`
- Hook ordering: `src/index.ts` (`tool.execute.before`, `tool.execute.after`, `chat.message`, `event`)

## Tool Hook Pipeline Ordering

The tool pipeline is wired explicitly in `src/index.ts`.

### tool.execute.before order
1. `claude-code-hooks`
2. `non-interactive-env`
3. `comment-checker`
4. `directory-agents-injector`
5. `directory-readme-injector`
6. `rules-injector`
7. `prometheus-md-only`
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

## Hook Inventory (Exported)

This is the set exported by `src/hooks/index.ts`.

### Enforcement / Safety

- `hierarchy-enforcer`
- `tdd-enforcement`
- `strict-workflow`
- `parallel-safety-enforcer`
- `planner-md-only` and `prometheus-md-only`
- `paul-orchestrator`

### Context Injection

- `directory-agents-injector`
- `directory-readme-injector`
- `rules-injector`
- `plan-summary-injector`
- `compaction-context-injector`

### Claude Code Compatibility

- `claude-code-hooks`

### Recovery / Robustness

- `session-recovery`
- `anthropic-context-window-limit-recovery`
- `edit-error-recovery`
- `delegate-task-retry`
- `task-resume-info`
- `empty-task-response-detector`

### Workflow / UX

- `todo-continuation-enforcer`
- `hit-it`
- `auto-slash-command`
- `ralph-loop`
- `clarification-handler`
- `agent-usage-reminder`

### Utilities

- `tool-output-truncator`
- `context-window-monitor`
- `comment-checker`
- `keyword-detector`
- `think-mode`
- `non-interactive-env`
- `interactive-bash-session`
- `empty-message-sanitizer`
- `thinking-block-validator`
- `session-notification`
- `background-notification`
- `background-compaction`
- `auto-update-checker`

Config-only / legacy entries (present in config schema but not implemented as standalone hook factories):
- `startup-toast` (flag used by `auto-update-checker`)
- `grep-output-truncator` (legacy name; no standalone hook export)

## Hook Events

| Event | Where Wired | Can Block |
|-------|-------------|-----------|
| `tool.execute.before` | `src/index.ts` | Yes |
| `tool.execute.after` | `src/index.ts` | No |
| `chat.message` | `src/index.ts` | Yes |
| `event` | `src/index.ts` | No |
| `experimental.chat.messages.transform` | `src/index.ts` | No |
| `experimental.session.compacting` | `claude-code-hooks` | No |
