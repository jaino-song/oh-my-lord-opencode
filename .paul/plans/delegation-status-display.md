# Delegation Status Display

## Context

### Original Request
User wants to see delegation status persistently in the terminal (not ephemeral toasts):
- **START**: When a delegation begins
- **COMPLETE**: When a delegation finishes with token usage

### Key Research Findings
1. `showToast` creates ephemeral popups that user isn't seeing in Warp terminal
2. `<system-reminder>` injection (used by background task completion) is persistent and visible
3. Token usage is already being fetched via `getsessiontokenusage()` but only passed to toasts

## Objectives & Deliverables

### Core Objective
Show delegation start/complete status persistently in the chat using tool result text and system-reminder injection.

### Concrete Deliverables
1. START message injected when delegation begins
2. COMPLETE message in tool result with tokens and duration

### Formats

**START message:**
```
Paul → {agent}
Task: {description}
Parallelism: {Yes|No}
```

**COMPLETE message:**
```
⚡ Paul → {agent}
Task: {description}
Tokens: {input} in / {output} out / {total} total
Duration: {duration}
✅ Task Complete
```

### Must Have
- START message shown immediately when delegation begins
- COMPLETE message with token usage (input/output/total)
- Duration display
- Parallelism indicator (Yes if run_in_background=true, No otherwise)

### Must NOT Have
- Do NOT rely on showToast (not visible in all terminals)
- Do NOT remove existing functionality
- Do NOT block on token fetch failure

## Task Flow

```
[1] Add START injection for sync tasks
       ↓
[2] Update COMPLETE format for sync tasks
       ↓
[3] Update START format for background tasks
       ↓
[4] Update COMPLETE format for background tasks
       ↓
[5] Test and verify
```

## TODOs

- [ ] 1. Add START System-Reminder Injection for Sync Tasks
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/tools/delegate-task/tools.ts`
  - After the session is created but BEFORE blocking on completion (around line 710-720)
  - Inject a system-reminder to the PARENT session showing task start:
    ```typescript
    // Inject START notification to parent session
    const parallelism = args.run_in_background ? "Yes" : "No"
    const startNotification = `<system-reminder>
    Paul → ${agentToUse}
    Task: ${args.description}
    Parallelism: ${parallelism}
    </system-reminder>`
    
    try {
      await client.session.prompt({
        path: { id: parentSessionID },
        body: { parts: [{ type: "text", text: startNotification }] }
      })
    } catch { /* ignore injection failures */ }
    ```
  - Need to get parentSessionID from context or input
  **Must NOT do**: Block task execution if injection fails
  **References**: `src/features/background-agent/manager.ts` lines 808-829 (example of system-reminder injection)
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] START message injected before task blocks
  - [ ] Shows agent, task description, parallelism
  - [ ] Typecheck passes

- [ ] 2. Update COMPLETE Format for Sync Tasks
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - In `src/tools/delegate-task/tools.ts` around line 791-798
  - Update the return string format:
    ```typescript
    const total = tokens ? tokens.input + tokens.output : 0
    const tokenLine = tokens 
      ? `Tokens: ${tokens.input} in / ${tokens.output} out / ${total} total`
      : ""
    
    return `⚡ Paul → ${agentToUse}
    Task: ${args.description}
    ${tokenLine}
    Duration: ${duration}
    ✅ Task Complete
    
    Session ID: ${sessionID}
    
    ---
    
    ${formattedOutput}`
    ```
  - Do the same for resume task completion (around line 436)
  **Must NOT do**: Remove session ID from output
  **References**: `src/tools/delegate-task/tools.ts` lines 789-798
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] COMPLETE message has new format
  - [ ] Token usage shows input/output/total
  - [ ] Duration and checkmark shown
  - [ ] Typecheck passes

- [ ] 3. Update START Format for Background Tasks
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - In `src/tools/delegate-task/tools.ts`, find the background task launch return (around line 650-660)
  - Update the return format to match:
    ```typescript
    return `Paul → ${agentToUse}
    Task: ${args.description}
    Parallelism: Yes
    
    Task ID: ${task.id}
    Session ID: ${task.sessionID}
    
    Task launched in background. Use \`background_output\` to check results.`
    ```
  **Must NOT do**: Remove task ID or session ID
  **References**: `src/tools/delegate-task/tools.ts` background task section
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Background START has consistent format
  - [ ] Shows parallelism: Yes
  - [ ] Typecheck passes

- [ ] 4. Update COMPLETE Format for Background Tasks
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - In `src/features/background-agent/manager.ts` around line 818-828
  - Update the system-reminder injection to include token info:
    ```typescript
    // Fetch token usage
    const tokenAnalytics = getTaskToastManager()?.getTokenAnalytics?.()
    const tokens = tokenAnalytics?.getAnalytics(task.sessionID)?.totalUsage
    const tokenLine = tokens 
      ? `Tokens: ${tokens.input} in / ${tokens.output} out / ${tokens.input + tokens.output} total`
      : ""
    
    notification = `<system-reminder>
    ⚡ Paul → ${task.agent}
    Task: ${task.description}
    ${tokenLine}
    Duration: ${duration}
    ✅ Task Complete
    
    Use \`background_output(task_id="${task.id}")\` to retrieve result.
    </system-reminder>`
    ```
  - May need to pass TokenAnalyticsManager or fetch tokens differently
  **Must NOT do**: Break existing background task completion flow
  **References**: `src/features/background-agent/manager.ts` lines 800-830
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Background COMPLETE has token info
  - [ ] Format matches sync task COMPLETE
  - [ ] Typecheck passes

- [ ] 5. Test All Paths
  **Agent Hint**: Joshua (Test Runner)
  **What to do**:
  - Run typecheck: `bun run typecheck`
  - Run build: `bun run build`
  - Manual test:
    1. Sync task: `delegate_task(category="quick", description="test", prompt="say done", run_in_background=false)`
    2. Background task: `delegate_task(category="quick", description="test bg", prompt="say done", run_in_background=true)`
  - Verify START and COMPLETE messages appear with correct format
  **Must NOT do**: Skip manual verification
  **References**: N/A
  **Verification Method**: Manual testing
  **Definition of Done**:
  - [ ] Sync task shows START then COMPLETE with tokens
  - [ ] Background task shows START then COMPLETE with tokens
  - [ ] All formats match specification
