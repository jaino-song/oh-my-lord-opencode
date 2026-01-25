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
    "background-agent"
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
    "planner-paul",
    "Timothy (Implementation Plan Reviewer)",
    "Nathan (Request Analyst)",
    "Thomas (TDD Plan Consultant)"
  ],

   "Joshua (Test Runner)": [],
    "Paul-Junior": ["explore", "librarian"],
    "frontend-ui-ux-engineer": [],
    "worker-paul": ["explore", "librarian", "git-master", "document-writer"],
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

// All categories spawn Paul-Junior (per delegate-task/constants.ts line 243)
export const CATEGORY_TO_AGENT: Record<string, string> = {
  "quick": "Paul-Junior",
  "visual-engineering": "Paul-Junior",
  "ultrabrain": "Paul-Junior",
  "artistry": "Paul-Junior",
  "most-capable": "Paul-Junior",
  "writing": "Paul-Junior",
  "general": "Paul-Junior",
}
