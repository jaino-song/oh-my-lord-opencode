import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test"

import { ANTIGRAVITY_PROVIDER_CONFIG, getPluginNameWithVersion, fetchNpmDistTags, fetchGitHubLatestVersion, generateOmoConfig } from "./config-manager"
import type { InstallConfig } from "./types"

function mockGitHubReleases(releases: Array<{ tag_name: string; prerelease?: boolean; draft?: boolean }>) {
  globalThis.fetch = mock(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(releases.map(r => ({ tag_name: r.tag_name, prerelease: r.prerelease ?? false, draft: r.draft ?? false }))),
    } as Response)
  ) as unknown as typeof fetch
}

describe("getPluginNameWithVersion", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test("returns @latest when current version matches latest GitHub release", async () => {
    // #given GitHub latest release is v2.14.0
    mockGitHubReleases([{ tag_name: "v2.14.0" }])

    // #when current version is 2.14.0
    const result = await getPluginNameWithVersion("2.14.0")

    // #then should use @latest tag
    expect(result).toBe("oh-my-lord-opencode@latest")
  })

  test("returns pinned version when current version does not match latest", async () => {
    // #given GitHub latest release is v2.14.0
    mockGitHubReleases([{ tag_name: "v2.14.0" }])

    // #when current version is older
    const result = await getPluginNameWithVersion("2.13.0")

    // #then should pin to specific version
    expect(result).toBe("oh-my-lord-opencode@2.13.0")
  })

  test("returns pinned version when fetch fails", async () => {
    // #given network failure
    globalThis.fetch = mock(() => Promise.reject(new Error("Network error"))) as unknown as typeof fetch

    // #when current version is 3.0.0-beta.3
    const result = await getPluginNameWithVersion("3.0.0-beta.3")

    // #then should fall back to pinned version
    expect(result).toBe("oh-my-lord-opencode@3.0.0-beta.3")
  })

  test("returns pinned version when GitHub returns non-ok response", async () => {
    // #given GitHub returns 404
    globalThis.fetch = mock(() =>
      Promise.resolve({ ok: false, status: 404 } as Response)
    ) as unknown as typeof fetch

    // #when current version is 2.14.0
    const result = await getPluginNameWithVersion("2.14.0")

    // #then should fall back to pinned version
    expect(result).toBe("oh-my-lord-opencode@2.14.0")
  })

  test("skips prerelease and draft releases when finding latest", async () => {
    // #given GitHub has prerelease and draft before stable
    mockGitHubReleases([
      { tag_name: "v3.1.0-beta.1", prerelease: true },
      { tag_name: "v3.0.1", draft: true },
      { tag_name: "v3.0.0" },
    ])

    // #when current version is 3.0.0
    const result = await getPluginNameWithVersion("3.0.0")

    // #then should match the stable release
    expect(result).toBe("oh-my-lord-opencode@latest")
  })
})

describe("fetchGitHubLatestVersion", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test("returns latest stable version from GitHub releases", async () => {
    // #given GitHub returns releases
    mockGitHubReleases([
      { tag_name: "v3.0.0-beta.1", prerelease: true },
      { tag_name: "v2.14.0" },
    ])

    // #when fetching latest version
    const result = await fetchGitHubLatestVersion()

    // #then should return the stable version
    expect(result).toBe("2.14.0")
  })

  test("returns null on network failure", async () => {
    // #given network failure
    globalThis.fetch = mock(() => Promise.reject(new Error("Network error"))) as unknown as typeof fetch

    // #when fetching latest version
    const result = await fetchGitHubLatestVersion()

    // #then should return null
    expect(result).toBeNull()
  })

  test("returns null on non-ok response", async () => {
    // #given GitHub returns 403
    globalThis.fetch = mock(() =>
      Promise.resolve({ ok: false, status: 403 } as Response)
    ) as unknown as typeof fetch

    // #when fetching latest version
    const result = await fetchGitHubLatestVersion()

    // #then should return null
    expect(result).toBeNull()
  })
})

describe("fetchNpmDistTags (deprecated shim)", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test("returns latest version wrapped as dist-tags", async () => {
    // #given GitHub latest release is v2.14.0
    mockGitHubReleases([{ tag_name: "v2.14.0" }])

    // #when fetching via deprecated shim
    const result = await fetchNpmDistTags("oh-my-lord-opencode")

    // #then should return { latest: "2.14.0" }
    expect(result).toEqual({ latest: "2.14.0" })
  })

  test("returns null on network failure", async () => {
    // #given network failure
    globalThis.fetch = mock(() => Promise.reject(new Error("Network error"))) as unknown as typeof fetch

    // #when fetching via deprecated shim
    const result = await fetchNpmDistTags("oh-my-lord-opencode")

    // #then should return null
    expect(result).toBeNull()
  })
})

describe("config-manager ANTIGRAVITY_PROVIDER_CONFIG", () => {
  test("Gemini models include full spec (limit + modalities)", () => {
    const google = (ANTIGRAVITY_PROVIDER_CONFIG as any).google
    expect(google).toBeTruthy()

    const models = google.models as Record<string, any>
    expect(models).toBeTruthy()

    const required = [
      "antigravity-gemini-3-pro-high",
      "antigravity-gemini-3-pro-low",
      "antigravity-gemini-3-flash",
    ]

    for (const key of required) {
      const model = models[key]
      expect(model).toBeTruthy()
      expect(typeof model.name).toBe("string")
      expect(model.name.includes("(Antigravity)")).toBe(true)

      expect(model.limit).toBeTruthy()
      expect(typeof model.limit.context).toBe("number")
      expect(typeof model.limit.output).toBe("number")

      expect(model.modalities).toBeTruthy()
      expect(Array.isArray(model.modalities.input)).toBe(true)
      expect(Array.isArray(model.modalities.output)).toBe(true)
    }
  })
})

describe("generateOmoConfig - GitHub Copilot fallback", () => {
  test("frontend-ui-ux-engineer uses Copilot when no native providers", () => {
    // #given user has only Copilot (no Claude, ChatGPT, Gemini)
    const config: InstallConfig = {
      hasClaude: false,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: false,
      hasCopilot: true,
    }

    // #when generating config
    const result = generateOmoConfig(config)

    // #then frontend-ui-ux-engineer should use Copilot Gemini
    const agents = result.agents as Record<string, { model?: string }>
    expect(agents["frontend-ui-ux-engineer"]?.model).toBe("github-copilot/gemini-3-pro-preview")
  })

  test("document-writer uses Copilot when no native providers", () => {
    // #given user has only Copilot
    const config: InstallConfig = {
      hasClaude: false,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: false,
      hasCopilot: true,
    }

    // #when generating config
    const result = generateOmoConfig(config)

    // #then document-writer should use Copilot Gemini Flash
    const agents = result.agents as Record<string, { model?: string }>
    expect(agents["document-writer"]?.model).toBe("github-copilot/gemini-3-flash-preview")
  })

  test("multimodal-looker uses Copilot when no native providers", () => {
    // #given user has only Copilot
    const config: InstallConfig = {
      hasClaude: false,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: false,
      hasCopilot: true,
    }

    // #when generating config
    const result = generateOmoConfig(config)

    // #then multimodal-looker should use Copilot Gemini Flash
    const agents = result.agents as Record<string, { model?: string }>
    expect(agents["multimodal-looker"]?.model).toBe("github-copilot/gemini-3-flash-preview")
  })

  test("explore uses Copilot grok-code when no native providers", () => {
    // #given user has only Copilot
    const config: InstallConfig = {
      hasClaude: false,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: false,
      hasCopilot: true,
    }

    // #when generating config
    const result = generateOmoConfig(config)

    // #then explore should use Copilot Grok
    const agents = result.agents as Record<string, { model?: string }>
    expect(agents["explore"]?.model).toBe("github-copilot/grok-code-fast-1")
  })

  test("native Gemini takes priority over Copilot for frontend-ui-ux-engineer", () => {
    // #given user has both Gemini and Copilot
    const config: InstallConfig = {
      hasClaude: false,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: true,
      hasCopilot: true,
    }

    // #when generating config
    const result = generateOmoConfig(config)

    // #then GPT 5.2 should be used for frontend-ui-ux-engineer
    const agents = result.agents as Record<string, { model?: string }>
    expect(agents["frontend-ui-ux-engineer"]?.model).toBe("openai/gpt-5.2")
  })

  test("native Claude takes priority over Copilot for frontend-ui-ux-engineer", () => {
    // #given user has Claude and Copilot but no Gemini
    const config: InstallConfig = {
      hasClaude: true,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: false,
      hasCopilot: true,
    }

    // #when generating config
    const result = generateOmoConfig(config)

    // #then native Claude should be used (NOT Copilot)
    const agents = result.agents as Record<string, { model?: string }>
    expect(agents["frontend-ui-ux-engineer"]?.model).toBe("anthropic/claude-opus-4-5")
  })

  test("categories use Copilot models when no native Gemini", () => {
    // #given user has Copilot but no Gemini
    const config: InstallConfig = {
      hasClaude: false,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: false,
      hasCopilot: true,
    }

    // #when generating config
    const result = generateOmoConfig(config)

    // #then categories should use Copilot models
    const categories = result.categories as Record<string, { model?: string }>
    expect(categories?.["visual-engineering"]?.model).toBe("github-copilot/gemini-3-pro-preview")
    expect(categories?.["artistry"]?.model).toBe("github-copilot/gemini-3-pro-preview")
    expect(categories?.["writing"]?.model).toBe("github-copilot/gemini-3-flash-preview")
  })
})
