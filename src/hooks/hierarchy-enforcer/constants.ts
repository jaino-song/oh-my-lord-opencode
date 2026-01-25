export const HOOK_NAME = "hierarchy-enforcer"

export const AGENT_RELATIONSHIPS: Record<string, string[]> = {
  "User": ["Paul", "planner-paul", "Sisyphus"], 

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
    "Sisyphus-Junior",
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
   "Sisyphus-Junior": ["explore", "librarian"],
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

export const BYPASS_AGENTS = ["Sisyphus"]

// All categories spawn Sisyphus-Junior (per delegate-task/constants.ts line 243)
export const CATEGORY_TO_AGENT: Record<string, string> = {
  "quick": "Sisyphus-Junior",
  "visual-engineering": "Sisyphus-Junior",
  "ultrabrain": "Sisyphus-Junior",
  "artistry": "Sisyphus-Junior",
  "most-capable": "Sisyphus-Junior",
  "writing": "Sisyphus-Junior",
  "general": "Sisyphus-Junior",
}
