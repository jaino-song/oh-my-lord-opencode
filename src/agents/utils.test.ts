import { describe, test, expect } from "bun:test"
import { createBuiltinAgents } from "./utils"
import type { AgentConfig } from "@opencode-ai/sdk"

describe("createBuiltinAgents with model overrides", () => {
  test("Elijah with default model has GPT reasoningEffort", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then
    const elijah = agents["Elijah (Deep Reasoning Advisor)"]
    expect(elijah.model).toBe("openai/gpt-5.3-codex")
    expect(elijah.reasoningEffort).toBe("high")
  })

  test("frontend-ui-ux-engineer uses GPT-5.3 Codex with high reasoning", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then
    const frontend = agents["frontend-ui-ux-engineer"]
    expect(frontend.model).toBe("openai/gpt-5.3-codex")
    expect(frontend.reasoningEffort).toBe("high")
  })

  test("librarian defaults to Gemini 3 Flash", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then
    const librarian = agents["librarian"]
    expect(librarian.model).toBe("google/antigravity-gemini-3-flash")
  })

  test("Paul-Junior uses GPT-5.3 Codex with high reasoning", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then
    const junior = agents["Paul-Junior"]
    expect(junior.model).toBe("openai/gpt-5.3-codex")
    expect(junior.reasoningEffort).toBe("high")
  })

  test("Ezra defaults to xhigh variant", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then
    const ezra = agents["Ezra (Plan Reviewer)"]
    expect(ezra.variant).toBe("xhigh")
  })

  test("Thomas defaults to GLM 4.7", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then
    const thomas = agents["Thomas (TDD Plan Consultant)"]
    expect(thomas.model).toBe("zai-coding-plan/glm-4.7")
  })

})

describe("buildAgent with skills", () => {
  const { buildAgent } = require("./utils")

  test("agent with skills has content prepended to prompt", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["frontend-ui-ux"],
          prompt: "Original prompt content",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.prompt).toContain("Role: Designer-Turned-Developer")
    expect(agent.prompt).toContain("Original prompt content")
    expect(agent.prompt).toMatch(/Designer-Turned-Developer[\s\S]*Original prompt content/s)
  })

  test("agent with multiple skills has all content prepended", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["frontend-ui-ux"],
          prompt: "Agent prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.prompt).toContain("Role: Designer-Turned-Developer")
    expect(agent.prompt).toContain("Agent prompt")
  })

  test("agent without skills works as before", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          model: "custom/model",
          temperature: 0.5,
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.model).toBe("custom/model")
    expect(agent.temperature).toBe(0.5)
    expect(agent.prompt).toBe("Base prompt")
  })

  test("agent with non-existent skills only prepends found ones", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["frontend-ui-ux", "non-existent-skill"],
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.prompt).toContain("Role: Designer-Turned-Developer")
    expect(agent.prompt).toContain("Base prompt")
  })

  test("agent with empty skills array keeps original prompt", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: [],
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.prompt).toBe("Base prompt")
  })
})
