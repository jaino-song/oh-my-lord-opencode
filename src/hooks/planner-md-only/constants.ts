import { createSystemDirective, SystemDirectiveTypes } from "../../shared/system-directive"

export const HOOK_NAME = "planner-md-only"

export const PLANNER_AGENTS = [
  "Prometheus (Planner)",
  "Solomon (TDD Planner)",
  "planner-paul",
]

export const ALLOWED_EXTENSIONS = [".md"]

export const ALLOWED_PATH_PREFIXES = [".sisyphus", ".paul"]

export const BLOCKED_TOOLS = ["Write", "Edit", "write", "edit"]

// Bash tool requires special handling - check for file-modifying commands
export const BASH_TOOLS = ["Bash", "bash"]

// Patterns that indicate file modification via bash
// These patterns BLOCK the command
export const DANGEROUS_BASH_PATTERNS = [
  // Output redirection (writes to files)
  />(?!\s*\/dev\/null)/,           // > but not > /dev/null
  />>/,                             // >> append
  /\s+tee\s+/,                      // tee command
  
  // File creation/deletion
  /\btouch\s+/,                     // touch creates files
  /\bmkdir\s+/,                     // mkdir creates directories
  /\brm\s+/,                        // rm deletes files
  /\brmdir\s+/,                     // rmdir deletes directories
  /\bunlink\s+/,                    // unlink deletes files
  
  // File modification
  /\bsed\s+-i/,                     // sed in-place edit
  /\bsed\s+--in-place/,             // sed in-place edit (long form)
  /\bawk\s+-i\s+inplace/,           // awk in-place edit
  /\bperl\s+-[ip]/,                 // perl in-place edit
  
  // File copy/move (can overwrite)
  /\bcp\s+/,                        // cp copies files
  /\bmv\s+/,                        // mv moves/renames files
  /\brsync\s+/,                     // rsync syncs files
  
  // Here-docs (writes to files)
  /<<\s*['"]?EOF/i,                 // heredoc patterns
  /<<\s*['"]?END/i,
  /<<-?\s*['"]?\w+['"]?\s*$/,       // general heredoc
  
  // Direct file writes
  /\becho\s+.*>/,                   // echo with redirect
  /\bprintf\s+.*>/,                 // printf with redirect
  /\bcat\s+.*>/,                    // cat with redirect (not cat for reading)
  
  // Permission changes
  /\bchmod\s+/,                     // chmod changes permissions
  /\bchown\s+/,                     // chown changes ownership
  /\bchgrp\s+/,                     // chgrp changes group
  
  // Destructive git operations
  /\bgit\s+(push|commit|add|checkout|reset|clean|stash)/,
  
  // Package managers that modify
  /\b(npm|yarn|pnpm|bun)\s+(install|add|remove|uninstall)/,
  /\bpip\s+(install|uninstall)/,
  
  // Other dangerous operations
  /\btruncate\s+/,                  // truncate files
  /\bdd\s+/,                        // dd disk operations
  /\binstall\s+/,                   // install command
  /\bln\s+/,                        // ln creates links
]

// Safe read-only bash patterns (allow list - these are always safe)
export const SAFE_BASH_PATTERNS = [
  /^ls(\s|$)/,                      // ls
  /^cat\s+[^>|]+$/,                 // cat without redirect or pipe to write
  /^head\s+/,                       // head
  /^tail\s+/,                       // tail
  /^grep\s+/,                       // grep
  /^find\s+/,                       // find
  /^which\s+/,                      // which
  /^pwd$/,                          // pwd
  /^echo\s+[^>]+$/,                 // echo without redirect
  /^git\s+(status|log|diff|branch|show|remote|describe|rev-parse)/,  // safe git
  /^(npm|yarn|pnpm|bun)\s+(list|ls|view|show|info|outdated|why)/,    // safe npm
  /^env$/,                          // env
  /^printenv/,                      // printenv
  /^whoami$/,                       // whoami
  /^hostname$/,                     // hostname
  /^date$/,                         // date
  /^df\s/,                          // df
  /^du\s/,                          // du
  /^wc\s/,                          // wc
  /^file\s/,                        // file
  /^stat\s/,                        // stat
  /^tree(\s|$)/,                    // tree
]

export const PLANNING_CONSULT_WARNING = `

---

${createSystemDirective(SystemDirectiveTypes.PROMETHEUS_READ_ONLY)}

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
