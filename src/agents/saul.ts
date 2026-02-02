import type { AgentConfig } from "@opencode-ai/sdk"
import { isGptModel } from "./types"
import type { AgentOverrideConfig } from "../config/schema"
import { createAgentToolRestrictions } from "../shared/permission-compat"

/**
 * Saul - Bare AI Agent
 * 
 * This is an unmodified AI model with tool access.
 * No system prompt, no rules, no framework overhead.
 * 
 * Named "Saul" for user identification in the @ menu.
 */

const SAUL_PROMPT = ``

export const SAUL_DEFAULTS = {
  model: "anthropic/claude-sonnet-4-5",
  temperature: 0.3,
} as const

const SAUL_RESTRICTIONS = createAgentToolRestrictions([
  "delegate_task",
  "call_paul_agent",
  "task",
])

export function createSaulAgentWithOverrides(
  override: AgentOverrideConfig | undefined,
  systemDefaultModel?: string
): AgentConfig {
  if (override?.disable) {
    override = undefined
  }

  const model = override?.model ?? systemDefaultModel ?? SAUL_DEFAULTS.model
  const temperature = override?.temperature ?? SAUL_DEFAULTS.temperature

  const prompt = override?.prompt_append
    ? SAUL_PROMPT + "\n\n" + override.prompt_append
    : SAUL_PROMPT

  const base: AgentConfig = {
    description: override?.description ??
      "Saul (v3.0) - Bare AI model with tool access. Zero system prompt, zero framework overhead.",
    model,
    temperature,
    maxTokens: 64000,
    prompt,
    color: override?.color ?? "#8B4513", // Saddle brown - earthy, independent
    permission: {
      ...(override?.permission ?? {}),
      ...SAUL_RESTRICTIONS.permission,
    },
  }

  if (override?.top_p !== undefined) {
    base.top_p = override.top_p
  }

  if (isGptModel(model)) {
    return { ...base, reasoningEffort: "medium" } as AgentConfig
  }

  return {
    ...base,
    thinking: { type: "enabled", budgetTokens: 16000 }, // Lower budget - less overhead
  } as AgentConfig
}

export const saulAgent: AgentConfig = {
  description: "Saul (v3.0) - Bare AI model with tool access. Zero system prompt, zero framework overhead.",
  model: SAUL_DEFAULTS.model,
  temperature: SAUL_DEFAULTS.temperature,
  maxTokens: 64000,
  prompt: SAUL_PROMPT,
  color: "#8B4513", // Saddle brown
  thinking: { type: "enabled", budgetTokens: 16000 },
  permission: SAUL_RESTRICTIONS.permission,
}
