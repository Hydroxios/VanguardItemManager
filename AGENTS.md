# Repository Guidelines

## Project Structure & Modules
- `src/app`: Next.js App Router entry (`layout.tsx`, `page.tsx`, routes like `login/`).
- `src/app/components`: UI components (e.g., `character/`, `destiny-ui/`, inputs, debug).
- `src/lib`: Data/domain logic (`hooks/`, `types/`, `bungie.tsx`).
- `public/`: Static assets. Build outputs in `.next/` (dev/prod) and `out/` (export).
- Config: `next.config.ts`, `tsconfig.json`, `tailwind.config.(js|ts)`, `eslint.config.mjs`, `firebase.json`.

## Build, Test, and Development
- `npm run dev`: Start local dev server (Turbopack) at `http://localhost:3000`.
- `npm run build`: Create production build.
- `npm start`: Serve the production build.
- `npm run lint`: Run ESLint using Next.js config.
- `npm run deploy`: Build then deploy to Firebase Hosting.

## Coding Style & Naming
- Language: TypeScript + React 19, Next.js 15 App Router.
- Indentation: 2 spaces; follow ESLint/Next defaults (`npm run lint`).
- Components: PascalCase files (e.g., `CharacterView.tsx`). Hooks: camelCase starting with `use`.
- Types in `src/lib/types` (`.ts`/`.d.ts`). UI in `src/app/components` (`.tsx`).
- Styling: Tailwind utility classes in components; global styles in `src/app/globals.css`.

## Testing Guidelines
- No test runner is configured yet. If adding tests:
  - Place unit tests under `src/__tests__/` with `*.test.ts`/`*.test.tsx`.
  - Focus on `src/lib/hooks` and pure utilities; add lightweight page/component tests.
  - Introduce a script (e.g., `vitest` or `jest`) and document usage in `package.json`.

## Commit & Pull Requests
- Commits: imperative, concise subject (e.g., "Fix loadout transfer when equipped").
- Branches: `feature/<short-name>`, `fix/<short-name>`.
- PRs: include summary, rationale, linked issues, screenshots for UI, and steps to verify.
- Quality gates: PRs must pass `npm run lint` and `npm run build` locally.

## Security & Configuration
- Secrets live in env files; do not commit them. Use `.env.local` for development.
- Required keys (examples): `API_KEY`, `DEV_API_KEY`, `CLIENT_ID`, `DEV_CLIENT_ID`, `CLIENT_SECRET`, `DEV_CLIENT_SECRET`.
- Do not log access tokens. Ensure OAuth redirect URIs match local/hosting settings.

