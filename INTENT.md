# INTENT.md — J1-PIPELINE Phase -1 (ORACLE)

**Repository:** `OneByJorah/age-of-agents-hermes`
**Analysis Date:** 2026-07-05
**Analyst:** J1-PIPELINE ORACLE (read-only)
**Status:** Intent Reconstructed

---

## What This System Does

**Age of Agents** (npm package `age-of-agents`) is a local-first web application that visualizes AI coding agent sessions as a calm, pixel-art real-time strategy realm. It runs alongside a developer's normal CLI workflow, watching agent session transcripts and rendering them as an ambient, glanceable game world.

### Technical Role

The system is a three-package monorepo (npm workspaces):

| Package | Stack | Responsibility |
|---------|-------|----------------|
| `packages/shared` | TypeScript | WebSocket protocol types (`GameEvent`, `HeroSnapshot`, `BuildingId`, `MappingConfig`, `ModelConfig`) |
| `packages/server` | Node.js + Fastify + `ws` + SQLite | Transcript watcher (chokidar), per-session state machine, HTTP hooks endpoint, demo scenario generator, CLI entry point, security guard (origin allowlist + session token), Docker container auto-discovery |
| `packages/client` | Vite + React 19 + PixiJS v8 | Pixel-art game realm (fantasy top-down + sci-fi isometric), HUD, minimap, side panel, building/tool mapping editor, model registry editor, session detail panel |

**Data flow:**
```
agent session transcript (JSONL) ──▶ server (watcher + state machine) ──▶ WebSocket ──▶ client (PixiJS realm + HUD)
```

**Supported agent sources:**
- **Claude Code** — reads `~/.claude/projects/<project>/<uuid>.jsonl` + HTTP hooks
- **Codex (OpenAI)** — reads `~/.codex/sessions/<date>/<uuid>.jsonl`
- **OpenCode** — reads SQLite state DB (`~/.opencode/state.db`)
- **Koda** — reads `~/.koda/sessions/<uuid>.jsonl`
- **Hermes Agent** — reads `~/.hermes/state.db` + `~/.hermes/logs/` (JorahOne fork addition)
- **Local LLMs** — Ollama/llama.cpp/vLLM/oMLX via bundled logging proxy (`aoa local` / `aoa local-proxy`)

### Operational Role

The system serves as a **second-monitor dashboard** for developers running multiple AI coding agents simultaneously. It provides:

- **Ambient awareness** — at a glance, see which sessions are active, what tools they're using, and their token consumption
- **Multi-project city view** — each project becomes a switchable city; the "All" view shows every settler together
- **Session inspection** — click a settler to see its task, token economy, recent tool actions, and transcript
- **Project intel (optional)** — integrates with Beads (AI-native issue tracker) and Graphify (code knowledge graph)
- **Agent launching (BETA)** — start Claude Code sessions from the panel via the Claude Agent SDK
- **Interactive mode (off by default)** — answer permission prompts and plan approvals from the panel

---

## Why This Was Built

### Real Problem

AI coding agents (Claude Code, Codex, OpenCode, Koda, Hermes) operate invisibly inside terminal sessions. A developer running multiple agents across several projects has no way to glance at what's happening — which sessions are active, what tools are being used, how many tokens are being consumed, or whether an agent is stuck waiting for input. The only feedback is the terminal itself, which is buried in scrollback and doesn't scale across projects.

The problem is one of **ambient observability**: developers need a calm, glanceable view of agent activity that doesn't require switching contexts or reading log files.

### Why Existing Tools Were Insufficient

- **AgentCraft** (getagentcraft.com) pioneered the concept of visualizing Claude Code sessions as a game world, but it was a closed-source product with no extensibility, no support for non-Claude agents, and no path for integration with the JorahOne ecosystem.
- **Terminal multiplexers** (tmux, screen) show raw output but provide no semantic understanding of agent state, tool usage, or token economics.
- **Log viewers** (tail, less, journalctl) are text-only and don't provide the ambient, at-a-glance awareness that a visual game world offers.
- **Custom dashboards** (Grafana, etc.) are overkill for a single-developer tool and don't map naturally to the session lifecycle metaphor.
- **No existing tool** supported the full range of agent CLIs (Claude, Codex, OpenCode, Koda, Hermes) or provided the extensible tool-to-building mapping that Age of Agents offers.

### What Triggered Development

The upstream project was created by **Mateusz Pawelczuk** (agentsmill/age-of-agents) to solve the ambient observability problem for Claude Code users. The JorahOne fork (`age-of-agents-hermes`) was created because:

1. **Hermes Agent integration** — JorahOne's primary AI agent platform (Hermes Agent by Nous Research) needed to be visualized alongside other agents. The upstream project had no Hermes source.
2. **JorahOne ecosystem fit** — The fork adds Hermes provider bindings, Tailscale origin support, separate port allocation (AOA on 8124, VideIT dashboard on 8123), and Hermes state.db session seeding.
3. **Production hardening** — The fork adds Docker Compose with health checks, security hardening (origin allowlist, session token), and CI/CD integration tailored to JorahOne's infrastructure.

### Ecosystem Fit

```
JorahOne Ecosystem
├── Hermes Agent (primary AI agent platform)
├── age-of-agents-hermes (ambient agent visualization)
│   ├── Reads Hermes state.db + logs
│   ├── Reads Claude/Codex/OpenCode/Koda transcripts
│   └── Provides glanceable dashboard
├── VideIT (dashboard — separate port)
├── Other JorahOne services (ADSentinel, EdgeRouter, etc.)
└── J1-PIPELINE (orchestration layer)
```

The repo is a **fork** of the upstream `agentsmill/age-of-agents` with JorahOne-specific modifications. The upstream is maintained separately; this fork tracks upstream changes and adds Hermes integration, security hardening, and production deployment configuration.

---

## Operational Classification

**Classification: PRODUCTION**

Evidence:
- **Published npm package** — `age-of-agents` v0.8.1 on npmjs.com, with `bin` entries (`aoa`, `age-of-agents`)
- **Docker Compose deployment** — `docker-compose.yml` with server + client services, health checks, restart policy, volume mounts for agent transcripts
- **Health check script** — `scripts/healthcheck.sh` validates both server and client endpoints
- **CI/CD** — GitHub Actions: CodeQL analysis (JS/TS/Python) + npm publish workflow triggered by version tags
- **Security hardening** — Origin allowlist, session token (0600 permissions), loopback-only bind by default, `AOA_ALLOW_REMOTE` guard, `/fs/list` confined to home directory
- **Comprehensive test suite** — 40+ test files across server and client packages (vitest)
- **Community readiness** — `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` (MIT), issue templates (bug report + feature request), PR template
- **Dependabot** — configured for npm, docker, and github-actions ecosystems
- **Version tags** — 20+ semantic version tags from v0.1.1 through v0.8.1
- **Documentation** — Full README with quick start, architecture, privacy, security, themes, contributing guide; `docs/` directory with launch-agent guide and screenshots
- **Security audit in git history** — Commit `05f193e` sanitized emails in community files

---

## Key Architectural Decisions

1. **Agent source adapter pattern** — Each CLI (Claude, Codex, OpenCode, Koda, Hermes, local-LLM) has its own `AgentSource` module that encapsulates all location and format knowledge. The `SourceWatcher` is generic and source-agnostic. This made adding Hermes support a single-file change.

2. **State machine per session** — Each session gets a `SessionTracker` that consumes `Fact` objects (from transcript lines or HTTP hooks) and mutates the `World`. The state machine is format-agnostic — it doesn't know about JSONL, SQLite, or HTTP. Lifecycle: thinking → working → awaiting-input → idle → sleeping → removed.

3. **Server-side rendering coordinates, client-side rendering positions** — The server broadcasts `HeroSnapshot` objects with semantic state (current tool, tokens, state kind) but never raw pixel coordinates. The client decides where each settler walks and renders the realm. This cleanly separates game logic from visualization.

4. **Tool-to-building mapping as data, not code** — The mapping from agent tools (Edit, Bash, WebSearch) to game buildings (forge, mine, tower) is a `MappingConfig` object that users can edit at runtime. Three matching scopes: exact, prefix (e.g., `mcp__`), and detail (tool + regex). This is persisted to disk and validated server-side.

5. **Local-first with defense-in-depth security** — The server binds to `127.0.0.1` only. Two security layers protect against malicious web pages: origin allowlist (rejects cross-origin requests) and session token (required for sensitive operations). The token is auto-created on first run with `0600` permissions.

6. **Docker auto-discovery** — Containerized Claude sessions are detected via `docker ps` and read via `docker exec` — no image changes or host bind-mounts required. Containerized settlers carry a 🐳 badge.

7. **Dual theme system** — Two complete art sets (fantasy top-down + sci-fi isometric) switchable at runtime, with different building sets, terrain, and unit sprites per theme.

8. **Optional interactive mode** — By default, Age of Agents is a passive read-only observer. An opt-in interactive mode lets the panel answer Claude Code permission prompts and plan approvals via local hooks, with timeout fallback to terminal.

---

## Repository Structure

```
age-of-agents-hermes/
├── .claude/
│   └── launch.json              # VS Code/Claude launch configurations
├── .github/
│   ├── dependabot.yml           # Dependabot for npm, docker, pip, github-actions
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── codeql.yml           # CodeQL analysis (JS/TS/Python)
│       └── publish.yml          # npm publish on version tags
├── docs/
│   ├── index.html               # GitHub Pages landing page
│   ├── launch-agent.md          # Guide for launching agents from the panel
│   ├── screenshots/             # 3 PNG screenshots (fantasy, scifi, session panel)
│   └── superpowers/             # Notes, plans, specs (JorahOne internal docs)
├── packages/
│   ├── client/                  # Vite + React 19 + PixiJS v8 frontend
│   │   ├── src/                 # React components, PixiJS game, HUD, stores
│   │   ├── tests/               # Client unit tests
│   │   ├── public/assets/       # PixelLab-generated pixel art
│   │   ├── Dockerfile
│   │   └── vite.config.ts
│   ├── server/                  # Node.js + Fastify + WebSocket backend
│   │   ├── src/
│   │   │   ├── arsenal/         # Skills/connectors/agents reader
│   │   │   ├── demo/            # Demo scenario generator
│   │   │   ├── proxy/           # Ollama + OpenAI logging proxies
│   │   │   ├── sdk/             # Claude Agent SDK integration (real + fake runners)
│   │   │   ├── security/        # Origin allowlist, session token, request guard
│   │   │   ├── sources/         # Agent source adapters (claude, codex, opencode, koda, hermes, local-llm)
│   │   │   ├── transcript/      # JSONL parser, tail, facts, title
│   │   │   ├── cli.ts           # CLI entry point
│   │   │   ├── server.ts        # Fastify server setup
│   │   │   ├── watcher.ts       # Generic source watcher
│   │   │   ├── world.ts         # In-memory world state
│   │   │   └── state-machine.ts # Per-session state machine
│   │   ├── test/                # 30+ server test files
│   │   ├── Dockerfile
│   │   └── package.json
│   └── shared/                  # Shared TypeScript types
│       └── src/
│           ├── index.ts         # GameEvent, HeroSnapshot, BuildingId, MappingConfig
│           ├── providers.ts     # Agent provider definitions (Claude, Codex, etc.)
│           ├── arsenal.ts       # Arsenal types
│           └── pending.ts       # Pending question types
├── scripts/
│   ├── build-server.mjs         # esbuild bundler for CLI distribution
│   ├── download-assets.mjs      # Optional third-party asset installer
│   ├── healthcheck.sh           # Docker health check script
│   ├── preview-*.ts             # Preview scripts for tilemap, terrain, scene
│   └── pixellab/                # PixelLab asset pipeline scripts
├── assets-manifest.json         # Optional third-party asset pack manifest
├── docker-compose.yml           # Production Docker Compose
├── package.json                 # Root workspace config (age-of-agents v0.8.1)
├── package-lock.json
├── README.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── .gitignore
└── INTENT.md                    # This file
```

---

## Notes

### JorahOne Fork Specifics

- **Upstream:** `https://github.com/agentsmill/age-of-agents` (original author: Mateusz Pawelczuk)
- **Fork:** `https://github.com/OneByJorah/age-of-agents-hermes`
- **13 Hermes-specific commits** in the fork's history, adding:
  - Hermes Agent source adapter (`sources/hermes.ts`)
  - Hermes provider to `AGENT_PROVIDERS`
  - Hermes state.db session seeding at startup
  - Separate port allocation (AOA on 8124, VideIT on 8123)
  - Tailscale origin support in security guard
  - Security audit (email sanitization in community files)

### Config Drift — Dependabot

- **Dependabot is configured for `pip` ecosystem** (`dependabot.yml` line 3-7), but this repository contains **no Python files**. The `pip` entry is a template vestige from the J1-PIPELINE bootstrap. It should be removed or replaced with a valid ecosystem. The `npm`, `docker`, and `github-actions` entries are correct.

### Empty Directories

- `docs/superpowers/notes/`, `docs/superpowers/plans/`, `docs/superpowers/specs/` — appear to be JorahOne internal documentation directories. Contents were not analyzed in this read-only pass.

### Security Audit

- Commit `05f193e` ("audit(age-of-agents-hermes): sanitize emails in community files") replaced `j1admin@onebyjorah.com` with `conduct@` and `security@` aliases in `CODE_OF_CONDUCT.md` and `SECURITY.md`. This is a positive maturity signal.

### Branding

- The repo name (`age-of-agents-hermes`) differs from the upstream brand (`age-of-agents`). The npm package name remains `age-of-agents` (not `age-of-agents-hermes`). This is intentional — the fork tracks upstream but the npm publish workflow publishes under the original name. The `-hermes` suffix distinguishes the fork at the repository level.

### Hermes Source Status

- The Hermes source file (`sources/hermes.ts`) was added in commit `a5906e6` and refined across 12 subsequent commits. It reads from `~/.hermes/state.db` (SQLite) and `~/.hermes/logs/`. The `classify` method currently returns `{ kind: "other" }` for all files — meaning Hermes sessions are primarily seeded from the state DB rather than from file system watcher events. This is a design choice: Hermes uses a database-driven approach rather than the JSONL file watching used by other sources.
