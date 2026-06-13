import { describe, expect, it } from 'vitest';
import { accumulateMessage } from '../src/building-stats.js';
import type { BuildingId } from '@agent-citadel/shared';

const DAY = 86_400_000;
const NOW = Date.parse('2026-06-13T12:00:00.000Z');
const DAY_START = Date.parse('2026-06-13T00:00:00.000Z');

function acc() {
  return new Map<BuildingId, { today: number; week: number; month: number }>();
}

describe('accumulateMessage', () => {
  it('przypisuje tokeny do budynku narzędzia we wszystkich oknach (dziś)', () => {
    const a = acc();
    accumulateMessage(a, { ts: NOW, output: 100, tools: [{ name: 'Edit' }] }, NOW, DAY_START);
    expect(a.get('forge')).toEqual({ today: 100, week: 100, month: 100 });
  });

  it('dzieli równo gdy wiadomość dotknęła kilku budynków', () => {
    const a = acc();
    accumulateMessage(a, { ts: NOW, output: 100, tools: [{ name: 'Edit' }, { name: 'Read' }] }, NOW, DAY_START);
    expect(a.get('forge')?.month).toBe(50);
    expect(a.get('library')?.month).toBe(50);
  });

  it('Bash z git → targ (atrybucja przez detail)', () => {
    const a = acc();
    accumulateMessage(a, { ts: NOW, output: 80, tools: [{ name: 'Bash', detail: 'git push origin main' }] }, NOW, DAY_START);
    expect(a.get('market')?.today).toBe(80);
    expect(a.has('mine')).toBe(false);
  });

  it('wiadomość bez narzędzia → twierdza (domyślny fallback)', () => {
    const a = acc();
    accumulateMessage(a, { ts: NOW, output: 30, tools: [] }, NOW, DAY_START);
    expect(a.get('citadel')?.month).toBe(30);
  });

  it('rozumowanie (bez narzędzia) idzie do budynku bieżącej pracy gdy podano fallback', () => {
    const a = acc();
    accumulateMessage(a, { ts: NOW, output: 40, tools: [] }, NOW, DAY_START, 'forge');
    expect(a.get('forge')?.today).toBe(40);
    expect(a.has('citadel')).toBe(false);
  });

  it('10 dni temu liczy się do 30 dni, ale nie do tygodnia ani dziś', () => {
    const a = acc();
    accumulateMessage(a, { ts: NOW - 10 * DAY, output: 100, tools: [{ name: 'Edit' }] }, NOW, DAY_START);
    expect(a.get('forge')).toEqual({ today: 0, week: 0, month: 100 });
  });

  it('starsze niż 30 dni i zerowe tokeny są ignorowane', () => {
    const a = acc();
    accumulateMessage(a, { ts: NOW - 40 * DAY, output: 100, tools: [{ name: 'Edit' }] }, NOW, DAY_START);
    accumulateMessage(a, { ts: NOW, output: 0, tools: [{ name: 'Edit' }] }, NOW, DAY_START);
    expect(a.size).toBe(0);
  });
});
