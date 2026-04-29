# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Development build (webpack) |
| `npm run dev` | Watch mode (webpack -w) |
| `npm run vscode:prepublish` | Production build |
| `npm run package` | Create VSIX package via `vsce` |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run all Jest tests |
| `npx jest test/hex.test.ts` | Run a single test file |

## Architecture

This is a VS Code extension that highlights color values in the editor using `TextEditorDecorationType`.

### Entry Point

`src/main.ts` — activates on `onStartupFinished`. Manages a map of `DocumentHighlight` instances keyed by visible text editor. Reacts to visible editor changes and config changes.

### Core Loop (`src/color-highlight.ts`)

`DocumentHighlight` class orchestrates all color-finding strategies in parallel via `Promise.all`, groups results by color, and applies/updates VS Code decorations on the visible editors.

### Color Finding Strategies (`src/find/`)

Each strategy is a function `(text: string) => Promise<ColorMatch[]>` that scans raw document text and returns `{start, end, color}` (string positions + normalized color string).

- **`hex.ts`** — `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, `0x` prefix. Supports ARGB mode (configurable).
- **`functions.ts`** — `rgb()`, `rgba()`, `hsl()`, `hsla()`, `lch()`, `oklch()` + CSS var color function syntax (`--name-rgb: values;`), plus a `sortStringsInDescendingOrder` utility used across variable strategies.
- **`words.ts`** — Named web colors from the `color-name` package. Rejects matches preceded by `-`, `@`, or `#`.
- **`hwb.ts`** — `hwb()` function.
- **`rgbWithoutFunction.ts`** — RGB values without function wrapper (e.g., `255, 0, 0`).
- **`hslWithoutFunction.ts`** — HSL values without function wrapper (e.g., `120, 100%, 50%`).

### Variable Resolution Strategies (`src/strategies/`)

These resolve CSS/SCSS/Less/Stylus variable references to their color values:

- **`css-vars.ts`** — CSS custom properties (`--var` / `var()`), with recursive resolution (max depth 5).
- **`scss-vars.ts`** — SCSS `$variables`, with `@import` resolution via `file-importer`.
- **`less-vars.ts`** — Less `@variables`.
- **`styl-vars.ts`** — Stylus `variables` (= syntax).

All variable strategies follow the same pattern: find variable definitions → resolve values using color find strategies → build a reverse regex to match variable usages → replace with color. They use `sortStringsInDescendingOrder` to avoid partial-name collisions.

### Importers (`src/importer/`)

- **`sass-importer.ts`** — Wraps the `file-importer` package to resolve SCSS `@import` chains.
- **`global-importer.ts`** — Reads global variable definition files from `color-highlight.globalPaths` config (relative to workspace root). Used by CSS/SCSS/Less strategies.

### Decoration System (`src/lib/`)

- **`decoration-map.ts`** — `DecorationMap` class lazily creates `TextEditorDecorationType` instances per unique color. Supports marker types: `background` (default), `dot-before`, `dot-after`, `foreground`, `outline`, `underline`.
- **`dynamic-contrast.ts`** — Computes WCAG relative luminance to pick black or white text for the background marker type.

### Build Output

- Entry: `src/main.ts`
- Produces **two** webpack bundles: `dist/extension-node.js` (node target) and `dist/extension-web.js` (webworker target)
- Both required in `package.json` (`main` and `browser` fields)

### Testing

- Jest with `ts-jest` preset
- Tests in `test/` matching `*.test.ts`
- Coverage collected from `src/find/*.ts`
- Test files exist for: hex, functions, words, hwb, rgbWithoutFunction, hslWithoutFunction
