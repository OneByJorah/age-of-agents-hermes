# PHASE 2 — ARCHITECT

**Repository:** `OneByJorah/age-of-agents-hermes`
**Analysis Date:** 2026-07-05
**Analyst:** J1-PIPELINE ARCHITECT

---

## Architecture Score: 70/100 (DEGRADED)

---

## Overview

Age of Agents is a three-package npm workspaces monorepo with a clean client-server architecture. The architecture is well-designed overall, but the fork has suffered a critical regression that undermines its purpose.

---

## Strengths

### 1. Clean Separation of Concerns

The three-package structure (shared, server, client) is well-designed:

- **`packages/shared`** — Protocol types, building/mapping config, model registry, provider definitions. Single source of truth for shared types.
- **`packages/server`** — State management, source watching, security, CLI, SDK integration. No rendering logic.
- **`packages/client`** — React 19 + PixiJS v8 rendering. No state management beyond what the server broadcasts.

### 2. Agent Source Adapter Pattern

The `AgentSource` interface (`sources/types.ts`) is a clean abstraction:

```typescript
interface AgentSource {
  id: AgentKind;
  roots(): string[];
  classify(path: string, root: string): ClassifiedFile;
  parseLine(line: string): Fact[];
}
```

This made adding new agent sources (Claude, Codex, OpenCode, Koda, Local LLM) a single-file change. The `SourceWatcher` is generic and source-agnostic.

### 3. Server-Side Coordinates, Client-Side Rendering

The server broadcasts `HeroSnapshot` objects with semantic state (current tool, tokens, state kind) but never raw pixel coordinates. The client decides where each settler walks and renders the realm. This cleanly separates game logic from visualization.

### 4. State Machine Per Session

Each session gets a `SessionTracker` that consumes `Fact` objects and mutates the `World`. Lifecycle: thinking → working → awaiting-input → idle → sleeping → removed. This is format-agnostic.

### 5. Tool-to-Building Mapping as Data

The mapping from agent tools to game buildings is a `MappingConfig` object that users can edit at runtime. Three matching scopes: exact, prefix, detail. This is persisted to disk and validated server-side.

### 6. Defense-in-Depth Security

- Loopback-only bind by default
- Origin allowlist (rejects cross-origin requests)
- Session token (0600 permissions, required for sensitive operations)
- `/fs/list` confined to home directory
- Timing-safe string comparison for token verification

---

## Critical Architectural Concern

### A-01: Hermes Source Deletion — Fork Identity Lost

**Severity: CRITICAL**

The deletion of `sources/hermes.ts` and all Hermes-related code in commit `20348e7` has:

1. **Removed the fork's primary feature** — Hermes Agent visualization
2. **Broken the `AgentKind` type** — `hermes` was removed from the union type, but the `AGENT_PROVIDERS` record still doesn't include it (it was never added to the upstream's `providers.ts`)
3. **Reverted the fork to upstream parity** — The repo is now functionally identical to `agentsmill/age-of-agents`

The `AgentKind` type in `shared/src/index.ts` is:
```typescript
export type AgentKind = 'claude' | 'codex' | 'opencode' | 'koda' | 'local-llm';
```

This does NOT include `'hermes'`. The `AGENT_PROVIDERS` record in `shared/src/providers.ts` also lacks a Hermes entry.

### A-02: Dockerfile Build Context Mismatch

**Severity: DEGRADED**

Both Dockerfiles use `../../` relative paths in `COPY` instructions, but the `docker-compose.yml` sets build context to `./packages/server` and `./packages/client`. The `../../` paths would escape the build context. The Dockerfiles appear designed to be built from the repo root, not from the package directories.

### A-03: Docker Compose Architecture — Client as Separate Service

**Severity: INFO**

The Docker Compose setup runs the client as a separate container (served by Vite preview) rather than having the server serve the built client. This is a valid choice for development but adds complexity for production. The CLI distribution (`aoa`) serves the client from the server via `@fastify/static`.

### A-04: No Hermes Volume Mount in Docker Compose

**Severity: DEGRADED**

Even if the Hermes source were restored, the Docker Compose file mounts `~/.claude`, `~/.codex`, `~/.opencode`, and `~/.koda` but not `~/.hermes`. The Docker deployment would not be able to read Hermes sessions.

### A-05: Package.json Points to Upstream

**Severity: DEGRADED**

The `package.json` `repository.url`, `bugs.url`, and `homepage` all point to the upstream `agentsmill/age-of-agents` repo. This means npm audit, bug reports, and documentation links all go to the wrong place for fork users.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    age-of-agents-hermes                      │
│  (npm workspaces monorepo)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐   ┌─────────────────────────────┐  │
│  │   packages/shared    │   │   packages/server            │  │
│  │   (TypeScript types) │   │   (Node.js + Fastify + ws)   │  │
│  │                      │   │                              │  │
│  │  • AgentKind         │──▶│  • SourceWatcher             │  │
│  │  • GameEvent         │   │  • SessionTracker (state)    │  │
│  │  • HeroSnapshot      │   │  • World (in-memory)         │  │
│  │  • BuildingId        │   │  • Security Guard            │  │
│  │  • MappingConfig     │   │  • CLI (aoa)                 │  │
│  │  • ModelConfig       │   │  • SDK Bridge               │  │
│  │  • AGENT_PROVIDERS   │   │  • Proxy (Ollama/OpenAI)     │  │
│  └─────────────────────┘   └───────┬─────────────────────┘  │
│                                     │ WebSocket              │
│                                     ▼                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  packages/client                                      │   │
│  │  (Vite + React 19 + PixiJS v8)                       │   │
│  │                                                       │   │
│  │  • GameCanvas (PixiJS realm)                         │   │
│  │  • HUD (React components)                            │   │
│  │  • SidePanel (session detail)                        │   │
│  │  • Minimap, ZoomControls, ThemeSwitch                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Agent Sources (watched by server):                          │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌──────┐ ┌──────────┐        │
│  │Claude│ │Codex │ │OpenCode│ │Koda │ │Local LLM │        │
│  │JSONL │ │JSONL │ │SQLite  │ │JSONL │ │Proxy     │        │
│  └──────┘ └──────┘ └────────┘ └──────┘ └──────────┘        │
│                                                              │
│  [HERMES SOURCE — DELETED in commit 20348e7]                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Recommendations

1. **Restore the Hermes source adapter** — This is the fork's primary purpose. Re-create `sources/hermes.ts` from git history (commit `a5906e6` or `964e71b`).
2. **Add `hermes` to `AgentKind`** in `shared/src/index.ts`
3. **Add Hermes to `AGENT_PROVIDERS`** in `shared/src/providers.ts`
4. **Add Hermes to `SOURCE_IDS`** in `sources/config.ts`
5. **Add Hermes to `ALL_SOURCES`** in `sources/index.ts`
6. **Fix Dockerfile build contexts** — Either change `docker-compose.yml` to use repo root as context, or fix the Dockerfiles to use correct relative paths
7. **Add `~/.hermes` volume mount** to `docker-compose.yml`
8. **Update `package.json`** to point to the fork's repository
