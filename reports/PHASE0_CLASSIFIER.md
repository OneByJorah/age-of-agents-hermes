# PHASE 0 — CLASSIFIER

**Repository:** `OneByJorah/age-of-agents-hermes`
**Analysis Date:** 2026-07-05
**Analyst:** J1-PIPELINE CLASSIFIER

---

## PROJECT_CLASS

**Primary class:** `Web`
**Secondary classes:** `AI`, `Agent`, `CLI`, `TypeScript`, `Node.js`

### Classification Evidence

| Class | Evidence |
|-------|----------|
| **Web** | Vite + React 19 + PixiJS v8 frontend; Fastify HTTP server; WebSocket protocol; SPA with HUD, minimap, side panel |
| **AI** | Visualizes AI coding agent sessions (Claude, Codex, OpenCode, Koda, Local LLMs); agent state machine; tool-to-building mapping |
| **Agent** | Agent source adapter pattern; session lifecycle management; Claude Agent SDK integration; agent launching (BETA) |
| **CLI** | npm package with `bin` entries (`aoa`, `age-of-agents`); CLI entry point with subcommands (`local`, `local-proxy`) |
| **TypeScript** | 50+ `.ts` files, 26 `.tsx` files across 3 packages; strict TypeScript throughout |
| **Node.js** | Node.js >=22 runtime; Fastify server; npm workspaces monorepo; esbuild bundling |

### Multi-class Rationale

This is primarily a **Web** application (it renders a game world in the browser) that specializes in **AI Agent** visualization. The **CLI** class captures its npm distribution model. The **TypeScript** and **Node.js** classes describe the implementation stack.

### J1 Classification

```yaml
repo: age-of-agents-hermes
class: Web, AI, Agent, CLI, TypeScript, Node.js
org: OneByJorah
owner: Jhonattan L. Jimenez
license: MIT
production_score: 0
last_audit: 2026-07-05
standards_version: "2.1"
dependencies: []
deploy_target: scratch
tailscale_only: false
public_facing: true
```

### Notes

- This is a **fork** of `agentsmill/age-of-agents` with JorahOne-specific modifications
- The Hermes Agent source adapter (`sources/hermes.ts`) was **deleted** in commit `20348e7` — this is a critical regression for the fork's primary purpose
- No `j1.yaml` exists yet; one should be created
