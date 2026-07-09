# PHASE 1 — AUDITOR

**Repository:** `OneByJorah/age-of-agents-hermes`
**Analysis Date:** 2026-07-05
**Analyst:** J1-PIPELINE AUDITOR

---

## Scoring Breakdown

| Category | Weight | Score | Status |
|----------|--------|-------|--------|
| Security | 20% | 75 | DEGRADED |
| Architecture | 15% | 70 | DEGRADED |
| Documentation | 15% | 60 | DEGRADED |
| Testing | 15% | 90 | OPERATIONAL |
| Deployment | 10% | 70 | DEGRADED |
| Automation | 10% | 80 | DEGRADED |
| GitHub Quality | 10% | 85 | DEGRADED |
| Branding | 5% | 50 | CRITICAL |
| **Production Score** | **100%** | **73** | **DEGRADED** |

**Overall Status: DEGRADED** (below 90, above 70)

---

## CRITICAL Findings

### C-01: Hermes Source Adapter Deleted (Branding / Architecture)

**Severity: CRITICAL**
**File:** `packages/server/src/sources/hermes.ts` (deleted)
**Commit:** `20348e7` ("Apply ruff auto-fixes and portfolio standardization")

The entire Hermes Agent source adapter (`sources/hermes.ts`) was deleted. This is the **primary reason the fork exists**. The deletion also removed:

- `hermes` from `ALL_SOURCES` in `sources/index.ts`
- `hermes` from `SOURCE_IDS` in `sources/config.ts`
- `hermes` from `AGENT_PROVIDERS` in `shared/src/providers.ts`
- `hermes` from `AgentKind` type in `shared/src/index.ts`
- `SOURCES` changed from `activeSources('hermes')` to `activeSources()`
- `primaryWatcher` logic reverted to `claudeWatcher` in `server.ts`
- Tailscale IP (`100.92.150.99`) removed from `LOOPBACK_HOSTS` in `origin.ts`

**Impact:** The fork no longer supports Hermes Agent visualization — its core differentiating feature. The repo is now functionally identical to upstream.

### C-02: INTENT.md Stale — References Deleted Hermes Source

**Severity: CRITICAL**
**File:** `INTENT.md`

INTENT.md claims `sources/hermes.ts` exists and describes Hermes integration features that were deleted in commit `20348e7`. Every claim about Hermes support is now false.

### C-03: README Does Not Mention Hermes Agent

**Severity: CRITICAL**
**File:** `README.md`

The README is the upstream version. It lists supported sources as `claude, codex, opencode, koda` and does not mention Hermes Agent. The `AOA_SOURCES` env var documentation doesn't include `hermes`. The `git clone` URL points to `agentsmill/age-of-agents` (upstream), not the fork.

---

## DEGRADED Findings

### D-01: Dependabot `pip` Ecosystem — No Python Files

**Severity: DEGRADED**
**File:** `.github/dependabot.yml` (lines 3-7)

Dependabot is configured for the `pip` ecosystem, but the repo contains zero Python files. This is a template vestige. The `npm`, `docker`, and `github-actions` entries are correct.

### D-02: CodeQL `python` Language — No Python Files

**Severity: DEGRADED**
**File:** `.github/workflows/codeql.yml` (line 22)

CodeQL matrix includes `python` but the repo has zero Python files. This is a template vestige. The `javascript` and `typescript` entries are correct.

### D-03: Dockerfile COPY Paths May Fail

**Severity: DEGRADED**
**Files:** `packages/server/Dockerfile`, `packages/client/Dockerfile`

Both Dockerfiles use `../../` relative paths (e.g., `COPY ../../package.json ../../package-lock.json* ./`). These paths are relative to the Docker build context, which is set to `./packages/server` and `./packages/client` respectively in `docker-compose.yml`. The `../../` paths would escape the build context and fail unless the context is the repo root. The `docker-compose.yml` sets `context: ./packages/server` and `context: ./packages/client`, which means the `../../` paths would reference directories outside the build context.

### D-04: Docker Compose Missing Hermes Volume Mount

**Severity: DEGRADED**
**File:** `docker-compose.yml`

The Docker Compose file mounts `~/.claude`, `~/.codex`, `~/.opencode`, and `~/.koda` but does NOT mount `~/.hermes`. Even if the Hermes source were restored, the Docker deployment would not be able to read Hermes sessions.

### D-05: No `j1.yaml` at Repo Root

**Severity: DEGRADED**

The J1-PIPELINE requires a `j1.yaml` at the repo root. This file does not exist.

### D-06: No `.gitignore` Entry for `reports/`

**Severity: DEGRADED**
**File:** `.gitignore`

The `reports/` directory created by the pipeline is not in `.gitignore` and will show as untracked.

### D-07: Package.json Points to Upstream Repository

**Severity: DEGRADED**
**File:** `package.json` (lines 9-12)

The `repository.url` and `bugs.url` fields point to `github.com/agentsmill/age-of-agents` (upstream), not `github.com/OneByJorah/age-of-agents-hermes` (fork). The `homepage` also points to the upstream GitHub Pages site.

### D-08: LICENSE Copyright Holder is Upstream Author

**Severity: DEGRADED**
**File:** `LICENSE` (line 3)

The copyright is `Copyright (c) 2026 Mateusz Pawelczuk` (upstream author). The fork's modifications should be attributed to JorahOne LLC.

### D-09: SECURITY.md References Old Email

**Severity: DEGRADED**
**File:** `SECURITY.md` (line 15)

The security contact email is `j1admin@onebyjorah.com`. While commit `05f193e` sanitized emails in `CODE_OF_CONDUCT.md` and `SECURITY.md`, the `SECURITY.md` still contains the original email in the reporting section.

### D-10: No CHANGELOG.md

**Severity: MINOR**

No `CHANGELOG.md` exists. The upstream uses git tags for releases, but there's no changelog documenting fork-specific changes.

---

## OPERATIONAL Findings

### O-01: Test Suite

**Status: OPERATIONAL (Score: 90)**

- 40+ test files across server and client packages
- Vitest test framework
- Tests cover: world, state machine, security (origin, token, bind, guard), sources, CLI args, mapping, model config, hooks, SDK bridge, Docker client, opencode poller, local LLM
- No test files for the (now-deleted) Hermes source

### O-02: CI/CD

**Status: OPERATIONAL**

- CodeQL analysis (JS/TS) — functional
- npm publish workflow — functional
- Dependabot for npm, docker, github-actions — functional

### O-03: Community Files

**Status: OPERATIONAL**

- `CODE_OF_CONDUCT.md` — present, sanitized
- `CONTRIBUTING.md` — present
- `SECURITY.md` — present (with stale email)
- `LICENSE` — MIT
- Issue templates (bug report + feature request) — present
- PR template — present

### O-04: Docker Deployment

**Status: DEGRADED (see D-03, D-04)**

- `docker-compose.yml` with health checks, restart policy, volume mounts
- Two Dockerfiles (server + client)
- Health check script (`scripts/healthcheck.sh`)

### O-05: Documentation

**Status: DEGRADED**

- `docs/` directory with launch-agent guide and screenshots — present
- `docs/superpowers/` with plans, specs, notes — extensive
- README is comprehensive but upstream-focused (no Hermes mention)
- No fork-specific documentation

---

## Summary of Findings

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| C-01 | Hermes source adapter deleted | CRITICAL | Branding/Architecture |
| C-02 | INTENT.md stale — references deleted Hermes source | CRITICAL | Documentation |
| C-03 | README doesn't mention Hermes Agent | CRITICAL | Documentation |
| D-01 | Dependabot `pip` ecosystem — no Python files | DEGRADED | Automation |
| D-02 | CodeQL `python` language — no Python files | DEGRADED | Automation |
| D-03 | Dockerfile COPY paths may fail | DEGRADED | Deployment |
| D-04 | Docker Compose missing Hermes volume mount | DEGRADED | Deployment |
| D-05 | No `j1.yaml` at repo root | DEGRADED | Automation |
| D-06 | No `.gitignore` entry for `reports/` | DEGRADED | Automation |
| D-07 | Package.json points to upstream repository | DEGRADED | Branding |
| D-08 | LICENSE copyright holder is upstream author | DEGRADED | Branding |
| D-09 | SECURITY.md references old email | DEGRADED | Documentation |
| D-10 | No CHANGELOG.md | MINOR | Documentation |
