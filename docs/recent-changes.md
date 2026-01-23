# Recent Changes Summary

This document summarizes the latest local changes in this repository and how they affect agent routing, competency checks, and planning templates.

## Overview

The recent updates focus on resolving delegation deadlocks by converting strict enforcement rules to advisory warnings. This allows Paul to make informed decisions without getting blocked when edge cases arise. The changes also clarify planner TODO structure to avoid mixed UI and testing keywords.

## Key Behavior Changes

### Hierarchy Enforcer (Competency Rules → Advisory)

**BREAKING CHANGE**: Competency violations are now **advisory warnings** instead of hard blocks.

- TDD warning blocks injected by the orchestrator are now stripped before keyword scanning. This prevents false testing detections when the warning text includes "test".
- When Paul delegates a task with UI/Git/External Research keywords to a non-specialist agent, the hook now:
  - **Injects an advisory warning** into the prompt (instead of throwing an error)
  - Tells Paul which specialist is recommended
  - Allows Paul to proceed if there's a valid reason
- Visual/UI competency enforcement still exempts:
  - `Sisyphus-Junior` (so Paul can delegate UI tasks without warnings)
  - `git-master` (so git operations that mention UI changes can still proceed)
- `Sisyphus-Junior` is now permitted to delegate to `frontend-ui-ux-engineer`, enabling an internal handoff for UI work while keeping Paul from calling the UI agent directly.

**Why**: Hard blocks caused deadlocks when prompts contained mixed keywords (e.g., "commit UI changes" triggered both Git and UI rules). Advisory warnings give Paul the information to adjust without getting stuck.

### Agent Routing and Allowed Delegates

- `frontend-ui-ux-engineer` was removed from Paul’s allowed direct delegates. UI work is expected to flow through `Sisyphus-Junior`.
- Category mapping remains consistent with the original intent: all categories, including `visual-engineering`, map to `Sisyphus-Junior`.

## TODO Continuation Hook (Strict → Advisory)

**BREAKING CHANGE**: TODO continuation is now **advisory** instead of mandatory.

- When incomplete tasks remain, the hook now:
  - **Suggests** continuing with the next task (instead of forcing it)
  - Acknowledges that some tasks may require manual user action
  - Allows Paul to skip blocked tasks and report status
- Loop detection still applies (stops after 3 identical attempts)

**Why**: Strict continuation caused infinite loops when tasks were blocked or required user input. Advisory mode gives Paul the flexibility to stop and report when appropriate.

## Planner Template Updates

Planner guidance now explicitly requires splitting UI work and testing/verification into separate TODOs. This avoids mixed-keyword prompts that can trigger competency warnings.

Updated templates:
- `src/agents/prometheus-prompt.ts`
- `src/agents/planner-paul.ts`

## Token Usage Optimizations

- Compressed Paul's base prompt to a minimal rule set in `src/agents/paul.ts`.
- Lazy-loaded AGENTS/README injections only when the files are read directly, and truncated to ~500 tokens in:
  - `src/hooks/directory-agents-injector/index.ts`
  - `src/hooks/directory-readme-injector/index.ts`
- Delegation outputs now default to summaries with `output_format="full"` opt-in in `src/tools/delegate-task/tools.ts`.
- Skill content is summarized before injection to reduce prompt bloat.
- Plan progress reads are cached by mtime in `src/features/boulder-state/storage.ts`.
- Plan file reads for Paul are summarized by `src/hooks/plan-summary-injector/index.ts`.

## Tests Added or Updated

- Hierarchy enforcer tests now cover:
  - Ignoring TDD warning blocks during competency scans
  - Allowing UI keywords when delegating to `git-master`
  - Continuing to block UI keywords for unrelated agents
- Delegate-task tests continue to assert that `visual-engineering` routes to `Sisyphus-Junior`.

Relevant test files:
- `src/hooks/hierarchy-enforcer/index.test.ts`
- `src/tools/delegate-task/tools.test.ts`

## Build Artifacts Updated

The following generated outputs are updated to reflect the behavior changes:

- `dist/index.js`
- `dist/cli/index.js`
- `dist/*.d.ts`
- `assets/oh-my-lord-opencode.schema.json`
- `dist/oh-my-lord-opencode.schema.json`

## Files Touched (Implementation)

- `src/hooks/hierarchy-enforcer/index.ts`
- `src/hooks/hierarchy-enforcer/constants.ts`
- `src/tools/delegate-task/tools.ts`
- `src/tools/delegate-task/constants.ts`
- `src/agents/prometheus-prompt.ts`
- `src/agents/planner-paul.ts`
- `src/hooks/hierarchy-enforcer/index.test.ts`
- `src/tools/delegate-task/tools.test.ts`
