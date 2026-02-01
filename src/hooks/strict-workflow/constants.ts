export const HOOK_NAME = "strict-workflow"

export const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm"]

export const BANNED_PM_COMMANDS = [
  "install",
  "i",
  "add",
  "remove",
  "uninstall",
  "ci",
  "link",
  "unlink",
  "update",
  "upgrade",
  "publish"
]

export const COMMIT_REGEX = /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+/
