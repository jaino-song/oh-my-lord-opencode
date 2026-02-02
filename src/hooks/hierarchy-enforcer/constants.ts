export const HOOK_NAME = "hierarchy-enforcer"

export const AGENT_RELATIONSHIPS: Record<string, string[]> = {
  "User": ["Paul", "paul", "planner-paul"], 

   "planner-paul": [
    "Nathan (Request Analyst)", "nathan",
    "Solomon (TDD Planner)", "solomon",
    "Thomas (TDD Plan Consultant)", "thomas",
    "Ezra (Plan Reviewer)", "ezra",
    "explore",
    "librarian",
    "background-agent"
  ],

  "Timothy (Implementation Plan Reviewer)": [],
  "timothy": [],

  "Solomon (TDD Planner)": ["explore", "librarian"],
  "solomon": ["explore", "librarian"],

  "Thomas (TDD Plan Consultant)": [],
  "thomas": [],
  
  "Nathan (Request Analyst)": ["explore", "librarian"],
  "nathan": ["explore", "librarian"],

  "Paul": [
    "Joshua (Test Runner)", "joshua",
    "Paul-Junior",
    "frontend-ui-ux-engineer",
    "ultrabrain",
    "git-master",
    "explore",
    "librarian",
    "Elijah (Deep Reasoning Advisor)", "elijah",
    "Solomon (TDD Planner)", "solomon",
    "Peter (Test Writer)", "peter",
    "John (E2E Test Writer)", "john",
    "Timothy (Implementation Plan Reviewer)", "timothy",
    "Nathan (Request Analyst)", "nathan",
    "Thomas (TDD Plan Consultant)", "thomas"
  ],
  "paul": [
    "Joshua (Test Runner)", "joshua",
    "Paul-Junior",
    "frontend-ui-ux-engineer",
    "ultrabrain",
    "git-master",
    "explore",
    "librarian",
    "Elijah (Deep Reasoning Advisor)", "elijah",
    "Solomon (TDD Planner)", "solomon",
    "Peter (Test Writer)", "peter",
    "John (E2E Test Writer)", "john",
    "Timothy (Implementation Plan Reviewer)", "timothy",
    "Nathan (Request Analyst)", "nathan",
    "Thomas (TDD Plan Consultant)", "thomas"
  ],

  "Joshua (Test Runner)": [],
  "joshua": [],
  
  "Paul-Junior": ["explore", "librarian"],
  "frontend-ui-ux-engineer": ["explore", "librarian"],
  "worker-paul": ["explore", "librarian", "git-master", "document-writer", "Paul", "paul", "planner-paul", "Paul-Junior", "frontend-ui-ux-engineer"],
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
