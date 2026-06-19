import { create } from 'zustand';
import {
  resolveModel,
  DEFAULT_MODEL_CONFIG,
  validateModelConfig,
  type ModelConfig,
  type ResolvedModel,
} from './theme/models';

/**
 * Store edytowalnego rejestru modeli. Lokalny serwer = źródło prawdy (plik), ale
 * klient trzyma optymistyczny cache, by świat reagował NATYCHMIAST: setModels
 * ustawia stan + localStorage + PUT w tle. Bliźniak mapping-store.ts.
 */
const STORAGE_KEY = 'age-of-agents.models';

function readCache(): ModelConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_MODEL_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MODEL_CONFIG;
    const res = validateModelConfig(JSON.parse(raw));
    return res.ok ? res.config : DEFAULT_MODEL_CONFIG;
  } catch {
    return DEFAULT_MODEL_CONFIG;
  }
}

function writeCache(config: ModelConfig): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* quota / prywatny tryb → ignoruj */
  }
}

function putModels(config: ModelConfig): void {
  if (typeof fetch === 'undefined') return;
  try {
    fetch('/model-config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
    }).catch(() => {
      /* PUT nieblokujący */
    });
  } catch {
    /* synchroniczny rzut fetch */
  }
}

interface ModelStore {
  models: ModelConfig;
  modelsLoaded: boolean;
  setModels(config: ModelConfig): void;
  resetModels(): void;
  hydrate(): Promise<void>;
}

export const useModels = create<ModelStore>((set, get) => ({
  models: readCache(),
  modelsLoaded: false,
  setModels: (config) => {
    set({ models: config });
    writeCache(config);
    putModels(config);
  },
  resetModels: () => get().setModels(DEFAULT_MODEL_CONFIG),
  hydrate: async () => {
    if (typeof fetch === 'undefined') {
      set({ modelsLoaded: true });
      return;
    }
    try {
      const res = await fetch('/model-config');
      if (res.ok) {
        const parsed: unknown = await res.json();
        const v = validateModelConfig(parsed);
        if (v.ok) {
          set({ models: v.config });
          writeCache(v.config);
        }
      }
    } catch {
      /* sieć padła → zostaje cache/DEFAULT */
    }
    set({ modelsLoaded: true });
  },
}));

/**
 * Resolver dla konsumentów spoza Reacta (ticker w game/view.ts): czyta aktualny
 * config ze store przez getState — bez couplingu z drzewem React.
 */
export function resolveModelLive(model: string | undefined): ResolvedModel {
  return resolveModel(model, useModels.getState().models);
}
