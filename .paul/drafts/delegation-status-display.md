# Draft: Delegation Status Display

## Requirements

### START message (when delegation begins)
```
Paul → Sisyphus-Junior
Task: Fix the bug
Parallelism: No/Yes
```

### COMPLETE message (when delegation finishes)
```
⚡ Paul → Sisyphus-Junior
Task: Fix the bug
Tokens: 12450 in / 3200 out / 15650 total
Duration: 1m 30s
✅ Task Complete
```

## Design Decisions

### Mechanism
- Use `<system-reminder>` injection (same as background task completion)
- This is persistent in chat, unlike ephemeral toasts

### For Sync Tasks (run_in_background=false)
1. **START**: Inject system-reminder before blocking on task
2. **COMPLETE**: Include in tool result text (already there, needs formatting)

### For Background Tasks (run_in_background=true)
1. **START**: Include in immediate tool return
2. **COMPLETE**: Already uses system-reminder injection, add token info

### Parallelism Detection
- Check if multiple background tasks are running
- Or check `run_in_background` parameter

## Scope
- IN: Start/Complete messages for delegate_task
- IN: Token usage display (input/output/total)
- IN: Parallelism indicator
- OUT: Real-time progress during execution (separate feature)
- OUT: Toast notifications (not reliable in all terminals)

## Open Questions
1. Should START message for sync tasks block the UI? (No - inject before blocking)
2. Format for parallelism - "Parallelism: Yes" or "🔀 Parallel" or "Mode: Background"?
