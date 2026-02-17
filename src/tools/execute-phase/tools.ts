import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import yaml from "js-yaml"
import { z } from "zod"
import type {
  ContractAcceptanceSpec,
  ExecutePhaseArgs,
  MachineReadableContract,
  MachineReadableContractSpec,
  PhaseInfo,
  PhaseTodo,
  PhaseResult,
} from "./types"
import { EXECUTE_PHASE_DESCRIPTION } from "./constants"
import type { BackgroundManager } from "../../features/background-agent"
import { log } from "../../shared/logger"
import { parseJsoncSafe } from "../../shared/jsonc-parser"
import { resolveMultipleSkillsAsync } from "../../features/opencode-skill-loader/skill-content"
import { getActivePlan } from "../../shared/plan-utils"
import { extractLatestAssistantText, pollSessionReliability, type PollSessionResult } from "../shared/delegation-reliability"

type OpencodeClient = PluginInput["client"]

interface Todo {
  id: string
  content: string
  status: string
  priority: string
}

interface SessionMessagePart {
  type?: string
  name?: string
  tool?: string
  text?: string
  input?: Record<string, unknown>
  state?: { input?: Record<string, unknown> }
}

interface SessionMessage {
  info?: { role?: string }
  parts?: SessionMessagePart[]
}

interface GitChangeSnapshot {
  changedFiles: Set<string>
}

type FrontendConformanceMode = "strict" | "normal" | "off"

const PHASE_MARKER_REGEX = /^\[P(\d+)\]\s*===\s*PHASE\s+\d+:\s*(.+?)\s*\((Parallel|Sequential)\)\s*===$/i
const TASK_REGEX = /^\[P(\d+)\.(\d+)\]\s*(.+)$/i
const AGENT_METADATA_REGEX = /\(Agent:\s*([^)]+)\)/i
const SKILLS_METADATA_REGEX = /\((?:Skills|Required Skills):\s*([^)]+)\)/i
const CONTRACTS_METADATA_REGEX = /\((?:Contracts|Contract Refs):\s*([^)]+)\)/i
const FILES_METADATA_REGEX = /\((?:Files|File Refs):\s*([^)]+)\)/i
const TODO_IDS_METADATA_REGEX = /\((?:TODO-IDs|TODO IDs|Todo IDs):\s*([^)]+)\)/i
const FILE_CONTRACTS_SECTION_REGEX = /###\s+File Contracts\s*([\s\S]*?)(?=\n###\s+|\n##\s+|$)/i
const CONTRACT_HEADING_REGEX = /^####\s+([^\n]+)$/gm
const MACHINE_CONTRACT_BLOCK_REGEX = /```(json|jsonc|yaml|yml)\s*\n([\s\S]*?)\n```/gi
const MACHINE_SCHEMA_VERSION = "contracts-v1"

const UI_HINT_REGEX = /\b(css|tailwind|style|styles|color|colors|background|border|margin|padding|flex|grid|animation|transition|responsive|mobile|layout|spacing|font|hover|shadow|ui|ux|component|components|tsx|jsx)\b/i
const GIT_HINT_REGEX = /\b(git|commit|rebase|squash|branch|merge|checkout|push|pull|cherry-pick|cherrypick|stash|tag)\b/i
const FRONTEND_FILE_REGEX = /\.(tsx|jsx|css|scss|sass|less)$/i
const TAILWIND_ANIMATION_REGEX = /\banimate-[a-z0-9-]+\b/i
const DATA_COMPONENT_ATTR_REGEX = /data-component\s*=\s*"([a-z0-9-]+)"/gi
const DATA_COMPONENT_LAYERED_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+){1,}$/
const SPACING_TOKEN_REGEX = /\bp-(\d+)\b/g
const RADIUS_TOKEN_REGEX = /\brounded(?:-([a-z0-9-]+))?\b/g

const ContractPatternCheckSchema = z.object({
  file: z.string().min(1),
  regex: z.string().min(1),
  description: z.string().min(1).optional(),
}).strict()

const ContractAcceptanceSchema = z.object({
  requiredFilesExist: z.array(z.string().min(1)).optional(),
  requiredPatterns: z.array(ContractPatternCheckSchema).optional(),
  forbiddenPatterns: z.array(ContractPatternCheckSchema).optional(),
  requireTodoIdsResolved: z.boolean().optional(),
  frontendConformance: z.boolean().optional(),
}).strict()

const MachineReadableContractSchema = z.object({
  id: z.string().min(1),
  files: z.array(z.string().min(1)).optional(),
  todoIds: z.array(z.string().min(1)).optional(),
  skills: z.array(z.string().min(1)).optional(),
  acceptance: ContractAcceptanceSchema.optional(),
}).strict()

const MachineReadableContractSpecSchema = z.object({
  schemaVersion: z.literal(MACHINE_SCHEMA_VERSION),
  contracts: z.array(MachineReadableContractSchema).min(1),
}).strict()

function parsePhaseMarker(content: string): { phase: number; title: string; mode: "parallel" | "sequential" } | null {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()
  const match = cleaned.match(PHASE_MARKER_REGEX)
  if (!match) return null
  return {
    phase: parseInt(match[1], 10),
    title: match[2].trim(),
    mode: match[3].toLowerCase() as "parallel" | "sequential",
  }
}

function parseTask(content: string): { phase: number; taskNum: string; description: string; agent?: string } | null {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()
  const match = cleaned.match(TASK_REGEX)
  if (!match) return null
  const metadataSegment = match[3].trim()
  const agentMatch = metadataSegment.match(AGENT_METADATA_REGEX)
  const description = metadataSegment
    .replace(AGENT_METADATA_REGEX, "")
    .replace(SKILLS_METADATA_REGEX, "")
    .replace(CONTRACTS_METADATA_REGEX, "")
    .replace(FILES_METADATA_REGEX, "")
    .replace(TODO_IDS_METADATA_REGEX, "")
    .replace(/\s{2,}/g, " ")
    .trim()
  return {
    phase: parseInt(match[1], 10),
    taskNum: `${match[1]}.${match[2]}`,
    description,
    agent: agentMatch?.[1]?.trim(),
  }
}

function normalizeCsvMetadata(raw: string): string[] {
  const stripped = raw.replace(/[`\[\]]/g, "").trim()
  if (!stripped) return []
  if (/^(none|n\/a|null)$/i.test(stripped)) return []
  return stripped
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export type ExecutePhasePollClassification = "success" | "retryable_failure" | "terminal_failure" | "cancelled"

export function classifyPollResultForExecutePhase(status: PollSessionResult["status"]): ExecutePhasePollClassification {
  if (status === "signal_done") return "success"
  if (status === "aborted") return "cancelled"
  if (status === "checkpoint_idle" || status === "no_progress_timeout" || status === "max_wait") {
    return "retryable_failure"
  }
  return "terminal_failure"
}

export function extractRequiredSkillsFromTodoContent(content: string): string[] | undefined {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()
  const match = cleaned.match(SKILLS_METADATA_REGEX)
  if (!match) return undefined
  return normalizeCsvMetadata(match[1])
}

export function extractContractRefsFromTodoContent(content: string): string[] | undefined {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()
  const match = cleaned.match(CONTRACTS_METADATA_REGEX)
  if (!match) return undefined
  return normalizeCsvMetadata(match[1]).map((id) => id.toUpperCase())
}

export function extractFileRefsFromTodoContent(content: string): string[] | undefined {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()
  const match = cleaned.match(FILES_METADATA_REGEX)
  if (!match) return undefined
  return normalizeCsvMetadata(match[1])
}

export function extractTodoAnchorIdsFromTodoContent(content: string): string[] | undefined {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()
  const match = cleaned.match(TODO_IDS_METADATA_REGEX)
  if (!match) return undefined
  return normalizeCsvMetadata(match[1]).map((id) => id.toUpperCase())
}

export function inferAgentFromTodoContent(content: string): string {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()

  if (GIT_HINT_REGEX.test(cleaned)) {
    return "git-master"
  }

  if (UI_HINT_REGEX.test(cleaned)) {
    return "frontend-ui-ux-engineer"
  }

  return "Paul-Junior"
}

function resolveAgent(todo: PhaseTodo): string {
  const hint = todo.agentHint?.trim()
  if (hint) {
    return hint
  }
  return inferAgentFromTodoContent(todo.content)
}

function extractPhaseInfo(todos: Todo[], targetPhase: number): PhaseInfo | null {
  let phaseTitle = `Phase ${targetPhase}`
  let phaseMode: "parallel" | "sequential" = "sequential"
  const phaseTodos: PhaseTodo[] = []

  for (const todo of todos) {
    if (!todo.content.toLowerCase().startsWith("exec::")) continue

    const marker = parsePhaseMarker(todo.content)
    if (marker && marker.phase === targetPhase) {
      phaseTitle = marker.title
      phaseMode = marker.mode
      continue
    }

    const task = parseTask(todo.content)
    if (task && task.phase === targetPhase) {
      phaseTodos.push({
        id: todo.id,
        content: todo.content,
        taskNumber: task.taskNum,
        agentHint: task.agent,
        requiredSkills: extractRequiredSkillsFromTodoContent(todo.content),
        contractRefs: extractContractRefsFromTodoContent(todo.content),
        fileRefs: extractFileRefsFromTodoContent(todo.content),
        todoAnchorIds: extractTodoAnchorIdsFromTodoContent(todo.content),
        status: todo.status,
      })
    }
  }

  if (phaseTodos.length === 0) return null

  return {
    phase: targetPhase,
    title: phaseTitle,
    mode: phaseMode,
    todos: phaseTodos,
  }
}

function buildTaskPrompt(todo: PhaseTodo, contractContext?: string): string {
  let prompt = `Execute task [P${todo.taskNumber}]:

${todo.content}

`

  if (contractContext) {
    prompt += `Authoritative plan contract context (follow strictly):

${contractContext}

`
  }

  if (todo.fileRefs && todo.fileRefs.length > 0) {
    prompt += `Allowed file scope: ${todo.fileRefs.join(", ")}

`
  }

  if (todo.todoAnchorIds && todo.todoAnchorIds.length > 0) {
    prompt += `TODO anchors that must be resolved before signal_done: ${todo.todoAnchorIds.join(", ")}

`
  }

  prompt += `Complete this task and call signal_done when finished.`

  return prompt
}

interface PlanContractIndex {
  planPath: string
  contracts: Map<string, string>
  machineContracts: Map<string, MachineReadableContract>
  machineContractErrors: string[]
  source: "machine" | "markdown" | "hybrid"
}

interface ContractPromptResolution {
  content?: string
  error?: string
}

interface PreflightValidationResult {
  ok: boolean
  details: string[]
}

interface MachineReadableContractParseResult {
  spec?: MachineReadableContractSpec
  errors: string[]
  candidateFound: boolean
}

function extractContractIdFromBlock(block: string): string | undefined {
  const headingMatch = block.match(/^####\s+([^\n]+)$/m)
  if (headingMatch) {
    const firstToken = headingMatch[1].trim().split(/\s+/)[0]
    const normalized = firstToken.replace(/[`:\[\]()]/g, "").toUpperCase()
    if (/^[A-Z0-9._-]+$/.test(normalized)) {
      return normalized
    }
  }

  const idMatch = block.match(/(?:Contract\s+ID|ID)\s*:\s*`?([A-Za-z0-9._-]+)`?/i)
  if (idMatch) {
    return idMatch[1].toUpperCase()
  }

  return undefined
}

export function parsePlanContractBlocks(planContent: string): Map<string, string> {
  const contracts = new Map<string, string>()
  const sectionMatch = planContent.match(FILE_CONTRACTS_SECTION_REGEX)
  if (!sectionMatch) {
    return contracts
  }

  const section = sectionMatch[1]
  const headings = Array.from(section.matchAll(CONTRACT_HEADING_REGEX))
  if (headings.length === 0) {
    return contracts
  }

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i]
    const start = current.index ?? 0
    const end = i + 1 < headings.length ? (headings[i + 1].index ?? section.length) : section.length
    const block = section.slice(start, end).trim()
    const contractId = extractContractIdFromBlock(block)
    if (!contractId) continue
    contracts.set(contractId, block)
  }

  return contracts
}

function parseMachineContractBlock(language: string, rawBlock: string): { value?: unknown; parseError?: string } {
  if (language === "yaml" || language === "yml") {
    try {
      return { value: yaml.load(rawBlock, { schema: yaml.JSON_SCHEMA }) }
    } catch (error) {
      return { parseError: error instanceof Error ? error.message : String(error) }
    }
  }

  const parsedJson = parseJsoncSafe<unknown>(rawBlock)
  if (parsedJson.errors.length > 0 || parsedJson.data === null) {
    const message = parsedJson.errors.map((e) => e.message).join(", ")
    return { parseError: message || "JSON parse error" }
  }

  return { value: parsedJson.data }
}

function formatSchemaIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)"
    return `${path}: ${issue.message}`
  })
}

export function parseMachineReadableContractSpecWithValidation(planContent: string): MachineReadableContractParseResult {
  const errors: string[] = []
  let candidateFound = false

  const matches = planContent.matchAll(MACHINE_CONTRACT_BLOCK_REGEX)
  for (const match of matches) {
    const language = (match[1] ?? "json").toLowerCase()
    const rawBlock = match[2]?.trim()
    if (!rawBlock) continue

    const parsed = parseMachineContractBlock(language, rawBlock)
    if (parsed.parseError) {
      if (/schemaVersion|contracts/i.test(rawBlock)) {
        candidateFound = true
        errors.push(`Machine contract block parse error (${language}): ${parsed.parseError}`)
      }
      continue
    }

    if (!parsed.value || typeof parsed.value !== "object") {
      continue
    }

    const record = parsed.value as Record<string, unknown>
    if (!("schemaVersion" in record) && !("contracts" in record)) {
      continue
    }

    candidateFound = true
    const validation = MachineReadableContractSpecSchema.safeParse(parsed.value)
    if (validation.success) {
      return {
        spec: validation.data as MachineReadableContractSpec,
        errors: [],
        candidateFound: true,
      }
    }

    errors.push(...formatSchemaIssues(validation.error).map((issue) => `Machine contract schema error (${language}): ${issue}`))
  }

  return {
    spec: undefined,
    errors,
    candidateFound,
  }
}

export function parseMachineReadableContractSpec(planContent: string): MachineReadableContractSpec | undefined {
  return parseMachineReadableContractSpecWithValidation(planContent).spec
}

export function lintContractsV1PlanContent(planContent: string): string[] {
  const parseResult = parseMachineReadableContractSpecWithValidation(planContent)
  if (!parseResult.candidateFound) {
    return []
  }

  const errors = [...parseResult.errors]
  if (!parseResult.spec) {
    return errors
  }

  const machineContracts = machineContractMap(parseResult.spec)
  for (const [contractId, contract] of machineContracts.entries()) {
    errors.push(...validateMachineContractShape(contract, contractId))
  }

  return errors
}

function normalizeContractId(id: string): string {
  return id.trim().replace(/[`]/g, "").toUpperCase()
}

function machineContractMap(spec: MachineReadableContractSpec | undefined): Map<string, MachineReadableContract> {
  const map = new Map<string, MachineReadableContract>()
  if (!spec) return map
  for (const contract of spec.contracts) {
    if (!contract?.id) continue
    map.set(normalizeContractId(contract.id), contract)
  }
  return map
}

function normalizeFileRefs(fileRefs: string[] | undefined): string[] {
  return (fileRefs ?? []).map((f) => f.trim()).filter(Boolean)
}

function validateMachineContractShape(contract: MachineReadableContract, contractId: string): string[] {
  const errors: string[] = []
  const files = normalizeFileRefs(contract.files)
  const todoIds = (contract.todoIds ?? []).map((id) => normalizeContractId(id)).filter(Boolean)

  if (files.length === 0) {
    errors.push(`Contract ${contractId} has no files in machine-readable spec.`)
  }

  for (const todoId of todoIds) {
    if (!/^TD-[A-Z0-9._-]+$/.test(todoId)) {
      errors.push(`Contract ${contractId} has invalid TODO ID format: ${todoId}`)
    }
  }

  if (contract.acceptance) {
    const acceptance = contract.acceptance
    const validatePatternList = (patterns: ContractAcceptanceSpec["requiredPatterns"], field: string) => {
      for (const pattern of patterns ?? []) {
        if (!pattern.file || !pattern.regex) {
          errors.push(`Contract ${contractId} ${field} entries must include file and regex.`)
          continue
        }
        try {
          // validate regex shape
          // eslint-disable-next-line no-new
          new RegExp(pattern.regex)
        } catch {
          errors.push(`Contract ${contractId} has invalid regex in ${field}: ${pattern.regex}`)
        }
      }
    }
    validatePatternList(acceptance.requiredPatterns, "requiredPatterns")
    validatePatternList(acceptance.forbiddenPatterns, "forbiddenPatterns")
  }

  return errors
}

function loadActivePlanContractIndex(workspaceRoot: string): PlanContractIndex | undefined {
  const planPath = getActivePlan(workspaceRoot)
  if (!planPath || !existsSync(planPath)) {
    return undefined
  }

  try {
    const planContent = readFileSync(planPath, "utf8")
    const markdownContracts = parsePlanContractBlocks(planContent)
    const machineParse = parseMachineReadableContractSpecWithValidation(planContent)
    const machineSpec = machineParse.spec
    const machineContracts = machineContractMap(machineSpec)
    const source: PlanContractIndex["source"] = machineContracts.size > 0 && markdownContracts.size > 0
      ? "hybrid"
      : (machineContracts.size > 0 ? "machine" : "markdown")

    const contracts = new Map<string, string>(markdownContracts)
    for (const [contractId, contract] of machineContracts.entries()) {
      const preview = [
        `#### ${contractId}`,
        `**Files**: ${(contract.files ?? []).join(", ") || "none"}`,
        `**TODO IDs**: ${(contract.todoIds ?? []).join(", ") || "none"}`,
      ].join("\n")
      contracts.set(contractId, preview)
    }

    return {
      planPath,
      contracts,
      machineContracts,
      machineContractErrors: machineParse.errors,
      source,
    }
  } catch (error) {
    log("[execute_phase] Failed to read active plan contracts", {
      planPath,
      error: error instanceof Error ? error.message : String(error),
    })
    return undefined
  }
}

function resolveContractPrompt(todo: PhaseTodo, planContractIndex?: PlanContractIndex): ContractPromptResolution {
  const refs = todo.contractRefs
  if (!refs || refs.length === 0) {
    return {}
  }

  if (!planContractIndex) {
    return {
      error: "❌ Contract refs provided but no active plan file was found to resolve them.",
    }
  }

  const missingRefs: string[] = []
  const blocks: string[] = []
  const seen = new Set<string>()

  for (const ref of refs) {
    const normalizedRef = ref.toUpperCase()
    if (seen.has(normalizedRef)) continue
    seen.add(normalizedRef)
    const machineContract = planContractIndex.machineContracts.get(normalizedRef)
    const block = machineContract
      ? [
          `#### ${normalizedRef}`,
          `Machine-readable contract (contracts-v1):`,
          "```json",
          JSON.stringify(machineContract, null, 2),
          "```",
        ].join("\n")
      : planContractIndex.contracts.get(normalizedRef)
    if (!block) {
      missingRefs.push(normalizedRef)
      continue
    }
    blocks.push(block)
  }

  if (missingRefs.length > 0) {
    return {
      error: `❌ Contract refs not found in active plan: ${missingRefs.join(", ")}`,
    }
  }

  return {
    content: `Plan: ${planContractIndex.planPath}\nContract source: ${planContractIndex.source}\n\n${blocks.join("\n\n")}`,
  }
}

function resolveWorkspacePath(workspaceRoot: string, fileRef: string): string {
  const normalized = fileRef.replace(/[`]/g, "").trim()
  return isAbsolute(normalized) ? normalized : join(workspaceRoot, normalized)
}

function validateTodoAnchors(todo: PhaseTodo, workspaceRoot: string): { ok: boolean; details: string[] } | null {
  const anchorIds = todo.todoAnchorIds
  if (!anchorIds || anchorIds.length === 0) {
    return null
  }

  const fileRefs = todo.fileRefs
  if (!fileRefs || fileRefs.length === 0) {
    return {
      ok: false,
      details: ["TODO-IDs metadata exists but Files metadata is empty."],
    }
  }

  const unresolved: string[] = []
  const normalizedAnchors = anchorIds.map((id) => id.toUpperCase())

  for (const fileRef of fileRefs) {
    const absolutePath = resolveWorkspacePath(workspaceRoot, fileRef)
    if (!existsSync(absolutePath)) {
      unresolved.push(`Missing file: ${fileRef}`)
      continue
    }

    let fileContent = ""
    try {
      fileContent = readFileSync(absolutePath, "utf8")
    } catch (error) {
      unresolved.push(`Could not read file ${fileRef}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    const lines = fileContent.split("\n")
    for (const anchorId of normalizedAnchors) {
      const unresolvedLineIndex = lines.findIndex(
        (line) => /\b(?:TODO|FIXME)\b/i.test(line) && line.toUpperCase().includes(anchorId)
      )
      if (unresolvedLineIndex >= 0) {
        unresolved.push(`${fileRef}:${unresolvedLineIndex + 1} still contains TODO anchor ${anchorId}`)
      }
    }
  }

  return {
    ok: unresolved.length === 0,
    details: unresolved,
  }
}

function validateTodoMetadataPresence(todo: PhaseTodo): string[] {
  const errors: string[] = []
  if (todo.requiredSkills === undefined) {
    errors.push(`[P${todo.taskNumber}] missing Skills metadata`)
  }
  if (todo.contractRefs === undefined) {
    errors.push(`[P${todo.taskNumber}] missing Contracts metadata`)
  }
  if (todo.fileRefs === undefined) {
    errors.push(`[P${todo.taskNumber}] missing Files metadata`)
  }
  if (todo.todoAnchorIds === undefined) {
    errors.push(`[P${todo.taskNumber}] missing TODO-IDs metadata`)
  }
  return errors
}

function validatePhasePreflight(
  phaseTodos: PhaseTodo[],
  planContractIndex: PlanContractIndex | undefined,
  workspaceRoot: string
): PreflightValidationResult {
  const details: string[] = []

  if (planContractIndex?.machineContractErrors.length) {
    details.push(...planContractIndex.machineContractErrors)
  }

  if (!planContractIndex && phaseTodos.some((todo) => (todo.contractRefs?.length ?? 0) > 0)) {
    details.push("Active plan file is required to resolve contract refs but was not found.")
  }

  const knownContractIds = new Set<string>([
    ...(planContractIndex ? Array.from(planContractIndex.contracts.keys()) : []),
    ...(planContractIndex ? Array.from(planContractIndex.machineContracts.keys()) : []),
  ])

  for (const todo of phaseTodos) {
    details.push(...validateTodoMetadataPresence(todo))

    for (const fileRef of todo.fileRefs ?? []) {
      if (!fileRef.trim()) {
        details.push(`[P${todo.taskNumber}] has empty file reference.`)
      }
    }

    for (const todoId of todo.todoAnchorIds ?? []) {
      if (!/^TD-[A-Z0-9._-]+$/.test(todoId)) {
        details.push(`[P${todo.taskNumber}] invalid TODO ID format: ${todoId}`)
      }
    }

    for (const contractId of todo.contractRefs ?? []) {
      const normalized = normalizeContractId(contractId)
      if (!knownContractIds.has(normalized)) {
        details.push(`[P${todo.taskNumber}] references unknown contract: ${normalized}`)
      }
      const machineContract = planContractIndex?.machineContracts.get(normalized)
      if (machineContract) {
        details.push(...validateMachineContractShape(machineContract, normalized))
      }
    }

    if ((todo.todoAnchorIds?.length ?? 0) > 0 && (todo.fileRefs?.length ?? 0) === 0) {
      details.push(`[P${todo.taskNumber}] has TODO-IDs but no Files metadata.`)
    }

    for (const fileRef of todo.fileRefs ?? []) {
      const absolute = resolveWorkspacePath(workspaceRoot, fileRef)
      if (!existsSync(absolute) && !todo.content.toLowerCase().includes("create") && !todo.content.toLowerCase().includes("add")) {
        details.push(`[P${todo.taskNumber}] file does not exist and task is not clearly creating it: ${fileRef}`)
      }
    }
  }

  return {
    ok: details.length === 0,
    details,
  }
}

function extractTouchedFilesFromMessages(messages: SessionMessage[], workspaceRoot: string): string[] {
  const touched = new Set<string>()
  const FILE_TOOLS = new Set(["mcp_write", "mcp_edit", "write", "edit", "apply_patch"])

  for (const message of messages) {
    for (const part of message.parts ?? []) {
      const toolName = (part.name ?? part.tool ?? "").toLowerCase()
      if (!FILE_TOOLS.has(toolName)) continue
      const input = (part.input ?? part.state?.input ?? {}) as Record<string, unknown>
      const candidates = [input.filePath, input.path, input.file]
      for (const candidate of candidates) {
        if (typeof candidate !== "string") continue
        const absolute = resolveWorkspacePath(workspaceRoot, candidate)
        const relative = absolute.startsWith(workspaceRoot) ? absolute.slice(workspaceRoot.length + 1) : absolute
        touched.add(relative)
      }
    }
  }

  return Array.from(touched)
}

async function runGitDiffNameOnly(workspaceRoot: string): Promise<string[]> {
  try {
    const proc = Bun.spawn(["git", "diff", "--name-only", "--relative"], {
      cwd: workspaceRoot,
      stdout: "pipe",
      stderr: "pipe",
    })
    const stdout = await new Response(proc.stdout).text()
    await proc.exited
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

async function runGitDiffCachedNameOnly(workspaceRoot: string): Promise<string[]> {
  try {
    const proc = Bun.spawn(["git", "diff", "--cached", "--name-only", "--relative"], {
      cwd: workspaceRoot,
      stdout: "pipe",
      stderr: "pipe",
    })
    const stdout = await new Response(proc.stdout).text()
    await proc.exited
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

async function runGitUntrackedNameOnly(workspaceRoot: string): Promise<string[]> {
  try {
    const proc = Bun.spawn(["git", "ls-files", "--others", "--exclude-standard"], {
      cwd: workspaceRoot,
      stdout: "pipe",
      stderr: "pipe",
    })
    const stdout = await new Response(proc.stdout).text()
    await proc.exited
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

async function captureGitChangeSnapshot(workspaceRoot: string): Promise<GitChangeSnapshot | undefined> {
  const [unstaged, staged, untracked] = await Promise.all([
    runGitDiffNameOnly(workspaceRoot),
    runGitDiffCachedNameOnly(workspaceRoot),
    runGitUntrackedNameOnly(workspaceRoot),
  ])

  const changedFiles = new Set<string>([...unstaged, ...staged, ...untracked])
  if (changedFiles.size === 0) {
    return { changedFiles }
  }

  return {
    changedFiles: new Set(Array.from(changedFiles).map((f) => f.replace(/^\.\//, ""))),
  }
}

function computeGitIntroducedFiles(
  before: GitChangeSnapshot | undefined,
  after: GitChangeSnapshot | undefined
): string[] {
  if (!after) return []
  const beforeSet = before?.changedFiles ?? new Set<string>()
  return Array.from(after.changedFiles).filter((filePath) => !beforeSet.has(filePath))
}

async function extractTouchedFilesWithGitFallback(
  messages: SessionMessage[],
  workspaceRoot: string,
  beforeSnapshot: GitChangeSnapshot | undefined
): Promise<string[]> {
  const messageTouched = extractTouchedFilesFromMessages(messages, workspaceRoot)
  const afterSnapshot = await captureGitChangeSnapshot(workspaceRoot)
  const introducedByGit = computeGitIntroducedFiles(beforeSnapshot, afterSnapshot)
  const merged = new Set<string>([
    ...messageTouched.map((f) => f.replace(/^\.\//, "")),
    ...introducedByGit.map((f) => f.replace(/^\.\//, "")),
  ])
  return Array.from(merged)
}

function validateFileScope(todo: PhaseTodo, touchedFiles: string[]): { ok: boolean; details: string[] } | null {
  const allowedRefs = (todo.fileRefs ?? []).map((f) => f.replace(/^\.\//, "").trim()).filter(Boolean)
  if (allowedRefs.length === 0) return null

  const outOfScope = touchedFiles.filter((f) => {
    const normalized = f.replace(/^\.\//, "")
    return !allowedRefs.some((allowed) => normalized === allowed || normalized.endsWith(`/${allowed}`))
  })

  return {
    ok: outOfScope.length === 0,
    details: outOfScope.map((f) => `[P${todo.taskNumber}] modified file outside scope: ${f}`),
  }
}

function readFileSafe(filePath: string): string | undefined {
  try {
    return readFileSync(filePath, "utf8")
  } catch {
    return undefined
  }
}

function runAcceptanceChecks(
  todo: PhaseTodo,
  planContractIndex: PlanContractIndex | undefined,
  workspaceRoot: string,
  frontendConformanceMode: FrontendConformanceMode
): { ok: boolean; details: string[] } {
  const details: string[] = []
  const refs = todo.contractRefs ?? []

  for (const rawRef of refs) {
    const ref = normalizeContractId(rawRef)
    const machineContract = planContractIndex?.machineContracts.get(ref)
    const acceptance = machineContract?.acceptance
    if (!acceptance) continue

    for (const requiredFile of acceptance.requiredFilesExist ?? []) {
      const absolute = resolveWorkspacePath(workspaceRoot, requiredFile)
      if (!existsSync(absolute)) {
        details.push(`[P${todo.taskNumber}] acceptance failed (${ref}): missing required file ${requiredFile}`)
      }
    }

    const checkPatternList = (
      patterns: ContractAcceptanceSpec["requiredPatterns"],
      mode: "required" | "forbidden"
    ) => {
      for (const patternCheck of patterns ?? []) {
        const absolute = resolveWorkspacePath(workspaceRoot, patternCheck.file)
        const content = readFileSafe(absolute)
        if (content === undefined) {
          details.push(`[P${todo.taskNumber}] acceptance failed (${ref}): file not readable ${patternCheck.file}`)
          continue
        }
        let regex: RegExp
        try {
          regex = new RegExp(patternCheck.regex, "m")
        } catch {
          details.push(`[P${todo.taskNumber}] acceptance invalid regex (${ref}): ${patternCheck.regex}`)
          continue
        }
        const matched = regex.test(content)
        if (mode === "required" && !matched) {
          details.push(`[P${todo.taskNumber}] acceptance failed (${ref}): missing pattern ${patternCheck.regex} in ${patternCheck.file}`)
        }
        if (mode === "forbidden" && matched) {
          details.push(`[P${todo.taskNumber}] acceptance failed (${ref}): forbidden pattern ${patternCheck.regex} found in ${patternCheck.file}`)
        }
      }
    }

    checkPatternList(acceptance.requiredPatterns, "required")
    checkPatternList(acceptance.forbiddenPatterns, "forbidden")

    if (acceptance.requireTodoIdsResolved !== false) {
      const anchorValidation = validateTodoAnchors(todo, workspaceRoot)
      if (anchorValidation && !anchorValidation.ok) {
        details.push(...anchorValidation.details.map((d) => `[P${todo.taskNumber}] acceptance failed (${ref}): ${d}`))
      }
    }

    if (frontendConformanceMode !== "off" && acceptance.frontendConformance) {
      const frontendValidation = validateFrontendConformance(todo, workspaceRoot)
      if (!frontendValidation.ok) {
        details.push(...frontendValidation.details.map((d) => `[P${todo.taskNumber}] frontend conformance failed (${ref}): ${d}`))
      }
    }
  }

  return {
    ok: details.length === 0,
    details,
  }
}

function validateFrontendConformance(todo: PhaseTodo, workspaceRoot: string): { ok: boolean; details: string[] } {
  const details: string[] = []
  const scopedFiles = (todo.fileRefs ?? []).filter((f) => FRONTEND_FILE_REGEX.test(f))
  if (scopedFiles.length === 0) {
    return { ok: true, details }
  }

  let spacingTokenBaseline: string | undefined
  let radiusTokenBaseline: string | undefined

  for (const scoped of scopedFiles) {
    const absolute = resolveWorkspacePath(workspaceRoot, scoped)
    const content = readFileSafe(absolute)
    if (!content) continue

    if (TAILWIND_ANIMATION_REGEX.test(content)) {
      details.push(`${scoped} contains Tailwind animation utility classes (animate-*). Use CSS animations instead.`)
    }

    const dataComponents = Array.from(content.matchAll(DATA_COMPONENT_ATTR_REGEX)).map((m) => m[1])
    if (dataComponents.length === 0) {
      details.push(`${scoped} has no data-component attributes.`)
    } else {
      for (const value of dataComponents) {
        if (!DATA_COMPONENT_LAYERED_REGEX.test(value)) {
          details.push(`${scoped} has non-layered data-component value: ${value}`)
        }
      }
    }

    const spacingTokens = Array.from(content.matchAll(SPACING_TOKEN_REGEX)).map((m) => m[1])
    for (const token of spacingTokens) {
      if (!spacingTokenBaseline) spacingTokenBaseline = token
      if (spacingTokenBaseline && token !== spacingTokenBaseline) {
        details.push(`${scoped} uses inconsistent spacing tokens (p-${spacingTokenBaseline} vs p-${token}).`)
        break
      }
    }

    const radiusTokens = Array.from(content.matchAll(RADIUS_TOKEN_REGEX)).map((m) => m[1] ?? "DEFAULT")
    for (const token of radiusTokens) {
      if (!radiusTokenBaseline) radiusTokenBaseline = token
      if (radiusTokenBaseline && token !== radiusTokenBaseline) {
        details.push(`${scoped} uses inconsistent radius tokens (rounded-${radiusTokenBaseline} vs rounded-${token}).`)
        break
      }
    }

    const isDataDriven = /\b(fetch|query|usequery|axios|loading)\b/i.test(content)
    const hasSkeleton = /\bSkeleton\b|\bskeleton\b/.test(content)
    if (isDataDriven && !hasSkeleton) {
      details.push(`${scoped} appears data-driven but has no skeleton marker.`)
    }
  }

  return {
    ok: details.length === 0,
    details,
  }
}

function shouldRunAutomaticFrontendConformance(todo: PhaseTodo): boolean {
  if ((todo.fileRefs ?? []).some((f) => FRONTEND_FILE_REGEX.test(f))) {
    return true
  }
  const agentHint = (todo.agentHint ?? "").toLowerCase()
  if (agentHint.includes("frontend-ui-ux")) {
    return true
  }
  return UI_HINT_REGEX.test(todo.content)
}

function summarizeSkillContent(content: string): string {
  // Skills are intentionally loaded - return full content without truncation
  return content
}

function normalizeSkillsForCache(skillNames: string[] | null | undefined): string[] {
  if (!skillNames || skillNames.length === 0) return []
  return [...new Set(skillNames.map((s) => s.trim()).filter(Boolean))]
}

export interface ExecutePhaseToolOptions {
  manager: BackgroundManager
  client: OpencodeClient
  directory: string
  frontendConformanceMode?: FrontendConformanceMode
}

export function createExecutePhase(options: ExecutePhaseToolOptions): ToolDefinition {
  const { manager, client, directory } = options
  const frontendConformanceMode = options.frontendConformanceMode ?? "normal"

  return tool({
    description: EXECUTE_PHASE_DESCRIPTION,
    args: {
      phase: tool.schema.number().describe("Phase number to execute (e.g., 1, 2, 3)"),
      skills: tool.schema.array(tool.schema.string()).nullable().describe("Array of skill names to prepend to all phase tasks. Use null if no skills needed. Optional.").optional(),
    },
    async execute(args: ExecutePhaseArgs, toolContext) {
      const ctx = toolContext as { sessionID: string; abort: AbortSignal }
      
      const todosResponse = await client.session.todo({ path: { id: ctx.sessionID } })
      const todos = (todosResponse.data ?? []) as Todo[]

      if (todos.length === 0) {
        return `❌ No todos found. Make sure EXEC:: todos are created by planner-paul.`
      }

      const phaseInfo = extractPhaseInfo(todos, args.phase)
      if (!phaseInfo) {
        return `❌ Phase ${args.phase} not found in todos. Available EXEC:: todos:\n${todos
          .filter(t => t.content.toLowerCase().startsWith("exec::"))
          .map(t => `- ${t.content}`)
          .join("\n")}`
      }

      const pendingTodos = phaseInfo.todos.filter(t => t.status !== "completed" && t.status !== "cancelled")
      if (pendingTodos.length === 0) {
        return `✅ Phase ${args.phase} (${phaseInfo.title}) already complete. All tasks finished.`
      }

      const planContractIndex = loadActivePlanContractIndex(directory)
      if (planContractIndex) {
        log("[execute_phase] Loaded active plan contracts", {
          planPath: planContractIndex.planPath,
          contractCount: planContractIndex.contracts.size,
          machineContractCount: planContractIndex.machineContracts.size,
          source: planContractIndex.source,
        })
      }

      const preflight = validatePhasePreflight(pendingTodos, planContractIndex, directory)
      if (!preflight.ok) {
        return `❌ Preflight validation failed for phase ${args.phase} (${phaseInfo.title}):\n- ${preflight.details.join("\n- ")}`
      }

      const skillContentCache = new Map<string, string>()
      const missingSkillCache = new Map<string, string[]>()

      async function resolveSkillsContent(skillNames: string[] | null | undefined): Promise<{ content?: string; error?: string; skills: string[] }> {
        const normalized = normalizeSkillsForCache(skillNames)
        if (normalized.length === 0) {
          return { skills: [] }
        }

        const key = normalized.join("|")
        if (missingSkillCache.has(key)) {
          const notFound = missingSkillCache.get(key) ?? []
          return { skills: normalized, error: `❌ Skills not found: ${notFound.join(", ")}` }
        }

        if (skillContentCache.has(key)) {
          return { skills: normalized, content: skillContentCache.get(key) }
        }

        const { resolved, notFound } = await resolveMultipleSkillsAsync(normalized)
        if (notFound.length > 0) {
          missingSkillCache.set(key, notFound)
          return { skills: normalized, error: `❌ Skills not found: ${notFound.join(", ")}` }
        }

        const summarized = Array.from(resolved.values()).map(summarizeSkillContent)
        const content = summarized.join("\n\n")
        skillContentCache.set(key, content)
        return { skills: normalized, content }
      }

      const phaseDefaultSkills = args.skills && args.skills.length > 0 ? args.skills : undefined
      const phaseSkillResolution = await resolveSkillsContent(phaseDefaultSkills)
      if (phaseSkillResolution.error) {
        return phaseSkillResolution.error
      }
      const phaseSkillContent = phaseSkillResolution.content
      if (phaseSkillResolution.skills.length > 0) {
        log(`[execute_phase] Resolved ${phaseSkillResolution.skills.length} phase-default skills for phase ${args.phase}`)
      }

      log(`[execute_phase] Starting phase ${args.phase}`, {
        title: phaseInfo.title,
        mode: phaseInfo.mode,
        taskCount: pendingTodos.length,
        hasSkills: !!phaseSkillContent,
      })

      const results: PhaseResult[] = []

      async function waitForTask(sessionID: string): Promise<{ status: string; result?: string; error?: string; messages: SessionMessage[] }> {
        const pollResult = await pollSessionReliability({
          client,
          sessionID,
          abort: ctx.abort,
          maxPollTimeMs: 10 * 60 * 1000,
        })

        const pollClassification = classifyPollResultForExecutePhase(pollResult.status)

        if (pollClassification === "success") {
          return { status: "completed", result: pollResult.signalDoneResult ?? "", messages: pollResult.messages as SessionMessage[] }
        }

        if (pollResult.status === "error_loop") {
          const recent = pollResult.errorLoop?.recentOutputs?.join("\n---\n") ?? "(no output)"
          return {
            status: "error",
            error: `Error loop detected: ${pollResult.errorLoop?.reason ?? "unknown"}\n${recent}`,
            messages: pollResult.messages as SessionMessage[],
          }
        }

        if (pollResult.status === "no_progress_timeout") {
          return { status: "error", error: "No progress for 10 minutes", messages: pollResult.messages as SessionMessage[] }
        }

        if (pollClassification === "cancelled") {
          return { status: "cancelled", error: "Task aborted", messages: pollResult.messages as SessionMessage[] }
        }

        if (pollClassification === "retryable_failure") {
          return { status: "error", error: "Timeout waiting for task", messages: pollResult.messages as SessionMessage[] }
        }

        const fallbackText = extractLatestAssistantText(pollResult.messages)
        if (fallbackText.trim()) {
          return { status: "completed", result: fallbackText, messages: pollResult.messages as SessionMessage[] }
        }

        return { status: "error", error: "No output", messages: pollResult.messages as SessionMessage[] }
      }

      if (phaseInfo.mode === "parallel") {
        const tasks: Array<{ todo: PhaseTodo; taskId: string; sessionId: string; agent: string; gitSnapshotBefore?: GitChangeSnapshot }> = []

        for (const todo of pendingTodos) {
          const agent = resolveAgent(todo)
          const taskSkills = todo.requiredSkills !== undefined ? todo.requiredSkills : phaseDefaultSkills
          const taskSkillResolution = await resolveSkillsContent(taskSkills)
          if (taskSkillResolution.error) {
            results.push({
              taskId: "",
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: taskSkillResolution.error,
              skillsUsed: taskSkillResolution.skills,
            })
            continue
          }

          const contractResolution = resolveContractPrompt(todo, planContractIndex)
          if (contractResolution.error) {
            results.push({
              taskId: "",
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: contractResolution.error,
              skillsUsed: taskSkillResolution.skills,
            })
            continue
          }

          const effectiveSkillContent = todo.requiredSkills !== undefined
            ? taskSkillResolution.content
            : (taskSkillResolution.content ?? phaseSkillContent)
          let prompt = buildTaskPrompt(todo, contractResolution.content)

          if (effectiveSkillContent) {
            prompt = `${effectiveSkillContent}\n\n${prompt}`
          }

          try {
            const gitSnapshotBefore = await captureGitChangeSnapshot(directory)

            const task = await manager.launch({
              description: `[P${todo.taskNumber}] ${todo.agentHint ?? "Task"}`,
              prompt,
              agent,
              parentSessionID: ctx.sessionID,
              parentMessageID: "",
              parentAgent: "Paul",
              skillContent: effectiveSkillContent,
            })
            tasks.push({ todo, taskId: task.id, sessionId: task.sessionID, agent, gitSnapshotBefore })
            log(`[execute_phase] Launched parallel task`, { taskId: task.id, agent, taskNumber: todo.taskNumber })
          } catch (error) {
            results.push({
              taskId: "",
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: `Failed to launch: ${error instanceof Error ? error.message : String(error)}`,
              skillsUsed: taskSkillResolution.skills,
            })
          }
        }

        const waitPromises = tasks.map(async ({ todo, taskId, sessionId, agent, gitSnapshotBefore }) => {
          try {
            const result = await waitForTask(sessionId)
            let phaseStatus: "success" | "failed" = result.status === "completed" ? "success" : "failed"
            let phaseResultText = result.result ?? result.error ?? "No output"

            if (phaseStatus === "success") {
              const touchedFiles = await extractTouchedFilesWithGitFallback(result.messages, directory, gitSnapshotBefore)
              const fileScopeValidation = validateFileScope(todo, touchedFiles)
              if (fileScopeValidation && !fileScopeValidation.ok) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nFile scope validation failed:\n- ${fileScopeValidation.details.join("\n- ")}`
              }
            }

            if (phaseStatus === "success") {
              const acceptanceValidation = runAcceptanceChecks(todo, planContractIndex, directory, frontendConformanceMode)
              if (!acceptanceValidation.ok) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nAcceptance validation failed:\n- ${acceptanceValidation.details.join("\n- ")}`
              }
            }

            const shouldRunAutoFrontend = frontendConformanceMode !== "off" && shouldRunAutomaticFrontendConformance(todo)
            if (phaseStatus === "success" && shouldRunAutoFrontend) {
              const frontendValidation = validateFrontendConformance(todo, directory)
              if (!frontendValidation.ok) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nFrontend conformance validation failed:\n- ${frontendValidation.details.join("\n- ")}`
              }
            }

            if (phaseStatus === "success" && frontendConformanceMode === "strict") {
              const frontendScopedFiles = (todo.fileRefs ?? []).filter((f) => FRONTEND_FILE_REGEX.test(f))
              if (shouldRunAutomaticFrontendConformance(todo) && frontendScopedFiles.length === 0) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nFrontend conformance validation failed:\n- [P${todo.taskNumber}] strict mode requires frontend file scope for frontend tasks.`
              }
            }

            if (phaseStatus === "success") {
              const anchorValidation = validateTodoAnchors(todo, directory)
              if (anchorValidation && !anchorValidation.ok) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nTODO anchor validation failed:\n- ${anchorValidation.details.join("\n- ")}`
              }
            }

            results.push({
              taskId,
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: phaseStatus,
              result: phaseResultText,
              sessionId,
              skillsUsed: todo.requiredSkills !== undefined
                ? todo.requiredSkills
                : (phaseDefaultSkills ?? undefined),
            })
          } catch (error) {
            results.push({
              taskId,
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: `Timeout or error: ${error instanceof Error ? error.message : String(error)}`,
              sessionId,
              skillsUsed: todo.requiredSkills !== undefined
                ? todo.requiredSkills
                : (phaseDefaultSkills ?? undefined),
            })
          }
        })

        await Promise.all(waitPromises)
      } else {
        for (const todo of pendingTodos) {
          const agent = resolveAgent(todo)
          const taskSkills = todo.requiredSkills !== undefined ? todo.requiredSkills : phaseDefaultSkills
          const taskSkillResolution = await resolveSkillsContent(taskSkills)
          if (taskSkillResolution.error) {
            results.push({
              taskId: "",
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: taskSkillResolution.error,
              skillsUsed: taskSkillResolution.skills,
            })
            break
          }

          const contractResolution = resolveContractPrompt(todo, planContractIndex)
          if (contractResolution.error) {
            results.push({
              taskId: "",
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: contractResolution.error,
              skillsUsed: taskSkillResolution.skills,
            })
            break
          }

          const effectiveSkillContent = todo.requiredSkills !== undefined
            ? taskSkillResolution.content
            : (taskSkillResolution.content ?? phaseSkillContent)
          let prompt = buildTaskPrompt(todo, contractResolution.content)

          if (effectiveSkillContent) {
            prompt = `${effectiveSkillContent}\n\n${prompt}`
          }

          try {
            const gitSnapshotBefore = await captureGitChangeSnapshot(directory)

            const task = await manager.launch({
              description: `[P${todo.taskNumber}] ${todo.agentHint ?? "Task"}`,
              prompt,
              agent,
              parentSessionID: ctx.sessionID,
              parentMessageID: "",
              parentAgent: "Paul",
              skillContent: effectiveSkillContent,
            })

            log(`[execute_phase] Launched sequential task`, { taskId: task.id, agent, taskNumber: todo.taskNumber })

            const result = await waitForTask(task.sessionID)
            let phaseStatus: "success" | "failed" = result.status === "completed" ? "success" : "failed"
            let phaseResultText = result.result ?? result.error ?? "No output"

            if (phaseStatus === "success") {
              const touchedFiles = await extractTouchedFilesWithGitFallback(result.messages, directory, gitSnapshotBefore)
              const fileScopeValidation = validateFileScope(todo, touchedFiles)
              if (fileScopeValidation && !fileScopeValidation.ok) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nFile scope validation failed:\n- ${fileScopeValidation.details.join("\n- ")}`
              }
            }

            if (phaseStatus === "success") {
              const acceptanceValidation = runAcceptanceChecks(todo, planContractIndex, directory, frontendConformanceMode)
              if (!acceptanceValidation.ok) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nAcceptance validation failed:\n- ${acceptanceValidation.details.join("\n- ")}`
              }
            }

            const shouldRunAutoFrontend = frontendConformanceMode !== "off" && shouldRunAutomaticFrontendConformance(todo)
            if (phaseStatus === "success" && shouldRunAutoFrontend) {
              const frontendValidation = validateFrontendConformance(todo, directory)
              if (!frontendValidation.ok) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nFrontend conformance validation failed:\n- ${frontendValidation.details.join("\n- ")}`
              }
            }

            if (phaseStatus === "success" && frontendConformanceMode === "strict") {
              const frontendScopedFiles = (todo.fileRefs ?? []).filter((f) => FRONTEND_FILE_REGEX.test(f))
              if (shouldRunAutomaticFrontendConformance(todo) && frontendScopedFiles.length === 0) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nFrontend conformance validation failed:\n- [P${todo.taskNumber}] strict mode requires frontend file scope for frontend tasks.`
              }
            }

            if (phaseStatus === "success") {
              const anchorValidation = validateTodoAnchors(todo, directory)
              if (anchorValidation && !anchorValidation.ok) {
                phaseStatus = "failed"
                phaseResultText = `${phaseResultText}\n\nTODO anchor validation failed:\n- ${anchorValidation.details.join("\n- ")}`
              }
            }

            results.push({
              taskId: task.id,
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: phaseStatus,
              result: phaseResultText,
              sessionId: task.sessionID,
              skillsUsed: taskSkillResolution.skills,
            })

            if (phaseStatus !== "success") {
              log(`[execute_phase] Sequential task failed, stopping phase`, { taskId: task.id })
              break
            }
          } catch (error) {
            results.push({
              taskId: "",
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: `Error: ${error instanceof Error ? error.message : String(error)}`,
              skillsUsed: taskSkillResolution.skills,
            })
            break
          }
        }
      }

      const successCount = results.filter(r => r.status === "success").length
      const failedCount = results.filter(r => r.status === "failed").length

      let output = `## Phase ${args.phase}: ${phaseInfo.title} (${phaseInfo.mode})\n\n`
      output += `**Results:** ${successCount} succeeded, ${failedCount} failed\n`
      if (args.skills && args.skills.length > 0) {
        output += `**Skills:** ${args.skills.join(", ")}\n`
      }
      output += "\n"

      for (const phaseResult of results) {
        const icon = phaseResult.status === "success" ? "✅" : "❌"
        output += `### ${icon} [P${phaseResult.taskNumber}] - ${phaseResult.agent}\n`
        if (phaseResult.skillsUsed && phaseResult.skillsUsed.length > 0) {
          output += `Skills: ${phaseResult.skillsUsed.join(", ")}\n`
        }
        output += `${phaseResult.result.slice(0, 500)}${phaseResult.result.length > 500 ? "..." : ""}\n\n`
        if (phaseResult.sessionId) {
          output += `Session: ${phaseResult.sessionId}\n\n`
        }
      }

      if (failedCount > 0) {
        output += `\n⚠️ Some tasks failed. Review errors and retry with:\n`
        for (const failed of results.filter((r) => r.status === "failed")) {
          output += `- [P${failed.taskNumber}] execute_phase(phase=${args.phase}${args.skills ? `, skills=[${args.skills.map(s => `"${s}"`).join(", ")}]` : ""})\n`
        }
      }

      return output
    },
  })
}
