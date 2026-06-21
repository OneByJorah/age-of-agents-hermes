import { randomUUID } from 'node:crypto';
import {
  classifyHookEvent,
  type PermissionPolicy,
  type PermissionRule,
  type PendingQuestion,
} from '@agent-citadel/shared';
import type { PendingRegistry } from './pending-registry.js';
import { decisionToHookOutput, type HookPayload } from './hooks.js';
import { toolDetail } from './transcript/parser.js';

export interface DecideDeps {
  policy: PermissionPolicy;
  registry: PendingRegistry;
  /** How long to hold the request open waiting for a human (ms). Keep < hook timeout. */
  timeoutMs: number;
  /** Persist an "allow always" rule. */
  onAlwaysRule: (rule: PermissionRule) => Promise<void>;
}

/**
 * Turns a PreToolUse hook payload into the JSON Claude Code should act on.
 * Returns `{}` for "defer" (print nothing -> normal flow / terminal prompt).
 * Anything blocking goes through the PendingRegistry and waits for the panel.
 */
export async function decideHook(
  body: HookPayload,
  deps: DecideDeps,
): Promise<Record<string, unknown>> {
  const sessionId = body.session_id ?? '';
  const tool = body.tool_name;
  const detail = tool ? toolDetail(tool, body.tool_input) : undefined;
  const classification = classifyHookEvent(
    { hookEvent: body.hook_event_name ?? '', tool, detail, sessionId },
    deps.policy,
  );

  switch (classification.action) {
    case 'defer':
    case 'show-question':
      return {};
    case 'allow':
      return decisionToHookOutput('allow');
    case 'deny':
      return decisionToHookOutput('deny', 'Blocked by panel policy');
    case 'ask-permission': {
      const question: PendingQuestion = {
        id: randomUUID(),
        sessionId,
        source: 'hook',
        kind: 'tool-permission',
        tool,
        detail,
        createdAt: new Date().toISOString(),
      };
      const decision = await deps.registry.ask(question, deps.timeoutMs);
      if (!decision) return {}; // timeout / cancelled -> defer
      if (decision.type === 'deny') return decisionToHookOutput('deny', decision.reason);
      if (decision.type === 'allow') {
        if (decision.scope === 'always' && tool) {
          await deps.onAlwaysRule({ tool, match: 'any', decision: 'allow', scope: 'global' });
        }
        return decisionToHookOutput('allow');
      }
      return {}; // unexpected decision shape -> defer
    }
    case 'ask-plan': {
      const question: PendingQuestion = {
        id: randomUUID(),
        sessionId,
        source: 'hook',
        kind: 'plan-approval',
        tool,
        detail,
        createdAt: new Date().toISOString(),
      };
      const decision = await deps.registry.ask(question, deps.timeoutMs);
      if (decision?.type === 'approve-plan') return decisionToHookOutput('allow');
      return {}; // reject / timeout -> defer to terminal (hooks can't reject with feedback)
    }
  }
}
