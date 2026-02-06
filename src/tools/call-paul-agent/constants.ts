export const ALLOWED_AGENTS = ["explore", "librarian"] as const

export const CALL_PAUL_AGENT_DESCRIPTION = `Spawn explore/librarian agent. ALWAYS runs in background (auto-forced). Returns task_id immediately.

Available: {agents}

IMPORTANT: explore/librarian agents ALWAYS run in background mode regardless of run_in_background parameter.
Fire at least 3 scouts in parallel for broad searches. Use \`background_output\` to collect each result before proceeding.
Pass \`resume=session_id\` to continue previous agent (only case where sync is used). Prompts MUST be in English.`
