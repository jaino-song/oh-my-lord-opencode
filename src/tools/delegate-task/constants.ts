export const DELEGATE_TASK_DESCRIPTION = `Spawn agent task with direct agent selection.

REQUIRED: Provide subagent_type parameter to specify which agent to spawn.

- subagent_type: Agent name directly (e.g., "oracle", "explore", "librarian", "paul-junior")
- run_in_background: true=async (returns task_id), false=sync (waits for result). MUST be explicitly set. Use run_in_background=true ONLY for parallel exploration with 5+ independent queries.
- resume: Session ID to resume (from previous task output). Continues agent with FULL CONTEXT PRESERVED - saves tokens, maintains continuity.
- skills: Array of skill names to prepend to prompt (e.g., ["playwright", "frontend-ui-ux"]). Skills will be resolved and their content prepended with a separator. Empty array [] is NOT allowed - use null if no skills needed.
- output_format: "summary" (default) or "full" for sync results. Summary truncates long outputs to save context.

**WHEN TO USE resume:**
- Task failed/incomplete → resume with "fix: [specific issue]"
- Need follow-up on previous result → resume with additional question
- Multi-turn conversation with same agent → always resume instead of new task

Prompts MUST be in English.`
