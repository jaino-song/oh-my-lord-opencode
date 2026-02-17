# Configuration Reference

How to configure oh-my-lord-opencode.

---

## Config File Locations

| Scope | Path |
|-------|------|
| Global (user) | `~/.config/opencode/oh-my-lord-opencode.json` |
| Project | `.opencode/oh-my-lord-opencode.json` |

Project config overrides global config.

The config loader is `src/plugin-config.ts` and it prefers `.jsonc` when available.

---

## Config Format

JSONC (JSON with comments) is supported.

```jsonc
{
  // Agent overrides
  "agents": {
    "Paul": {
      "model": "anthropic/claude-sonnet-4-5",
      "temperature": 0.1
    }
  },

  // Disable specific hooks
  "disabled_hooks": ["comment-checker"],

  // Disable specific skills
  "disabled_skills": ["playwright"],

  // Claude Code compatibility
  "claude_code": {
    "mcp": true,
    "commands": true,
    "skills": true,
    "agents": true,
    "hooks": true
  },

  // Auto-update setting
  "auto_update": true
}
```

---

## Agent Overrides

Override model, temperature, or other settings per agent.

```jsonc
{
  "agents": {
    "Paul": {
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.1,
      "category": "most-capable"
    },
    "planner-paul": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "explore": {
      "model": "anthropic/claude-haiku-4-5"
    }
  }
}
```

### Available Override Fields

| Field | Type | Description |
|-------|------|-------------|
| model | string | Model identifier (deprecated - use category) |
| category | string | Category name to inherit model settings |
| variant | string | Model variant |
| skills | string[] | Skill names to inject into agent prompt |
| temperature | number | 0.0-2.0, lower = more deterministic |
| top_p | number | 0.0-1.0, nucleus sampling |
| prompt | string | Replace agent prompt |
| prompt_append | string | Additional prompt text |
| tools | object | Enable/disable specific tools |
| disable | boolean | Disable the agent |
| description | string | Custom agent description |
| mode | string | "subagent", "primary", or "all" |
| color | string | Hex color code (e.g., "#FF5733") |
| permission | object | Permission overrides (edit, bash, webfetch, etc.) |

### Overridable Agents

- `Paul`, `planner-paul`, `worker-paul`
- `oracle`, `librarian`, `explore`
- `frontend-ui-ux-engineer`, `document-writer`, `multimodal-looker`
- `Solomon (TDD Planner)`, `Peter (Test Writer)`, `John (E2E Test Writer)`
- `Joshua (Test Runner)`, `Thomas (TDD Plan Consultant)`
- `Nathan (Request Analyst)`, `Ezra (Plan Reviewer)`, `Elijah (Deep Reasoning Advisor)`
- `Timothy (Implementation Plan Reviewer)`
- `build`, `plan`, `Paul-Junior`, `OpenCode-Builder`

---

## Categories

Define model presets that agents can inherit.

```jsonc
{
  "categories": {
    "most-capable": {
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.1,
      "maxTokens": 16000
    },
    "quick": {
      "model": "anthropic/claude-haiku-4-5",
      "temperature": 0.2
    }
  }
}
```

### Built-in Categories

- `visual-engineering` - UI/UX focused
- `ultrabrain` - High reasoning tasks
- `artistry` - Creative tasks
- `quick` - Fast responses
- `most-capable` - Best quality
- `writing` - Documentation
- `general` - Default

---

## Disabled Hooks

Disable specific hooks by name.

```jsonc
{
  "disabled_hooks": [
    "comment-checker",
    "auto-update-checker",
    "session-notification"
  ]
}
```

### Available Hooks

- `hierarchy-enforcer` - Enforce agent hierarchy
- `tdd-enforcement` - TDD workflow enforcement
- `paul-orchestrator` - Paul orchestration logic
- `todo-continuation-enforcer` - TODO continuation
- `comment-checker` - Check for leftover comments
- `tool-output-truncator` - Truncate large outputs
- `directory-agents-injector` - Inject AGENTS.md
- `directory-readme-injector` - Inject README.md
- `session-notification` - Session notifications
- `auto-update-checker` - Check for updates
- `keyword-detector` - Detect keywords
- `think-mode` - Extended thinking mode
- `ralph-loop` - Ralph loop functionality
- `rules-injector` - Inject rules
- `background-notification` - Background task notifications
- `agent-usage-reminder` - Agent usage reminders
- `non-interactive-env` - Non-interactive environment handling
- `interactive-bash-session` - Interactive bash sessions
- `empty-message-sanitizer` - Sanitize empty messages
- `thinking-block-validator` - Validate thinking blocks
- `compaction-context-injector` - Context compaction
- `claude-code-hooks` - Claude Code hook loading
- `auto-slash-command` - Auto slash commands
- `edit-error-recovery` - Edit error recovery
- `delegate-task-retry` - Delegate task retry
- `planner-md-only` - Planner markdown only
- `strict-workflow` - Strict workflow enforcement
- `parallel-safety-enforcer` - Parallel safety

---

## Disabled Agents

Disable built-in agents by name.

Agent names are validated by `BuiltinAgentNameSchema` in `src/config/schema.ts`.

```jsonc
{
  "disabled_agents": [
    "oracle",
    "Metis (Plan Consultant)",
    "Momus (Plan Reviewer)"
  ]
}
```

---

## Disabled MCPs

Disable built-in MCP servers by name.

MCP names are validated by `AnyMcpNameSchema` / `McpNameSchema` in `src/mcp/types.ts`.

```jsonc
{
  "disabled_mcps": ["context7", "websearch"]
}
```

---

## Disabled Commands

Disable built-in command templates.

Command names are validated by `BuiltinCommandNameSchema` in `src/config/schema.ts`.

```jsonc
{
  "disabled_commands": ["hit-it"]
}
```

---

## Disabled Skills

Disable specific built-in skills.

```jsonc
{
  "disabled_skills": [
    "playwright",
    "frontend-ui-ux"
  ]
}
```

### Built-in Skills

- `playwright` - Browser automation via Playwright MCP
- `frontend-ui-ux` - UI/UX design guidance
- `git-master` - Git operations (atomic commits, rebase, history search)
- `gemini-function-calling` - Gemini function calling integration (built-in skill template)

### Notes

`disabled_skills` is validated by `BuiltinSkillNameSchema` in `src/config/schema.ts`. As of today it only includes:
- `playwright`
- `frontend-ui-ux`
- `git-master`

So `gemini-function-calling` exists as a built-in skill but cannot be disabled via `disabled_skills` unless the schema is expanded.

---

## Claude Code Compatibility

Control Claude Code feature loading.

```jsonc
{
  "claude_code": {
    "mcp": true,       // Load .mcp.json servers
    "commands": true,  // Load commands/*.md
    "skills": true,    // Load skills/*/SKILL.md
    "agents": true,    // Load agents/*.md
    "hooks": true,     // Load settings.json hooks
    "plugins": true,   // Load installed plugins
    "plugins_override": {
      "some-plugin": false  // Disable specific plugin
    }
  }
}
```

Set to `false` to disable specific Claude Code integrations.

---

## Paul Agent Config

Configure Paul agent behavior.

```jsonc
{
  "paul_agent": {
    "disabled": false,
    "default_builder_enabled": true,
    "planner_enabled": true,
    "replace_plan": false,
    "prefer_orchestrator": false
  }
}
```

---

## Notification Settings

```jsonc
{
  "notification": {
    "force_enable": false  // Force enable even if external notifier detected
  }
}
```

---

## Git Master Config

```jsonc
{
  "git_master": {
    "commit_footer": true,           // Add "Ultraworked with Paul" footer
    "include_co_authored_by": true   // Add "Co-authored-by: Paul" trailer
  }
}
```

---

## Ralph Loop Config

```jsonc
{
  "ralph_loop": {
    "enabled": false,              // Enable ralph loop (opt-in)
    "default_max_iterations": 100, // Max iterations if not specified
    "state_dir": ".opencode/"      // State file directory
  }
}
```

---

## Background Task Config

```jsonc
{
  "background_task": {
    "defaultConcurrency": 3,
    "providerConcurrency": {
      "anthropic": 5,
      "openai": 3
    },
    "modelConcurrency": {
      "claude-opus-4-5": 2
    }
  }
}
```

---

## Comment Checker Config

```jsonc
{
  "comment_checker": {
    "custom_prompt": "Custom warning message. Use {{comments}} for detected comments."
  }
}
```

---

## Experimental Features

```jsonc
{
  "experimental": {
    "aggressive_truncation": false,
    "auto_resume": false,
    "truncate_all_tool_outputs": false,
    "dynamic_context_pruning": {
      "enabled": false,
      "notification": "detailed",  // "off", "minimal", "detailed"
      "turn_protection": {
        "enabled": true,
        "turns": 3
      },
      "protected_tools": ["task", "todowrite", "todoread"],
      "strategies": {
        "deduplication": { "enabled": true },
        "supersede_writes": { "enabled": true, "aggressive": false },
        "purge_errors": { "enabled": true, "turns": 5 }
      }
    }
  }
}
```

---

## Features Config

```jsonc
{
  "features": {
    "clarificationHandler": true  // Enable subagent clarification (default: true)
  }
}
```

---

## Execute Phase Config

Controls frontend conformance strictness during `execute_phase` enforcement.

```jsonc
{
  "execute_phase": {
    "frontend_conformance_mode": "normal" // "strict" | "normal" | "off"
  }
}
```

Mode behavior:
- `strict`: run automatic frontend checks and fail frontend-tagged tasks that do not provide frontend file scope
- `normal`: run automatic frontend checks for frontend-scoped tasks
- `off`: disable frontend conformance checks (automatic and contract acceptance frontendConformance)

---

## Skills Config

Advanced skill configuration.

```jsonc
{
  "skills": {
    "sources": [
      "/path/to/custom/skills",
      { "path": "/another/path", "recursive": true, "glob": "*.md" }
    ],
    "enable": ["custom-skill"],
    "disable": ["playwright"],
    "my-custom-skill": {
      "description": "My custom skill",
      "template": "Skill content here",
      "model": "anthropic/claude-sonnet-4-5",
      "agent": "explore",
      "subtask": true
    }
  }
}
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `OML_DEBUG` | Enable debug logging |
| `OPENCODE_DEBUG` | Enable OpenCode debug mode |

---

## Schema Validation

Config is validated via Zod schema at `src/config/schema.ts`.

Run `bun run build:schema` after schema changes to regenerate JSON schema.

---

## Example Configs

### Minimal Config

```jsonc
{
  "auto_update": true
}
```

### Custom Models via Categories

```jsonc
{
  "categories": {
    "my-fast": {
      "model": "anthropic/claude-haiku-4-5",
      "temperature": 0.1
    }
  },
  "agents": {
    "explore": { "category": "my-fast" }
  }
}
```

### Disable TDD Enforcement (Not Recommended)

```jsonc
{
  "disabled_hooks": ["tdd-enforcement"]
}
```

### Full Example

```jsonc
{
  "$schema": "./assets/config-schema.json",
  "auto_update": true,
  
  "categories": {
    "fast": {
      "model": "anthropic/claude-haiku-4-5",
      "temperature": 0.2
    }
  },
  
  "agents": {
    "explore": { "category": "fast" },
    "librarian": { "category": "fast" }
  },
  
  "disabled_hooks": [
    "agent-usage-reminder"
  ],
  
  "claude_code": {
    "mcp": true,
    "commands": true,
    "skills": true
  },
  
  "git_master": {
    "commit_footer": true
  },
  
  "notification": {
    "force_enable": false
  }
}
```
