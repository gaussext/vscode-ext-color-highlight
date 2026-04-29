# 性能分析与优化：DocumentHighlight.onUpdate 多重调用

## 问题现象

`DocumentHighlight.onUpdate` 在单次用户操作中被多次调用，导致大量冗余的全文档重新扫描和 `setDecorations` 操作。

## 根因分析

### 两条独立的调用路径

`onUpdate` 有两条完全独立的触发路径，且没有任何去重机制：

| 路径 | 触发点 | 文件 | 行号 |
|------|--------|------|------|
| **A** — 文档内容变更 | `onDidChangeTextDocument` 事件 | `src/color-highlight.ts` | 116 |
| **B** — 编辑器状态变更 | `doHighlight()` → 遍历所有实例 | `src/main.ts` | 86 (旧) |

### 路径 A：文档内容变更（每按键触发）

```
用户键盘输入
  →  VS Code 触发 onDidChangeTextDocument
    →  DocumentHighlight.onUpdate(document)
      →  updateRange(text, version)
        →  Promise.all(strategies)   // 全文档扫描
        →  editor.setDecorations(...)
```

注册于 `constructor → initialize()`，每个 `DocumentHighlight` 实例在创建时都会注册此监听器。

### 路径 B：编辑器状态变更（冗余触发）

```
标签切换 / 分屏 / 打开文件
  →  onDidChangeVisibleTextEditors
    →  onOpenEditor()
      →  doHighlight(validDocuments)
        →  findOrCreateInstance(doc)   // 已有实例直接返回
        →  instance.onUpdate()         // ★ 对已有实例也调用
```

`doHighlight` 对 `validDocuments` 中**所有**实例都调用 `onUpdate()`，而不仅仅是新建实例。

### 串联场景：两条路径叠加重合

| 场景 | 路径 A 触发 | 路径 B 触发 | 冗余次数 |
|------|------------|------------|---------|
| 用户键入文字 | ✅ 每次按键 | 偶尔（编辑器状态变化） | 1-2 次 |
| 打开新文件 | ✅ 实例创建后 | ✅ `onOpenEditor` → `doHighlight` | 2 次 |
| 切换标签 | ❌ | ✅ 对已有实例 | 1 次（冗余） |
| 配置变更 (`reactivate`) | ✅ 重新创建实例 | ✅ `onOpenEditor` | 2+ 次 |
| 手动命令 (`extension.colorHighlight`) | ❌ | ✅ | 1 次（期望） |

### 更深入的问题：无防抖

除了多重调用，所有路径都缺乏防抖/节流机制：

- **每次调用都完整执行**：`Promise.all(this.strategies.map(fn => fn(text)))` 在全部策略上跑全量扫描
- **版本检查不阻止计算**：`updateRange` 的版本检查（原 `color-highlight.ts:133-139`）发生在 `Promise.all` 完成之后，计算开销已经产生
- **连续输入的放大效应**：快速键入时，N 次按键产生 N 次全量扫描，只有最后一次的结果被应用

---

## 优化方案

### 改动 1：消除冗余调用（`src/main.ts`）

**思路**：`onDidChangeTextDocument` 已经覆盖了内容变更后的更新，`doHighlight` 路径对已有实例的 `onUpdate` 是冗余的。

**变更**：

| 函数 | 旧行为 | 新行为 |
|------|--------|--------|
| `findOrCreateInstance` | 仅创建/查找实例 | 创建新实例后立即调用 `instance.onUpdate()` |
| `doHighlight` | 对所有实例调用 `onUpdate()` | 只创建/查找实例，不再调用 `onUpdate` |
| `runHighlightEditorCommand` | 委托 `doHighlight` | 改为 `findOrCreateInstance` + 强制 `onUpdate`（手动命令需要） |

**效果**：
- 切换标签/分屏时，已有实例不会收到冗余的 `onUpdate` 调用
- 手动命令仍然强制刷新
- 初次打开文件时 `onUpdate` 正常触发

### 改动 2：防抖合并快速连续触发（`src/color-highlight.ts`）

**思路**：路径 A（`onDidChangeTextDocument`）是高频路径，需要防抖；路径 B（直接调用）是低频/一次性路径，需要即时响应。将两者分离。

**变更**：

```typescript
// 新增：防抖的文档变更处理
private onDocumentChanged(document: vscode.TextDocument): void {
    if (this.disposed || this.document.uri.toString() !== document.uri.toString()) {
      return;
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    const text = this.document.getText();
    const version = this.document.version.toString();
    this.updateTimeout = setTimeout(() => {
      this.updateTimeout = undefined;
      this.updateRange(text, version);
    }, 150);  // 150ms 防抖窗口
}

// 保留：即时更新入口（供 main.ts 直接调用）
onUpdate(document: vscode.TextDocument = this.document): void {
    if (this.disposed || this.document.uri.toString() !== document.uri.toString()) {
      return;
    }
    const text = this.document.getText();
    const version = this.document.version.toString();
    this.updateRange(text, version);
}
```

**dispose 清理**：`dispose()` 中清除 pending 的 `updateTimeout`，防止实例销毁后仍有回调执行。

**效果**：
- 快速连续输入 → 150ms 窗口内合并 → 只执行一次 `updateRange`
- 初始渲染/手动命令 → 无延迟，即时触发
- 实例销毁 → 定时器被清除

---

## 改动文件清单

| 文件 | 改动内容 |
|------|---------|
| `src/main.ts:56-90` | `findOrCreateInstance` 新增 `instance.onUpdate()`；`doHighlight` 移除 `onUpdate` 循环；`runHighlightEditorCommand` 改为直接调用 `onUpdate` |
| `src/color-highlight.ts:114-135` | 新增 `onDocumentChanged` 防抖方法；`initialize` 注册时改为使用 `onDocumentChanged` |
| `src/color-highlight.ts:25` | 新增 `updateTimeout` 字段 |
| `src/color-highlight.ts:192-206` | `dispose` 中清除 `updateTimeout` |

## 优化后调用流程

```
打开新文件：
  onOpenEditor → doHighlight → findOrCreateInstance (新建)
                                 → instance.onUpdate()  ← 即时，无防抖
                                 → updateRange → 渲染

用户键入：
  onDidChangeTextDocument → onDocumentChanged
                              ← 150ms 防抖，连续键入重置计时器
                              → updateRange → 渲染

切换标签（已有实例）：
  onOpenEditor → doHighlight → findOrCreateInstance (已有)
                                 ← 不再调用 onUpdate，无操作

手动命令：
  runHighlightEditorCommand → findOrCreateInstance → instance.onUpdate()  ← 即时强制刷新
```
