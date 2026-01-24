import type { TokenUsage, AgentTokenRecord, SessionTokenAnalytics, TokenReport, AgentReportEntry, DelegationNode } from "./types"
import { createEmptyTokenUsage, addTokenUsage, calculateCost, MODEL_PRICING } from "./types"

export class TokenAnalyticsManager {
  private sessions: Map<string, SessionTokenAnalytics> = new Map()

  startSession(sessionID: string, parentSessionID?: string, agent?: string, model?: string): void {
    if (this.sessions.has(sessionID)) return
    
    this.sessions.set(sessionID, {
      sessionID,
      parentSessionID,
      agents: new Map(),
      totalUsage: createEmptyTokenUsage(),
      startTime: Date.now(),
    })

    if (agent) {
      this.sessions.get(sessionID)!.agents.set(agent, {
        agent,
        model: model || "unknown",
        provider: "unknown",
        usage: createEmptyTokenUsage(),
        messageCount: 0,
        toolCalls: 0,
        startTime: Date.now(),
      })
    }
  }

  recordMessage(
    sessionID: string,
    agent: string,
    model: string,
    provider: string,
    tokens: { input?: number; output?: number; reasoning?: number; cache?: { read?: number; write?: number } }
  ): void {
    const session = this.sessions.get(sessionID)
    if (!session) return

    const usage: TokenUsage = {
      input: tokens.input || 0,
      output: tokens.output || 0,
      reasoning: tokens.reasoning || 0,
      cacheRead: tokens.cache?.read || 0,
      cacheWrite: tokens.cache?.write || 0,
    }

    session.totalUsage = addTokenUsage(session.totalUsage, usage)

    let record = session.agents.get(agent)
    if (!record) {
      record = {
        agent,
        model,
        provider,
        usage: createEmptyTokenUsage(),
        messageCount: 0,
        toolCalls: 0,
        startTime: Date.now(),
      }
      session.agents.set(agent, record)
    }

    const updatedRecord = session.agents.get(agent)!
    updatedRecord.usage = addTokenUsage(updatedRecord.usage, usage)
    updatedRecord.messageCount++
    updatedRecord.model = model
    updatedRecord.provider = provider
  }

  recordToolCall(sessionID: string, agent: string): void {
    const session = this.sessions.get(sessionID)
    if (!session) return

    const record = session.agents.get(agent)
    if (record) {
      record.toolCalls++
    }
  }

  endSession(sessionID: string): void {
    const session = this.sessions.get(sessionID)
    if (session) {
      session.endTime = Date.now()
      for (const record of session.agents.values()) {
        if (!record.endTime) {
          record.endTime = Date.now()
        }
      }
    }
  }

  getAnalytics(sessionID: string): SessionTokenAnalytics | undefined {
    return this.sessions.get(sessionID)
  }

  getReport(sessionID: string): TokenReport | null {
    const session = this.sessions.get(sessionID)
    if (!session) return null

    const endTime = session.endTime || Date.now()
    const duration = endTime - session.startTime

    const totalTokens = session.totalUsage
    const totalInputOutput = totalTokens.input + totalTokens.output

    const agentBreakdown: AgentReportEntry[] = []
    let estimatedCost = 0

    for (const record of session.agents.values()) {
      const cost = calculateCost(record.usage, record.model)
      estimatedCost += cost

      const agentTotal = record.usage.input + record.usage.output
      const percentage = totalInputOutput > 0 ? (agentTotal / totalInputOutput) * 100 : 0

      agentBreakdown.push({
        agent: record.agent,
        model: record.model,
        provider: record.provider,
        usage: record.usage,
        messageCount: record.messageCount,
        toolCalls: record.toolCalls,
        duration: (record.endTime || Date.now()) - record.startTime,
        estimatedCost: cost,
        percentage,
      })
    }

    agentBreakdown.sort((a, b) => b.percentage - a.percentage)

    const delegationTree = this.buildDelegationTree(sessionID)

    return {
      sessionID,
      duration,
      totalTokens: totalTokens.input + totalTokens.output + totalTokens.reasoning,
      estimatedCost,
      agentBreakdown,
      delegationTree,
    }
  }

  private buildDelegationTree(sessionID: string): DelegationNode[] {
    const session = this.sessions.get(sessionID)
    if (!session) return []

    const nodes: DelegationNode[] = []
    
    for (const [childID, childSession] of this.sessions.entries()) {
      if (childSession.parentSessionID === sessionID) {
        const childNodes = this.buildDelegationTree(childID)
        const mainAgent = childSession.agents.values().next().value
        
        if (mainAgent) {
          nodes.push({
            agent: mainAgent.agent,
            model: mainAgent.model,
            usage: childSession.totalUsage,
            estimatedCost: calculateCost(childSession.totalUsage, mainAgent.model),
            children: childNodes,
          })
        }
      }
    }

    return nodes
  }

  clear(sessionID: string): void {
    this.sessions.delete(sessionID)
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.parentSessionID === sessionID) {
        this.clear(id)
      }
    }
  }
}
