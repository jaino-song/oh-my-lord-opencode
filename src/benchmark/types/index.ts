/**
 * Benchmark tool types for AI model evaluation
 *
 * @module benchmark/types
 */

/**
 * Task types for benchmarking different agent roles
 */
export type TaskType =
  | "code-generation"
  | "code-review"
  | "test-writing"
  | "planning"
  | "research"
  | "refactoring"
  | "orchestration"

/**
 * Token usage information from API responses
 */
export interface TokenUsage {
  /** Input/prompt tokens consumed */
  input: number
  /** Output/completion tokens generated */
  output: number
  /** Total tokens (input + output) */
  total: number
}

/**
 * Cost information for a benchmark run
 */
export interface CostInfo {
  /** Input token cost in USD */
  inputCost: number
  /** Output token cost in USD */
  outputCost: number
  /** Total cost in USD */
  totalCost: number
}

/**
 * Single benchmark task definition
 */
export interface BenchmarkTask {
  /** Unique identifier for the task */
  id: string
  /** Human-readable name */
  name: string
  /** The prompt to send to the model */
  prompt: string
  /** Type of task being benchmarked */
  taskType: TaskType
  /** Description of expected behavior/output */
  expectedBehavior: string
  /** Optional automated checks (e.g., "test passes", "lint clean") */
  automatedChecks?: string[]
  /** Criteria for LLM judge evaluation */
  judgeEvaluationCriteria?: string[]
  /** Optional context/files needed for the task */
  context?: {
    /** File paths to include as context */
    files?: string[]
    /** Additional context text */
    text?: string
  }
}

/**
 * Result of executing a single task on a single model
 */
export interface TaskResult {
  /** Task ID */
  taskId: string
  /** Whether the task completed successfully */
  success: boolean
  /** Model's output/response */
  output: string
  /** Latency in milliseconds */
  latencyMs: number
  /** Token usage */
  tokens: TokenUsage
  /** Cost information */
  cost: CostInfo
  /** Error message if failed */
  error?: string
  /** Number of retries attempted */
  retries: number
}

/**
 * Quality evaluation from LLM judge
 */
export interface JudgeVerdict {
  /** Quality score (0-100) */
  score: number
  /** Whether the output passes quality threshold */
  pass: boolean
  /** Detailed reasoning for the score */
  reasoning: string
  /** Individual criterion scores */
  criteriaScores?: Record<string, number>
  /** Automated check results */
  automatedChecks?: {
    /** Check name */
    name: string
    /** Whether it passed */
    passed: boolean
    /** Details */
    details?: string
  }[]
}

/**
 * Complete result for a single model across all tasks
 */
export interface ModelResult {
  /** Model identifier (e.g., "anthropic/claude-opus-4-5") */
  model: string
  /** Results for each task */
  taskResults: TaskResult[]
  /** Judge verdicts for each task */
  judgeVerdicts: Record<string, JudgeVerdict>
  /** Aggregated metrics */
  aggregates: {
    /** Average latency across all tasks */
    avgLatencyMs: number
    /** Total tokens consumed */
    totalTokens: TokenUsage
    /** Total cost */
    totalCost: number
    /** Average quality score */
    avgQualityScore: number
    /** Success rate (0-1) */
    successRate: number
    /** Number of tasks passed (score >= threshold) */
    tasksPassed: number
    /** Number of tasks failed */
    tasksFailed: number
  }
}

/**
 * Benchmark suite containing related tasks
 */
export interface BenchmarkSuite {
  /** Unique identifier */
  name: string
  /** Human-readable description */
  description: string
  /** Type of tasks in this suite */
  taskType: TaskType
  /** Tasks in the suite */
  tasks: BenchmarkTask[]
}

/**
 * Judge configuration
 */
export interface JudgeConfig {
  /** Model to use as judge (default: anthropic/claude-opus-4-5) */
  model: string
  /** Quality score threshold for pass/fail (default: 70) */
  passThreshold: number
  /** Temperature for judge (default: 0.1) */
  temperature: number
  /** Maximum tokens for judge response */
  maxTokens?: number
}

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  /** Models to benchmark */
  models: string[]
  /** Suites to run (if empty, runs all default suites) */
  suites?: string[]
  /** Number of retries for failed requests (default: 3) */
  retries: number
  /** Timeout per task in milliseconds (default: 120000) */
  timeoutMs: number
  /** Judge configuration */
  judge: JudgeConfig
  /** Output directory for results (default: ".paul/benchmark-results") */
  outputDir: string
  /** Whether to include historical comparison in report */
  includeHistoricalComparison: boolean
}

/**
 * Complete benchmark run results
 */
export interface BenchmarkRun {
  /** Unique run identifier (timestamp) */
  id: string
  /** Run timestamp (ISO 8601) */
  timestamp: string
  /** Configuration used for this run */
  config: BenchmarkConfig
  /** Results for each model */
  modelResults: ModelResult[]
  /** Summary statistics */
  summary: {
    /** Total number of tasks executed */
    totalTasks: number
    /** Total number of models tested */
    totalModels: number
    /** Total duration in milliseconds */
    totalDurationMs: number
    /** Overall success rate */
    overallSuccessRate: number
  }
}

/**
 * Progress update during benchmark execution
 */
export interface BenchmarkProgress {
  /** Number of tasks completed so far */
  completed: number
  /** Total number of tasks to execute */
  total: number
  /** Current model being tested */
  currentModel: string
  /** Current task being executed */
  currentTask: string
  /** Percentage complete (0-100) */
  percentComplete: number
}

/**
 * Comparison between two benchmark runs
 */
export interface BenchmarkComparison {
  /** First run (baseline) */
  baseline: BenchmarkRun
  /** Second run (comparison) */
  comparison: BenchmarkRun
  /** Per-model deltas */
  modelDeltas: Record<
    string,
    {
      /** Latency change in milliseconds (positive = slower) */
      latencyDeltaMs: number
      /** Latency change percentage */
      latencyDeltaPercent: number
      /** Cost change in USD (positive = more expensive) */
      costDelta: number
      /** Cost change percentage */
      costDeltaPercent: number
      /** Quality score change (positive = better) */
      qualityDelta: number
      /** Status: "improved", "regressed", "unchanged", "new", "removed" */
      status: "improved" | "regressed" | "unchanged" | "new" | "removed"
    }
  >
  /** Overall assessment */
  overall: {
    /** Average latency change */
    avgLatencyDeltaPercent: number
    /** Average cost change */
    avgCostDeltaPercent: number
    /** Average quality change */
    avgQualityDelta: number
    /** Summary text */
    summary: string
  }
}

/**
 * Pricing information for a model
 */
export interface ModelPricing {
  /** Model identifier */
  model: string
  /** Cost per 1M input tokens in USD */
  inputPricePer1M: number
  /** Cost per 1M output tokens in USD */
  outputPricePer1M: number
}

/**
 * Callback function for progress updates
 */
export type ProgressCallback = (progress: BenchmarkProgress) => void | Promise<void>
