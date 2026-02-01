export interface FallbackModelConfig {
  main: string
  fallback: string
}

export const AGENT_FALLBACK_MODELS: Record<string, FallbackModelConfig> = {
  "Solomon (TDD Planner)": {
    main: "openai/gpt-5.2",
    fallback: "anthropic/claude-sonnet-4-5",
  },
  "Timothy (Implementation Plan Reviewer)": {
    main: "openai/gpt-5.2",
    fallback: "anthropic/claude-sonnet-4-5",
  },
  "Nathan (Request Analyst)": {
    main: "openai/gpt-5.2-high",
    fallback: "anthropic/claude-sonnet-4.5",
  },
  "Elijah (Deep Reasoning Advisor)": {
    main: "openai/gpt-5.2-high",
    fallback: "zai-coding-plan/glm-4.7",
  },
  "Thomas (TDD Plan Consultant)": {
    main: "openai/gpt-5.2-high",
    fallback: "zai-coding-plan/glm-4.7",
  },
  "Paul-Junior": {
    main: "zai-coding-plan/glm-4.7",
    fallback: "openai/gpt-5.2-codex-xhigh",
  },
}

export const PAUL_JUNIOR_SUBSTITUTE = "Paul-Junior"

export const MAX_RETRY_ATTEMPTS = 2
export const RETRY_DELAY_MS = 2000
