import type { AgentConfig } from "@opencode-ai/sdk"
import type { BuiltinAgentName, AgentOverrideConfig, AgentOverrides, AgentFactory, AgentPromptMetadata } from "./types"
import type { CategoriesConfig, CategoryConfig, GitMasterConfig } from "../config/schema"
import { createSisyphusAgent } from "./sisyphus"
// @deprecated Use specialized agents (Ezra, Nathan, Elijah) instead
import { createOracleAgent, ORACLE_PROMPT_METADATA } from "./oracle"
import { createLibrarianAgent, LIBRARIAN_PROMPT_METADATA } from "./librarian"
import { createExploreAgent, EXPLORE_PROMPT_METADATA } from "./explore"
import { createFrontendUiUxEngineerAgent, FRONTEND_PROMPT_METADATA } from "./frontend-ui-ux-engineer"
import { createDocumentWriterAgent, DOCUMENT_WRITER_PROMPT_METADATA } from "./document-writer"
import { createMultimodalLookerAgent, MULTIMODAL_LOOKER_PROMPT_METADATA } from "./multimodal-looker"
// @deprecated Use specialized agents (Solomon, Timothy) instead
import { createMetisAgent } from "./metis"
import { createPaulAgent, paulAgent, createOrchestratorSisyphusAgent, orchestratorSisyphusAgent } from "./paul"
import { createMomusAgent } from "./momus"
import { createEzraAgent, EZRA_PROMPT_METADATA } from "./ezra"
import { createNathanAgent, NATHAN_PROMPT_METADATA } from "./nathan"
import { createElijahAgent, ELIJAH_PROMPT_METADATA } from "./elijah"
import { createSolomonAgent } from "./solomon"
import { createJoshuaAgent, JOSHUA_PROMPT_METADATA } from "./joshua"
import { createPeterAgent, PETER_PROMPT_METADATA } from "./peter"
import { createJohnAgent, JOHN_PROMPT_METADATA } from "./john"
import { createThomasAgent, THOMAS_PROMPT_METADATA } from "./thomas"
import { createPlannerPaulAgent } from "./planner-paul"
import { createTimothyAgent, timothyPromptMetadata } from "./timothy"
import { createWorkerPaulAgentWithOverrides, workerPaulAgent } from "./worker-paul"
import { createSisyphusJuniorAgentWithOverrides } from "./sisyphus-junior"
import { createSaulAgentWithOverrides, saulAgent } from "./saul"
import { createGitMasterAgent, GIT_MASTER_PROMPT_METADATA } from "./git-master"
import { createUltrabrainAgent, ULTRABRAIN_PROMPT_METADATA } from "./ultrabrain"
import type { AvailableAgent } from "./paul-prompt-builder"
import { deepMerge } from "../shared"
import { DEFAULT_CATEGORIES } from "../tools/delegate-task/constants"
import { resolveMultipleSkills } from "../features/opencode-skill-loader/skill-content"

type AgentSource = AgentFactory | AgentConfig

/**
 * Agents that are user-selectable from the @ autocomplete menu.
 * All other agents are hidden and can only be invoked by the orchestrator.
 */
const USER_SELECTABLE_AGENTS: BuiltinAgentName[] = [
  "Paul",
  "planner-paul",
  "worker-paul",
  "Saul",
]

const agentSources: Record<BuiltinAgentName, AgentSource> = {
   Sisyphus: createSisyphusAgent,
   Saul: saulAgent,
   // @deprecated Use specialized agents (Ezra, Nathan, Elijah) instead
   oracle: createOracleAgent,
   librarian: createLibrarianAgent,
  explore: createExploreAgent,
  "frontend-ui-ux-engineer": createFrontendUiUxEngineerAgent,
  "document-writer": createDocumentWriterAgent,
   "multimodal-looker": createMultimodalLookerAgent,
   // @deprecated Use specialized agents (Solomon, Timothy) instead
   "Metis (Plan Consultant)": createMetisAgent,
   "Momus (Plan Reviewer)": createMomusAgent,
  "Ezra (Plan Reviewer)": createEzraAgent,
  "Nathan (Request Analyst)": createNathanAgent,
  "Elijah (Deep Reasoning Advisor)": createElijahAgent,
  "Paul": paulAgent,
  "orchestrator-sisyphus": orchestratorSisyphusAgent,
  "Solomon (TDD Planner)": createSolomonAgent,
  "Joshua (Test Runner)": createJoshuaAgent,
  "Peter (Test Writer)": createPeterAgent,
  "John (E2E Test Writer)": createJohnAgent,
  "Thomas (TDD Plan Consultant)": createThomasAgent,
  "planner-paul": createPlannerPaulAgent,
  "Timothy (Implementation Plan Reviewer)": createTimothyAgent,
  "worker-paul": workerPaulAgent,
  "Sisyphus-Junior": (model?: string) => createSisyphusJuniorAgentWithOverrides(undefined, model),
  "git-master": createGitMasterAgent,
  "ultrabrain": createUltrabrainAgent,
}

/**
 * Metadata for each agent, used to build Sisyphus's dynamic prompt sections
 * (Delegation Table, Tool Selection, Key Triggers, etc.)
 */
const agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> = {
   // @deprecated Use specialized agents (Ezra, Nathan, Elijah) instead
   oracle: ORACLE_PROMPT_METADATA,
   librarian: LIBRARIAN_PROMPT_METADATA,
  explore: EXPLORE_PROMPT_METADATA,
  "frontend-ui-ux-engineer": FRONTEND_PROMPT_METADATA,
  "document-writer": DOCUMENT_WRITER_PROMPT_METADATA,
  "multimodal-looker": MULTIMODAL_LOOKER_PROMPT_METADATA,
  "Peter (Test Writer)": PETER_PROMPT_METADATA,
  "Joshua (Test Runner)": JOSHUA_PROMPT_METADATA,
  "John (E2E Test Writer)": JOHN_PROMPT_METADATA,
  "Thomas (TDD Plan Consultant)": THOMAS_PROMPT_METADATA,
  "Timothy (Implementation Plan Reviewer)": timothyPromptMetadata,
  "Ezra (Plan Reviewer)": EZRA_PROMPT_METADATA,
  "Nathan (Request Analyst)": NATHAN_PROMPT_METADATA,
  "Elijah (Deep Reasoning Advisor)": ELIJAH_PROMPT_METADATA,
  "git-master": GIT_MASTER_PROMPT_METADATA,
  "ultrabrain": ULTRABRAIN_PROMPT_METADATA,
}

function isFactory(source: AgentSource): source is AgentFactory {
  return typeof source === "function"
}

export function buildAgent(
  source: AgentSource,
  model?: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig
): AgentConfig {
  const base = isFactory(source) ? source(model) : source
  const categoryConfigs: Record<string, CategoryConfig> = categories
    ? { ...DEFAULT_CATEGORIES, ...categories }
    : DEFAULT_CATEGORIES

  const agentWithCategory = base as AgentConfig & { category?: string; skills?: string[]; variant?: string }
  if (agentWithCategory.category) {
    const categoryConfig = categoryConfigs[agentWithCategory.category]
    if (categoryConfig) {
      if (!base.model) {
        base.model = categoryConfig.model
      }
      if (base.temperature === undefined && categoryConfig.temperature !== undefined) {
        base.temperature = categoryConfig.temperature
      }
      if (base.variant === undefined && categoryConfig.variant !== undefined) {
        base.variant = categoryConfig.variant
      }
    }
  }

  if (agentWithCategory.skills?.length) {
    const { resolved } = resolveMultipleSkills(agentWithCategory.skills, { gitMasterConfig })
    if (resolved.size > 0) {
      const skillContent = Array.from(resolved.values()).join("\n\n")
      base.prompt = skillContent + (base.prompt ? "\n\n" + base.prompt : "")
    }
  }

  return base
}

/**
 * Creates OmO-specific environment context (time, timezone, locale).
 * Note: Working directory, platform, and date are already provided by OpenCode's system.ts,
 * so we only include fields that OpenCode doesn't provide to avoid duplication.
 * See: https://github.com/code-yeongyu/oh-my-opencode/issues/379
 */
export function createEnvContext(): string {
  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const locale = Intl.DateTimeFormat().resolvedOptions().locale

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  return `
<omo-env>
  Current time: ${timeStr}
  Timezone: ${timezone}
  Locale: ${locale}
</omo-env>`
}

function mergeAgentConfig(
  base: AgentConfig,
  override: AgentOverrideConfig
): AgentConfig {
  const { prompt_append, ...rest } = override
  const merged = deepMerge(base, rest as Partial<AgentConfig>)

  if (prompt_append && merged.prompt) {
    merged.prompt = merged.prompt + "\n" + prompt_append
  }

  return merged
}

export function createBuiltinAgents(
  disabledAgents: BuiltinAgentName[] = [],
  agentOverrides: AgentOverrides = {},
  directory?: string,
  systemDefaultModel?: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig
): Record<string, AgentConfig> {
  const result: Record<string, AgentConfig> = {}
  const availableAgents: AvailableAgent[] = []

  const mergedCategories = categories
    ? { ...DEFAULT_CATEGORIES, ...categories }
    : DEFAULT_CATEGORIES

  for (const [name, source] of Object.entries(agentSources)) {
    const agentName = name as BuiltinAgentName

    if (agentName === "Sisyphus") continue
    if (agentName === "orchestrator-sisyphus") continue
    if (disabledAgents.includes(agentName)) continue

    const override = agentOverrides[agentName]
    const model = override?.model

    let config = buildAgent(source, model, mergedCategories, gitMasterConfig)

    if (agentName === "librarian" && directory && config.prompt) {
      const envContext = createEnvContext()
      config = { ...config, prompt: config.prompt + envContext }
    }

    if (override) {
      config = mergeAgentConfig(config, override)
    }

    if (!USER_SELECTABLE_AGENTS.includes(agentName)) {
      config = { ...config, hidden: true }
    }

    result[name] = config

    const metadata = agentMetadata[agentName]
    if (metadata) {
      availableAgents.push({
        name: agentName,
        description: config.description ?? "",
        metadata,
      })
    }
  }

  if (!disabledAgents.includes("Sisyphus")) {
    const sisyphusOverride = agentOverrides["Sisyphus"]
    const sisyphusModel = sisyphusOverride?.model ?? systemDefaultModel

    let sisyphusConfig = createSisyphusAgent(sisyphusModel, availableAgents)

    if (directory && sisyphusConfig.prompt) {
      const envContext = createEnvContext()
      sisyphusConfig = { ...sisyphusConfig, prompt: sisyphusConfig.prompt + envContext }
    }

    if (sisyphusOverride) {
      sisyphusConfig = mergeAgentConfig(sisyphusConfig, sisyphusOverride)
    }

    if (!USER_SELECTABLE_AGENTS.includes("Sisyphus")) {
      sisyphusConfig = { ...sisyphusConfig, hidden: true }
    }

    result["Sisyphus"] = sisyphusConfig
  }

  if (!disabledAgents.includes("Paul")) {
    const paulOverride = agentOverrides["Paul"]
    const paulModel = paulOverride?.model ?? systemDefaultModel
    let paulConfig = createOrchestratorSisyphusAgent({
      model: paulModel,
      availableAgents,
    })

    if (paulOverride) {
      paulConfig = mergeAgentConfig(paulConfig, paulOverride)
    }

    result["Paul"] = paulConfig
  }

  if (!disabledAgents.includes("planner-paul")) {
      const plannerOverride = agentOverrides["planner-paul"]
      const plannerModel = plannerOverride?.model ?? systemDefaultModel

      let plannerConfig = createPlannerPaulAgent(plannerModel)

      if (plannerOverride) {
          plannerConfig = mergeAgentConfig(plannerConfig, plannerOverride)
      }

      result["planner-paul"] = plannerConfig
  }

  if (!disabledAgents.includes("worker-paul")) {
      const workerOverride = agentOverrides["worker-paul"]

      let workerConfig = createWorkerPaulAgentWithOverrides(workerOverride, systemDefaultModel)

      if (workerOverride) {
          workerConfig = mergeAgentConfig(workerConfig, workerOverride)
      }

      result["worker-paul"] = workerConfig
  }

  if (!disabledAgents.includes("Sisyphus-Junior")) {
      const juniorOverride = agentOverrides["Sisyphus-Junior"]

      let juniorConfig = createSisyphusJuniorAgentWithOverrides(juniorOverride, systemDefaultModel)

      if (juniorOverride) {
          juniorConfig = mergeAgentConfig(juniorConfig, juniorOverride)
      }

      result["Sisyphus-Junior"] = juniorConfig
  }

  if (!disabledAgents.includes("Saul")) {
      const saulOverride = agentOverrides["Saul"]

      let saulConfig = createSaulAgentWithOverrides(saulOverride, systemDefaultModel)

      if (saulOverride) {
          saulConfig = mergeAgentConfig(saulConfig, saulOverride)
      }

      result["Saul"] = saulConfig
  }

  if (!disabledAgents.includes("orchestrator-sisyphus")) {
    const orchestratorOverride = agentOverrides["orchestrator-sisyphus"]
    const orchestratorModel = orchestratorOverride?.model ?? systemDefaultModel
    let orchestratorConfig = createOrchestratorSisyphusAgent({
      model: orchestratorModel,
      availableAgents,
    })

    if (orchestratorOverride) {
      orchestratorConfig = mergeAgentConfig(orchestratorConfig, orchestratorOverride)
    }

    orchestratorConfig = { ...orchestratorConfig, hidden: true }
    result["orchestrator-sisyphus"] = orchestratorConfig
  }

  return result
}
