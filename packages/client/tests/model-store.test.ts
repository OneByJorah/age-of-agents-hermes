import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useModels, resolveModelLive } from '../src/model-store';
import { DEFAULT_MODEL_CONFIG, type ModelConfig } from '../src/theme/models';

const CUSTOM: ModelConfig = {
  sprites: [{ match: { kind: 'pattern', pattern: 'opus' }, sprite: 'haiku' }],
  windows: [{ match: { kind: 'pattern', pattern: 'opus' }, contextWindow: 500_000 }],
  fallback: { sprite: 'sonnet', contextWindow: 200_000 },
};

beforeEach(() => {
  useModels.setState({ models: DEFAULT_MODEL_CONFIG, modelsLoaded: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('useModels store', () => {
  it('domyślnie DEFAULT_MODEL_CONFIG', () => {
    expect(useModels.getState().models).toEqual(DEFAULT_MODEL_CONFIG);
  });
  it('setModels aktualizuje stan i wysyła PUT /model-config', () => {
    const f = vi.fn(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', f);
    useModels.getState().setModels(CUSTOM);
    expect(useModels.getState().models).toEqual(CUSTOM);
    expect(f).toHaveBeenCalledWith('/model-config', expect.objectContaining({ method: 'PUT' }));
  });
  it('resetModels przywraca DEFAULT', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}'))));
    useModels.setState({ models: CUSTOM });
    useModels.getState().resetModels();
    expect(useModels.getState().models).toEqual(DEFAULT_MODEL_CONFIG);
  });
  it('odrzucony PUT nie psuje stanu (optymistyczny zapis)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('net'))));
    useModels.getState().setModels(CUSTOM);
    await Promise.resolve();
    expect(useModels.getState().models).toEqual(CUSTOM);
  });
  it('hydrate wczytuje config z GET', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(CUSTOM)))));
    await useModels.getState().hydrate();
    expect(useModels.getState().models).toEqual(CUSTOM);
    expect(useModels.getState().modelsLoaded).toBe(true);
  });
  it('hydrate ignoruje niepoprawny config z serwera', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ sprites: [], windows: [], fallback: { sprite: 'nope', contextWindow: 1 } })))));
    await useModels.getState().hydrate();
    expect(useModels.getState().models).toEqual(DEFAULT_MODEL_CONFIG);
  });
});

describe('resolveModelLive', () => {
  it('używa aktualnego configu ze store', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}'))));
    expect(resolveModelLive('claude-opus-4-8').sprite).toBe('opus'); // DEFAULT
    useModels.setState({ models: CUSTOM });
    expect(resolveModelLive('claude-opus-4-8').sprite).toBe('haiku'); // custom
    expect(resolveModelLive('claude-opus-4-8').contextWindow).toBe(500_000);
  });
});
