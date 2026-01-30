import { createSystemDirective, SystemDirectiveTypes } from "../../shared/system-directive"

export const HOOK_NAME = "planner-md-only"

export const PLANNER_AGENTS = [
  "Prometheus (Planner)",
  "Solomon (TDD Planner)",
  "planner-paul",
]

// Whitelist of allowed delegate targets
export const ALLOWED_DELEGATE_TARGETS = [
  // Analysis & Research
  "Nathan (Request Analyst)",
  "explore",
  "librarian",
  
  // Deep Reasoning & Consultation
  "Elijah (Deep Reasoning Advisor)",
  
  // Planning & Review
  "Timothy (Implementation Plan Reviewer)",
  "Solomon (TDD Planner)",
  "Thomas (TDD Plan Consultant)",
  "Ezra (Plan Reviewer)",
]

export const ALLOWED_EXTENSIONS = [".md"]

export const PLAN_TRIGGER_PHRASES = [
  "make a plan",
  "make the plan",
  "generate plan",
  "generate the plan",
  "create the plan",
  "save it",
  "save the plan",
  "write the plan",
]

export const DRAFT_PATH_PATTERN = /[/\\]\.?(paul|sisyphus)[/\\]drafts[/\\]/i
export const PLAN_PATH_PATTERN = /[/\\]\.?(paul|sisyphus)[/\\]plans[/\\]/i

export const BLOCKED_TOOLS = ["Write", "Edit", "write", "edit"]

// Bash tool requires special handling - check for file-modifying commands
export const BASH_TOOLS = ["Bash", "bash"]

// Patterns that indicate file modification via bash
// These patterns BLOCK the command
export const DANGEROUS_BASH_PATTERNS = [
  // Output redirection (writes to files)
  />(?!\s*\/dev\/null)/,
  />>/,
  /\s+tee\s+/,
  
  // File creation/deletion
  /\btouch\s+/,
  /\bmkdir\s+/,
  /\brm\s+/,
  /\brmdir\s+/,
  /\bunlink\s+/,
  
  // File modification
  /\bsed\s+-i/,
  /\bsed\s+--in-place/,
  /\bawk\s+-i\s+inplace/,
  /\bperl\s+-[ip]/,
  
  // File copy/move (can overwrite)
  /\bcp\s+/,
  /\bmv\s+/,
  /\brsync\s+/,
  
  // Here-docs (writes to files)
  /<<\s*['"]?EOF/i,
  /<<\s*['"]?END/i,
  /<<-?\s*['"]?\w+['"]?\s*$/,
  
  // Direct file writes
  /\becho\s+.*>/,
  /\bprintf\s+.*>/,
  /\bcat\s+.*>/,
  
  // Permission changes
  /\bchmod\s+/,
  /\bchown\s+/,
  /\bchgrp\s+/,
  
  // Destructive git operations
  /\bgit\s+(push|commit|add|checkout|reset|clean|stash)/,
  
  // Package managers that modify
  /\b(npm|yarn|pnpm|bun)\s+(install|add|remove|uninstall)/,
  /\bpip\s+(install|uninstall)/,
  
  // Other dangerous operations
  /\btruncate\s+/,
  /\bdd\s+/,
  /\binstall\s+/,
  /\bln\s+/,
]

// Safe read-only bash patterns (allow list - these are always safe)
export const SAFE_BASH_PATTERNS = [
  /^ls(\s|$)/,
  /^cat\s+[^>|]+$/,
  /^head\s+/,
  /^tail\s+/,
  /^grep\s+/,
  /^find\s+/,
  /^which\s+/,
  /^pwd$/,
  /^echo\s+[^>]+$/,
  /^git\s+(status|log|diff|branch|show|remote|describe|rev-parse)/,
  /^(npm|yarn|pnpm|bun)\s+(list|ls|view|show|info|outdated|why)/,
  /^env$/,
  /^printenv/,
  /^whoami$/,
  /^hostname$/,
  /^date$/,
  /^df\s/,
  /^du\s/,
  /^wc\s/,
  /^file\s/,
  /^stat\s/,
  /^tree(\s|$)/,
  /^mkdir\s+(-p\s+)?\.?(paul|sisyphus)\//,
]

export const PLANNING_CONSULT_WARNING = `

---

${createSystemDirective(SystemDirectiveTypes.PLANNER_PAUL_READ_ONLY)}

You are being invoked by a READ-ONLY planning agent.

**CRITICAL CONSTRAINTS:**
- DO NOT modify any files (no Write, Edit, or any file mutations)
- DO NOT execute commands that change system state
- DO NOT create, delete, or rename files
- ONLY provide analysis, recommendations, and information

**YOUR ROLE**: Provide consultation, research, and analysis to assist with planning.
Return your findings and recommendations. The actual implementation will be handled separately after planning is complete.

---

`
