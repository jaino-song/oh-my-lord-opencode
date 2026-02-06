import type { AgentConfig } from "@opencode-ai/sdk"
import { librarianAgent } from "./librarian"
import { exploreAgent } from "./explore"
import { frontendUiUxEngineerAgent } from "./frontend-ui-ux-engineer"
import { documentWriterAgent } from "./document-writer"
import { multimodalLookerAgent } from "./multimodal-looker"
import { paulAgent } from "./paul"
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
  librarian: librarianAgent,
  explore: exploreAgent,
  "frontend-ui-ux-engineer": frontendUiUxEngineerAgent,
  "document-writer": documentWriterAgent,
  "multimodal-looker": multimodalLookerAgent,
  
  "Ezra (Plan Reviewer)": ezraAgent,
  "ezra": ezraAgent,
  
  "Nathan (Request Analyst)": nathanAgent,
  "nathan": nathanAgent,
  
  "Elijah (Deep Reasoning Advisor)": elijahAgent,
  "elijah": elijahAgent,
  
  "Paul": paulAgent,
  "paul": paulAgent,
  
  "Solomon (TDD Planner)": solomonAgent,
  "solomon": solomonAgent,
  
  "Joshua (Test Runner)": joshuaAgent,
  "joshua": joshuaAgent,
  
  "Peter (Test Writer)": peterAgent,
  "peter": peterAgent,
  
  "John (E2E Test Writer)": johnAgent,
  "john": johnAgent,
  
  "Thomas (TDD Plan Consultant)": thomasAgent,
  "thomas": thomasAgent,
  
  "planner-paul": plannerPaulAgent,
  
  "Timothy (Implementation Plan Reviewer)": timothyAgent,
  "timothy": timothyAgent,
  
  "worker-paul": workerPaulAgent,
}

export * from "./types"
export { createBuiltinAgents } from "./utils"
export type { AvailableAgent } from "./paul-prompt-builder"
