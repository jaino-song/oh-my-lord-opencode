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

export const FILE_NAMING_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)+$/

export const EXCLUDED_FILES = [
  "README.md",
  "LICENSE",
  "Dockerfile",
  "Makefile",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "AGENTS.md",
  "SKILL.md",
  "AGENT_CREATION_STANDARD.md",
  "CODE_OF_CONDUCT.md"
]
