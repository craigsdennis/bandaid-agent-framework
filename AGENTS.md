# Repository Guidelines

## Project Structure & Module Organization
- `src/server.ts`: Cloudflare Worker entry (Hono app, routes, queue consumer).
- `src/agents/`: Durable Object agents (e.g., `orchestrator.ts`, `poster.ts`, `spotify-user.ts`).
- `src/workflows/`: Cloudflare Workflows (long‑running tasks like `spotify-researcher.ts`, `image-normalizer.ts`).
- `src/front-end/`: React UI (`pages/`, `components/`, `Layout.tsx`).
- `public/`: Static assets (served as SPA via Wrangler assets binding).
- `wrangler.jsonc`: Worker, DO bindings, R2, Workflows, and Images config.

## Build, Test, and Development Commands
- `npm run dev` or `npm start`: Launch Vite + Cloudflare plugin for local dev.
- `vite build`: Build worker + client bundle to `dist/`.
- `npm run deploy`: Build then `wrangler deploy` to Cloudflare.
- Optional: `wrangler dev` to run the worker directly (uses `wrangler.jsonc`).

## Coding Style & Naming Conventions
- Language: TypeScript (ES2022 target). Indentation: 2 spaces.
- Files: kebab-case for files (`spotify-user.ts`), PascalCase for exported React components and classes (`PosterAgent`).
- Functions/vars: `camelCase`. Avoid one-letter names; prefer descriptive identifiers.
- React: co-locate UI in `src/front-end/` with `.tsx` extensions; keep components small and typed.
- Agents: extend `Agent<Env, State>`; expose callable methods with `@callable()`; keep local SQL schema creation in constructor.

## Testing Guidelines
- No formal test suite yet. Validate changes by running `npm run dev` and exercising flows:
  - Upload poster → see record under Posters and normalized image.
  - Spotify login → create playlist from poster page.
- Prefer pure functions where possible for future Vitest coverage.

## Commit & Pull Request Guidelines
- Commits: present tense, concise, descriptive (e.g., “Add playlist cover from poster”).
- PRs must include:
  - Scope/summary and rationale; linked issues if applicable.
  - Screenshots or GIFs for UI changes.
  - Verification steps and any config/env changes.
  - Risk/rollback notes for Worker/DO or schema changes.

## Security & Configuration Tips
- Secrets: use `.dev.vars` for local and Wrangler secrets in CI/prod. Do not commit real keys. Keep `.dev.vars.example` updated.
- Required env: `OPENAI_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `PUBLIC_UPLOADS_HOST`, `PUBLIC_POSTERS_HOST`.
- Storage: R2 buckets `UPLOADS`/`POSTERS`; Durable Objects for agents; Workflows for background tasks. Avoid breaking bindings in `wrangler.jsonc`.

## Agent-Specific Notes
- Orchestrator name is `main`; use `getAgentByName(env.Orchestrator, "main")` for coordination.
- Poster agents are named by poster UUID; Spotify user agents by Spotify user id.
- Prefer calling agents via `agent.call("method", args)` from the UI and keep wire payloads minimal.
