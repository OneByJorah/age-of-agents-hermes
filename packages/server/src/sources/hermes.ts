import { homedir } from "node:os";
import { join, basename } from "node:path";
import Database from "better-sqlite3";
import type { AgentSource, ClassifiedFile, Fact } from './types.js';
import { interpretLine } from '../transcript/parser.js';
import { rootIfExists } from './config.js';

const HERMES_DB = process.env.AOA_HERMES_DB ?? join(homedir(), ".hermes", "state.db");
const HERMES_STATE_DIR = join(homedir(), ".hermes");

function openDb(): Database.Database | null {
  try {
    const fs = require("node:fs");
    if (!fs.existsSync(HERMES_DB)) return null;
    return new Database(HERMES_DB);
  } catch {
    return null;
  }
}

function recentTool(line: any): { name: string; detail?: string } | undefined {
  const role = typeof line.role === "string" ? line.role.toLowerCase() : "";
  const content = typeof line.content === "string" ? line.content : "";
  if (role !== "assistant") return undefined;
  const json = content.trim();
  if (!json.startsWith("{") && !json.startsWith("[")) return undefined;
  try {
    const record = JSON.parse(json);
    const calls: any[] = Array.isArray(record.tool_calls) ? record.tool_calls : [];
    if (!calls.length) return undefined;
    const name = typeof calls[calls.length - 1].function?.name === "string" ? calls[calls.length - 1].function.name : undefined;
    if (!name) return undefined;
    const args = calls[calls.length - 1].function?.arguments;
    const detail = typeof args === "string" ? clip(args, 60) : undefined;
    return { name, detail };
  } catch {
    return undefined;
  }
}

function clip(text: string, max = 240): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function parseHermesLine(line: string): Fact[] {
  let record: any;
  try {
    record = JSON.parse(line);
  } catch {
    return [];
  }
  if (!record || typeof record !== "object") return [];
  const ts: string = typeof record.ts === "string" ? record.ts : new Date().toISOString();
  const sessionId = typeof record.session_id === "string" ? record.session_id : typeof record.sessionId === "string" ? record.sessionId : "";
  const facts: Fact[] = [];
  if (typeof record.content === "string" && record.content.trim()) {
    const role = typeof record.role === "string" ? record.role.toLowerCase() : "";
    if (role === "user") facts.push({ kind: "prompt", text: clip(record.content), ts });
    else if (role === "assistant") facts.push({ kind: "assistant-text", text: clip(record.content), ts });
  }
  const tool = recentTool(record);
  if (tool) {
    facts.push({
      kind: 'tool-start',
      tool: tool.name,
      detail: tool.detail,
      messageId: `hermes-${ts}`,
      ts,
    });
  }
  if (sessionId) {
    facts.push({ kind: "turn-end", ts });
  }
  return facts;
}

function sessionTitle(sessionId: string, db: Database.Database | null): string | undefined {
  if (!db) return undefined;
  try {
    const row = db.prepare("SELECT title FROM sessions WHERE id = ?").get(sessionId) as { title?: string } | undefined;
    return row?.title;
  } catch {
    return undefined;
  }
}

export const hermesSource: AgentSource = {
  id: "hermes",
  roots: () => {
    const candidates = [join(HERMES_STATE_DIR, "logs")];
    const db = openDb();
    if (db) {
      try {
        const rows = db.prepare("SELECT id FROM sessions").all() as { id?: string }[];
        for (const row of rows) {
          if (typeof row.id === "string" && row.id.trim()) {
            candidates.push(join(HERMES_STATE_DIR, row.id.trim()));
          }
        }
      } catch {
        // ignore SQLite metadata lookup failures
      }
      try { db.close(); } catch {}
    }
    return rootIfExists(HERMES_STATE_DIR);
  },
  depth: 3,
  classify(_path: string, _root: string): ClassifiedFile {
    return { kind: "other" };
  },
  parseLine: parseHermesLine,
};
