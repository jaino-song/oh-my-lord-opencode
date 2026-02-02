export const HOOK_NAME = "hierarchy-enforcer"

export const AGENT_RELATIONSHIPS: Record<string, string[]> = {
  "User": ["Paul", "planner-paul"], 

   "planner-paul": [
    "Nathan (Request Analyst)",
    "Timothy (Implementation Plan Reviewer)",
    "Solomon (TDD Planner)",
    "Thomas (TDD Plan Consultant)",
    "explore",
    "librarian",
    "background-agent",
    "worker-paul",
    "paul",
    "ezra (plan reviewer)"
  ],

  "Timothy (Implementation Plan Reviewer)": [],

  "Solomon (TDD Planner)": [
    "explore",
    "librarian"
  ],

  "Thomas (TDD Plan Consultant)": [],
  "Nathan (Request Analyst)": ["explore", "librarian"],

  "Paul": [
    "Joshua (Test Runner)",
    "Paul-Junior",
    "frontend-ui-ux-engineer",
    "ultrabrain",
    "git-master",
    "explore",
    "librarian",
    "Elijah (Deep Reasoning Advisor)",
    
    "Solomon (TDD Planner)",
    "Peter (Test Writer)",
    "John (E2E Test Writer)",
    "Timothy (Implementation Plan Reviewer)",
    "Nathan (Request Analyst)",
    "Thomas (TDD Plan Consultant)"
  ],

   "Joshua (Test Runner)": [],
    "Paul-Junior": ["explore", "librarian"],
    "frontend-ui-ux-engineer": ["explore", "librarian"],
    "worker-paul": ["explore", "librarian", "git-master", "document-writer", "Paul", "planner-paul", "Paul-Junior", "frontend-ui-ux-engineer"],
}

export const APPROVAL_REQUIREMENTS: Record<string, string[]> = {
  "implement": ["Joshua (Test Runner)"],
  "refactor": ["Joshua (Test Runner)"],
  "fix": ["Joshua (Test Runner)"],
  
  "visual": ["frontend-ui-ux-engineer"],
  
  "plan review": ["Timothy (Implementation Plan Reviewer)"],
  "spec review": ["Thomas (TDD Plan Consultant)"]
}

export const BYPASS_AGENTS: string[] = []

// Enforce sync delegation for critical orchestrators
// These agents MUST use run_in_background=false to prevent race conditions
export const SYNC_DELEGATION_REQUIRED: Record<string, string[]> = {
  "planner-paul": ["paul", "worker-paul"],
}
