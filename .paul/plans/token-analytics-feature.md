# Token Analytics Feature

## Context
User wants a token analytics system that tracks and reports token usage across all agents during a single agent run. This helps understand costs, efficiency, and delegation patterns.

## Objectives & Deliverables

### Core Objective
Create a token analytics feature that tracks token consumption per agent/model and displays a comprehensive report.

### Deliverables
1. `src/features/token-analytics/` - Token tracking infrastructure
2. `/token-report` slash command - Display analytics report
3. Hook integration - Capture token data from message events

### Must Have
- Track input/output/reasoning tokens per agent
- Track cache read/write tokens
- Calculate estimated cost by model
- Show delegation tree with token breakdown
- Display percentage of total usage per agent

### Must NOT Have
- Persistent storage (session-only tracking)
- External API calls for pricing
- Automatic optimization suggestions

## Task Flow

```
1. Create types.ts (token structures, pricing)
       ↓
2. Create manager.ts (TokenAnalyticsManager class)
       ↓
3. Create reporter.ts (generate formatted report)
       ↓
4. Create hook (capture tokens from events)
       ↓
5. Create slash command (/token-report)
       ↓
6. Wire up in index.ts
       ↓
7. Test with real delegation
```

## TODOs

### TODO 0: Fix Toast False Positive Bug (Prerequisite)
**Agent Hint**: Sisyphus-Junior
**What to do**:
Fix bug in `src/hooks/hierarchy-enforcer/index.ts` where toast shows "Failed" when tasks actually succeeded.

**Problem**: The toast logic matches "error"/"failed" too aggressively - it triggers on system reminder text like "If ANY verification fails..." even when the task succeeded.

**Fix steps**:
1. Add helper function to strip system reminders (around line 227):
```typescript
function stripSystemReminders(text: string): string {
  const reminderStart = text.indexOf("---\n\n**MANDATORY:")
  if (reminderStart !== -1) {
    return text.slice(0, reminderStart).trim()
  }
  return text
}
```

2. For Sisyphus-Junior/frontend-ui-ux/ultrabrain block (lines 310-316), change to:
```typescript
else if (normalizedAgent.includes("sisyphus-junior") || normalizedAgent.includes("frontend-ui-ux") || normalizedAgent.includes("ultrabrain")) {
  const cleanResult = stripSystemReminders(result)
  const cleanLower = cleanResult.toLowerCase()
  const hasSuccess = cleanLower.includes("✅") || cleanLower.startsWith("done") || cleanLower.includes("complete") || cleanLower.includes("success")
  const hasRealError = cleanLower.includes("❌") || /\b(error|failed|exception):/i.test(cleanLower) || cleanLower.includes("threw")
  
  if (hasRealError && !hasSuccess) {
    await showToast(client, `❌ ${targetAgent} Failed`, "Implementation error", "error", 4000)
  } else {
    await showToast(client, `✅ ${targetAgent}`, "Implementation complete", "success", 2500)
  }
}
```

3. For fallback block (lines 338-344), change to:
```typescript
else {
  const cleanResult = stripSystemReminders(result)
  const cleanLower = cleanResult.toLowerCase()
  const hasSuccess = cleanLower.includes("✅") || cleanLower.includes("approved") || cleanLower.includes("passed") || cleanLower.includes("success") || cleanLower.includes("complete")
  const hasRealError = cleanLower.includes("❌") || /\b(error|failed|exception):/i.test(cleanLower)
  
  if (hasRealError && !hasSuccess) {
    await showToast(client, `❌ ${targetAgent || "Task"} Failed`, "Check output for details", "error", 4000)
  } else if (hasSuccess) {
    await showToast(client, `✅ ${targetAgent || "Task"} Complete`, "Delegation successful", "success", 2500)
  }
}
```

**References**:
- `src/hooks/hierarchy-enforcer/index.ts` lines 227-360

**Verification Method**: `bun run typecheck` + manual test with delegation
**Definition of Done**:
- [ ] Toast shows success when task succeeds
- [ ] Toast shows error only on real failures (with ❌, "Error:", etc.)
- [ ] System reminder text doesn't trigger false positives

---

### TODO 1: Create Token Types
**Agent Hint**: Sisyphus-Junior
**What to do**:
- Create `src/features/token-analytics/types.ts`
- Define `TokenUsage` interface (input, output, reasoning, cacheRead, cacheWrite)
- Define `AgentTokenRecord` interface (agent, model, provider, usage, messageCount, toolCalls)
- Define `SessionTokenAnalytics` interface (sessionID, agents map, totalUsage)
- Define `TokenReport` and `AgentReportEntry` interfaces
- Define `MODEL_PRICING` constant with per-million-token costs

**References**:
- `src/hooks/context-window-monitor.ts` lines 18-27 (existing token structure)

**Verification Method**: `bun run typecheck`
**Definition of Done**:
- [ ] All interfaces exported
- [ ] MODEL_PRICING includes all common models
- [ ] No TypeScript errors

---

### TODO 2: Create TokenAnalyticsManager
**Agent Hint**: Sisyphus-Junior
**What to do**:
- Create `src/features/token-analytics/manager.ts`
- Implement `TokenAnalyticsManager` class with:
  - `sessions: Map<string, SessionTokenAnalytics>`
  - `startSession(sessionID, parentSessionID?, agent?, model?)` - Initialize tracking
  - `recordMessage(sessionID, agent, model, provider, tokens)` - Record usage
  - `recordToolCall(sessionID, agent)` - Increment tool call count
  - `endSession(sessionID)` - Mark session complete
  - `getAnalytics(sessionID)` - Get session data
  - `getReport(sessionID)` - Generate full report
  - `clear(sessionID)` - Clean up

**References**:
- `src/features/background-agent/manager.ts` (similar manager pattern)

**Verification Method**: `bun run typecheck`
**Definition of Done**:
- [ ] Manager tracks nested delegations via parentSessionID
- [ ] Aggregates totals correctly
- [ ] Handles missing sessions gracefully

---

### TODO 3: Create Report Generator
**Agent Hint**: Sisyphus-Junior
**What to do**:
- Create `src/features/token-analytics/reporter.ts`
- Implement `generateTokenReport(analytics: SessionTokenAnalytics): string`
- Format output as ASCII table with:
  - Session info header
  - Agent breakdown table (agent, model, tokens, cost, percentage)
  - Delegation tree with indentation
  - Token details footer

**Verification Method**: Manual test with mock data
**Definition of Done**:
- [ ] Report is visually clear
- [ ] Numbers are formatted (commas, decimals)
- [ ] Delegation tree shows hierarchy

---

### TODO 4: Create Token Analytics Hook
**Agent Hint**: Sisyphus-Junior
**What to do**:
- Create `src/features/token-analytics/hook.ts`
- Implement `createTokenAnalyticsHook(manager: TokenAnalyticsManager)`
- Hook into events:
  - `message.updated` - Extract tokens from assistant messages
  - `session.created` - Start tracking new session
  - `session.deleted` - Clean up
  - `tool.execute.after` - Count tool calls

**References**:
- `src/hooks/context-window-monitor.ts` (token extraction pattern)
- `src/hooks/session-notification.ts` (event handling pattern)

**Verification Method**: `bun run typecheck`
**Definition of Done**:
- [ ] Captures tokens from all message types
- [ ] Tracks parent-child session relationships
- [ ] Cleans up on session delete

---

### TODO 5: Create /token-report Slash Command
**Agent Hint**: Sisyphus-Junior
**What to do**:
- Create `src/features/token-analytics/command.ts`
- Add `/token-report` command that:
  - Gets current session ID
  - Calls manager.getReport()
  - Displays formatted output
- Register in slash command discovery

**References**:
- `src/features/builtin-commands/` (command pattern)

**Verification Method**: Manual test in OpenCode
**Definition of Done**:
- [ ] Command shows in `/` menu
- [ ] Displays report for current session
- [ ] Shows helpful message if no data

---

### TODO 6: Wire Up in Main Plugin
**Agent Hint**: Sisyphus-Junior
**What to do**:
- Update `src/features/token-analytics/index.ts` to export all
- Update `src/index.ts`:
  - Import TokenAnalyticsManager
  - Create manager instance
  - Create and register hook
  - Pass manager to slash command tool

**References**:
- `src/index.ts` (existing hook registration pattern)

**Verification Method**: `bun run build`
**Definition of Done**:
- [ ] No build errors
- [ ] Hook registered in event handler
- [ ] Command available

---

### TODO 7: Integration Test
**Agent Hint**: Sisyphus-Junior
**What to do**:
- Test with real delegation scenario:
  1. Start worker-paul session
  2. Give it a vague task (triggers explore agents)
  3. Run `/token-report`
  4. Verify delegation tree shows correctly

**Verification Method**: Manual verification in OpenCode
**Definition of Done**:
- [ ] Report shows main agent tokens
- [ ] Report shows delegated agent tokens
- [ ] Costs calculated correctly
- [ ] Tree structure displays properly
