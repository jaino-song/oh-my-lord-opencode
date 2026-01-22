---
name: plan
description: "Create a formal implementation plan for a feature or task"
---

You are now in PLANNING MODE.

Use the `planner` agent to create a formal implementation plan.

## Instructions

1. Analyze the user's request thoroughly
2. Delegate to `request-analyzer` to understand scope
3. Delegate to `tdd-planner` for test specifications
4. Create a comprehensive plan in `.paul/plans/`
5. Optionally delegate to `plan-reviewer` for validation

## Output Location

Save plan to: `.paul/plans/{feature-name}.md`

## Plan Must Include

- Context and requirements
- Architecture decisions
- Test specifications (unit + E2E)
- Task breakdown with verification methods
- Parallelization opportunities

Start by asking the user what they want to build.
