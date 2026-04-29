# AGENTS.md

## 命令

| 命令 | 说明 |
|---------|-------------|
| `npm run build` | 开发构建 (webpack) |
| `npm run dev` | 监听模式 (webpack -w) |
| `npm run vscode:prepublish` | 生产构建 |
| `npm run package` | 通过 `vsce` 创建 VSIX 包 |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run typecheck` | TypeScript 类型检查 |

## 构建输出

- 入口：`src/main.ts`
- 生成**两个**包：`dist/extension-node.js` 和 `dist/extension-web.js`（webworker 目标）
- 插件需要两个包（参见 `package.json` 第 39-40 行）

## 无测试套件

本仓库没有测试。不要查找测试命令或测试文件。

## 说明

- **TypeScript**，目标 ES2019，webpack + ts-loader
- `@types/vscode` 锁定到 `^1.57.0`，兼容 VS Code 1.57+
- ESLint 升级到 v8 + `@typescript-eslint/parser`，支持 TypeScript
- 无 `declaration` 输出（由 webpack 打包）
