# ho-english

English learning app in the `my-bun-labs` workspace.

## Stack

- Bun for package management and scripts
- React 19 + Vite 6 for the frontend
- TypeScript strict mode via `../../tsconfig.base.json`
- Biome from the workspace root for formatting and linting

## Commands

Install dependencies from the workspace root:

```bash
bun install
```

Run the dev server:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```

Typecheck only:

```bash
bun run typecheck
```
