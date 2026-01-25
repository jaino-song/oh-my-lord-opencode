# Fix planner-paul Workflow Issues + Token Optimization

## Context

### Original Request
User identified that planner-paul skipped critical workflow steps:
1. Did not invoke Nathan (Request Analyst) at Phase 0
2. Did not re-invoke Timothy after plan changes
3. Delegate_task calls were failing

### Investigation Findings

**Issue 1: Phase 0 Skipped**
- planner-paul system prompt requires IMMEDIATE Nathan invocation
- Skipped and went straight to investigation
- This is a discipline/enforcement issue

**Issue 2: Delegate_task Failures**
- Calls to Timothy failed with "JSON Parse error: Unexpected EOF"
- Appears to be a model configuration or API issue

**Issue 3: Missing Thomas in Hierarchy**
- `hierarchy-enforcer/constants.ts` does NOT include Thomas in planner-paul's allowed delegates
- But planner-paul's system prompt says to invoke Thomas after Solomon

**Issue 4: Token Efficiency**
- planner-paul holds full context of all agent results
- No truncation or summarization applied
- Thomas invoked for ALL plans (unnecessary for simple ones)

## Objectives & Deliverables

### Core Objective
Fix planner-paul workflow AND optimize token usage.

### Concrete Deliverables
1. Add Thomas to planner-paul's allowed delegates
2. Make Thomas invocation **conditional** (only for complex plans)
3. Apply token-saving methods to all agent delegations
4. Fix delegate_task failures
5. Update planner-paul system prompt with token-efficient patterns

### Must Have
- Thomas added to allowed delegates
- Conditional Thomas invocation (complexity-based)
- `output_format: "summary"` used for agent results
- Delegate_task working for all planning agents

### Must NOT Have
- Do NOT invoke Thomas for simple plans
- Do NOT hold full test specs in planner-paul context
- Do NOT remove existing hierarchy restrictions

## Token-Saving Methods to Apply

| Method | Where | Savings |
|--------|-------|---------|
| `output_format: "summary"` | All delegate_task calls | ~50% of result size |
| Conditional Thomas | Skip for simple plans | ~5k tokens/plan |
| Truncate test specs | Solomon result handling | ~2-3k tokens |
| Background agents for research | Nathan's explore calls | Offloads context |

## TODOs

- [ ] 1. Add Thomas to planner-paul Allowed Delegates
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/hooks/hierarchy-enforcer/constants.ts`
  - Add `"Thomas (TDD Plan Consultant)"` to `AGENT_RELATIONSHIPS["planner-paul"]` array
  **Must NOT do**: Change other agent relationships
  **References**: `src/hooks/hierarchy-enforcer/constants.ts` line 6-13
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Thomas added to planner-paul's allowed delegates
  - [ ] Typecheck passes

- [ ] 2. Update planner-paul System Prompt - Token Optimization
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Open `src/agents/planner-paul.ts`
  - Update Phase 0 (Nathan) delegation pattern:
    ```typescript
    delegate_task(
      subagent_type="Nathan (Request Analyst)",
      prompt="Analyze request: {request}",
      run_in_background=false,
      output_format="summary"  // ADD THIS
    )
    ```
  - Update Phase 3 (Timothy, Solomon) delegation patterns with `output_format="summary"`
  - Add conditional Thomas logic:
    ```
    ### Phase 3.5: Thomas Review (CONDITIONAL)
    **Invoke Thomas ONLY IF**:
    - Plan has >5 test files OR
    - Contains E2E/integration tests OR
    - Security-critical features OR
    - User explicitly requests TDD review
    
    **Skip Thomas IF**:
    - Simple unit tests only
    - <5 test files
    - Low-risk changes
    ```
  - Update delegation examples to use `output_format="summary"`
  **Must NOT do**: Change core workflow phases
  **References**: `src/agents/planner-paul.ts`
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] All delegate_task examples use `output_format="summary"`
  - [ ] Conditional Thomas logic documented
  - [ ] Typecheck passes

- [ ] 3. Investigate Delegate_task JSON Parse Errors
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Check model configurations for planning agents:
    - `src/agents/timothy.ts` - model ID
    - `src/agents/nathan.ts` - model ID
    - `src/agents/solomon.ts` - model ID
    - `src/agents/thomas.ts` - model ID
  - Verify model IDs exist and are valid
  - Check `src/tools/delegate-task/tools.ts` for JSON parse error handling
  - Look for empty response handling
  **Must NOT do**: Change agent prompts or behavior
  **References**: 
  - `src/agents/*.ts`
  - `src/tools/delegate-task/tools.ts`
  **Verification Method**: Manual test - invoke delegate_task with each agent
  **Definition of Done**:
  - [ ] Root cause identified
  - [ ] Fix implemented
  - [ ] All planning agents work with delegate_task

- [ ] 4. Add Token Usage Tracking to Delegate_task (Optional Enhancement)
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - In `src/tools/delegate-task/tools.ts`, after task completion:
    - Fetch token usage from session (like we planned for toast)
    - Log token usage for monitoring
    - Consider warning if result exceeds threshold (e.g., >5k tokens)
  - This helps identify token-heavy delegations
  **Must NOT do**: Block on high token usage (advisory only)
  **References**: 
  - `src/tools/delegate-task/tools.ts`
  - `src/hooks/context-window-monitor.ts` (token fetching example)
  **Verification Method**: `bun run typecheck`
  **Definition of Done**:
  - [ ] Token usage logged after delegation
  - [ ] Warning for >5k token results
  - [ ] Typecheck passes

- [ ] 5. Add Workflow Enforcement for Phase 0 (Optional)
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Create hook or extend hierarchy-enforcer to track Nathan invocation
  - When planner-paul tries to write to `.paul/plans/`:
    - Check if Nathan was invoked in this session
    - If not, inject warning (not block): "Warning: Nathan analysis was skipped"
  - Store Nathan invocation state per session
  **Must NOT do**: Hard-block planning without Nathan
  **References**: `src/hooks/hierarchy-enforcer/`
  **Verification Method**: Manual test
  **Definition of Done**:
  - [ ] Warning shown if Nathan not invoked
  - [ ] Does not block workflow

- [ ] 6. Test Full Workflow with Token Monitoring
  **Agent Hint**: Sisyphus-Junior
  **What to do**:
  - Test planner-paul workflow end-to-end:
    1. Invoke Nathan (with `output_format="summary"`)
    2. Create plan
    3. Invoke Timothy (with `output_format="summary"`)
    4. Invoke Solomon (with `output_format="summary"`)
    5. Check complexity → conditionally invoke Thomas
  - Monitor token usage at each step
  - Verify total stays under 25k tokens for simple plans
  **Must NOT do**: Skip token monitoring
  **References**: planner-paul system prompt
  **Verification Method**: Manual test in OpenCode
  **Definition of Done**:
  - [ ] All delegate_task calls succeed
  - [ ] Token usage reasonable (<25k for simple plans)
  - [ ] Thomas skipped for simple plans
  - [ ] Full workflow completes without errors
