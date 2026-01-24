import type {
  TokenReport,
  DelegationNode,
  AgentReportEntry,
  TokenUsage,
} from "./types"

/**
 * Format a number with thousands separators
 * @example formatNumber(12450) => "12,450"
 */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

/**
 * Format a cost value as USD currency
 * @example formatCost(0.15) => "$0.15"
 */
function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`
}

/**
 * Format duration in milliseconds as human-readable string
 * @example formatDuration(154000) => "2m 34s"
 * @example formatDuration(45000) => "45s"
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Format a percentage value
 * @example formatPercentage(27.5) => "27.5%"
 */
function formatPercentage(pct: number): string {
  return `${pct.toFixed(1)}%`
}

/**
 * Truncate or pad a string to a maximum length
 * @example truncateString("hello world", 8) => "hello..."
 * @example truncateString("hi", 8) => "hi      "
 */
function truncateString(s: string, maxLen: number): string {
  if (s.length > maxLen) {
    return s.substring(0, maxLen - 3) + "..."
  }
  return s.padEnd(maxLen, " ")
}

/**
 * Calculate total tokens from TokenUsage
 */
function getTotalTokens(usage: TokenUsage): number {
  return usage.input + usage.output + usage.reasoning + usage.cacheRead + usage.cacheWrite
}

/**
 * Recursively render delegation tree nodes
 */
function renderDelegationTree(nodes: DelegationNode[], prefix: string = ""): string[] {
  const lines: string[] = []

  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1
    const connector = isLast ? "└── " : "├── "
    const nextPrefix = prefix + (isLast ? "    " : "│   ")

    const tokens = formatNumber(getTotalTokens(node.usage))
    const cost = formatCost(node.estimatedCost)
    const line = `${prefix}${connector}${node.agent} (${node.model}) - ${tokens} tokens - ${cost}`
    lines.push(line)

    if (node.children.length > 0) {
      lines.push(...renderDelegationTree(node.children, nextPrefix))
    }
  })

  return lines
}

/**
 * Generate a formatted ASCII token analytics report
 */
export function generateTokenReport(report: TokenReport): string {
  const lines: string[] = []

  // ============================================================================
  // HEADER SECTION
  // ============================================================================
  const headerWidth = 62
  const headerBorder = "═".repeat(headerWidth)
  const headerTitle = "TOKEN ANALYTICS REPORT"
  const titlePadding = Math.floor((headerWidth - headerTitle.length) / 2)
  const titleLine = " ".repeat(titlePadding) + headerTitle + " ".repeat(headerWidth - titlePadding - headerTitle.length)

  lines.push(`╔${headerBorder}╗`)
  lines.push(`║${titleLine}║`)
  lines.push(`╠${headerBorder}╣`)

  // Session info
  const sessionLine = `║ Session: ${report.sessionID}`.padEnd(headerWidth + 1) + "║"
  lines.push(sessionLine)

  const durationLine = `║ Duration: ${formatDuration(report.duration)}`.padEnd(headerWidth + 1) + "║"
  lines.push(durationLine)

  const tokensLine = `║ Total Tokens: ${formatNumber(report.totalTokens)}`.padEnd(headerWidth + 1) + "║"
  lines.push(tokensLine)

  const costLine = `║ Estimated Cost: ${formatCost(report.estimatedCost)}`.padEnd(headerWidth + 1) + "║"
  lines.push(costLine)

  lines.push(`╚${headerBorder}╝`)
  lines.push("")

  // ============================================================================
  // AGENT BREAKDOWN TABLE
  // ============================================================================
  if (report.agentBreakdown.length > 0) {
    const tableWidth = 85
    const tableBorder = "─".repeat(tableWidth)

    lines.push(`┌${tableBorder}┐`)
    lines.push(`│ AGENT BREAKDOWN${" ".repeat(tableWidth - 15)}│`)
    lines.push(`├──────────────────┬─────────────────────┬──────────┬──────────┬─────────┬────────┤`)

    // Header row
    const headers = [
      "Agent",
      "Model",
      "Tokens",
      "Cost",
      "Share",
      "Calls",
    ]
    const headerRow = `│ ${truncateString(headers[0], 16)} │ ${truncateString(headers[1], 19)} │ ${truncateString(headers[2], 8)} │ ${truncateString(headers[3], 8)} │ ${truncateString(headers[4], 7)} │ ${truncateString(headers[5], 6)} │`
    lines.push(headerRow)
    lines.push(`├──────────────────┼─────────────────────┼──────────┼──────────┼─────────┼────────┤`)

    // Data rows
    report.agentBreakdown.forEach((entry) => {
      const agentCell = truncateString(entry.agent, 16)
      const modelCell = truncateString(entry.model, 19)
      const tokensCell = formatNumber(getTotalTokens(entry.usage)).padStart(8)
      const costCell = formatCost(entry.estimatedCost).padStart(8)
      const shareCell = formatPercentage(entry.percentage).padStart(7)
      const callsCell = String(entry.messageCount).padStart(6)

      const row = `│ ${agentCell} │ ${modelCell} │ ${tokensCell} │ ${costCell} │ ${shareCell} │ ${callsCell} │`
      lines.push(row)
    })

    lines.push(`└──────────────────┴─────────────────────┴──────────┴──────────┴─────────┴────────┘`)
    lines.push("")
  }

  // ============================================================================
  // DELEGATION TREE
  // ============================================================================
  if (report.delegationTree.length > 0) {
    const treeWidth = 85
    const treeBorder = "─".repeat(treeWidth)

    lines.push(`┌${treeBorder}┐`)
    lines.push(`│ DELEGATION TREE${" ".repeat(treeWidth - 15)}│`)
    lines.push(`├${treeBorder}┤`)

    const treeLines = renderDelegationTree(report.delegationTree)
    treeLines.forEach((treeLine) => {
      const paddedLine = treeLine.padEnd(treeWidth)
      lines.push(`│ ${paddedLine} │`)
    })

    lines.push(`└${treeBorder}┘`)
    lines.push("")
  }

  // ============================================================================
  // TOKEN DETAILS FOOTER
  // ============================================================================
  const totalUsage = report.agentBreakdown.reduce(
    (acc, entry) => ({
      input: acc.input + entry.usage.input,
      output: acc.output + entry.usage.output,
      reasoning: acc.reasoning + entry.usage.reasoning,
      cacheRead: acc.cacheRead + entry.usage.cacheRead,
      cacheWrite: acc.cacheWrite + entry.usage.cacheWrite,
    }),
    {
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
    }
  )

  const detailsWidth = 85
  const detailsBorder = "─".repeat(detailsWidth)

  lines.push(`┌${detailsBorder}┐`)
  lines.push(`│ TOKEN DETAILS${" ".repeat(detailsWidth - 13)}│`)
  lines.push(`├${detailsBorder}┤`)

  const detailsLine = `│ Input: ${formatNumber(totalUsage.input)} │ Output: ${formatNumber(totalUsage.output)} │ Reasoning: ${formatNumber(totalUsage.reasoning)} │ Cache R: ${formatNumber(totalUsage.cacheRead)} │ Cache W: ${formatNumber(totalUsage.cacheWrite)}`.padEnd(detailsWidth + 1) + "│"
  lines.push(detailsLine)

  lines.push(`└${detailsBorder}┘`)

  return lines.join("\n")
}
