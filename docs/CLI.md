# CLI

The repository ships a CLI intended for local setup and diagnostics.

Entry:
- `src/cli/index.ts` (bun shebang)

Commands:
- `install`: interactive setup + config writing
- `doctor`: environment checks
- `run`: launch OpenCode session with completion enforcement
- `get-local-version`: version/update status

Implementation roots:
- `src/cli/install.ts`
- `src/cli/config-manager.ts`
- `src/cli/doctor/`
- `src/cli/run/`
- `src/cli/get-local-version/`
