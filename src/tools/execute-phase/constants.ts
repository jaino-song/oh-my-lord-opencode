export const EXECUTE_PHASE_TOOL_NAME = "execute_phase"

export const EXECUTE_PHASE_DESCRIPTION = `Execute all tasks in a specific phase from the plan.

This tool reads EXEC:: todos, finds all tasks for the specified phase, and executes them.
- For phases marked (Parallel): fires all tasks concurrently with run_in_background=true
- For phases marked (Sequential): fires tasks one-by-one with run_in_background=false

Phase format in todos:
- Phase marker: \`EXEC:: [P1] === PHASE 1: Title (Parallel) ===\`
- Task: \`EXEC:: [P1.1] Task description (Agent: agent-name) (Skills: skill-a, skill-b) (Contracts: FC-A, FC-B) (Files: src/a.ts, src/b.ts) (TODO-IDs: TD-A, TD-B)\`

Skill precedence:
- Task-level \`(Skills: ...)\` metadata (or \`(Required Skills: ...)\`) overrides phase-level \`skills\` argument
- If task metadata is missing, \`execute_phase({ skills: [...] })\` applies to all tasks in the phase

Contract and validation behavior:
- Task-level \`(Contracts: ...)\` refs resolve to \`### File Contracts\` blocks in the active plan and are prepended to delegated prompts
- Task-level \`(Files: ...)\` + \`(TODO-IDs: ...)\` enables post-task validation; task fails if TODO/FIXME lines still contain those IDs
- Machine-readable contracts are supported via a JSON fenced block in plan with \`schemaVersion: "contracts-v1"\`; parser uses this first, then falls back to markdown parsing
- Preflight validation runs before phase execution and fails fast on missing/invalid metadata or unknown contract refs
- File-scope enforcement fails tasks that modify files outside \`(Files: ...)\` scope
- Acceptance checks (required/forbidden regex patterns, required files, TODO resolution) run per referenced contract
- Frontend conformance checks run automatically on frontend-scoped tasks (no \`animate-*\`, layered \`data-component\`, spacing/radius consistency, skeleton presence for data-driven views); behavior is configurable via \`execute_phase.frontend_conformance_mode\` (\`strict\` | \`normal\` | \`off\`)

Usage:
1. Call execute_phase({ phase: 1 }) to run Phase 1
2. Wait for results and verify
3. Call execute_phase({ phase: 2 }) to run Phase 2
4. Repeat until all phases complete`
