# oh-my-lord-opencode Architecture

## Overview

oh-my-lord-opencode is a multi-model agent orchestration plugin for OpenCode. It transforms OpenCode into a strict project manager with enforced TDD workflows.

**Core Philosophy: Zero-Trust Orchestration**

We assume LLMs will be lazy and cut corners. Rather than relying on prompt instructions alone, we PREVENT rule-breaking via code-level hooks that throw errors.

## The Three Pillars of Enforcement

### 1. Code-Level Blocking (Hooks)

Hooks intercept agent actions and throw `Error` to reject invalid operations. This is the primary enforcement mechanism - prompts can be ignored, but thrown errors cannot.

```
PreToolUse Hook
     │
     ├── Valid action → Allow
     │
     └── Invalid action → throw Error("BLOCKED: reason")
```

### 2. Prompt-Level Directives

Minimalist prompts optimized for token efficiency. Agents receive only essential instructions - detailed rules are enforced by hooks, not prompt length.

### 3. Context Injection

`AGENTS.md` files are automatically injected into agent context, providing project-specific knowledge without manual copy-paste.

## Agent Domains (Practical Model)

```
USER REQUEST
     │
     v
┌─────────────────┐
│  planner-paul   │  (planning + routing)
└────────┬────────┘
         │
    ┌────┴───────────────────────────┐
    │                              │
    v                              v
┌─────────────────┐        ┌─────────────┐
│  Paul (complex) │        │ worker-paul  │
│   (orchest)     │        │   (trivial)  │
└─────────────────┘        └─────────────┘
```

**Key Distinction**:
- **`planner-paul` routes DIRECTLY to specialists** for most tasks
- **`planner-paul` calls `Paul` ONLY for complex tasks requiring orchestration** (multi-domain coordination, complex refactoring)
- **`Paul` orchestrates specialists** but does NOT implement directly
- **`worker-paul` works standalone** for trivial changes (< 50 lines, single file, low risk)

| Domain | Agent | Role |
|--------|-------|------|
| Planning/Router | planner-paul | Planning + routing; delegates directly to specialists or Paul for complex tasks |
| Complex Orchestrator | Paul | Orchestrates multi-domain tasks; delegates to specialists, does NOT implement |
| Trivial Executor | worker-paul | Small, standalone changes; limited delegation to support agents only |
| Bare Model | Saul | Minimal prompt; useful for "no framework overhead" testing |

Important: user selectability is controlled in `src/agents/utils.ts` (`USER_SELECTABLE_AGENTS`).

Default agent selection:
- If `Paul` is enabled, plugin sets OpenCode `default_agent = "Paul"`.
- If `Paul` is disabled, plugin sets OpenCode `default_agent = "planner-paul"`.

This behavior is implemented in `src/plugin-handlers/config-handler.ts`.

## Enforcement Mechanisms (Hooks)

Located in `src/hooks/`:

The hook surface is larger than the table below; see `docs/HOOKS.md` for the comprehensive list.

| Hook | Purpose | Type |
|------|---------|------|
| `hierarchy-enforcer` | Delegation authorization + advisory hints | Hard block + advisory |
| `tdd-enforcement` | Test-first + dirty-file verification enforcement | Hard block |
| `strict-workflow` | Bun-only package management + Conventional Commits | Hard block |
| `parallel-safety-enforcer` | Prevent conflicting concurrent edits | Hard block |
| `paul-orchestrator` | Orchestrator role enforcement + continuation | Advisory |
| `planner-md-only` / `prometheus-md-only` | Restrict planners to `.paul/` files | Hard block |

**HARD BLOCK**: Throws error, prevents action entirely.

## Agent Hierarchy

Defined in `src/hooks/hierarchy-enforcer/constants.ts`:

```
planner-paul CAN CALL:
   ├── Nathan, Timothy, Solomon, Thomas, Ezra (planning)
   ├── explore, librarian (research)
   ├── Paul (ONLY for complex tasks requiring orchestration)
   └── worker-paul (trivial tasks)

Paul CAN CALL:
  ├── Joshua, Peter, John (testing)
  ├── Paul-Junior, frontend-ui-ux-engineer, ultrabrain (implementation)
  ├── git-master (git operations)
  ├── explore, librarian, Elijah (research/reasoning)
  └── Nathan, Timothy, Solomon, Thomas (mid-execution analysis)

worker-paul CAN CALL:
  └── explore, librarian, git-master, document-writer (support only)
```

**Cross-domain calls are BLOCKED:**
- paul cannot call planner-paul
- worker-paul cannot call paul
- Only planner-paul can route between domains

## TDD Workflow (Mandatory)

All code changes must follow RED-GREEN-REFACTOR:

```
┌─────────────────────────────────────────────────────────┐
│                    TDD CYCLE                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. RED                                                 │
│     └── Write tests (Peter/John)                        │
│     └── Run Joshua → FAIL expected                      │
│                                                         │
│  2. GREEN                                               │
│     └── Implement (Paul-Junior/frontend-ui-ux-engineer) │
│     └── Run Joshua → PASS                               │
│                                                         │
│  3. REFACTOR                                            │
│     └── Clean up code                                   │
│     └── Verify (lsp_diagnostics, build)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The `tdd-enforcement` hook blocks any attempt to write implementation code before tests exist.

## Data Structures

```
.paul/
├── plans/          # Formal implementation plans (*.md)
│   └── feature-x.md
├── drafts/         # Work-in-progress drafts (*.md)
│   └── wip-feature-y.md
└── notepads/       # Agent learning notes
    ├── paul/
    ├── worker-paul/
    └── planner-paul/
```

- **plans/**: Approved plans that paul executes. Created by planner-paul.
- **drafts/**: Incomplete plans still being refined.
- **notepads/**: Per-agent notes for recording learnings, blockers, patterns.

## Tool Registry

Located in `src/tools/`:

| Category | Tool(s) | Purpose |
|----------|----------|---------|
| LSP (6 tools) | lsp_goto_definition, lsp_find_references, lsp_symbols, lsp_diagnostics, lsp_prepare_rename, lsp_rename | IDE-grade code intelligence (jump to def, find refs, list symbols, diagnostics, rename) |
| AST (2 tools) | ast_grep_search, ast_grep_replace | Structural pattern matching/rewriting with tree-sitter |
| Search (2 tools) | grep, glob | Timeout-safe content and file pattern search |
| Session (4 tools) | session_list, session_read, session_search, session_info | History navigation and retrieval |
| Delegation | delegate_task | Primary tool for spawning subagents with `category` or `subagent_type` |
| Agent Spawning | call_paul_agent | Spawn explore/librarian agents only (research support) |
| Analysis | look_at | Multimodal analysis (PDF, images, diagrams) |
| Execution | slashcommand, skill, skill_mcp | Command execution and skill-based extensibility |
| Background | background_output, background_cancel | Async task management (parallel agent orchestration) |
| Terminal | interactive_bash | Tmux session management for TUI apps (vim, pudb, htop) |

**Tool Registration**:
- `src/tools/index.ts` exports `builtinTools` (core tools) and factory functions
- Background tools (`background_output`, `background_cancel`) created dynamically via `createBackgroundTools()`
- Delegation tool (`delegate_task`) created via `createDelegateTask()` with options

## Where Truth Lives

| File | Purpose |
|------|---------|
| `src/index.ts` | Plugin wiring: tools + hooks + event pipeline |
| `src/agents/index.ts` | Built-in agent registry (`builtinAgents`) |
| `src/agents/utils.ts` | Agent visibility (`USER_SELECTABLE_AGENTS`), overrides, dynamic prompt wiring |
| `src/hooks/index.ts` | Hook registry (30+ hooks exported) |
| `src/tools/index.ts` | Tool registry (`builtinTools`) + factory exports |
| `src/plugin-config.ts` | JSONC config loading + merge (top-level, not in config/) |
| `src/plugin-handlers/config-handler.ts` | OpenCode config handler (agent/tool wiring) |
| `src/config/index.ts` | Config schema and types exports |
| `src/config/schema.ts` | Zod config schema (main schema definition) |

Next reads:
- `docs/PLUGIN_LIFECYCLE.md`
- `docs/REPO_MAP.md`
