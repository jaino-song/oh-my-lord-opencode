# Agent Reference

Quick reference for all agents in oh-my-lord-opencode.

---

## User-Selectable Agents (v4.2)

User-selectability is controlled by `src/agents/utils.ts` (`USER_SELECTABLE_AGENTS`).

| Agent | Purpose |
|-------|---------|
| planner-paul | **Plan Creator** - Creates formal plans, user switches to Paul after |
| Paul | **Plan Executor** - Executes plans from planner-paul |
| worker-paul | **Trivial Executor** - Standalone agent for small tasks |
| Saul | Bare model (minimal prompt) |

---

## Built-in Agents

Notes:
- Default models are defined in `src/agents/*.ts` and can be overridden via config.
- Some agents are "compatibility" entries kept for older workflows.
- Lowercase aliases (paul, ezra, nathan, etc.) are registered for convenience.

| Agent | Alias | Model | Purpose | Visibility |
|-------|-------|-------|---------|------------|
| planner-paul | - | anthropic/claude-opus-4-6 | Planning + routing | User-selectable |
| Paul | paul | anthropic/claude-opus-4-6 | Orchestrator | User-selectable |
| worker-paul | - | anthropic/claude-opus-4-6 | Trivial executor | User-selectable |
| Saul | - | anthropic/claude-sonnet-4-5 | Bare model | User-selectable |

---

## Planning Assistants

Called by planner-paul during planning phase (v4.2: always Elijah + Ezra + Thomas).

| Agent | Alias | Model | Purpose |
|-------|-------|-------|---------|
| Nathan (Request Analyst) | nathan | anthropic/claude-opus-4-6 | Phase 0: Impact-based triviality analysis |
| Elijah (Deep Reasoning Advisor) | elijah | anthropic/claude-opus-4-6 | **Always used** - Plan security/performance/architecture audit |
| Ezra (Plan Reviewer) | ezra | anthropic/claude-opus-4-6 | **Always used** - Deep plan review (confidence scoring) |
| Solomon (TDD Planner) | solomon | anthropic/claude-opus-4-6 | Test planning |
| Thomas (TDD Plan Consultant) | thomas | anthropic/claude-sonnet-4-5 | **Always used** - TDD plan audit |
| Timothy (Implementation Plan Reviewer) | timothy | anthropic/claude-sonnet-4-5 | Quick plan review (used by Paul, not planner-paul) |

Planner specifics for frontend-heavy plans:
- planner-paul now requires a `Blueprint` section (file tree + per-file contracts) for UI/frontend scope.
- planner-paul requires a `UI Planning Contract` section for frontend scope (layout/responsive/animation/skeleton/data-component conventions).
- frontend tasks in plans must include `Required Skills` mapped from situation (for example `frontend-design`, `ui-ux-pro-max`, `nextjs-app-router-patterns`).
- Ezra validates frontend-plan compliance when UI/frontend scope exists.

Execution verification note:
- For implementation plans, final completion requires a recent Elijah `--verify-plan` approval (recorded via delegation notification/approval state). Docs/config-only plans skip this gate.

---

## Execution Specialists

Called by paul during execution phase.

| Agent | Model | Purpose |
|-------|-------|---------|
| Paul-Junior | anthropic/claude-opus-4-6 | Implementation agent |
| frontend-ui-ux-engineer | google/gemini-3-pro-preview | UI/UX implementation |
| ultrabrain | openai/o1 | Hard logic + security-critical implementation |
| git-master | zai-coding-plan/glm-4.7 | Git operations |

---

## Testing Agents

| Agent | Alias | Model | Purpose |
|-------|-------|-------|---------|
| Joshua (Test Runner) | joshua | zai-coding-plan/glm-4.7 | Runs tests, reports pass/fail |
| Peter (Test Writer) | peter | zai-coding-plan/glm-4.7 | Writes unit tests (Jest) |
| John (E2E Test Writer) | john | zai-coding-plan/glm-4.7 | Writes E2E tests (Playwright) |

---

## Research Agents

Available to multiple agents for research tasks.

| Agent | Alias | Model | Purpose |
|-------|-------|-------|---------|
| explore | - | anthropic/claude-haiku-4-5 | Fast codebase search |
| librarian | - | zai-coding-plan/glm-4.7 | Multi-repo analysis, docs lookup |
| Elijah (Deep Reasoning Advisor) | elijah | anthropic/claude-opus-4-6 | Deep plan review + execution debugging, architecture decisions |

---

## Utility Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| document-writer | google/antigravity-gemini-3-flash | Technical documentation |
| multimodal-looker | google/antigravity-gemini-3-flash | PDF/image analysis |

---

## Removed Agents

| Agent | Replacement | Removed In |
|-------|-------------|------------|
| oracle | Elijah | v0.19.0 |
| Metis | Nathan | v0.19.0 |
| Momus | Ezra | v0.19.0 |
| Prometheus | planner-paul | v0.19.0 |
| Sisyphus | Paul | v0.19.0 |

---

## Call Graph (v4.2)

Who can call whom (enforced by `hierarchy-enforcer`):

Note on tool naming:
- Many prompts/templates mention `call_omo_agent`.
- The plugin tool exposed is `call_paul_agent` (spawns explore/librarian only).

**Important (v4.2)**: planner-paul does NOT delegate to Paul/worker-paul. User manually switches.

```
planner-paul (planning only)
├── Nathan, Elijah, Solomon, Thomas, Ezra (planning assistants)
└── explore, librarian (research)

Paul (execution)
├── Joshua, Peter, John (testing)
├── Paul-Junior, frontend-ui-ux-engineer, ultrabrain (implementation)
├── git-master (git)
├── explore, librarian, Elijah (research)
└── Nathan, Timothy, Solomon, Thomas (mid-execution analysis)

worker-paul (standalone)
└── explore, librarian, git-master, document-writer (support)

Paul-Junior, frontend-ui-ux-engineer
└── explore, librarian (research only)
```

---

## Source Files

- Agent definitions: `src/agents/*.ts`
- Agent registry: `src/agents/index.ts`
- Hierarchy rules: `src/hooks/hierarchy-enforcer/constants.ts`
