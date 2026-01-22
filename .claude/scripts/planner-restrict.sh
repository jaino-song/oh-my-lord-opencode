#!/bin/bash
# Planner Restriction - Prevents planner from writing code
# Exit 0 = allowed, Exit 1 = blocked

set -e

TOOL_INPUT="${TOOL_INPUT:-$(cat -)}"
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null || echo "")

# If no file path, allow
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Allowed paths for planner
ALLOWED_PATTERNS=(
  ".paul/plans/"
  ".paul/drafts/"
  ".claude/state/"
  "*.md"
)

# Check if file matches allowed patterns
for pattern in "${ALLOWED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]] || [[ "$FILE_PATH" == $pattern ]]; then
    echo "ALLOWED: Planner can write to $FILE_PATH"
    exit 0
  fi
done

# Block code files
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.jsx ]]; then
  echo "BLOCKED: Planner cannot write code files"
  echo "File: $FILE_PATH"
  echo "Planner is restricted to planning files only (.paul/plans/, *.md)"
  exit 1
fi

# Allow other files (json configs, etc)
echo "ALLOWED: $FILE_PATH"
exit 0
