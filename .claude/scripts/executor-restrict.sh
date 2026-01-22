#!/bin/bash
# Executor Restriction - Prevents executor from writing code directly
# Executor must delegate to implementation agents
# Exit 0 = allowed, Exit 1 = blocked

set -e

TOOL_INPUT="${TOOL_INPUT:-$(cat -)}"
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null || echo "")

# If no file path, allow
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Allowed paths for executor (coordination files only)
ALLOWED_PATTERNS=(
  ".claude/state/"
  ".sisyphus/"
  "*.md"
)

# Check if file matches allowed patterns
for pattern in "${ALLOWED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]] || [[ "$FILE_PATH" == $pattern ]]; then
    echo "ALLOWED: Executor can write to $FILE_PATH"
    exit 0
  fi
done

# Block code files - executor must delegate
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.jsx ]]; then
  echo "BLOCKED: Executor cannot write code files directly"
  echo "File: $FILE_PATH"
  echo ""
  echo "Executor must delegate implementation:"
  echo "  - Backend code -> backend-impl agent"
  echo "  - Frontend code -> frontend-impl agent"
  echo "  - Test code -> unit-test-writer or e2e-test-writer agent"
  exit 1
fi

# Allow other files
echo "ALLOWED: $FILE_PATH"
exit 0
