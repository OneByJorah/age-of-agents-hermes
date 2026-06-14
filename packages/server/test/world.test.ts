import { describe, expect, it, vi } from 'vitest';
import type { HeroSnapshot } from '@agent-citadel/shared';
import { World } from '../src/world.js';

function hero(): HeroSnapshot {
  return {
    sessionId: 's1',
    title: 'Test',
    projectDir: '/x',
    teamColor: 0,
    state: 'working',
    tokens: { input: 0, output: 0 },
    startedAt: '2026-06-14T10:00:00.000Z',
    lastActivityAt: '2026-06-14T10:00:00.000Z',
  };
}

describe('World.emit — odporność na błędne listenery', () => {
  it('rzucający listener (np. zerwany socket.send) nie propaguje błędu i nie blokuje innych', () => {
    const world = new World();
    const received: string[] = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Pierwszy listener pada — odwzorowuje broadcast WS na martwym sockecie.
    world.onEvent(() => {
      throw new Error('boom');
    });
    // Drugi listener musi i tak dostać zdarzenie.
    world.onEvent((e) => {
      received.push(e.type);
    });

    // Mutacja świata nie może wybuchnąć na zewnątrz (inaczej ubija sweep/proces).
    expect(() => world.upsertHero(hero())).not.toThrow();
    // Drugi listener nadal zadziałał mimo awarii pierwszego.
    expect(received).toContain('hero-spawned');
    // Błąd został zgłoszony, a nie po cichu połknięty.
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
  });
});
