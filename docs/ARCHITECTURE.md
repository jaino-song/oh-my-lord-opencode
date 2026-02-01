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
    ┌────┴────┐
    │         │
    v         v
┌────────┐  ┌─────────────┐
│  Paul  │  │ worker-paul  │
│ (orch) │  │ (trivial)    │
└────────┘  └─────────────┘
```

| Domain | Agent | Role |
|--------|-------|------|
| Planning/Router | planner-paul | Planning + routing; often writes `.paul/plans/*` |
| Orchestrator | Paul | Default orchestrator when enabled; delegates to specialists |
| Trivial Executor | worker-paul | Small, standalone changes; limited delegation |
| Bare Model | Saul | Minimal prompt; useful for “no framework overhead” testing |

Important: user selectability is controlled in `src/agents/utils.ts` (`USER_SELECTABLE_AGENTS`).

Default agent selection:
- If `Paul` is enabled, the plugin sets OpenCode `default_agent = "Paul"`.
- If `Paul` is disabled, the plugin sets OpenCode `default_agent = "planner-paul"`.

This behavior is implemented in `src/plugin-handlers/config-handler.ts`.

## Enforcement Mechanisms (Hooks)

Located in `src/hooks/`:

The hook surface is larger than the table below; see `docs/HOOKS.md` for the comprehensive list.

| Hook | Purpose | Type |
|------|---------|------|
| `hierarchy-enforcer` | Delegation authorization + advisory hints | Hard block + advisory |
| `tdd-enforcement` | Test-first + dirty-file verification enforcement | Hard block |
| `strict-workflow` | Workflow invariants (todo flow, sequencing) | Hard block |
| `parallel-safety-enforcer` | Prevent conflicting concurrent edits | Hard block |
| `paul-orchestrator` | Orchestrator role enforcement + continuation | Hard block |
| `planner-md-only` / `prometheus-md-only` | Restrict planners to `.paul/` files | Hard block |

**HARD BLOCK**: Throws error, prevents action entirely.

## Agent Hierarchy

Defined in `src/hooks/hierarchy-enforcer/constants.ts`:

```
planner-paul CAN CALL:
  ├── Nathan, Timothy, Solomon, Thomas, Ezra (planning)
  ├── explore, librarian (research)
  ├── Paul (execution routing)
  └── worker-paul (trivial routing)

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

## Where the Truth Lives

| File | Purpose |
|------|---------|
| `src/index.ts` | Plugin wiring: tools + hooks + event pipeline |
| `src/agents/index.ts` | Built-in agent registry |
| `src/agents/utils.ts` | Agent visibility, overrides, dynamic prompt wiring |
| `src/hooks/index.ts` | Hook registry |
| `src/tools/index.ts` | Base tool registry |
| `src/plugin-config.ts` | JSONC config loading + merge |
| `src/plugin-handlers/config-handler.ts` | OpenCode config handler (agent/tool wiring) |
| `src/config/schema.ts` | Zod config schema |

Next reads:
- `docs/PLUGIN_LIFECYCLE.md`
- `docs/REPO_MAP.md`
