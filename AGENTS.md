# Repository Guidelines

## Project Structure & Module Organization
The Vite workspace centers on `src/`, where `App.jsx` holds the prompt-building logic, `main.jsx` wires React 18 to the DOM, and `index.css` applies Tailwind layers. Static assets and the HTML shell live in `public/`. Design references or specs belong in `docs/`. Shared configuration is under `tailwind.config.js`, `postcss.config.js`, and `vite.config.js`; keep Firebase or API helpers colocated with their consuming components unless they merit a dedicated module.

## Build, Test, and Development Commands
Install once with `npm install`. Run `npm run dev` for the hot-reloading Vite server, and point collaborators to the printed localhost port. Ship artifacts via `npm run build`, which emits a production bundle in `dist/`. Use `npm run preview` to smoke-test the built output before deploying Firebase or static hosting targets.

## Coding Style & Naming Conventions
Favor small functional React components, hooks, and descriptive prop names. Follow the existing two-space indentation, ES modules, and `const` by default. Name components in `PascalCase`, helpers in `camelCase`, and Tailwind utility groups via semantic `className` strings rather than ad hoc inline styles. Centralize environment access through `import.meta.env` and place longer logic (e.g., token estimation) in extracted helpers when it aids reuse.

## Testing Guidelines
End-to-end tests use Playwright in `tests/`. Run with `npx playwright test` or `npm test`. Unit tests use `vitest` with `@testing-library/react`; store specs next to components as `ComponentName.test.jsx`. For PRs, document manual verification steps for authentication flows, Gemini calls, and history persistence. Add mock fallbacks so reviewers without secrets can exercise code paths.

## Commit & Pull Request Guidelines
Adopt Conventional Commits (e.g., `feat: add workspace history filters` or `fix: handle expired firebase session`). Keep commit scopes tight and prefer one feature or bugfix per branch. PRs should describe intent, list key changes, note required env vars, and include screenshots or short clips when UI shifts. Link to tracking issues and call out any migrations or cleanup steps for deploys.

## Security & Configuration Tips
Never hard-code keys; create a `.env.local` with the `VITE_FIREBASE_*` and `VITE_GEMINI_API_KEY` values and exclude it from commits. Initialize Firebase only when variables are present, mirroring the guard in `App.jsx`. Rotate keys after demos, and document any required IAM changes inside `docs/security.md` if security posture evolves.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.
