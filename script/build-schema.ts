#!/usr/bin/env bun
/// <reference types="bun-types" />
import * as z from "zod"
import { OhMyOpenCodeConfigSchema } from "../src/config/schema"

const SCHEMA_OUTPUT_PATHS = [
  "assets/oh-my-lord-opencode.schema.json",
  "dist/oh-my-lord-opencode.schema.json",
]

async function main() {
  console.log("Generating JSON Schema...")

  const jsonSchema = z.toJSONSchema(OhMyOpenCodeConfigSchema, {
    io: "input",
    target: "draft-7",
  })

  const finalSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
    title: "Oh My OpenCode Configuration",
    description: "Configuration schema for oh-my-lord-opencode plugin",
    ...jsonSchema,
  }

  await Promise.all(SCHEMA_OUTPUT_PATHS.map((outputPath) => Bun.write(outputPath, JSON.stringify(finalSchema, null, 2))))

  console.log(`✓ JSON Schema generated: ${SCHEMA_OUTPUT_PATHS.join(", ")}`)
}

main()
