/**
 * Think Mode Switcher
 *
 * This module handles "thinking mode" activation for reasoning-capable models.
 * When a user includes "think" keywords in their prompt, models are upgraded to
 * their high-reasoning variants with extended thinking budgets.
 *
 * PROVIDER ALIASING:
 * GitHub Copilot acts as a proxy provider that routes to underlying providers
 * (Anthropic, Google, OpenAI). We resolve the proxy to the actual provider
 * based on model name patterns, allowing GitHub Copilot to inherit thinking
 * configurations without duplication.
 *
 * NORMALIZATION:
 * Model IDs are normalized (dots → hyphens in version numbers) to handle API
 * inconsistencies defensively while maintaining backwards compatibility.
 */

/**
 * Extracts provider-specific prefix from model ID (if present).
 * Custom providers may use prefixes for routing (e.g., vertex_ai/, openai/).
 *
 * @example
 * extractModelPrefix("vertex_ai/claude-sonnet-4-5") // { prefix: "vertex_ai/", base: "claude-sonnet-4-5" }
 * extractModelPrefix("claude-sonnet-4-5") // { prefix: "", base: "claude-sonnet-4-5" }
 * extractModelPrefix("openai/gpt-5.2") // { prefix: "openai/", base: "gpt-5.2" }
 */
function extractModelPrefix(modelID: string): { prefix: string; base: string } {
  const slashIndex = modelID.indexOf("/")
  if (slashIndex === -1) {
    return { prefix: "", base: modelID }
  }
  return {
    prefix: modelID.slice(0, slashIndex + 1),
    base: modelID.slice(slashIndex + 1),
  }
}

/**
 * Normalizes model IDs to use consistent hyphen formatting.
 * GitHub Copilot may use dots (claude-opus-4.5) but our maps use hyphens (claude-opus-4-5).
 * This ensures lookups work regardless of format.
 *
 * @example
 * normalizeModelID("claude-opus-4.5") // "claude-opus-4-5"
 * normalizeModelID("gemini-3.5-pro") // "gemini-3-5-pro"
 * normalizeModelID("gpt-5.2") // "gpt-5-2"
 * normalizeModelID("vertex_ai/claude-opus-4.5") // "vertex_ai/claude-opus-4-5"
 */
function normalizeModelID(modelID: string): string {
  // Replace dots with hyphens when followed by a digit
  // This handles version numbers like 4.5 → 4-5, 5.2 → 5-2
  return modelID.replace(/\.(\d+)/g, "-$1")
}

/**
 * Resolves proxy providers (like github-copilot) to their underlying provider.
 * This allows GitHub Copilot to inherit thinking configurations from the actual
 * model provider (Anthropic, Google, OpenAI).
 *
 * @example
 * resolveProvider("github-copilot", "claude-opus-4-5") // "anthropic"
 * resolveProvider("github-copilot", "gemini-3-pro") // "google"
 * resolveProvider("github-copilot", "gpt-5.2") // "openai"
 * resolveProvider("anthropic", "claude-opus-4-5") // "anthropic" (unchanged)
 */
function resolveProvider(providerID: string, modelID: string): string {
  // GitHub Copilot is a proxy - infer actual provider from model name
  if (providerID === "github-copilot") {
    const modelLower = modelID.toLowerCase()
    if (modelLower.includes("claude")) return "anthropic"
    if (modelLower.includes("gemini")) return "google"
    if (
      modelLower.includes("gpt") ||
      modelLower.includes("o1") ||
      modelLower.includes("o3")
    ) {
      return "openai"
    }
  }

  // Direct providers or unknown - return as-is
  return providerID
}

// Maps model IDs to their "high reasoning" variant
// Only models with explicit high variants are mapped here.
// Most providers use thinking parameters (THINKING_CONFIGS) instead of variant switching.
const HIGH_VARIANT_MAP: Record<string, string> = {
  // Claude models - all versions support high variants
  "claude-sonnet-4": "claude-sonnet-4-high",
  "claude-sonnet-4-5": "claude-sonnet-4-5-high",
  "claude-opus-4": "claude-opus-4-high",
  "claude-opus-4-5": "claude-opus-4-5-high",
  "claude-3-5-sonnet": "claude-3-5-sonnet-high",
  "claude-3-opus": "claude-3-opus-high",
  "claude-3-sonnet": "claude-3-sonnet-high",

  // GPT models - support high variants
  "gpt-4": "gpt-4-high",
  "gpt-4-turbo": "gpt-4-turbo-high",
  "gpt-5": "gpt-5-high",
  "gpt-5-1": "gpt-5-1-high",
  "gpt-5-2": "gpt-5-2-high",
  "gpt-5-1-codex": "gpt-5-1-codex-high",
  "gpt-5-2-codex": "gpt-5-2-codex-high",

  // o1 and o3 models (OpenAI reasoning models)
  "o1-preview": "o1-preview-high",
  "o1-mini": "o1-mini-high",
  "o3-mini": "o3-mini-high",

  // Gemini models - support high variants
  "gemini-pro": "gemini-pro-high",
  "gemini-flash": "gemini-flash-high",
  "gemini-3-pro": "gemini-3-pro-high",
  "gemini-3-flash": "gemini-3-flash-high",
  "gemini-3-pro-preview": "gemini-3-pro-preview-high",
  "gemini-3-flash-preview": "gemini-3-flash-preview-high",

  // Google Antigravity is the only provider with explicit high variant model
  "google/antigravity-gemini-3-pro-low": "google/antigravity-gemini-3-pro-high",
}

const ALREADY_HIGH: Set<string> = new Set(Object.values(HIGH_VARIANT_MAP))

 export const THINKING_CONFIGS = {
   anthropic: {
     thinking: {
       type: "enabled",
       budgetTokens: 64000,
     },
     maxTokens: 128000,
   },
   "amazon-bedrock": {
     reasoningConfig: {
       type: "enabled",
       budgetTokens: 32000,
     },
     maxTokens: 64000,
   },
   google: {
     // Antigravity models use high variant switching instead of thinking parameters
     // see HIGH_VARIANT_MAP and getThinkingConfig logic
     providerOptions: {
       google: {
         thinkingConfig: {
           thinkingLevel: "HIGH",
         },
       },
     },
   },
   "google-vertex": {
     // Vertex AI models don't have separate high variants
     // Extended thinking handled by provider, not model switching
     providerOptions: {
       "google-vertex": {
         thinkingConfig: {
           thinkingLevel: "HIGH",
         },
       },
     },
   },
   openai: {
     reasoning_effort: "high",
   },
 } as const satisfies Record<string, Record<string, unknown>>

 const THINKING_CAPABLE_MODELS = {
   anthropic: ["claude-sonnet-4", "claude-opus-4", "claude-3"],
   "amazon-bedrock": ["claude", "anthropic"],
   google: ["gemini-3"], // Gemini 3 only (flash and pro don't support extended thinking)
   "google-vertex": ["gemini-3"], // Gemini 3 only
   openai: ["gpt-5", "o1", "o3"],
   // Antigravity has explicit high variant models (see HIGH_VARIANT_MAP)
   // Use model switching for antigravity provider
 } as const satisfies Record<string, readonly string[]>

export function getHighVariant(modelID: string): string | null {
  const normalized = normalizeModelID(modelID)
  const { prefix, base } = extractModelPrefix(normalized)

  // Check if already high variant (with or without prefix)
  if (ALREADY_HIGH.has(base) || base.endsWith("-high")) {
    return null
  }

  // Look up high variant for base model
  const highBase = HIGH_VARIANT_MAP[base]
  if (!highBase) {
    return null
  }

  // Preserve prefix in the high variant
  return prefix + highBase
}

export function isAlreadyHighVariant(modelID: string): boolean {
  const normalized = normalizeModelID(modelID)
  const { base } = extractModelPrefix(normalized)
  return ALREADY_HIGH.has(base) || base.endsWith("-high")
}

type ThinkingProvider = keyof typeof THINKING_CONFIGS

function isThinkingProvider(provider: string): provider is ThinkingProvider {
  return provider in THINKING_CONFIGS
}

  export function getThinkingConfig(
    providerID: string,
    modelID: string
  ): Record<string, unknown> | null {
    const normalized = normalizeModelID(modelID)
    const { base } = extractModelPrefix(normalized)

    // Check if already high variant - don't inject config again
    if (isAlreadyHighVariant(modelID)) {
      return null
    }

    // Check if provider supports thinking
    const resolvedProvider = resolveProvider(providerID, modelID)
    if (!isThinkingProvider(resolvedProvider)) {
      return null
    }

    // For Antigravity provider, use high variant switching instead
    // Don't inject thinking config directly
    if (resolvedProvider === "google" && modelID.startsWith("google/antigravity-gemini")) {
      return null
    }

    const config = THINKING_CONFIGS[resolvedProvider]
    const capablePatterns = THINKING_CAPABLE_MODELS[resolvedProvider]

    // Check capability using base model name (without prefix)
    const baseLower = base.toLowerCase()
    const isCapable = capablePatterns.some((pattern) =>
      baseLower.includes(pattern.toLowerCase())
    )

    return isCapable ? config : null
  }
