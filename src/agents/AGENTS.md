# AGENTS KNOWLEDGE BASE

## OVERVIEW
AI agent definitions for multi-model orchestration, delegating tasks to specialized experts.

## STRUCTURE
```
agents/
├── paul.ts                  # Paul (Strict Plan Executor)
├── planner-paul.ts          # planner-paul (Router & Architect)
├── worker-paul.ts           # worker-paul (Trivial Task Handler)
├── paul-junior.ts           # Junior variant for delegated tasks
├── elijah.ts                # Deep Reasoning Advisor
├── nathan.ts                # Request Analyst
├── ezra.ts                  # Plan Reviewer (confidence scoring)
├── solomon.ts               # TDD Planner
├── timothy.ts               # Quick Plan Reviewer
├── librarian.ts             # Multi-repo research (claude-sonnet-4-5)
├── explore.ts               # Fast codebase grep (claude-haiku-4-5)
├── frontend-ui-ux-engineer.ts  # UI generation (Gemini 3 Pro Preview)
├── document-writer.ts       # Technical docs (Gemini 3 Pro Preview)
├── multimodal-looker.ts     # PDF/image analysis (Gemini 3 Flash)
├── build-prompt.ts          # Shared build agent prompt
├── plan-prompt.ts           # Shared plan agent prompt
├── types.ts                 # AgentModelConfig interface
├── utils.ts                 # createBuiltinAgents(), getAgentName()
└── index.ts                 # builtinAgents export
```

## AGENT MODELS
| Agent | Default Model | Purpose |
|-------|---------------|---------|
| **Paul** | anthropic/claude-opus-4-6 | **Strict Plan Executor** (Internal). Executes formal plans only. Strictly delegates. Adaptive thinking. |
| **planner-paul** | anthropic/claude-opus-4-6 | **Smart Router & Architect**. Analyzes requests, routes to worker-paul (trivial) or creates plans for Paul (complex). Adaptive thinking. |
| **worker-paul** | anthropic/claude-opus-4-6 | **Trivial Task Handler**. Autonomous executor for small tasks (<50 lines, single file). Adaptive thinking. |
| Solomon | openai/gpt-5.3-codex | TDD test planning. Plans tests FIRST, then implementation. Xhigh variant. |
| Elijah | openai/gpt-5.3-codex | Deep Reasoning Advisor (planning + execution). 7 modes: --plan-review, --verify-plan, --debug, --architecture, --security, --performance, --stuck. Xhigh variant. |
| Nathan | openai/gpt-5.3-codex | Request Analyst. Intent classification, guardrails, question prioritization before planning. Xhigh variant. |
| Ezra | openai/gpt-5.3-codex | Plan Reviewer with confidence scoring, anti-pattern detection, review modes. Xhigh variant. |
| Timothy | anthropic/claude-sonnet-4-5 | Quick Plan Reviewer. |
| librarian | anthropic/claude-sonnet-4-5 | Multi-repo analysis, docs research, GitHub examples. 32k thinking. |
| explore | anthropic/claude-haiku-4-5 | Fast contextual grep. Fallbacks: opencode/gpt-5-nano. |
| frontend-ui-ux | google/gemini-3-pro-preview | Production-grade UI/UX generation and styling. |
| document-writer | google/gemini-3-pro-preview | Technical writing, guides, API documentation. |

## HOW TO ADD AN AGENT
1. Create `src/agents/my-agent.ts` exporting `AgentConfig`.
2. Add to `builtinAgents` in `src/agents/index.ts`.
3. Update `types.ts` if adding new config interfaces.

## MODEL FALLBACK LOGIC
`createBuiltinAgents()` handles resolution:
1. User config override (`agents.{name}.model`).
2. Environment-specific settings (max20, antigravity).
3. Hardcoded defaults in `index.ts`.

## ANTI-PATTERNS
- **Trusting reports**: NEVER trust subagent self-reports; always verify outputs.
- **High temp**: Don't use >0.3 for code agents (Paul/planner-paul use 0.1).
- **Sequential calls**: Prefer `delegate_task` with `run_in_background` for parallelism.

## SHARED PROMPTS
- **build-prompt.ts**: Unified base for Builder variants.
- **plan-prompt.ts**: Core planning logic shared across planning agents.
