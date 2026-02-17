# Contracts v1

`contracts-v1` is the machine-readable contract format embedded in plan markdown.

`execute_phase` reads this block first for deterministic validation and enforcement, then falls back to markdown `### File Contracts` if needed.

## Where To Put It

Place one fenced code block under `## Blueprint` after `### File Contracts` in `.paul/plans/*.md`:

```json
{
  "schemaVersion": "contracts-v1",
  "contracts": []
}
```

## Schema

```json
{
  "schemaVersion": "contracts-v1",
  "contracts": [
    {
      "id": "FC-EXAMPLE",
      "files": ["src/example.ts"],
      "todoIds": ["TD-EXAMPLE-001"],
      "skills": ["skill-a", "skill-b"],
      "acceptance": {
        "requiredFilesExist": ["src/example.ts"],
        "requiredPatterns": [
          {
            "file": "src/example.ts",
            "regex": "export function",
            "description": "public API exists"
          }
        ],
        "forbiddenPatterns": [
          {
            "file": "src/example.ts",
            "regex": "TODO\\(TD-EXAMPLE-001\\)",
            "description": "anchor resolved"
          }
        ],
        "requireTodoIdsResolved": true,
        "frontendConformance": false
      }
    }
  ]
}
```

## Template: Frontend Task

```json
{
  "schemaVersion": "contracts-v1",
  "contracts": [
    {
      "id": "FC-LOGIN-FORM",
      "files": [
        "src/components/login-form.tsx",
        "src/components/login-form.css"
      ],
      "todoIds": ["TD-LOGIN-001", "TD-LOGIN-002"],
      "skills": ["frontend-design", "ui-ux-pro-max"],
      "acceptance": {
        "requiredFilesExist": ["src/components/login-form.tsx"],
        "requiredPatterns": [
          {
            "file": "src/components/login-form.tsx",
            "regex": "data-component=\"[a-z0-9-]+\""
          },
          {
            "file": "src/components/login-form.tsx",
            "regex": "Skeleton|skeleton"
          }
        ],
        "forbiddenPatterns": [
          {
            "file": "src/components/login-form.tsx",
            "regex": "\\banimate-[a-z0-9-]+\\b"
          }
        ],
        "requireTodoIdsResolved": true,
        "frontendConformance": true
      }
    }
  ]
}
```

## Template: Backend API Task

```json
{
  "schemaVersion": "contracts-v1",
  "contracts": [
    {
      "id": "FC-AUTH-API",
      "files": [
        "src/services/auth.ts",
        "src/types/auth.ts"
      ],
      "todoIds": ["TD-AUTH-001"],
      "skills": ["typescript-advanced-types"],
      "acceptance": {
        "requiredFilesExist": [
          "src/services/auth.ts",
          "src/types/auth.ts"
        ],
        "requiredPatterns": [
          {
            "file": "src/services/auth.ts",
            "regex": "export async function login"
          },
          {
            "file": "src/types/auth.ts",
            "regex": "export interface LoginResponse"
          }
        ],
        "forbiddenPatterns": [
          {
            "file": "src/services/auth.ts",
            "regex": "TODO\\(TD-AUTH-001\\)"
          }
        ],
        "requireTodoIdsResolved": true,
        "frontendConformance": false
      }
    }
  ]
}
```

## Template: Test Task

```json
{
  "schemaVersion": "contracts-v1",
  "contracts": [
    {
      "id": "FC-LOGIN-TESTS",
      "files": ["tests/login.integration.test.ts"],
      "todoIds": ["TD-TEST-001"],
      "skills": ["tdd-workflow", "webapp-testing"],
      "acceptance": {
        "requiredFilesExist": ["tests/login.integration.test.ts"],
        "requiredPatterns": [
          {
            "file": "tests/login.integration.test.ts",
            "regex": "describe\\("
          },
          {
            "file": "tests/login.integration.test.ts",
            "regex": "expect\\("
          }
        ],
        "requireTodoIdsResolved": true,
        "frontendConformance": false
      }
    }
  ]
}
```

## Validation Notes

- `id` should be stable and uppercase-friendly (`FC-...`).
- `todoIds` should use `TD-...` format.
- `files` should be workspace-relative and match EXEC task `(Files: ...)` scope.
- Regex is validated during preflight; invalid regex blocks phase execution.
- If both machine and markdown contracts exist, machine contract data is authoritative for enforcement.
- CI lint entrypoint for schema/shape regressions: `bun run test:contracts-v1`.

## Recommended Workflow

1. Write human-readable `### File Contracts` prose.
2. Add one `contracts-v1` JSON block.
3. Ensure each EXEC task references matching `Contracts/Files/TODO-IDs`.
4. Run `execute_phase`; fix preflight errors before launching work.
