# AGENTS KNOWLEDGE BASE

## OVERVIEW
AI agent definitions for multi-model orchestration, delegating tasks to specialized experts.

## STRUCTURE
```
agents/
├── paul.ts                  # Paul (Strict Plan Executor)
├── planner-paul.ts          # planner-paul (Router & Architect)
├── worker-paul.ts           # worker-paul (Trivial Task Handler)
├── orchestrator-sisyphus.ts # Legacy Orchestrator agent
├── sisyphus.ts              # Legacy Sisyphus prompt
├── paul-junior.ts           # Junior variant for delegated tasks
├── elijah.ts                # Deep Reasoning Advisor (replaces Oracle)
├── nathan.ts                # Request Analyst (replaces Metis)
├── oracle.ts                # DEPRECATED - use elijah.ts
├── librarian.ts             # Multi-repo research (zai-coding-plan/glm-4.7)
├── explore.ts               # Fast codebase grep (claude-haiku-4-5)
├── frontend-ui-ux-engineer.ts  # UI generation (Gemini 3 Pro Preview)
├── document-writer.ts       # Technical docs (Gemini 3 Pro Preview)
├── multimodal-looker.ts     # PDF/image analysis (Gemini 3 Flash)
├── prometheus-prompt.ts     # Planning agent prompt
├── metis.ts                 # DEPRECATED - use nathan.ts
├── momus.ts                 # DEPRECATED - use ezra.ts
├── build-prompt.ts          # Shared build agent prompt
├── plan-prompt.ts           # Shared plan agent prompt
├── sisyphus-prompt-builder.ts # Factory for orchestrator prompts
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
| Solomon | anthropic/claude-opus-4-6 | TDD test planning. Plans tests FIRST, then implementation. Adaptive thinking. |
| Sisyphus | anthropic/claude-opus-4-6 | Legacy Orchestrator. |
| Elijah | anthropic/claude-opus-4-6 | Deep Reasoning Advisor. 5 modes: --debug, --architecture, --security, --performance, --stuck. Adaptive thinking. |
| Nathan | anthropic/claude-opus-4-6 | Request Analyst. Intent classification, guardrails, question prioritization before planning. Adaptive thinking. |
| librarian | anthropic/claude-sonnet-4-5 | Multi-repo analysis, docs research, GitHub examples. 32k thinking. |
| explore | anthropic/claude-haiku-4-5 | Fast contextual grep. Fallbacks: opencode/gpt-5-nano. |
| frontend-ui-ux | google/gemini-3-pro-preview | Production-grade UI/UX generation and styling. |
| document-writer | google/gemini-3-pro-preview | Technical writing, guides, API documentation. |
| Prometheus | anthropic/claude-opus-4-6 | Strategic planner. Interview mode, orchestrates Metis/Momus. |
| Ezra | anthropic/claude-opus-4-6 | Plan Reviewer with confidence scoring, anti-pattern detection, review modes. Adaptive thinking. |
| Timothy | anthropic/claude-sonnet-4-5 | Quick Plan Reviewer. |
| oracle | openai/gpt-5.2 | **DEPRECATED** - Use Elijah instead. |
| Metis | anthropic/claude-sonnet-4-5 | **DEPRECATED** - Use Nathan instead. |
| Momus | anthropic/claude-sonnet-4-5 | **DEPRECATED** - Use Ezra instead. |

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
- **High temp**: Don't use >0.3 for code agents (Sisyphus/Prometheus use 0.1).
- **Sequential calls**: Prefer `delegate_task` with `run_in_background` for parallelism.

## SHARED PROMPTS
- **build-prompt.ts**: Unified base for Sisyphus and Builder variants.
- **plan-prompt.ts**: Core planning logic shared across planning agents.
- **orchestrator-sisyphus.ts**: Uses a 7-section prompt structure and "wisdom notepad" to preserve learnings across turns.
