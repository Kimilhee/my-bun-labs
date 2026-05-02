# ho-english

This app follows the root workspace conventions in `../../CLAUDE.md`.

## Runtime And Tooling

- Use Bun for package management and scripts: `bun install`, `bun run`, `bun test`, `bunx`.
- Do not use Node-specific commands when Bun can run the same workflow.
- Keep TypeScript strict and extend the root `tsconfig.base.json`.
- Use Biome via the root workspace configuration for formatting and linting.

## Frontend Direction

- Use the root default stack unless this app documents a reason to diverge: React 19, Vite 6, and shadcn/ui.
- The Bun-generated "don't use Vite" guidance does not apply here; Vite is the workspace default for frontend apps.
- If this app later chooses Bun HTML imports instead of Vite, document the reason in this file before changing the stack.

## Project Shape

- Start with the Basic FSD layers from the root guide: `app/`, `pages/`, and `shared/`.
- Add `widgets/`, `features/`, or `entities/` only when the app grows enough to need them.
- Keep files and directories in kebab-case.
