import { join } from "node:path";
import { getOpenCodeStorageDir } from "../../shared/data-path";

export const OPENCODE_STORAGE = getOpenCodeStorageDir();
export const INTERACTIVE_BASH_SESSION_STORAGE = join(
  OPENCODE_STORAGE,
  "interactive-bash-session",
);

export const PAUL_SESSION_PREFIX = "paul-";

export function buildSessionReminderMessage(sessions: string[]): string {
  if (sessions.length === 0) return "";
  return `\n\n[System Reminder] Active paul-* tmux sessions: ${sessions.join(", ")}`;
}
