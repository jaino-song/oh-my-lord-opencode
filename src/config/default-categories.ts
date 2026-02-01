import type { CategoriesConfig } from "./schema"

/**
 * Built-in category presets.
 *
 * These act as defaults when an agent specifies `category` but the user config
 * does not define that category under `categories`.
 */
export const DEFAULT_CATEGORIES: CategoriesConfig = {
  "visual-engineering": {
    model: "openai/gpt-5.2",
    temperature: 0.7,
    reasoningEffort: "high",
    textVerbosity: "high",
  },
  ultrabrain: {
    model: "openai/gpt-5.2",
    temperature: 0.1,
    reasoningEffort: "high",
    textVerbosity: "high",
  },
  artistry: {
    model: "openai/gpt-5.2",
    temperature: 0.8,
  },
  quick: {
    model: "anthropic/claude-haiku-4-5",
    temperature: 0.3,
  },
  "most-capable": {
    model: "anthropic/claude-opus-4-5",
    temperature: 0.1,
  },
  writing: {
    model: "openai/gpt-5.2",
    temperature: 0.3,
  },
  general: {
    model: "openai/gpt-5.2",
    temperature: 0.3,
  },
}
