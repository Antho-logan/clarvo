# CLAUDE.md — repo rules for Claude Code

## npm lockfile trap (MUST read before any npm install)

This repo depends on `@rolldown/binding-wasm32-wasi` and
`@tailwindcss/oxide-wasm32-wasi`. Between them they pull in TWO different
versions of `@emnapi/core` / `@emnapi/runtime`:

- **Top-level `@emnapi/core@1.10.0`** (marked `dev: true, optional: true`)
  — brought in by `@napi-rs/wasm-runtime` under `@tailwindcss/oxide-wasm32-wasi`
- **Nested `@emnapi/core@1.9.2`** at
  `node_modules/@rolldown/binding-wasm32-wasi/node_modules/@emnapi/core` —
  pinned by `@rolldown/binding-wasm32-wasi`

CI runs `npm ci` on Linux (ubuntu-latest) and requires BOTH sets to be
in the lockfile. If either is missing, CI fails with
`Missing: @emnapi/core@1.x.x from lock file`.

### The rule (do not deviate)

**Never regenerate `package-lock.json` on macOS.** `npm install` on macOS
— even with `--include=optional`, `--force`, or `--os=linux` — drops one
or the other set of emnapi entries from the lockfile. This has bitten us
multiple times.

**Always regenerate the lockfile inside a Linux glibc container:**

```bash
rm package-lock.json
docker run --rm -v "$(pwd):/app" -w /app node:22-bookworm-slim \
  bash -c "npm install --package-lock-only --include=optional"
```

(Use `node:22-bookworm-slim` specifically — alpine uses musl and picks
different platform binaries. `node:22-bookworm-slim` matches CI's
ubuntu-latest glibc environment.)

### Verification gate (do not skip)

After regenerating, verify BOTH entry sets are present:

```bash
grep -B1 '"version": "1.10.0"' package-lock.json | grep emnapi   # must match
grep -B1 '"version": "1.9.2"'  package-lock.json | grep emnapi   # must match
npm ci                                                           # must exit 0
```

All three checks must pass before committing. If any fails, redo the
regenerate step — do not try to hand-patch the lockfile.

### Why

The top-level `@emnapi/core@1.10.0` is at the root of `node_modules/`.
The rolldown wasm32-wasi binding pins its own nested `@emnapi/core@1.9.2`.
Both must be in the lockfile because CI is strict about platform-scoped
optional deps. macOS's npm resolves optional deps differently — it keeps
the platform binaries the host needs and prunes sibling subgraphs it
considers redundant, even though CI on a different platform needs them.

If you see a commit like "fix: sync package-lock.json with package.json"
or "fix(ci): regenerate lockfile" in the history, it was this exact trap.
Do not re-trigger it.

## Preview / local dev

- `.claude/launch.json` defines four preview configs: `next-dev`,
  `fastapi`, `celery-worker`, `docker-compose`. Use `mcp__Claude_Preview__preview_start`
  with the config name.
- For UI previews without running the full auth pipeline, set
  `AUTH_DEV_BYPASS=true` in `.env.local`. The middleware and the dashboard
  layout honor this flag and render a synthetic demo user. The flag is
  documented in `.env.example`; never default it to true in committed config.

## Backend tests & type checks

- `pytest` is required to stay at ≥ 80% coverage on repos / parsers /
  sources / search / api (enforced by `--cov-fail-under=80` in CI).
- `mypy --strict` is expected to be clean on those same modules.
- Test DB connection string uses `postgresql+psycopg://` (psycopg3), not
  `psycopg2`.
