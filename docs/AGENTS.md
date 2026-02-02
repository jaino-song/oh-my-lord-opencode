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
| planner-paul | - | anthropic/claude-opus-4-5 | Planning + routing | User-selectable |
| Paul | paul | anthropic/claude-opus-4-5 | Orchestrator | User-selectable |
| worker-paul | - | anthropic/claude-opus-4-5 | Trivial executor | User-selectable |
| Saul | - | anthropic/claude-sonnet-4-5 | Bare model | User-selectable |

---

## Planning Assistants

Called by planner-paul during planning phase (v4.2: always Ezra + Thomas).

| Agent | Alias | Model | Purpose |
|-------|-------|-------|---------|
| Nathan (Request Analyst) | nathan | anthropic/claude-opus-4-5 | Phase 0: Impact-based triviality analysis |
| Ezra (Plan Reviewer) | ezra | anthropic/claude-opus-4-5 | **Always used** - Deep plan review (confidence scoring) |
| Solomon (TDD Planner) | solomon | anthropic/claude-opus-4-5 | Test planning |
| Thomas (TDD Plan Consultant) | thomas | anthropic/claude-sonnet-4-5 | **Always used** - TDD plan audit |
| Timothy (Implementation Plan Reviewer) | timothy | anthropic/claude-sonnet-4-5 | Quick plan review (used by Paul, not planner-paul) |
| Metis (Plan Consultant) | - | anthropic/claude-sonnet-4-5 | Deprecated (kept for compat) |
| Momus (Plan Reviewer) | - | anthropic/claude-sonnet-4-5 | Deprecated (kept for compat) |

---

## Execution Specialists

Called by paul during execution phase.

| Agent | Model | Purpose |
|-------|-------|---------|
| Paul-Junior | anthropic/claude-opus-4-5 | Implementation agent |
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
| Elijah (Deep Reasoning Advisor) | elijah | anthropic/claude-opus-4-5 | Deep debugging, architecture decisions |

---

## Utility Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| document-writer | google/antigravity-gemini-3-flash | Technical documentation |
| multimodal-looker | google/antigravity-gemini-3-flash | PDF/image analysis |

---

## Deprecated Agents

| Agent | Replacement |
|-------|-------------|
| oracle | Elijah |
| Metis | Nathan |
| Momus | Ezra |

---

## Call Graph (v4.2)

Who can call whom (enforced by `hierarchy-enforcer`):

Note on tool naming:
- Many prompts/templates mention `call_omo_agent`.
- The plugin tool exposed is `call_paul_agent` (spawns explore/librarian only).

**Important (v4.2)**: planner-paul does NOT delegate to Paul/worker-paul. User manually switches.

```
planner-paul (planning only)
├── Nathan, Solomon, Thomas, Ezra (planning assistants)
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
