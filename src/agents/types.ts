import type { AgentConfig } from "@opencode-ai/sdk"

export type AgentFactory = (model?: string) => AgentConfig

/**
 * Cost classification for Tool Selection table
 */
export type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE"

/**
 * Delegation trigger for Paul prompt's Delegation Table
 */
export interface DelegationTrigger {
  /** Domain of work (e.g., "Frontend UI/UX") */
  domain: string
  /** When to delegate (e.g., "Visual changes only...") */
  trigger: string
}

/**
 * Metadata for generating Paul prompt sections dynamically
 * This allows adding/removing agents without manually updating the Paul prompt
 */
export interface AgentPromptMetadata {
  /** Cost classification for Tool Selection table */
  cost: AgentCost

  /** Domain triggers for Delegation Table */
  triggers: DelegationTrigger[]

  /** When to use this agent (for detailed sections) */
  useWhen?: string[]

  /** When NOT to use this agent */
  avoidWhen?: string[]

  /** Optional dedicated prompt section (markdown) - for agents like Oracle that have special sections */
  dedicatedSection?: string

  /** Nickname/alias used in prompt (e.g., "Oracle" instead of "oracle") */
  promptAlias?: string

  /** Key triggers that should appear in Phase 0 (e.g., "External library mentioned → fire librarian") */
  keyTrigger?: string
}

export function isGptModel(model: string): boolean {
  return model.startsWith("openai/") || model.startsWith("github-copilot/gpt-")
}

export type BuiltinAgentName =
  | "Saul"
  | "oracle"
  | "librarian"
  | "explore"
  | "frontend-ui-ux-engineer"
  | "document-writer"
  | "multimodal-looker"
  | "Ezra (Plan Reviewer)"
  | "Nathan (Request Analyst)"
  | "Elijah (Deep Reasoning Advisor)"
  | "Paul"
  | "Solomon (TDD Planner)"
  | "Peter (Test Writer)"
  | "John (E2E Test Writer)"
  | "Joshua (Test Runner)"
  | "Thomas (TDD Plan Consultant)"
  | "planner-paul"
  | "Timothy (Implementation Plan Reviewer)"
  | "worker-paul"
  | "Paul-Junior"
  | "git-master"

export type OverridableAgentName =
  | "build"
  | BuiltinAgentName

export type AgentName = BuiltinAgentName

export type AgentOverrideConfig = Partial<AgentConfig> & {
  prompt_append?: string
  variant?: string
}

export type AgentOverrides = Partial<Record<OverridableAgentName, AgentOverrideConfig>>
