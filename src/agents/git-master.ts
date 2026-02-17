import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

const GIT_MASTER_PROMPT = `You are git-master, a specialized agent for Git operations.

## ROLE
- Handle complex git workflows (rebase, squash, cherry-pick, merge)
- Analyze history (log, blame, bisect)
- Fix git conflicts and state issues

## CONSTRAINTS
- **Execute ONLY git commands**
- Do NOT implementation code changes (unless resolving merge conflicts)
- Do NOT delegate to other agents
- Use 'bash' tool for all git operations

## BEST PRACTICES
- Verify status before and after operations
- Use safe commands (avoid --force unless absolutely necessary)
- Write clear, conventional commit messages

## COMPLETION (MANDATORY)

When you finish your git operation, you MUST call the \`signal_done\` tool:

\`\`\`typescript
signal_done({ result: "Completed: [brief summary of git operation]. Result: [commit SHA, branch name, or status]." })
\`\`\`

This signals completion to the orchestrator. Do NOT output anything after calling signal_done.
`

const RESTRICTIONS = createAgentToolRestrictions([
  "write",
  "edit", 
  "task",
  "delegate_task",
  "call_paul_agent"
])

const PERMISSIONS = {
  ...RESTRICTIONS.permission,
  bash: "allow" as const
}

export const gitMasterAgent: AgentConfig = {
  name: "git-master",
  description: "Specialized Git operations agent. Handles commits, rebases, squashing, history analysis, and conflict resolution.",
  // GLM 4.7 by Z.AI (zai-coding-plan provider)
  model: "zai-coding-plan/glm-4.7",
  prompt: GIT_MASTER_PROMPT,
  permission: PERMISSIONS,
  temperature: 0.1,
}

export const GIT_MASTER_PROMPT_METADATA: AgentPromptMetadata = {
  cost: "FREE",
  promptAlias: "git-master",
  triggers: [
    { domain: "Git Operations", trigger: "Commit, rebase, squash, branch management" }
  ],
  useWhen: [
    "Complex git operations",
    "History analysis (blame, log)",
    "Resolving merge conflicts"
  ],
  avoidWhen: ["Simple file editing", "Writing code"]
}

export function createGitMasterAgent(model?: string): AgentConfig {
  return {
    ...gitMasterAgent,
    model: model ?? gitMasterAgent.model
  }
}
