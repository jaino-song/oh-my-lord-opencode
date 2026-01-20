export const HOOK_NAME = "parallel-safety-enforcer"

export const FILE_PATH_PATTERNS = [
  /(?:modify|edit|update|change|create|write)\s+[`"']?([^\s`"']+\.\w+)[`"']?/gi,
  /(?:file|path):\s*[`"']?([^\s`"']+\.\w+)[`"']?/gi,
  /src\/[^\s`"']+\.\w+/g,
  /\.paul\/[^\s`"']+\.md/g,
  /\.sisyphus\/[^\s`"']+\.md/g,
]

export const BACKGROUND_CAPABLE_TOOLS = ["delegate_task", "task"]

export const MAX_PARALLEL_TASKS = 3
