import { join } from "node:path";
import { getOpenCodeStorageDir } from "../../shared/data-path";

export const OPENCODE_STORAGE = getOpenCodeStorageDir();
export const AGENT_USAGE_REMINDER_STORAGE = join(
  OPENCODE_STORAGE,
  "agent-usage-reminder",
);

// All tool names normalized to lowercase for case-insensitive matching
export const TARGET_TOOLS = new Set([
  "grep",
  "safe_grep",
  "glob",
  "safe_glob",
  "webfetch",
  "context7_resolve-library-id",
  "context7_query-docs",
  "websearch_web_search_exa",
  "context7_get-library-docs",
  "grep_app_searchgithub",
]);

export const AGENT_TOOLS = new Set([
  "task",
  "call_paul_agent",
  "delegate_task",
]);

export const REMINDER_MESSAGE = `
[Agent Usage Reminder]

You called a search/fetch tool directly without leveraging specialized agents.

RECOMMENDED: Use call_paul_agent with explore/librarian agents for better results:

\`\`\`
// Parallel exploration - fire multiple agents simultaneously
call_paul_agent(subagent_type="explore", prompt="Find all files matching pattern X", description="Scout: file patterns", run_in_background=true)
call_paul_agent(subagent_type="explore", prompt="Search for implementation of Y", description="Scout: implementation of Y", run_in_background=true)
call_paul_agent(subagent_type="librarian", prompt="Lookup documentation for Z", description="Scout: docs for Z", run_in_background=true)

// Then continue your work while they run in background
// System will notify you when each completes
\`\`\`

WHY:
- Agents can perform deeper, more thorough searches
- Background tasks run in parallel, saving time
- Specialized agents have domain expertise
- Reduces context window usage in main session

ALWAYS prefer: Multiple parallel call_paul_agent calls > Direct tool calls
`;
