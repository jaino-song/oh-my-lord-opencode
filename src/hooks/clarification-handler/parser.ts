/**
 * clarification-handler parser
 *
 * parses clarification requests from subagent output.
 * format: [NEEDS_CLARIFICATION]
 * question: ...
 * options:
 * A) ...
 * B) ...
 * context: ...
 * recommendation: ...
 * [/NEEDS_CLARIFICATION]
 */

import type { ClarificationRequest, ClarificationOption, ParseResult } from "./types"
import { CLARIFICATION_MARKER } from "./constants"

/** regex to extract clarification block */
const CLARIFICATION_BLOCK_REGEX =
  /\[NEEDS_CLARIFICATION\]([\s\S]*?)\[\/NEEDS_CLARIFICATION\]/i

/** regex to extract question */
const QUESTION_REGEX =
  /question:\s*(.+?)(?=\n(?:options:|context:|recommendation:|$))/is

/** regex to extract options block */
const OPTIONS_REGEX =
  /options:\s*([\s\S]*?)(?=\n(?:context:|recommendation:|$|\[\/NEEDS_CLARIFICATION\]))/i

/** regex to extract individual option (case-insensitive: A) or a)) */
const OPTION_REGEX = /([A-Za-z])\)\s*(.+)/g

/** regex to extract context */
const CONTEXT_REGEX =
  /context:\s*(.+?)(?=\n(?:recommendation:|$|\[\/NEEDS_CLARIFICATION\]))/is

/** regex to extract recommendation */
const RECOMMENDATION_REGEX =
  /recommendation:\s*(.+?)(?=\n|$|\[\/NEEDS_CLARIFICATION\])/is

/**
 * check if text contains a clarification marker
 */
export function hasClarificationMarker(text: string): boolean {
  return text.includes(CLARIFICATION_MARKER) || CLARIFICATION_BLOCK_REGEX.test(text)
}

/**
 * parse options from options block text
 */
function parseOptions(optionsText: string): ClarificationOption[] {
  const options: ClarificationOption[] = []
  let match: RegExpExecArray | null

  // reset regex state
  OPTION_REGEX.lastIndex = 0

  while ((match = OPTION_REGEX.exec(optionsText)) !== null) {
    options.push({
      label: match[1],
      description: match[2].trim(),
    })
  }

  return options
}

/**
 * parse a clarification request from text
 */
export function parseClarificationRequest(text: string): ParseResult {
  // check for clarification block
  const blockMatch = text.match(CLARIFICATION_BLOCK_REGEX)
  if (!blockMatch) {
    // check for simple marker without block
    if (text.includes(CLARIFICATION_MARKER)) {
      return { success: false, reason: "Found marker but no structured block" }
    }
    return { success: false, reason: "No clarification block found" }
  }

  const content = blockMatch[1]

  // extract question (required)
  const questionMatch = content.match(QUESTION_REGEX)
  if (!questionMatch) {
    return { success: false, reason: "No question found in clarification block" }
  }
  const question = questionMatch[1].trim()

  // extract options (required, at least 2)
  const optionsMatch = content.match(OPTIONS_REGEX)
  if (!optionsMatch) {
    return { success: false, reason: "No options found in clarification block" }
  }
  const options = parseOptions(optionsMatch[1])
  if (options.length < 2) {
    return { success: false, reason: "At least 2 options required" }
  }

  // extract context (optional)
  const contextMatch = content.match(CONTEXT_REGEX)
  const context = contextMatch ? contextMatch[1].trim() : undefined

  // extract recommendation (optional)
  const recommendationMatch = content.match(RECOMMENDATION_REGEX)
  const recommendation = recommendationMatch
    ? recommendationMatch[1].trim()
    : undefined

  return {
    success: true,
    request: {
      question,
      options,
      context,
      recommendation,
    },
  }
}

/**
 * format a clarification request for display
 */
export function formatClarificationRequest(request: ClarificationRequest): string {
  let formatted = `Question: ${request.question}\n\nOptions:\n`
  for (const option of request.options) {
    formatted += `  ${option.label}) ${option.description}\n`
  }
  if (request.context) {
    formatted += `\nContext: ${request.context}`
  }
  if (request.recommendation) {
    formatted += `\nRecommendation: ${request.recommendation}`
  }
  return formatted
}
