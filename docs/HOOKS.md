# Hook Reference

This plugin is hook-driven. Hooks are the primary enforcement layer: they intercept tools, events, and message transforms.

Authoritative sources:
- Hook exports: `src/hooks/index.ts`
- Hook ordering: `src/index.ts` (`tool.execute.before`, `tool.execute.after`, `chat.message`, `event`)

## Tool Hook Pipeline Ordering

The tool pipeline is wired explicitly in `src/index.ts`.

### tool.execute.before order
1. `claude-code-hooks`
2. `non-interactive-env`
3. `comment-checker`
4. `directory-agents-injector`
5. `directory-readme-injector`
6. `rules-injector`
7. `prometheus-md-only`
8. `tdd-enforcement`
9. `strict-workflow`
10. `hierarchy-enforcer`
11. `parallel-safety-enforcer`
12. `paul-orchestrator`

### tool.execute.after order
1. `claude-code-hooks`
2. `tool-output-truncator`
3. `context-window-monitor`
4. `comment-checker`
5. `directory-agents-injector`
6. `directory-readme-injector`
7. `plan-summary-injector`
8. `rules-injector`
9. `empty-task-response-detector`
10. `agent-usage-reminder`
11. `interactive-bash-session`
12. `edit-error-recovery`
13. `delegate-task-retry`
14. `paul-orchestrator`
15. `tdd-enforcement`
16. `strict-workflow`
17. `hierarchy-enforcer`
18. `parallel-safety-enforcer`
19. `task-resume-info`
20. `token-analytics`

## Hook Reference (Detailed)

This is the set exported by `src/hooks/index.ts`.

### Enforcement / Safety

#### `hierarchy-enforcer`
**Purpose**: Enforces the three-domain agent architecture (planning, execution, trivial). Prevents cross-domain calls that violate strict mode.

**Enforcements (HARD BLOCKS - Throws Errors)**:
- Cross-domain calls (Paul → planner-paul, worker-paul → Paul, etc.)
- Orchestrators writing code directly without delegating
- Subagents delegating to other subagents

**Warnings (ADVISORY - Allows Proceeding)**:
- Competency routing: Wrong specialist for task type (e.g., CSS work to non-specialist)

**Features**:
- Agent call graph validation using call_omo_agent / call_paul_agent
- Approval state tracking for task completion (Ezra for plans, Thomas for TDD)
- OS notifications for delegation status
- Toast messages for agent transitions

**v4.2 Changes**:
- planner-paul can NO longer delegate to Paul/worker-paul (user switches manually)
- Timothy removed from planner-paul's allowed delegates (always use Ezra)
- Plan review approval now requires Ezra (not Timothy)

---

#### `tdd-enforcement`
**Purpose**: Enforces RED-GREEN-REFACTOR TDD cycle. Blocks writing implementation without tests first.

**Enforcements (HARD BLOCKS)**:
- Cannot write implementation code (write/edit) before test file exists
- Cannot mark todo as completed without running test verification
- Cannot skip test execution after implementation

**Phases Tracked**:
- `NONE`: No work started
- `RED`: Test written, not yet passing
- `GREEN`: Implementation written, tests verified passing

**Features**:
- Dirty file tracking (files modified but not verified)
- Auto-clears dirty files when delegating to test agents (Joshua, Peter, John)
- Detects test files by extension (`.test.ts`, `.spec.ts`, `__tests__/`)
- Supports TypeScript, JavaScript, Python

---

#### `strict-workflow`
**Purpose**: Enforces project-specific development standards.

**Enforcements**:
- **Package Managers**: Blocks npm/yarn/pnpm - only `bun` allowed
- **Commit Messages**: Requires Conventional Commits format: `<type>(<scope>): <description>`
  - Valid types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
  - Example: `feat(auth): add login support`

---

#### `parallel-safety-enforcer`
**Purpose**: Prevents file conflicts when running parallel background tasks.

**Enforcements**:
- Maximum parallel tasks limit (default: configurable)
- File conflict detection: Cannot modify same file across parallel tasks
- Background-only enforcement (synchronous tasks unaffected)

**Features**:
- File extraction from prompt content
- Pending file tracking per session
- Graceful error messages with remediation options

---

#### `planner-md-only` / `prometheus-md-only`
**Purpose**: Restricts planner agents (planner-paul) to read-only operations on code files.

**Enforcements**:
- Blocks `write`/`edit`/`read` on non-.md files
- Blocks file-modifying bash commands (pattern-based)
- Allows only `.md` files within workspace root
- Requires at least one todo before writing to `.paul/plans/*.md`
- Drafts (`.paul/plans/drafts/*.md`) exempt from todo requirement

**Safe Bash Commands Allowed**: `ls`, `find`, `grep`, `git log`, `git status`, `git diff` (read-only)

**Exemptions**:
- When delegating to Paul/worker-paul for execution (don't inject read-only warning)
- Draft plan writes (no todo gate)

---

#### `paul-orchestrator`
**Purpose**: Enforces orchestrator behavior (delegate, don't implement directly). Activates when Paul agent is active.

**Enforcements (ADVISORY)**:
- Direct file modifications outside `.paul/` trigger delegation reminder
- Must delegate implementation to subagents
- Must verify subagent work after completion

**Features**:
- Plan continuation reminders for active work plans
- Verification reminders after delegate_task completion
- Auto-switches to appropriate agent when reading `.paul/plans/*.md`

---

### Context Injection

#### `directory-agents-injector`
**Purpose**: Automatically injects `AGENTS.md` files into agent context when working in specific directories.

**Behavior**:
- Searches upward from file path for `AGENTS.md`
- Skips root `AGENTS.md` (OpenCode already loads it)
- Caches injected paths per session to avoid duplicates
- Dynamically truncates to ~500 tokens max

**Use Case**: Team-specific agent instructions in subdirectories (e.g., `frontend/AGENTS.md`)

---

#### `directory-readme-injector`
**Purpose**: Automatically injects `README.md` files into agent context when working in specific directories.

**Behavior**:
- Searches upward from file path for `README.md`
- Caches injected paths per session to avoid duplicates
- Dynamically truncates to ~500 tokens max

**Use Case**: Project-specific context, build instructions, API docs

---

#### `rules-injector`
**Purpose**: Conditionally injects rule files from `.claude/rules/` based on file path matching.

**Behavior**:
- Rule files use frontmatter: `rules: [{match: "src/**/*.ts"}]`
- Searches: project root, `~/.claude/rules/`, and near target file
- De-duplicates by content hash and real path
- Dynamically truncates to context limits

**Frontmatter Example**:
```yaml
---
rules:
  - match: "src/**/*.ts"
    reason: "TypeScript-specific conventions"
---

# TypeScript Rules
Use strict types, no `any`...
```

---

#### `plan-summary-injector`
**Purpose**: Summarizes plan files (`.paul/plans/*.md`, `.sisyphus/plans/*.md`) when read by Paul agent.

**Behavior**:
- Extracts title and todo list from plan
- Shows progress: `## TODO Summary (3/10)`
- Lists up to 40 todos, truncates remainder
- Caches by file mtime to avoid re-summarizing

**Only Active For**: Paul agent (not subagents)

---

#### `compaction-context-injector`
**Purpose**: Ensures session summaries preserve critical context for post-compaction continuity.

**Injects During Compaction**:
Required sections in agent's summary:
1. **User Requests (As-Is)**: Original user prompts preserved
2. **Final Goal**: What user ultimately wanted
3. **Work Completed**: Files modified, features implemented
4. **Remaining Tasks**: Pending work, follow-ups
5. **MUST NOT Do**: Forbidden approaches, failed attempts, anti-patterns

**Use Case**: Prevents agent amnesia after session compaction

---

### Claude Code Compatibility

#### `claude-code-hooks`
**Purpose**: Compatibility layer for Claude Code's `settings.json` hooks.

**Implements**:
- `PreToolUse`: Modify tool inputs before execution
- `PostToolUse`: Append context after tool results
- `UserPromptSubmit`: Filter/modify user prompts
- `Stop`: Handle session idle events
- `PreCompact`: Inject context before summary generation

**Features**:
- Loads hook configuration from `.claude/settings.json`
- Extensible via plugin-extended config
- Error state tracking for recovery
- Tool input/result caching
- Transcript recording

---

### Recovery / Robustness

#### `session-recovery`
**Purpose**: Auto-recovers from session crashes, corruption, or interrupted states.

**Recovers From**:
- Missing tool results in assistant messages
- Incorrect `<thinking>` block ordering
- Thinking disabled violations (thinking block without permission)
- Empty messages after compaction
- Orphaned thinking blocks (not followed by response)
- Empty assistant messages with tool uses

**Recovery Actions**:
- Removes invalid tool use parts
- Reorders thinking blocks
- Strips thinking blocks when disabled
- Replaces empty messages with recovery text
- Re-prompts session with continuation directive

---

#### `anthropic-context-window-limit-recovery`
**Purpose**: (Separate from `context-window-monitor`) Auto-summarizes at 85% context window usage to prevent hard limits.

**Behavior**:
- Triggers when approaching 200k token limit (1M context requires 1M-aware check)
- Uses preemptive compaction to stay under limit
- Prevents "context window exceeded" errors

---

#### `edit-error-recovery`
**Purpose**: Catches Edit tool mistakes and forces immediate corrective action.

**Detects**:
- `oldString and newString must be different`
- `oldString not found`
- `oldString found multiple times`

**Recovery Reminder**:
```
[EDIT ERROR - IMMEDIATE ACTION REQUIRED]

You made an Edit mistake. STOP and do this NOW:

1. READ the file immediately to see its ACTUAL current state
2. VERIFY what the content really looks like (your assumption was wrong)
3. APOLOGIZE briefly to the user for the error
4. CONTINUE with corrected action based on the real file content

DO NOT attempt another edit until you've read and verified the file state.
```

---

#### `delegate-task-retry`
**Purpose**: Parses delegate_task errors and provides actionable retry guidance.

**Handles Errors**:
- `run_in_background` parameter missing
- `skills` parameter missing
- `category` vs `subagent_type` mutual exclusivity
- Unknown category/agent/skill
- Primary agent blocking

**Retry Guidance**:
- Extracts error type from failure message
- Provides fix hint: "Add run_in_background=false"
- Lists available options from error output

---

#### `task-resume-info`
**Purpose**: Appends resume instructions to delegate_task output for later continuation.

**Behavior**:
- Detects session ID in delegate_task output
- Appends: `to resume: delegate_task(resume="ses_xyz", prompt="...")`
- Skips if already present or if task failed

---

#### `empty-task-response-detector`
**Purpose**: Warns when delegate_task returns no response.

**Warning**:
```
[Task Empty Response Warning]

Task invocation completed but returned no response. This indicates that agent either:
- Failed to execute properly
- Did not terminate correctly
- Returned an empty result

Note: The call has already completed - you are NOT waiting for a response. Proceed accordingly.
```

---

### Workflow / UX

#### `todo-notification`
**Purpose**: Shows OS notifications and toasts when todo items are completed or started.

**Behavior**:
- Monitors `todowrite` tool calls
- Shows toast notification when todo status changes to `completed`
- Shows toast notification when todo status changes to `in_progress`
- Injects completion notification into session (except for delegation todos)
- Tracks notified todos per session to avoid duplicates

**Notifications**:
- ✅ Task Completed: Shows when a todo is marked complete
- 🔄 Task Started: Shows when a todo is marked in_progress

---

#### `delegation-notification`
**Purpose**: Shows OS notifications and toasts when delegate_task completes.

**Behavior**:
- Monitors `delegate_task` tool results
- Shows agent-specific toasts based on result content
- Records approvals for hierarchy-enforcer (Timothy, Thomas, Joshua)
- Injects notifications for background tasks

**Agent-specific notifications**:
- **Nathan**: Shows complexity analysis (LOW/MEDIUM/HIGH)
- **Timothy**: Shows approval status (approved/issues to address)
- **Solomon**: Shows test count planned
- **Thomas**: Shows spec review status (approved/complete)
- **Joshua**: Shows pass/fail with test counts
- **Paul-Junior/frontend-ui-ux**: Shows success/error with task details
- **git-master**: Shows commit SHA or push status
- **explore/librarian**: Shows file count found

**Approval Recording**:
- Timothy approval → records for hierarchy-enforcer
- Thomas approval → records for hierarchy-enforcer
- Joshua pass → records for hierarchy-enforcer

---

#### `todo-continuation-enforcer`
**Purpose**: Advises agent to continue incomplete tasks when stopping.

**Status**: ⚠️ **TEMPORARILY DISABLED** (v0.16.0)

**Behavior** (when enabled):
- Monitors todo list for incomplete items
- Detects "abort" signals (stopping mid-task)
- Injects advisory continuation prompt before agent stops

**Advisory**:
```
[TODO CONTINUATION]

Incomplete tasks remain in your todo list.

ADVISORY: Consider continuing with the next pending task if appropriate.
- Some tasks may require manual user action or cannot be automated
- If a task is blocked or requires user input, you may skip it
- Mark tasks complete when finished
- If all remaining tasks are blocked, you may stop and report status
```

**Skips**: Planner agents (planner-paul) by default

---

#### `hit-it`
**Purpose**: Detects `/hit-it` command in user requests and activates execution mode.

**Triggers On**:
- `/hit-it` or `/hititx` keyword
- Quick fix patterns (e.g., "fix line 42", "typo in file")
- Specific file mentions

**Behavior**:
- Finds active plan in `.paul/plans/`
- Reads plan state and progress
- Prompts Paul to continue execution
- Clears planner state (switches from planning to execution)

**Quick Fix Patterns**:
- "fix/edit/update/remove line X"
- "typo/spelling/grammar fix"
- File extensions: `.ts`, `.tsx`, `.js`, `.py`, `.md`, etc.

---

#### `auto-slash-command`
**Purpose**: Detects `/command` patterns in user prompts and replaces with command templates.

**Behavior**:
- Parses `/command args` from prompt text
- Loads skill templates (if skills provided)
- Replaces prompt with tagged command content
- Skips if already processed (prevents infinite loops)

**Example**:
```
User: /plan add user auth
→ Replaced with: [AUTO-SLASH-COMMAND]
[/plan] template content...
[/AUTO-SLASH-COMMAND]
```

---

#### `ralph-loop`
**Purpose**: Self-referential development loop - continues agent work until completion promise output.

**Behavior**:
- Starts loop with prompt and optional completion promise
- Monitors agent responses for `<promise>PROMISE</promise>`
- Auto-reprompts if completion promise missing
- Increments iteration counter each retry
- Stops after max iterations (default: 3)

**Completion Promise Format**:
```xml
<promise>I've implemented user authentication with login, logout, and JWT token management.</promise>
```

**Use Case**: Multi-step tasks requiring multiple agent turns

---

#### `clarification-handler`
**Purpose**: Enables bidirectional orchestrator-subagent conversation for clarification requests.

**Format**:
```
[needs_clarification]
question: <question>
options:
a) <option 1>
b) <option 2>
context: <context>
recommendation: <a or b>
[/needs_clarification]
```

**Behavior**:
- Detects clarification marker in delegate_task result
- Parses question, options, recommendation
- Shows toast with clarification details
- Orchestrator answers from context or escalates to user
- Max 3 clarification rounds per delegation

**Skips**: Background tasks (logs warning instead)

---

#### `agent-usage-reminder`
**Purpose**: Reminds agent to use delegation when appropriate.

**Behavior**:
- Tracks if agent used delegate_task or call_omo_agent
- After using tools (read, write, grep, etc.) without delegation:
  - Injects reminder message on next tool output
- Persists state per session (survives compaction)
- Resets on session delete/compaction

**Reminders Stop Once**: Agent uses delegation at least once

---

### Utilities

#### `tool-output-truncator`
**Purpose**: Truncates verbose tool outputs to prevent context bloat.

**Truncated Tools** (default 50k tokens):
- `grep`, `glob`, `lsp_diagnostics`, `ast_grep_search`
- `interactive_bash`, `skill_mcp`

**Special Limits**:
- `webfetch`: 10k tokens (aggressive for web pages)

**Dynamic Behavior**:
- Adjusts truncation based on current context usage
- Uses token counting to ensure precision
- Graceful degradation if token counting fails

---

#### `context-window-monitor`
**Purpose**: Reminds Anthropic Claude agents when they have plenty of context remaining.

**Behavior**:
- Monitors last assistant message's input tokens
- Injects reminder when usage < 70% of limit
- Prevents "context anxiety" - rushing to finish

**Reminder**:
```
[CONTEXT WINDOW MONITOR]

You are using Anthropic Claude with 1M context window.
You have plenty of context remaining - do NOT rush or skip tasks.
Complete your work thoroughly and methodically.

[Context Status: 45.2% used (45,200/1,000,000 tokens), 54.8% remaining]
```

**Respects**: `ANTHROPIC_1M_CONTEXT` and `VERTEX_ANTHROPIC_1M_CONTEXT` env vars

---

#### `comment-checker`
**Purpose**: Prevents AI-generated slop, excessive comments, and bad comment patterns.

**Uses**: External CLI binary (`@code-yeongyu/comment-checker`)

**Patterns Blocked**:
- Excessive comments (> 30% comment ratio)
- Redundant "Initialize X" comments
- "TODO" comments without tasks
- Empty comment blocks
- Comments that duplicate code

**Behavior**:
- Runs on `write`/`edit`/`multiedit` tools
- Downloads CLI binary on first use (lazy)
- Returns warning or error based on severity
- Logs debug info to `/tmp/comment-checker-debug.log` (when `COMMENT_CHECKER_DEBUG=1`)

---

#### `keyword-detector`
**Purpose**: Detects special keywords in user prompts and triggers agent behavior changes.

**Detected Keywords**:
- `ultrawork`: Sets variant to "max", all agents available
- `debug`: Enables debug mode
- `strict`: Enforces strict checking
- `verbose`: Increases logging verbosity

**Behavior**:
- Filters code blocks before detection
- Skips system directive messages
- Injects context collector entries for each keyword
- Shows toast notification for ultrawork mode

**Ultrawork Mode**:
```javascript
ctx.client.tui.showToast({
  body: {
    title: "Ultrawork Mode Activated",
    message: "Maximum precision engaged. All agents at your disposal.",
    variant: "success",
    duration: 3000
  }
})
```

---

#### `think-mode`
**Purpose**: Detects "think" keyword and switches to high-variant models with thinking configuration.

**Behavior**:
- Detects `/think` or "think:" in prompt
- Switches model to high variant (e.g., `claude-opus-4-5`)
- Injects thinking configuration (e.g., `thinking_budget` for Gemini)
- Persists state per session

**Supported Providers**:
- Anthropic: Already high-variant models
- Google: Injects `thinking_budget`
- OpenAI: Switches to o1/o3 if applicable

---

#### `non-interactive-env`
**Purpose**: Prepends non-interactive environment variables to git commands to prevent hanging.

**Problem Solved**:
- Git commands with pagers (`less`, `vim`) hang in non-interactive shells
- CI/CD environments require `GIT_TERMINAL_PROMPT=0`

**Behavior**:
- Detects git commands in bash tool
- Prepends: `GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat`
- Warns about interactive commands (e.g., `vim`, `nano`)

**Banned Commands** (warns):
- `vim`, `vi`, `nano`, `emacs`, `less`, `more`

---

#### `interactive-bash-session`
**Purpose**: Manages tmux sessions for Paul agents when using TUI apps (vim, pudb, htop).

**Behavior**:
- Detects Paul session ID (e.g., `paul-x`)
- Detects TUI command patterns: `vim`, `pudb`, `htop`
- Creates or attaches to tmux session: `tmux new-session -d -s paul-x`
- Sends command via `tmux send-keys`
- Reminds agent to attach: `tmux attach -t paul-x`

**Session Naming**:
- Strips `:window` and `.pane` suffixes
- Example: `paul-1:1.2` → `paul-1`

---

#### `empty-message-sanitizer`
**Purpose**: Cleans up empty or whitespace-only messages to prevent agent confusion.

**Behavior**:
- Detects empty message parts
- Strips whitespace-only content
- Removes empty messages entirely

---

#### `thinking-block-validator`
**Purpose**: Ensures valid `<thinking>` block format in agent responses.

**Validates**:
- Thinking blocks have opening `<thinking>` and closing `</thinking>`
- No orphaned thinking blocks (opening without closing)
- No nested thinking blocks

**Errors**: Throws if validation fails (blocks tool execution)

---

#### `session-notification`
**Purpose**: Shows OS notifications for session lifecycle events.

**Events**:
- Session created
- Session deleted
- Agent switched
- Task completed (via delegate_task)

**Behavior**:
- Uses `ctx.client.tui.showToast` API
- Configurable duration (default: 5s)
- Variants: info, success, warning, error

---

#### `background-notification`
**Purpose**: Shows OS notifications for background task completion.

**Behavior**:
- Monitors background agent tasks
- Shows notification on task completion/failure
- Includes task duration and result

---

#### `background-compaction`
**Purpose**: Manages automatic session compaction to prevent context bloat.

**Behavior**:
- Triggers compaction at configurable token thresholds
- Runs in background to avoid blocking
- Notifies agent when compaction completes

---

#### `auto-update-checker`
**Purpose**: Checks for plugin updates periodically.

**Behavior**:
- Checks npm registry for new version
- Shows toast notification if update available
- Respects `startup-toast` config flag

---

### Config-only / Legacy Entries

These exist in config schema but are not standalone hook factories:

- **`startup-toast`**: Flag used by `auto-update-checker` to show/hide startup toasts
- **`grep-output-truncator`**: Legacy name for `tool-output-truncator`; no standalone hook export

## Hook Events

| Event | Where Wired | Can Block |
|-------|-------------|-----------|
| `tool.execute.before` | `src/index.ts` | Yes |
| `tool.execute.after` | `src/index.ts` | No |
| `chat.message` | `src/index.ts` | Yes |
| `event` | `src/index.ts` | No |
| `experimental.chat.messages.transform` | `src/index.ts` | No |
| `experimental.session.compacting` | `claude-code-hooks` | No |
