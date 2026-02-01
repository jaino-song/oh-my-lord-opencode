# Agent Reference

Quick reference for all agents in oh-my-lord-opencode.

---

## User-Selectable Agents

User-selectability is controlled by `src/agents/utils.ts` (`USER_SELECTABLE_AGENTS`).

| Agent | Purpose |
|-------|---------|
| Paul | Default orchestrator when enabled (set by config handler) |
| planner-paul | Planning + routing agent |
| worker-paul | Trivial executor |
| Saul | Bare model (minimal prompt) |

---

## Built-in Agents

Notes:
- Default models are defined in `src/agents/*.ts` and can be overridden via config.
- Some agents are “compatibility” entries kept for older workflows.

| Agent | Model | Purpose | Visibility |
|-------|-------|---------|------------|
| planner-paul | anthropic/claude-opus-4-5 | Planning + routing | User-selectable |
| Paul | anthropic/claude-opus-4-5 | Orchestrator | User-selectable |
| worker-paul | anthropic/claude-opus-4-5 | Trivial executor | User-selectable |
| Saul | anthropic/claude-sonnet-4-5 | Bare model | User-selectable |

---

## Planning Assistants

Called by planner-paul during planning phase.

| Agent | Model | Purpose |
|-------|-------|---------|
| Nathan (Request Analyst) | openai/gpt-5.2 | Analyzes requests, recommends routing |
| Timothy (Implementation Plan Reviewer) | openai/gpt-5.2 | Plan review |
| Ezra (Plan Reviewer) | google/gemini-3-pro-high | Deep plan review |
| Solomon (TDD Planner) | openai/gpt-5.2-codex | Test planning |
| Thomas (TDD Plan Consultant) | google/gemini-3-pro-high | TDD plan audit |
| Metis (Plan Consultant) | anthropic/claude-sonnet-4-5 | Deprecated (kept for compat) |
| Momus (Plan Reviewer) | anthropic/claude-sonnet-4-5 | Deprecated (kept for compat) |
| oracle | openai/gpt-5.2 | Deprecated (kept for compat) |

---

## Execution Specialists

Called by paul during execution phase.

| Agent | Model | Purpose |
|-------|-------|---------|
| Paul-Junior | anthropic/claude-sonnet-4-5 | Implementation agent |
| frontend-ui-ux-engineer | google/gemini-3-pro-preview | UI/UX implementation |
| ultrabrain | openai/o1 | Hard logic + security-critical implementation |
| git-master | zai-coding-plan/glm-4.7 | Git operations |

---

## Testing Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| Joshua (Test Runner) | zai-coding-plan/glm-4.7 | Runs tests, reports pass/fail |
| Peter (Test Writer) | zai-coding-plan/glm-4.7 | Writes unit tests (Jest) |
| John (E2E Test Writer) | zai-coding-plan/glm-4.7 | Writes E2E tests (Playwright) |

---

## Research Agents

Available to multiple agents for research tasks.

| Agent | Model | Purpose |
|-------|-------|---------|
| explore | anthropic/claude-haiku-4-5 | Fast codebase search |
| librarian | zai-coding-plan/glm-4.7 | Multi-repo analysis, docs lookup |
| Elijah (Deep Reasoning Advisor) | openai/gpt-5.2-codex | Deep debugging, architecture decisions |

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

## Call Graph

Who can call whom (enforced by `hierarchy-enforcer`):

Note on tool naming:
- Many prompts/templates mention `call_omo_agent`.
- The plugin tool exposed is `call_paul_agent` (spawns explore/librarian only).

```
planner-paul
├── Nathan, Timothy, Solomon, Thomas, Ezra (planning)
├── explore, librarian (research)
├── Paul (complex execution)
└── worker-paul (trivial execution)

Paul
├── Joshua, Peter, John (testing)
├── Paul-Junior, frontend-ui-ux-engineer, ultrabrain (implementation)
├── git-master (git)
├── explore, librarian, Elijah (research)
└── Nathan, Timothy, Solomon, Thomas (mid-execution analysis)

worker-paul
└── explore, librarian, git-master, document-writer (support)

Paul-Junior, frontend-ui-ux-engineer
└── explore, librarian (research only)
```

---

## Source Files

- Agent definitions: `src/agents/*.ts`
- Agent registry: `src/agents/index.ts`
- Hierarchy rules: `src/hooks/hierarchy-enforcer/constants.ts`
