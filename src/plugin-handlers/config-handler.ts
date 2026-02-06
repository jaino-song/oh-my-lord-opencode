import { createBuiltinAgents } from "../agents";
import { createPaulJuniorAgentWithOverrides } from "../agents/paul-junior";
import {
  loadUserCommands,
  loadProjectCommands,
  loadOpencodeGlobalCommands,
  loadOpencodeProjectCommands,
} from "../features/claude-code-command-loader";
import { loadBuiltinCommands } from "../features/builtin-commands";
import {
  loadUserSkills,
  loadProjectSkills,
  loadOpencodeGlobalSkills,
  loadOpencodeProjectSkills,
} from "../features/opencode-skill-loader";
import {
  loadUserAgents,
  loadProjectAgents,
} from "../features/claude-code-agent-loader";
import { loadMcpConfigs } from "../features/claude-code-mcp-loader";
import { loadAllPluginComponents } from "../features/claude-code-plugin-loader";
import { createBuiltinMcps } from "../mcp";
import type { OhMyOpenCodeConfig } from "../config";
import { log } from "../shared";
import { migrateAgentConfig } from "../shared/permission-compat";
import type { ModelCacheState } from "../plugin-state";

export interface ConfigHandlerDeps {
  ctx: { directory: string };
  pluginConfig: OhMyOpenCodeConfig;
  modelCacheState: ModelCacheState;
}

export function createConfigHandler(deps: ConfigHandlerDeps) {
  const { ctx, pluginConfig, modelCacheState } = deps;

  return async (config: Record<string, unknown>) => {
    type ProviderConfig = {
      options?: { headers?: Record<string, string> };
      models?: Record<string, { limit?: { context?: number } }>;
    };
    const providers = config.provider as
      | Record<string, ProviderConfig>
      | undefined;

    const anthropicBeta =
      providers?.anthropic?.options?.headers?.["anthropic-beta"];
    modelCacheState.anthropicContext1MEnabled =
      anthropicBeta?.includes("context-1m") ?? false;

    if (providers) {
      for (const [providerID, providerConfig] of Object.entries(providers)) {
        const models = providerConfig?.models;
        if (models) {
          for (const [modelID, modelConfig] of Object.entries(models)) {
            const contextLimit = modelConfig?.limit?.context;
            if (contextLimit) {
              modelCacheState.modelContextLimitsCache.set(
                `${providerID}/${modelID}`,
                contextLimit
              );
            }
          }
        }
      }
    }

    const pluginComponents = (pluginConfig.claude_code?.plugins ?? true)
      ? await loadAllPluginComponents({
          enabledPluginsOverride: pluginConfig.claude_code?.plugins_override,
        })
      : {
          commands: {},
          skills: {},
          agents: {},
          mcpServers: {},
          hooksConfigs: [],
          plugins: [],
          errors: [],
        };

    if (pluginComponents.plugins.length > 0) {
      log(`Loaded ${pluginComponents.plugins.length} Claude Code plugins`, {
        plugins: pluginComponents.plugins.map((p) => `${p.name}@${p.version}`),
      });
    }

    if (pluginComponents.errors.length > 0) {
      log(`Plugin load errors`, { errors: pluginComponents.errors });
    }

    const builtinAgents = createBuiltinAgents(
      pluginConfig.disabled_agents,
      pluginConfig.agents,
      ctx.directory,
      config.model as string | undefined,
      pluginConfig.git_master
    );

    // Claude Code agents: Do NOT apply permission migration
    // Claude Code uses whitelist-based tools format which is semantically different
    // from OpenCode's denylist-based permission system
    const userAgents = (pluginConfig.claude_code?.agents ?? true)
      ? loadUserAgents()
      : {};
    const projectAgents = (pluginConfig.claude_code?.agents ?? true)
      ? loadProjectAgents()
      : {};

    // Plugin agents: Apply permission migration for compatibility
    const rawPluginAgents = pluginComponents.agents;
    const pluginAgents = Object.fromEntries(
      Object.entries(rawPluginAgents).map(([k, v]) => [
        k,
        v ? migrateAgentConfig(v as Record<string, unknown>) : v,
      ])
    );

    const isPaulEnabled = pluginConfig.paul_agent?.disabled !== true;
    const builderEnabled =
      pluginConfig.paul_agent?.default_builder_enabled ?? false;
    const replacePlan = pluginConfig.paul_agent?.replace_plan ?? true;

    type AgentConfig = Record<
      string,
      Record<string, unknown> | undefined
    > & {
      build?: Record<string, unknown>;
      plan?: Record<string, unknown>;
      explore?: { tools?: Record<string, unknown> };
      librarian?: { tools?: Record<string, unknown> };
      "multimodal-looker"?: { tools?: Record<string, unknown> };
      "Paul"?: { tools?: Record<string, unknown> };
    };
    const configAgent = config.agent as AgentConfig | undefined;

    const preferOrchestrator = pluginConfig.paul_agent?.prefer_orchestrator ?? false;
    
    if (isPaulEnabled && builtinAgents.Paul) {
      if (preferOrchestrator && builtinAgents["Paul"]) {
        (config as { default_agent?: string }).default_agent = "Paul";
      } else {
        (config as { default_agent?: string }).default_agent = "Paul";
      }

      const agentConfig: Record<string, unknown> = {
        Paul: builtinAgents.Paul,
      };

      agentConfig["Paul-Junior"] = createPaulJuniorAgentWithOverrides(
        pluginConfig.agents?.["Paul-Junior"],
        config.model as string | undefined
      );

      if (builderEnabled) {
        const { name: _buildName, ...buildConfigWithoutName } =
          configAgent?.build ?? {};
        const migratedBuildConfig = migrateAgentConfig(
          buildConfigWithoutName as Record<string, unknown>
        );
        const openCodeBuilderOverride =
          pluginConfig.agents?.["OpenCode-Builder"];
        const openCodeBuilderBase = {
          ...migratedBuildConfig,
          description: `${configAgent?.build?.description ?? "Build agent"} (OpenCode default)`,
        };

        agentConfig["OpenCode-Builder"] = openCodeBuilderOverride
          ? { ...openCodeBuilderBase, ...openCodeBuilderOverride }
          : openCodeBuilderBase;
      }

    const filteredConfigAgents = configAgent
      ? Object.fromEntries(
          Object.entries(configAgent)
            .filter(([key]) => {
              if (key === "build") return false;
              if (key === "plan" && replacePlan) return false;
              return true;
            })
            .map(([key, value]) => [
              key,
              value ? migrateAgentConfig(value as Record<string, unknown>) : value,
            ])
        )
      : {};

      const migratedBuild = configAgent?.build
        ? migrateAgentConfig(configAgent.build as Record<string, unknown>)
        : {};

      const planDemoteConfig = replacePlan
        ? { mode: "subagent" as const }
        : undefined;

       config.agent = {
         ...agentConfig,
         ...Object.fromEntries(
           Object.entries(builtinAgents).filter(([k]) => k !== "Paul")
         ),
         ...userAgents,
         ...projectAgents,
         ...pluginAgents,
         ...filteredConfigAgents,
         build: { ...migratedBuild, mode: "subagent", hidden: true },
         ...(planDemoteConfig ? { plan: planDemoteConfig } : {}),
       };
    } else {
       // Paul disabled - use fallback agents
       if (builtinAgents["planner-paul"]) {
         (config as { default_agent?: string }).default_agent = "planner-paul";
       }
      
      const migratedBuild = configAgent?.build
        ? migrateAgentConfig(configAgent.build as Record<string, unknown>)
        : {};
      
      config.agent = {
        ...builtinAgents,
        ...userAgents,
        ...projectAgents,
        ...pluginAgents,
        ...configAgent,
        build: { ...migratedBuild, mode: "subagent", hidden: true },
        plan: { mode: "subagent" },
      };
    }

    const agentResult = config.agent as AgentConfig;

    config.tools = {
      ...(config.tools as Record<string, unknown>),
      "grep_app_*": false,
      LspHover: false,
      LspCodeActions: false,
      LspCodeActionResolve: false,
    };

    type AgentWithPermission = { permission?: Record<string, unknown> };
    
    if (agentResult.librarian) {
      const agent = agentResult.librarian as AgentWithPermission;
      agent.permission = { ...agent.permission, "grep_app_*": "allow" };
    }
    if (agentResult["multimodal-looker"]) {
      const agent = agentResult["multimodal-looker"] as AgentWithPermission;
      agent.permission = { ...agent.permission, task: "deny", look_at: "deny" };
    }
     if (agentResult["Paul"]) {
       const agent = agentResult["Paul"] as AgentWithPermission;
       agent.permission = { ...agent.permission, task: "deny", call_paul_agent: "allow", delegate_task: "allow" };
     }

    if (agentResult["Paul-Junior"]) {
      const agent = agentResult["Paul-Junior"] as AgentWithPermission;
      agent.permission = { ...agent.permission, delegate_task: "allow" };
    }
     if (agentResult["planner-paul"]) {
      const agent = agentResult["planner-paul"] as AgentWithPermission;
      agent.permission = { ...agent.permission, call_paul_agent: "allow", delegate_task: "allow" };
    }

    config.permission = {
      ...(config.permission as Record<string, unknown>),
      webfetch: "allow",
      external_directory: "allow",
    };

    const mcpResult = (pluginConfig.claude_code?.mcp ?? true)
      ? await loadMcpConfigs()
      : { servers: {} };

    config.mcp = {
      ...(config.mcp as Record<string, unknown>),
      ...createBuiltinMcps(pluginConfig.disabled_mcps),
      ...mcpResult.servers,
      ...pluginComponents.mcpServers,
    };

    const builtinCommands = loadBuiltinCommands(pluginConfig.disabled_commands);
    const systemCommands = (config.command as Record<string, unknown>) ?? {};

    // Parallel loading of all commands and skills for faster startup
    const includeClaudeCommands = pluginConfig.claude_code?.commands ?? true;
    const includeClaudeSkills = pluginConfig.claude_code?.skills ?? true;

    const [
      userCommands,
      projectCommands,
      opencodeGlobalCommands,
      opencodeProjectCommands,
      userSkills,
      projectSkills,
      opencodeGlobalSkills,
      opencodeProjectSkills,
    ] = await Promise.all([
      includeClaudeCommands ? loadUserCommands() : Promise.resolve({}),
      includeClaudeCommands ? loadProjectCommands() : Promise.resolve({}),
      loadOpencodeGlobalCommands(),
      loadOpencodeProjectCommands(),
      includeClaudeSkills ? loadUserSkills() : Promise.resolve({}),
      includeClaudeSkills ? loadProjectSkills() : Promise.resolve({}),
      loadOpencodeGlobalSkills(),
      loadOpencodeProjectSkills(),
    ]);

    config.command = {
      ...builtinCommands,
      ...userCommands,
      ...userSkills,
      ...opencodeGlobalCommands,
      ...opencodeGlobalSkills,
      ...systemCommands,
      ...projectCommands,
      ...projectSkills,
      ...opencodeProjectCommands,
      ...opencodeProjectSkills,
      ...pluginComponents.commands,
      ...pluginComponents.skills,
    };
  };
}
