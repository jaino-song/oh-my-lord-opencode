import { describe, expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

function read(path: string): string {
  return readFileSync(path, "utf8")
}

function listDocsMd(): string[] {
  const dir = "docs"
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(dir, f))
    .sort()
}

function extractHookNamesFromSchema(schemaText: string): string[] {
  const m = schemaText.match(/HookNameSchema\s*=\s*z\.enum\(\[([\s\S]*?)\]\)/)
  if (!m) return []
  const block = m[1]
  return Array.from(block.matchAll(/"([^"]+)"/g)).map((x) => x[1])
}

function extractBuiltinAgentKeys(agentsIndexText: string): string[] {
  const m = agentsIndexText.match(/export const builtinAgents[\s\S]*?= \{([\s\S]*?)\n\}/)
  if (!m) return []
  const block = m[1]
  const keys = Array.from(block.matchAll(/\n\s*("[^"]+"|[A-Za-z0-9_-]+)\s*:/g)).map((x) =>
    x[1].replace(/^"|"$/g, "")
  )
  return Array.from(new Set(keys)).sort()
}

function extractToolKeys(toolsIndexText: string): string[] {
  const m = toolsIndexText.match(/export const builtinTools:[\s\S]*?= \{([\s\S]*?)\n\}/)
  if (!m) return []
  const block = m[1]
  const keys = Array.from(block.matchAll(/\n\s*([a-zA-Z0-9_]+)\s*,?/g)).map((x) => x[1])
  return Array.from(new Set(keys)).sort()
}

describe("docs-sync", () => {
  test("llms.txt lists all docs/*.md", () => {
    const llms = read("llms.txt")
    const docs = listDocsMd()

    for (const doc of docs) {
      expect(llms).toContain(doc)
    }
  })

  test("docs/HOOKS.md covers HookNameSchema", () => {
    const schema = read("src/config/schema.ts")
    const hooks = extractHookNamesFromSchema(schema)
    expect(hooks.length).toBeGreaterThan(0)

    const doc = read("docs/HOOKS.md").toLowerCase()
    for (const h of hooks) {
      expect(doc).toContain(h.toLowerCase())
    }
  })

  test("docs/AGENTS.md covers builtinAgents keys", () => {
    const agentsIndex = read("src/agents/index.ts")
    const keys = extractBuiltinAgentKeys(agentsIndex)
    expect(keys.length).toBeGreaterThan(0)

    const doc = read("docs/AGENTS.md")
    for (const k of keys) {
      expect(doc).toContain(k)
    }
  })

  test("docs/TOOLS.md covers builtinTools keys", () => {
    const toolsIndex = read("src/tools/index.ts")
    const keys = extractToolKeys(toolsIndex)
    expect(keys.length).toBeGreaterThan(0)

    const doc = read("docs/TOOLS.md")
    for (const k of keys) {
      expect(doc).toContain("`" + k + "`")
    }
  })
})
