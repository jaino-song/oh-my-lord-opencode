import type { PluginInput } from "@opencode-ai/plugin"
import { HOOK_NAME, PACKAGE_MANAGERS, BANNED_PM_COMMANDS, COMMIT_REGEX } from "./constants"

export * from "./constants"

const OH_MY_LORD_REPO_MARKERS = ["oh-my-lord-opencode", "oh-my-lord-claude"]

function isOhMyLordRepo(directory: string): boolean {
  return OH_MY_LORD_REPO_MARKERS.some(marker => directory.toLowerCase().includes(marker))
}

function isBannedPackageCommand(command: string): boolean {
  const trimmed = command.trim()
  const pm = PACKAGE_MANAGERS.find(p => trimmed.startsWith(p + " "))
  if (!pm) return false

  return BANNED_PM_COMMANDS.some(cmd => trimmed.includes(` ${cmd}`) || trimmed.includes(` ${cmd} `))
}

function isValidCommitMessage(message: string): boolean {
  return COMMIT_REGEX.test(message)
}

export function createStrictWorkflowHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      const tool = input.tool.toLowerCase()

      if (tool === "bash") {
        const command = output.args.command as string | undefined
        const workdir = output.args.workdir as string | undefined
        const effectiveDir = workdir ?? ctx.directory
        
        if (command && isBannedPackageCommand(command) && isOhMyLordRepo(effectiveDir)) {
          const pm = PACKAGE_MANAGERS.find(p => command.trim().startsWith(p))
          throw new Error(
            `[${HOOK_NAME}] BLOCKED: usage of '${pm}' for dependency management.\n` +
            `This project (oh-my-lord) strictly uses 'bun'.\n` +
            `Use 'bun install', 'bun add', 'bun remove' instead.`
          )
        }
        
        if (command && command.trim().startsWith("git commit")) {
          const match = command.match(/-m\s+["'](.+?)["']/)
          if (match) {
            const msg = match[1]
            if (!isValidCommitMessage(msg)) {
              throw new Error(
                `[${HOOK_NAME}] BLOCKED: Commit message does not follow Conventional Commits.\n` +
                `Format required: <type>(<scope>): <description>\n` +
                `Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert\n` +
                `Example: "feat(auth): add login support"`
              )
            }
          }
        }
      }


    },

    "tool.execute.after": async (
      _input: { tool: string; sessionID: string; callID: string },
      _output: { output: string; args?: Record<string, unknown> }
    ) => {
      // No-op
    }
  }
}
