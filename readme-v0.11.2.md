# v0.11.2 Release

## 🐛 Fixed: Approval System Blocking Planners

### Issue
In v0.11.1, the `hierarchy-enforcer` hook incorrectly required Joshua (Test Runner) approval for ALL tasks that started with "Implement", "Refactor", or "Fix" - even when these were just planning descriptions without any actual code changes.

This blocked planners from marking their own tasks complete, causing workflow interruptions and false approval requirement errors.

### Solution
Removed the strict pattern matching that treated any task starting with "Implement", "Refactor", or "Fix" as requiring test verification.

**Changed Logic:**
```typescript
// BEFORE (v0.11.1):
if (content.startsWith("exec::") || 
    content.match(/^(implement|refactor|fix)\s/i) || 
    content.match(/\b(implement|refactor|fix)\s+(the|a|this)\s/i)) {
  requiredApproverPattern = "joshua"
}

// AFTER (v0.11.2):
if (content.startsWith("exec::")) {
  requiredApproverPattern = "joshua"
}
```

### Impact
- ✅ **Planners can complete their tasks** without triggering false approval errors
- ✅ **Planning descriptions** (e.g., "Implement some feature") no longer require Joshua approval
- ✅ **EXEC:: tasks still require approval** - Only actual execution tasks prefixed with `EXEC::` need test verification
- ✅ **Timothy approval** - Plan review tasks still require Timothy approval
- ✅ **Thomas approval** - Spec review tasks still require Thomas approval

### Example Behavior

| Task Type | Example | Requires Approval | Reason |
|-----------|----------|------------------|--------|
| Planning | "Implement user auth" | ❌ None | Just a description, no code written |
| Execution | "EXEC:: Implement user auth" | ✅ Joshua | Code written, needs test verification |
| Plan Review | "Review plan for feature" | ✅ Timothy | Planning document review |
| Spec Review | "Review test spec" | ✅ Thomas | Test specification review |

### Version Details
- **Version**: 0.11.2
- **Base**: v0.11.1
- **Date**: 2026-01-26
- **Commit**: db8fc49

### Build Status
- ✅ TypeScript compilation successful
- ✅ Main bundle: 2.1 MB
- ✅ CLI bundle: 0.87 MB
- ✅ JSON Schema generated

### Notes
TODOs are for tracking purposes. Verification happens via actual test runs (Joshua), not via status updates. This change allows planners to manage their workflow without unnecessary approval gates.

See [changelog-v0.11.2.md](./changelog-v0.11.2.md) for technical details.
