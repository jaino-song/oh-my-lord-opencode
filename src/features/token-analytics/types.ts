export interface TokenUsage {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
}

export interface AgentTokenRecord {
  agent: string
  model: string
  provider: string
  usage: TokenUsage
  messageCount: number
  toolCalls: number
  startTime: number
  endTime?: number
}

export interface SessionTokenAnalytics {
  sessionID: string
  parentSessionID?: string
  agents: Map<string, AgentTokenRecord>
  totalUsage: TokenUsage
  startTime: number
  endTime?: number
}

export interface AgentReportEntry {
  agent: string
  model: string
  provider: string
  usage: TokenUsage
  messageCount: number
  toolCalls: number
  duration: number
  estimatedCost: number
  percentage: number
}

export interface DelegationNode {
  agent: string
  model: string
  usage: TokenUsage
  estimatedCost: number
  children: DelegationNode[]
}

export interface TokenReport {
  sessionID: string
  duration: number
  totalTokens: number
  estimatedCost: number
  agentBreakdown: AgentReportEntry[]
  delegationTree: DelegationNode[]
}

export const MODEL_PRICING: Record<
  string,
  {
    input: number
    output: number
    reasoning: number
    cacheRead: number
    cacheWrite: number
  }
> = {
  "anthropic/claude-opus-4-5": {
    input: 15.0,
    output: 75.0,
    reasoning: 0.0,
    cacheRead: 1.5,
    cacheWrite: 18.75,
  },
  "anthropic/claude-sonnet-4-5": {
    input: 3.0,
    output: 15.0,
    reasoning: 0.0,
    cacheRead: 0.3,
    cacheWrite: 3.75,
  },
  "anthropic/claude-haiku-4": {
    input: 0.8,
    output: 4.0,
    reasoning: 0.0,
    cacheRead: 0.08,
    cacheWrite: 1.0,
  },
  "openai/gpt-5.2": {
    input: 10.0,
    output: 30.0,
    reasoning: 0.0,
    cacheRead: 5.0,
    cacheWrite: 12.5,
  },
  "openai/gpt-5.2-codex-high": {
    input: 12.0,
    output: 36.0,
    reasoning: 0.0,
    cacheRead: 6.0,
    cacheWrite: 15.0,
  },
  "gpt-5.2-codex-high": {
    input: 12.0,
    output: 36.0,
    reasoning: 0.0,
    cacheRead: 6.0,
    cacheWrite: 15.0,
  },
  "openai/gpt-5.2-high": {
    input: 15.0,
    output: 45.0,
    reasoning: 0.0,
    cacheRead: 7.5,
    cacheWrite: 18.75,
  },
  "google/gemini-3-pro-high": {
    input: 7.5,
    output: 22.5,
    reasoning: 0.0,
    cacheRead: 0.75,
    cacheWrite: 9.375,
  },
  "gemini-3-pro-preview": {
    input: 5.0,
    output: 15.0,
    reasoning: 0.0,
    cacheRead: 0.5,
    cacheWrite: 6.25,
  },
  "grok-code": {
    input: 8.0,
    output: 24.0,
    reasoning: 0.0,
    cacheRead: 0.8,
    cacheWrite: 10.0,
  },
  "Claude/glm-4.7-free": {
    input: 0.0,
    output: 0.0,
    reasoning: 0.0,
    cacheRead: 0.0,
    cacheWrite: 0.0,
  },
  "glm-4.7-free": {
    input: 0.0,
    output: 0.0,
    reasoning: 0.0,
    cacheRead: 0.0,
    cacheWrite: 0.0,
  },
}

export function createEmptyTokenUsage(): TokenUsage {
  return {
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
  }
}

export function addTokenUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    reasoning: a.reasoning + b.reasoning,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  }
}

export function calculateCost(usage: TokenUsage, model: string): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    return 0
  }

  const inputCost = (usage.input / 1_000_000) * pricing.input
  const outputCost = (usage.output / 1_000_000) * pricing.output
  const reasoningCost = (usage.reasoning / 1_000_000) * pricing.reasoning
  const cacheReadCost = (usage.cacheRead / 1_000_000) * pricing.cacheRead
  const cacheWriteCost = (usage.cacheWrite / 1_000_000) * pricing.cacheWrite

  return inputCost + outputCost + reasoningCost + cacheReadCost + cacheWriteCost
}
