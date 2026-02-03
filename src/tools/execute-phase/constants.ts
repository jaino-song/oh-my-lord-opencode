export const EXECUTE_PHASE_TOOL_NAME = "execute_phase"

export const EXECUTE_PHASE_DESCRIPTION = `Execute all tasks in a specific phase from the plan.

This tool reads EXEC:: todos, finds all tasks for the specified phase, and executes them.
- For phases marked (Parallel): fires all tasks concurrently with run_in_background=true
- For phases marked (Sequential): fires tasks one-by-one with run_in_background=false

Phase format in todos:
- Phase marker: \`EXEC:: [P1] === PHASE 1: Title (Parallel) ===\`
- Task: \`EXEC:: [P1.1] Task description (Agent: agent-name)\`

Usage:
1. Call execute_phase({ phase: 1 }) to run Phase 1
2. Wait for results and verify
3. Call execute_phase({ phase: 2 }) to run Phase 2
4. Repeat until all phases complete`
