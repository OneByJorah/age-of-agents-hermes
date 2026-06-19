import { describe, expect, it, vi } from 'vitest';
import type { HeroSnapshot, ProjectArsenal } from '@agent-citadel/shared';
import { World } from '../src/world.js';

function arsenal(projectDir: string): ProjectArsenal {
  return {
    projectDir, projectName: 'proj', activeSessions: 1,
    skills: [], connectors: [], hooks: [], agents: [], refreshedAt: 1,
  };
}

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

describe('World — arsenał jako stan świata (replay dla nowych klientów)', () => {
  it('setArsenal włącza arsenał do snapshotu i emituje arsenal-updated', () => {
    const world = new World();
    const received: string[] = [];
    world.onEvent((e) => received.push(e.type));

    const a = arsenal('PD');
    world.setArsenal(a);

    // Nowy klient czyta arsenał ze snapshotu — bez czekania na zmianę fingerprintu.
    expect(world.snapshot().arsenals).toContainEqual(a);
    // Podłączeni klienci nadal dostają emit na żywo.
    expect(received).toContain('arsenal-updated');
  });

  it('setArsenal nadpisuje arsenał tego samego projektu (klucz: projectDir)', () => {
    const world = new World();
    world.setArsenal(arsenal('PD'));
    world.setArsenal({ ...arsenal('PD'), activeSessions: 3 });

    const arsenals = world.snapshot().arsenals;
    expect(arsenals.filter((x) => x.projectDir === 'PD')).toHaveLength(1);
    expect(arsenals[0].activeSessions).toBe(3);
  });
});
