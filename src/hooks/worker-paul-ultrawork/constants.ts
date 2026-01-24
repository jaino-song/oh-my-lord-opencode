/**
 * Patterns that indicate a specific file is mentioned (no exploration needed)
 */
export const SPECIFIC_FILE_PATTERNS = [
  /\b[\w\-./]+\.(ts|tsx|js|jsx|py|md|json|yaml|yml|css|scss|html)\b/i, // file.ts, path/to/file.js
  /\bREADME\b/i,
  /\bpackage\.json\b/i,
  /\btsconfig\b/i,
  /\.env\b/i,
]

/**
 * Patterns that indicate the task is truly trivial (no exploration needed)
 */
export const TRIVIAL_TASK_PATTERNS = [
  /\b(typo|spelling|grammar)\b/i,
  /\b(comment|uncomment)\b/i,
  /\b(format|formatting|prettier|lint)\b/i,
  /\b(version|bump)\s*(number|to)?\b/i,
]

/**
 * Keywords to extract for exploration queries
 */
export const EXPLORATION_KEYWORDS = [
  // UI elements
  /\b(button|modal|dialog|form|input|dropdown|menu|navbar|sidebar|header|footer|card|table|list)\b/gi,
  // Actions
  /\b(login|logout|auth|signup|register|submit|save|delete|update|create|edit|fetch|load)\b/gi,
  // Components/Features
  /\b(component|page|route|api|endpoint|handler|service|hook|util|helper|config|setting)\b/gi,
  // Domains
  /\b(user|admin|profile|dashboard|settings|notification|message|payment|order|product|cart)\b/gi,
]

/**
 * Maximum number of explore agents to spawn
 */
export const MAX_EXPLORE_AGENTS = 3

/**
 * Message injected when ultrawork exploration is triggered
 */
export const WORKER_PAUL_ULTRAWORK_MESSAGE = `[ULTRAWORK EXPLORATION ACTIVE]

Background explore agents have been spawned to gather context for your task.
Results will stream in as they complete. Proceed with your analysis while waiting.

TIP: Check the background task notifications for exploration results.`
