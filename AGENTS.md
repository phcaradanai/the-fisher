# Repository Guidelines

## Project Overview
King Fisher is a browser-based fishing collection RPG. The shipped milestone is Chapter 1: the Village Canal, its local King Fish, and the scout invitation. `prompt/#001.md` is the original implementation brief; `PRODUCT.md` records the approved product constraints and stack.

## Architecture & Data Flow
Keep content separate from game logic and rendering. Typed area, fish, gear, and story catalogs in `src/content/` feed the deterministic fishing rules in `src/game/core/fishing/` and Zustand game state in `src/game/state/`. `src/app/` owns semantic React UI, PixiJS scene rendering, localization, audio cues, and responsive styles. Persist versioned local progress with Zod-validated LocalStorage; no backend or account system is in scope. Keep continuous scene animation in PixiJS and expose meaningful game state through the React HUD.

## Key Directories
- `src/app/` — application shell, panels, bilingual copy, PixiJS canal scene, audio, and styles.
- `src/content/` — typed Chapter 1 area, fish, gear, story catalogs, registries, and validation.
- `src/game/core/fishing/` — seeded random source, fishing state machine, fight behavior, and catch resolution.
- `src/game/state/` — versioned save schema, serialization, progression, and Zustand store.
- `tools/content-validator/` — development-time content checks.
- `prompt/` — original product and implementation specification.

Do not add unused future systems; keep Chapter 1 focused and data-driven.

## Development Commands
Requires Node.js `>=22.12` per `package.json`.
- `npm run dev` — start the Vite development server.
- `npm run content:validate` — validate content IDs, fields, and references.
- `npm test` — run Vitest once.
- `npm run build` — type-check and build the production app.
- `npm run check` — run content validation, tests, and production build.

## Code Conventions & Common Patterns
- Prefer small modules, clear names, and pure functions for game calculations.
- Model fishing as explicit, testable state transitions with centralized seeded randomness.
- Keep fish, gear, area, and story data in the typed catalogs; use catalog registries instead of name-based conditionals or UI hardcoding.
- Use Zod to parse persisted data at the save boundary. Keep the save version explicit and preserve unreadable saves rather than silently replacing player progress.
- Keep gameplay hot paths allocation-light; cache derived equipment effects until equipment changes.
- Keep story copy in data and all player-facing copy localized in Thai and English.
- Avoid giant components/stores, circular dependencies, and architecture for out-of-scope features.

## Important Files
- `prompt/#001.md` — original Chapter 1 product and implementation brief.
- `PRODUCT.md` — approved product scope and technical constraints.
- `package.json` — runtime requirement and development scripts.
- `src/content/index.ts` and `src/content/validate.ts` — catalog lookup and validation.
- `src/game/core/fishing/engine.ts` — deterministic fishing state machine.
- `src/game/state/save.ts` and `src/game/state/game-store.ts` — save contract and progression.
- `src/app/App.tsx`, `src/app/Panels.tsx`, and `src/app/CanalScene.tsx` — app shell, player-facing panels, and PixiJS scene.

## Runtime/Tooling Preferences
Use the configured TypeScript, React, Vite, PixiJS, Zustand, Zod, and Vitest stack. Persist Chapter 1 locally in the browser. Package manager and deployment target are otherwise unspecified; follow `package.json` rather than adding tooling.

## Testing & QA
`npm run check` is the required project gate: content validation, all Vitest tests, TypeScript, and the Vite production build. Test observable fishing transitions, fight outcomes, progression, equipment effects, content references, and save serialization with fixed seeds where possible. For UI changes, inspect the actual browser surface at desktop and 390px mobile widths; verify browser console and save/reload behavior when affected. PixiJS visual implementation details are not unit-test targets.
