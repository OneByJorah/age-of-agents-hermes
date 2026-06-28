import { homedir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { validateLaunchRequest } from '@agent-citadel/shared';
import type { LiveSessionRegistry } from './sdk/sessions.js';

export interface SessionRoutesOptions { sessions: LiveSessionRegistry; }

function authConfigured(): boolean {
  const e = process.env;
  return !!(e.CLAUDE_CODE_OAUTH_TOKEN || e.ANTHROPIC_API_KEY || e.ANTHROPIC_AUTH_TOKEN || e.CLAUDE_CODE_USE_BEDROCK || e.CLAUDE_CODE_USE_VERTEX);
}

function loadHermesSessions() {
  try {
    const db = new Database(join(homedir(), '.hermes', 'state.db'));
    const rows = db.prepare('SELECT id, started_at, ended_at, cwd FROM sessions ORDER BY started_at DESC LIMIT 200').all() as { id: string; started_at?: string; ended_at?: string; cwd?: string }[];
    db.close();
    return rows.map(r => ({ sessionId: r.id, startedAt: r.started_at ?? new Date().toISOString(), cwd: r.cwd ?? '' }));
  } catch {
    return [];
  }
}

export function registerSessionRoutes(app: FastifyInstance, opts: SessionRoutesOptions): void {
  app.get('/sessions', async () => {
    const sdkSessions = opts.sessions.list();
    const hermesSessions = loadHermesSessions();
    // Merge without duplicates.
    const seen = new Set(sdkSessions.map(s => s.sessionId));
    const merged = [
      ...sdkSessions,
      ...hermesSessions.filter(s => s.sessionId && !seen.has(s.sessionId)),
    ];
    return { available: await opts.sessions.available(), authConfigured: authConfigured(), sessions: merged };
  });
  app.post('/sessions/launch', async (request, reply) => {
    const res = validateLaunchRequest(request.body);
    if (!res.ok) return reply.code(400).send({ error: res.error });
    if (!(await opts.sessions.available())) return reply.code(501).send({ error: 'Claude Agent SDK not installed' });
    try {
      return await opts.sessions.launch(res.value);
    } catch (err) {
      return reply.code(500).send({ error: err instanceof Error ? err.message : 'launch failed' });
    }
  });

  app.post<{ Params: { id: string }; Body: { text?: string } }>('/sessions/:id/message', async (request, reply) => {
    const text = request.body?.text;
    if (typeof text !== 'string' || !text.trim()) return reply.code(400).send({ error: 'text required' });
    if (!opts.sessions.pushText(request.params.id, text)) return reply.code(404).send({ error: 'unknown session' });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/sessions/:id/stop', async (request, reply) => {
    if (!(await opts.sessions.stop(request.params.id))) return reply.code(404).send({ error: 'unknown session' });
    return { ok: true };
  });
}
