# vscode-ext-color-highlight

VS Code 颜色高亮插件，支持全局变量

## Configuration

```json
{    
    "color-highlight.enable": true,
    "color-highlight.css.globalPaths": ["./variables.css"],
    "color-highlight.sass.globalPaths": ["./variables.scss"],
}
```

## Features

- [x] 支持全局的 CSS 变量
- [x] 支持递归的 CSS 变量 
- [x] 支持全局的 SASS 变量
- [x] 支持全局的 LESS 变量

## Build

```bash
npm i
npm run vsce
code --install-extension your-extension.vsix
```
