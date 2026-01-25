# Enhanced Task Toast Notifications

## Context

### Original Request
User wants richer toast notifications for background/sync task lifecycle, showing:
- Task status (STARTED/COMPLETED)
- Task name
- Agent name
- Token usage (input/output)
- Task report/summary (on completion)
- **Live progress updates** showing what the agent is currently working on (for background tasks)

### Interview Summary
- Investigated OpenCode's `client.tui.showToast()` API - confirmed working
- Found bug: sync tasks (`run_in_background=false`) never call `showCompletionToast()`
- Token usage available via `client.session.messages()` API (each assistant message has `tokens` object)
- Sidebar panel is OpenCode native UI - not controllable by plugin

### Key Research Findings
1. **Toast API**: `client.tui.showToast({ body: { title, message, variant, duration } })`
2. **Token structure** (from session messages):
   ```typescript
   tokens: {
     input: number,
     output: number,
     reasoning: number,
     cache: { read: number, write: number }
   }
   ```
3. **Current bug locations**:
   - `delegate-task/tools.ts` line 408-409: Resume sync - only `removeTask()`, no completion toast
   - `delegate-task/tools.ts` line 761-762: New sync - only `removeTask()`, no completion toast

## Objectives & Deliverables

### Core Objective
Enhance task toast notifications to show comprehensive task information at start and completion.

### Concrete Deliverables
1. Updated `TrackedTask` type with token and result fields
2. Enhanced `showTaskListToast()` with new format for task start
3. Enhanced `showCompletionToast()` with new format including tokens and report
4. Bug fix: Add `showCompletionToast()` calls for sync delegate_task paths
5. Token usage fetching integrated into task completion flow
6. **NEW: Live progress toasts** showing agent's current work during background tasks

### Must Have
- Toast shown on task START with: status, task name, agent name
- Toast shown on task COMPLETION with: status, task name, agent name, tokens, report summary
- Sync tasks (run_in_background=false) must show completion toast (bug fix)
- Resume tasks must show completion toast (bug fix)
- Token usage fetched from session messages API
- **Progress toast** shown periodically for background tasks with agent's latest response

### Must NOT Have
- Do NOT modify OpenCode's sidebar (not controllable)
- Do NOT break existing background task notification flow
- Do NOT remove the inline `<system-reminder>` messages (keep both toast AND prompt message)
- Do NOT fetch tokens synchronously blocking task completion

## Task Flow

```
[1] Update Types
       ↓
[2] Token fetching utility
       ↓
[3-4] Update TaskToastManager (start + completion format)
       ↓
[5-6] Fix delegate-task sync paths (bug fix)
       ↓
[7] Update background-agent manager (completion)
       ↓
[8] Update Tests
       ↓
[9] Add Progress Toast method
       ↓
[10] Integrate Progress Toast into polling
       ↓
[11] Integration Test
```

## Parallelization

**Group A (Can run in parallel):**
- Task 1: Update types
- Task 3: Add token fetching utility

**Group B (Sequential after A):**
- Task 2: Update TaskToastManager (depends on types)

**Group C (Sequential after B):**
- Task 4: Fix delegate-task (depends on manager changes)
- Task 5: Update background-agent (depends on manager changes)

**Group D (Final):**
- Task 6: Test all paths

## TODOs

- [ ] 1. Update TrackedTask Type
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/features/task-toast-manager/types.ts`
  - Add optional fields to `TrackedTask` interface:
    ```typescript
    tokens?: {
      input: number
      output: number
    }
    result?: string  // Summary of task result
    ```
  - Add new interface for completion toast data:
    ```typescript
    interface CompletionToastData {
      id: string
      description: string
      agent: string
      duration: string
      tokens?: { input: number; output: number }
      result?: string
    }
    ```
  **Must NOT do**: Change existing required fields
  **References**: `src/features/task-toast-manager/types.ts`
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] TrackedTask has optional `tokens` and `result` fields
  - [ ] CompletionToastData interface exported
  - [ ] Typecheck passes

- [ ] 2. Create Token Fetching Utility
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Create new file `src/features/task-toast-manager/token-utils.ts`
  - Implement function to fetch token usage from session:
    ```typescript
    export async function getSessionTokenUsage(
      client: OpencodeClient,
      sessionID: string
    ): Promise<{ input: number; output: number } | null>
    ```
  - Sum all assistant message tokens (input + cache.read for input, output for output)
  - Handle errors gracefully (return null on failure)
  **Must NOT do**: Block on failure, throw exceptions
  **References**: `src/hooks/context-window-monitor.ts` (example of token fetching)
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Function fetches tokens from session messages
  - [ ] Handles errors gracefully
  - [ ] Typecheck passes

- [ ] 3. Update TaskToastManager - Start Toast
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/features/task-toast-manager/manager.ts`
  - Update `showTaskListToast()` method to use new format:
    ```
    Title: "[TASK STARTED]"
    Message:
    Task: {description}
    Agent: {agent}
    [+ existing running/queued list if multiple tasks]
    ```
  - Keep existing logic for showing multiple tasks
  **Must NOT do**: Remove existing task list functionality
  **References**: `src/features/task-toast-manager/manager.ts` lines 150-170
  **Verification Method**: `bun run typecheck && bun test task-toast`
  **Definition of Done**:
  - [ ] Start toast shows new format
  - [ ] Multiple task list still works
  - [ ] Tests pass

- [ ] 4. Update TaskToastManager - Completion Toast
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Update `showCompletionToast()` method signature to accept `CompletionToastData`
  - Update toast format:
    ```
    Title: "[TASK COMPLETED]"
    Message:
    Task: {description}
    Agent: {agent}
    Duration: {duration}
    Tokens: {input}in / {output}out (if available)
    Report: {truncated result} (if available, max 100 chars)
    ```
  - Truncate result to ~100 chars with "..." if longer
  **Must NOT do**: Make tokens/result required (keep optional)
  **References**: `src/features/task-toast-manager/manager.ts` lines 176-199
  **Verification Method**: `bun run typecheck && bun test task-toast`
  **Definition of Done**:
  - [ ] Completion toast shows new format
  - [ ] Tokens displayed if provided
  - [ ] Result truncated appropriately
  - [ ] Tests pass

- [ ] 5. Fix delegate-task Sync Path - New Tasks
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/tools/delegate-task/tools.ts`
  - At line ~761 (sync task completion), before `removeTask()`:
    1. Fetch token usage using new utility
    2. Call `showCompletionToast()` with full data:
       ```typescript
       toastManager.showCompletionToast({
         id: taskId,
         description: args.description,
         agent: agentToUse,
         duration,
         tokens: await getSessionTokenUsage(client, sessionID),
         result: formattedOutput.slice(0, 200)
       })
       ```
  - Import the new utility function
  **Must NOT do**: Remove existing `removeTask()` call, block on token fetch failure
  **References**: `src/tools/delegate-task/tools.ts` lines 755-775
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Sync tasks show completion toast
  - [ ] Tokens fetched and passed
  - [ ] Result summary passed
  - [ ] Typecheck passes

- [ ] 6. Fix delegate-task Sync Path - Resume Tasks
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - At line ~408 (resume task completion), before `removeTask()`:
    1. Fetch token usage
    2. Call `showCompletionToast()` with data
  - Similar pattern to Task 5
  **Must NOT do**: Break existing resume flow
  **References**: `src/tools/delegate-task/tools.ts` lines 400-430
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Resume tasks show completion toast
  - [ ] Typecheck passes

- [ ] 7. Update background-agent Manager
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/features/background-agent/manager.ts`
  - In `notifyParentSession()` at line ~771:
    1. Fetch token usage before calling `showCompletionToast()`
    2. Pass tokens and result to `showCompletionToast()`
  - Get result from task completion data if available
  **Must NOT do**: Change the `<system-reminder>` message flow
  **References**: `src/features/background-agent/manager.ts` lines 760-776
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Background tasks pass tokens to completion toast
  - [ ] Typecheck passes

- [ ] 8. Update Tests
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Update `src/features/task-toast-manager/manager.test.ts`:
    - Test new toast message format
    - Test with/without tokens
    - Test with/without result
    - Test result truncation
  - Ensure existing tests still pass
  **Must NOT do**: Delete existing tests
  **References**: `src/features/task-toast-manager/manager.test.ts`
  **Verification Method**: `bun test task-toast-manager`
  **Definition of Done**:
  - [ ] New format tested
  - [ ] Edge cases covered
  - [ ] All tests pass

- [ ] 9. Add Progress Toast Method to TaskToastManager
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/features/task-toast-manager/manager.ts`
  - Add new method `showProgressToast()`:
    ```typescript
    showProgressToast(task: {
      id: string
      description: string
      agent: string
      progress: string  // Agent's latest response/activity
      toolCalls?: number
      elapsed: string
    }): void
    ```
  - Toast format:
    ```
    Title: "[TASK IN PROGRESS]"
    Message:
    Task: {description}
    Agent: {agent} | {elapsed} | {toolCalls} tools
    ---
    {progress (truncated to 150 chars)}
    ```
  - Use shorter duration (2-3 seconds) since it's a progress update
  **Must NOT do**: Show progress toast if task is not running
  **References**: `src/features/task-toast-manager/manager.ts`
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] `showProgressToast()` method added
  - [ ] Format matches spec
  - [ ] Typecheck passes

- [ ] 10. Integrate Progress Toast into BackgroundManager Polling
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/features/background-agent/manager.ts`
  - In the polling loop (around line 990-1020), add progress toast trigger:
    1. Track last progress toast time per task
    2. Show progress toast every ~10 seconds if task has new `lastMessage`
    3. Call `toastManager.showProgressToast()` with task progress data
  - Add throttling to avoid toast spam (min 10s between progress toasts per task)
  - Only show if `task.progress.lastMessage` exists and changed since last toast
  **Must NOT do**: 
  - Show progress toast for sync tasks (only background)
  - Show toast more frequently than every 10 seconds
  - Block polling on toast failure
  **References**: 
  - `src/features/background-agent/manager.ts` lines 985-1020 (polling loop)
  - `src/features/background-agent/types.ts` (TaskProgress has lastMessage)
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Progress toast shown during background task execution
  - [ ] Throttled to max once per 10 seconds
  - [ ] Shows agent's latest response text
  - [ ] Typecheck passes

- [ ] 11. Integration Test - Manual Verification
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Run `bun run build`
  - Test in OpenCode with:
    1. Background task (`run_in_background=true`) - verify start + **progress** + completion toast
    2. Sync task (`run_in_background=false`) - verify start + completion toast (no progress for sync)
    3. Resume task - verify completion toast
  - Verify toast shows: task name, agent, tokens, report
  - Verify progress toast shows agent's current work
  **Must NOT do**: Skip manual verification
  **References**: N/A
  **Verification Method**: Manual testing in OpenCode
  **Definition of Done**:
  - [ ] Background task toasts work (start + progress + completion)
  - [ ] Progress toast shows agent's response text
  - [ ] Sync task toasts work
  - [ ] Resume task toasts work
  - [ ] All information displayed correctly
