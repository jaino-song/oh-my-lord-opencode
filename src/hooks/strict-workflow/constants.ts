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

export const FRONTEND_FILE_NAMING_REGEX = /^[a-zA-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)*(\.[a-z0-9]+)+$/

export const FRONTEND_DIR_PATTERNS = [
  "components/",
  "hooks/",
  "app/",
  "pages/",
  "src/components/",
  "src/hooks/",
  "src/app/",
  "src/pages/"
]

export const REACT_HOOK_PATTERNS = [
  /^use[A-Z].*\.tsx?$/,
  /^use[A-Z].*\.jsx?$/
]

export const REACT_COMPONENT_PATTERNS = [
  /^[A-Z].*\.tsx$/,
  /^[A-Z].*\.jsx$/
]

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
