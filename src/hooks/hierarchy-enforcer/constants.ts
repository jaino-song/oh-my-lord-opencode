export const HOOK_NAME = "hierarchy-enforcer"

/**
 * Agent delegation permissions. Lookup is case-insensitive.
 * Only canonical casing needed per agent.
 */
export const AGENT_RELATIONSHIPS: Record<string, string[]> = {
  "User": ["Paul", "planner-paul", "worker-paul"], 

  "planner-paul": [
    "Nathan (Request Analyst)",
    "Solomon (TDD Planner)",
    "Thomas (TDD Plan Consultant)",
    "Ezra (Plan Reviewer)",
    "Elijah (Deep Reasoning Advisor)",
    "explore",
    "librarian"
  ],

  // DISABLED: Timothy - unclear role, not documented in agent prompts
  // "Timothy (Implementation Plan Reviewer)": [],

  "Solomon (TDD Planner)": ["explore", "librarian"],
  "Thomas (TDD Plan Consultant)": [],
  "Nathan (Request Analyst)": ["explore", "librarian"],

  "Paul": [
    "Joshua (Test Runner)",
    "Paul-Junior",
    "frontend-ui-ux-engineer",
    "git-master",
    "explore",
    "librarian",
    "Elijah (Deep Reasoning Advisor)",
    "Solomon (TDD Planner)",
    "Peter (Test Writer)",
    "John (E2E Test Writer)",
    "Nathan (Request Analyst)",
    "Thomas (TDD Plan Consultant)"
  ],

  "Joshua (Test Runner)": [],
  "Paul-Junior": ["explore", "librarian"],
  "frontend-ui-ux-engineer": ["explore", "librarian"],
  
  // --override required for Paul/planner-paul/Paul-Junior/frontend-ui-ux-engineer
  "worker-paul": ["explore", "librarian", "git-master", "document-writer"]
}

export const APPROVAL_REQUIREMENTS: Record<string, string[]> = {
  "implement": ["Joshua (Test Runner)"],
  "refactor": ["Joshua (Test Runner)"],
  "fix": ["Joshua (Test Runner)"],
  
  "visual": ["frontend-ui-ux-engineer"],
  
  "plan review": ["Ezra (Plan Reviewer)"],
  "spec review": ["Thomas (TDD Plan Consultant)"]
}

export const BYPASS_AGENTS: string[] = []

// Enforce sync delegation for critical orchestrators
// These agents MUST use run_in_background=false to prevent race conditions
export const SYNC_DELEGATION_REQUIRED: Record<string, string[]> = {}
