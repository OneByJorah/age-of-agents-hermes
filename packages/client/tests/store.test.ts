import { describe, it, expect, beforeEach } from 'vitest';
import { useWorld } from '../src/store';

beforeEach(() => {
  useWorld.setState({ autofollow: false, selectedSessionId: undefined, selectedBuildingId: undefined });
});

describe('autofollow w store', () => {
  it('domyślnie wyłączony', () => {
    expect(useWorld.getState().autofollow).toBe(false);
  });

  it('setAutofollow(true) włącza', () => {
    useWorld.getState().setAutofollow(true);
    expect(useWorld.getState().autofollow).toBe(true);
  });

  it('select(id) resetuje autofollow do false i ustawia zaznaczenie', () => {
    useWorld.getState().setAutofollow(true);
    useWorld.getState().select('hero-1');
    expect(useWorld.getState().autofollow).toBe(false);
    expect(useWorld.getState().selectedSessionId).toBe('hero-1');
  });

  it('select(undefined) (zamknięcie panelu) też resetuje autofollow', () => {
    useWorld.getState().setAutofollow(true);
    useWorld.getState().select(undefined);
    expect(useWorld.getState().autofollow).toBe(false);
  });

  it('selectBuilding(id) resetuje autofollow', () => {
    useWorld.getState().setAutofollow(true);
    useWorld.getState().selectBuilding('forge');
    expect(useWorld.getState().autofollow).toBe(false);
  });
});
