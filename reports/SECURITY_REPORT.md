# PHASE 3 — GUARDIAN

**Repository:** `OneByJorah/age-of-agents-hermes`
**Analysis Date:** 2026-07-05
**Analyst:** J1-PIPELINE GUARDIAN

---

## Security Score: 75/100 (DEGRADED)

| Sub-Category | Score | Status |
|--------------|-------|--------|
| Auth/AuthZ | 85 | OPERATIONAL |
| HTTPS/TLS | 50 | DEGRADED |
| CSP/Headers | 50 | DEGRADED |
| Docker Hardening | 60 | DEGRADED |
| Least Privilege | 80 | OPERATIONAL |
| Supply Chain | 70 | DEGRADED |
| Secrets | 85 | OPERATIONAL |
| AppArmor/SELinux | 0 | Not applicable |
| Rate Limiting | 50 | DEGRADED |
| Firewall/Network | 80 | OPERATIONAL |
| Input Validation | 85 | OPERATIONAL |

---

## CRITICAL Findings

### S-01: No HTTPS/TLS — Local-Only Design

**Severity: INFO (by design)**

The server binds to `127.0.0.1` only by default and has no transport encryption. This is a documented design choice for a local-first tool. The `AOA_ALLOW_REMOTE=1` override exists but warns loudly. This is acceptable for the threat model.

### S-02: No Content Security Policy

**Severity: DEGRADED**

The server does not set any Content-Security-Policy headers. While the app is local-only, CSP would protect against XSS from malicious agent transcript data rendered in the client.

### S-03: No Rate Limiting on API Endpoints

**Severity: DEGRADED**

The Fastify server has no rate limiting on any endpoint. A misbehaving client or local script could:
- Flood `/hooks` with POST requests
- Rapidly call `/sessions/launch` to start many Claude Code sessions
- Call `/hooks/install` / `/hooks/uninstall` repeatedly

While the server is local-only, rate limiting is a defense-in-depth measure.

### S-04: Docker Containers Run as Root

**Severity: DEGRADED**

Both Dockerfiles use `node:22-alpine` which runs as root by default. Neither Dockerfile creates a non-root user or uses `USER` directive. The server container has access to the Docker socket (`/var/run/docker.sock:ro`) and agent transcript directories.

---

## OPERATIONAL Findings

### O-01: Origin Allowlist (Strong)

**Status: OPERATIONAL**

The `isAllowedOrigin` function in `security/origin.ts` correctly:
- Allows missing/empty Origin (non-browser callers)
- Rejects non-loopback hosts
- Validates port matches the runtime port or dev ports (5173, 4173)
- Rejects `null` origin (sandboxed/file pages)

### O-02: Session Token (Strong)

**Status: OPERATIONAL**

The `loadOrCreateToken` function in `security/token.ts` correctly:
- Generates 32 random bytes (64 hex chars)
- Writes with `0600` permissions
- Uses atomic write (tmp + rename)
- Validates existing token format on read
- Uses `timingSafeEqual` for comparison

### O-03: Sensitive Route Protection

**Status: OPERATIONAL**

The `isSensitiveRoute` function in `security/guard.ts` correctly protects:
- `POST /sessions/launch`
- `POST /sessions/:id/message|stop`
- `POST /hooks/install|uninstall`
- `PUT /tool-mapping|model-config|permission-policy`
- `GET /fs/list`

### O-04: Loopback-Only Bind

**Status: OPERATIONAL**

The `startServer` function in `server.ts` refuses to bind to non-loopback hosts unless `AOA_ALLOW_REMOTE=1` is set. This is enforced at startup, not configurable at runtime.

### O-05: Filesystem Confinement

**Status: OPERATIONAL**

The `/fs/list` endpoint in `fs-routes.ts` is confined to the home directory. Path traversal is prevented by resolving paths and checking `isWithin(root, target)`.

### O-06: WebSocket Handshake Verification

**Status: OPERATIONAL**

The `verifyWsClient` function in `security/guard.ts` requires both:
- Allowlisted (or absent) Origin
- Valid `?token=` query parameter

### O-07: No Hardcoded Secrets

**Status: OPERATIONAL**

No hardcoded API keys, tokens, or passwords found in the codebase. The session token is generated at runtime.

### O-08: Input Validation

**Status: OPERATIONAL**

- Mapping config validation (`validateMapping`) — thorough
- Model config validation — thorough
- Permission policy validation — thorough
- CLI args validation — present
- Port validation — present

---

## Recommendations

1. **Add Content-Security-Policy header** to the Fastify server
2. **Add rate limiting** to sensitive endpoints (especially `/hooks`, `/sessions/launch`)
3. **Add non-root user** to both Dockerfiles (e.g., `USER node`)
4. **Consider HTTPS** for the `AOA_ALLOW_REMOTE=1` use case
