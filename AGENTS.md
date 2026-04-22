# AGENTS.md

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Development build (webpack) |
| `npm run dev` | Watch mode (webpack -w) |
| `npm run vscode:prepublish` | Production build |
| `npm run package` | Create VSIX package via `vsce` |
| `npm run lint` / `npm run lint:fix` | ESLint |

## Build Output

- Entry: `src/main.js`
- Produces **two** bundles: `dist/extension-node.js` and `dist/extension-web.js` (webworker target)
- Both are required by the extension (see `package.json` lines 39-40)

## No test suite

This repo has no tests. Don't look for test commands or test files.

## Notes

- Not TypeScript - plain JavaScript with Babel transpilation
- No typecheck command exists
- Uses `@vscode/test-electron` devDependency but no actual tests present