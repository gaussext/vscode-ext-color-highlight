# AGENTS.md

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Development build (webpack) |
| `npm run dev` | Watch mode (webpack -w) |
| `npm run vscode:prepublish` | Production build |
| `npm run package` | Create VSIX package via `vsce` |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run typecheck` | TypeScript type checking |

## Build Output

- Entry: `src/main.ts`
- Produces **two** bundles: `dist/extension-node.js` and `dist/extension-web.js` (webworker target)
- Both are required by the extension (see `package.json` lines 39-40)

## No test suite

This repo has no tests. Don't look for test commands or test files.

## Notes

- **TypeScript** with ES2019 target, webpack + ts-loader
- `@types/vscode` pinned to `^1.57.0` for VS Code 1.57+ compatibility
- ESLint upgraded to v8 + `@typescript-eslint/parser` for TypeScript support
- No `declaration` output (bundled by webpack)