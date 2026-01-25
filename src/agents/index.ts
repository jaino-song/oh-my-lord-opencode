import type { AgentConfig } from "@opencode-ai/sdk"
import { oracleAgent } from "./oracle"
import { librarianAgent } from "./librarian"
import { exploreAgent } from "./explore"
import { frontendUiUxEngineerAgent } from "./frontend-ui-ux-engineer"
import { documentWriterAgent } from "./document-writer"
import { multimodalLookerAgent } from "./multimodal-looker"
import { metisAgent } from "./metis"
import { paulAgent } from "./paul"
import { momusAgent } from "./momus"
import { ezraAgent } from "./ezra"
import { nathanAgent } from "./nathan"
import { elijahAgent } from "./elijah"
import { solomonAgent } from "./solomon"
import { joshuaAgent } from "./joshua"
import { peterAgent } from "./peter"
import { johnAgent } from "./john"
import { thomasAgent } from "./thomas"
import { plannerPaulAgent } from "./planner-paul"
import { timothyAgent } from "./timothy"
import { workerPaulAgent } from "./worker-paul"
import { saulAgent } from "./saul"

export const builtinAgents: Record<string, AgentConfig> = {
  Saul: saulAgent,
  // DEPRECATED: Use "Elijah (Deep Reasoning Advisor)" instead
  oracle: oracleAgent,
  librarian: librarianAgent,
  explore: exploreAgent,
  "frontend-ui-ux-engineer": frontendUiUxEngineerAgent,
  "document-writer": documentWriterAgent,
  "multimodal-looker": multimodalLookerAgent,
  // DEPRECATED: Use "Nathan (Request Analyst)" instead
  "Metis (Plan Consultant)": metisAgent,
  // DEPRECATED: Use "Ezra (Plan Reviewer)" instead
  "Momus (Plan Reviewer)": momusAgent,
  "Ezra (Plan Reviewer)": ezraAgent,
  "Nathan (Request Analyst)": nathanAgent,
  "Elijah (Deep Reasoning Advisor)": elijahAgent,
  "Paul": paulAgent,
  "Solomon (TDD Planner)": solomonAgent,
  "Joshua (Test Runner)": joshuaAgent,
  "Peter (Test Writer)": peterAgent,
  "John (E2E Test Writer)": johnAgent,
  "Thomas (TDD Plan Consultant)": thomasAgent,
  "planner-paul": plannerPaulAgent,
  "Timothy (Implementation Plan Reviewer)": timothyAgent,
  "worker-paul": workerPaulAgent,
}

export * from "./types"
export { createBuiltinAgents } from "./utils"
export type { AvailableAgent } from "./paul-prompt-builder"
