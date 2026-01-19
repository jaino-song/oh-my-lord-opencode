import type { AgentConfig } from "@opencode-ai/sdk"
import { sisyphusAgent } from "./sisyphus"
import { oracleAgent } from "./oracle"
import { librarianAgent } from "./librarian"
import { exploreAgent } from "./explore"
import { frontendUiUxEngineerAgent } from "./frontend-ui-ux-engineer"
import { documentWriterAgent } from "./document-writer"
import { multimodalLookerAgent } from "./multimodal-looker"
import { metisAgent } from "./metis"
import { paulAgent, orchestratorSisyphusAgent } from "./orchestrator-sisyphus"
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

export const builtinAgents: Record<string, AgentConfig> = {
  Sisyphus: sisyphusAgent,
  oracle: oracleAgent,
  librarian: librarianAgent,
  explore: exploreAgent,
  "frontend-ui-ux-engineer": frontendUiUxEngineerAgent,
  "document-writer": documentWriterAgent,
  "multimodal-looker": multimodalLookerAgent,
  "Metis (Plan Consultant)": metisAgent,
  "Momus (Plan Reviewer)": momusAgent,
  "Ezra (Plan Reviewer)": ezraAgent,
  "Nathan (Request Analyst)": nathanAgent,
  "Elijah (Deep Reasoning Advisor)": elijahAgent,
  "Paul": paulAgent,
  "orchestrator-sisyphus": orchestratorSisyphusAgent,
  "Solomon (TDD Planner)": solomonAgent,
  "Joshua (Test Runner)": joshuaAgent,
  "Peter (Test Writer)": peterAgent,
  "John (E2E Test Writer)": johnAgent,
  "Thomas (TDD Plan Consultant)": thomasAgent,
  "planner-paul": plannerPaulAgent,
  "Timothy (Implementation Plan Reviewer)": timothyAgent,
}

export * from "./types"
export { createBuiltinAgents } from "./utils"
export type { AvailableAgent } from "./sisyphus-prompt-builder"
