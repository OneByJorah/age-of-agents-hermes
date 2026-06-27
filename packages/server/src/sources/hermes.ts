import { homedir } from "node:os";
import { join, basename } from "node:path";
import Database from "better-sqlite3";
import type { AgentSource, ClassifiedFile, Fact } from './types.js';
import { interpretLine } from '../transcript/parser.js';
import { rootIfExists } from './config.js';

const HERMES_DB = process.env.AOA_HERMES_DB ?? join(homedir(), ".hermes", "state.db");

function openDb(): Database.Database | null {
  try {
    const fs = require("node:fs");
    if (!fs.existsSync(HERMES_DB)) return null;
    return new Database(HERMES_DB);
  } catch {
    return null;
  }
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

function sessionMeta(sessionId: string, db: Database.Database | null) {
  const out: { cwd?: string; model?: string; source?: string } = {};
  if (!db) return out;
  try {
    const rows = db.prepare("SELECT key, value FROM state_meta WHERE session_id = ?").all(sessionId) as { key: string; value?: string }[];
    for (const row of rows) {
      if (row.key === "cwd") out.cwd = row.value ?? out.cwd;
      else if (row.key === "model") out.model = row.value ?? out.model;
      else if (row.key === "source") out.source = row.value ?? out.source;
    }
  } catch {
    // ignore partial metadata reads
  }
  return out;
}

function recentTool(line: any): string | undefined {
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
  const role = typeof record.role === "string" ? record.role.toLowerCase() : "";
  const db = openDb();
  const sessionId = typeof record.session_id === "string" ? record.session_id : typeof record.sessionId === "string" ? record.sessionId : "";
  const meta = sessionMeta(sessionId, db);
  const facts: Fact[] = [];
  if (typeof record.content === "string" && record.content.trim()) {
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
  if ((role === "assistant" || role === "tool") && sessionId) {
    facts.push({ kind: "turn-end", ts });
  }
  db?.close();
  return facts;
}

export const hermesSource: AgentSource = {
  id: "hermes",
  roots: () => {
    const dir = join(homedir(), ".hermes", "logs");
    try {
      const fs = require("node:fs");
      return fs.existsSync(dir) ? [dir] : [];
    } catch {
      return [];
    }
  },
  depth: 3,
  classify(_path: string, _root: string): ClassifiedFile {
    // All files under .hermes/logs are treated as session targets unless explicitly filtered.
    return { kind: "other" };
  },
  parseLine: parseHermesLine,
};

export function sessionIdForHermes(dir: string): string | undefined {
  const base = basename(dir);
  if (base && base !== "logs") return base;
  return undefined;
}
