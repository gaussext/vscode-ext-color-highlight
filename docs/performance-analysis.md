# 性能分析与优化

## VS Code 扩展调用流程

### 激活流程

```
VS Code 启动完成
  → onStartupFinished
    → activate(context)
      → 注册命令 extension.colorHighlight
      → 订阅 onDidChangeVisibleTextEditors → onOpenEditor
      → 订阅 onDidChangeConfiguration → onConfigurationChange
      → 立即调用 onOpenEditor(visibleTextEditors) 处理初始编辑器
```

### 每次 DocumentHighlight 实例创建时的订阅

```
new DocumentHighlight(document, config)
  → constructor()
    → 构建 strategies 数组（10+ 个颜色解析器）
    → initialize(viewConfig)
      → new DecorationMap(config)
      → 订阅 onDidChangeTextDocument → onDocumentChanged
```

每个实例独立订阅 `onDidChangeTextDocument`，监听自己文档的内容变更。

### 三条独立的更新触发路径

| 路径 | 触发事件 | 入口函数 | 入口文件 |
|------|----------|----------|----------|
| **A — 编辑器可见性变化** | `onDidChangeVisibleTextEditors` | `onOpenEditor` → `doHighlight` | `main.ts` |
| **B — 文档内容变更** | `onDidChangeTextDocument` | `onDocumentChanged` (150ms 防抖) | `color-highlight.ts` |
| **C — 手动命令** | 用户执行 `extension.colorHighlight` | `runHighlightEditorCommand` | `main.ts` |

### 完整更新链路

```
onUpdate(document)
  → 检查 document 匹配
  → 检查 lastUpdatedVersion（若版本未变则跳过）
  → updateRange(text, version)
    → 检查 lastUpdatedVersion（避免防抖路径绕过 onUpdate）
    → 检查 updatePromise 锁（等待进行中的更新）
    → 再次检查 lastUpdatedVersion（等待后可能已被覆盖）
    → runUpdate(text, version)
      → Promise.all(strategies)       ← 全量异步扫描
      → 检查 actualVersion === version（版本竞态检查）
      → groupByColor + 转为 Range[]
      → editor.setDecorations(...)   ← 实际渲染
      → 记录 lastUpdatedVersion
```

---

## 问题与根因分析

### 问题 1：打开一次编辑器触发多次 Update（视觉闪动）

#### 根因 1.1：`TextDocument` 引用比较失效

- `instanceMap` 中的实例查找使用 `instance.getDocument() === document`（JavaScript 对象引用比较）
- VS Code 在多次 `onDidChangeVisibleTextEditors` 事件中可能传递**不同的 `TextDocument` 对象引用**（即使 URI 相同）
- 引用比较返回 `false`，导致同一个文件被识别为"新文档"，创建第二个 `DocumentHighlight` 实例
- 两个实例各自调用 `onUpdate()`，各自执行 `Promise.all(strategies)` 和 `setDecorations`
- 两次渲染结果叠加 → 视觉闪动

#### 根因 1.2：`onDidChangeVisibleTextEditors` 多次触发

VS Code 打开单个文件时，`onDidChangeVisibleTextEditors` 可能触发多次：
- 预览模式打开 → 转为固定标签
- 编辑器逐步加载完成
- 分屏/切换布局

每次触发都导致 `onOpenEditor` 被调用。

#### 根因 1.3：防抖路径绕过版本检查

`onDocumentChanged`（路径 B）直接调用 `updateRange`，绕过了 `onUpdate` 中的 `lastUpdatedVersion` 检查。当路径 A 的初始更新已完成但 `onDidChangeTextDocument` 触发时，150ms 后再次执行 `updateRange`，即使版本号没变也会执行第二次完整的扫描 + 渲染。

### 问题 2：切换标签时重复扫描

`onOpenEditor` 在收到 `onDidChangeVisibleTextEditors` 事件时，对所有可见文档调用 `findOrCreateInstance`，而已有实例的文档不需要重新扫描——它们的颜色没有变化，只是编辑器焦点变了。

### 问题 3：异步重叠无串行化

多次 `onUpdate` → `updateRange` 调用，每个都独立启动 `Promise.all(strategies)`。多个异步流水线同时运行，都通过版本检查，都调用 `setDecorations` → 无意义的重复渲染。

---

## 优化策略

### 策略 1：URI 比较代替引用比较

**改动**：`src/main.ts`

```typescript
// 辅助函数
function getUri(docOrInstance: vscode.TextDocument | DocumentHighlight): string {
  return docOrInstance instanceof DocumentHighlight
    ? docOrInstance.getDocument().uri.toString()
    : docOrInstance.uri.toString();
}

// instanceMap 查找（findOrCreateInstance）
const found = instanceMap.find((instance) => getUri(instance) === docUri);

// 待清理实例判定（onOpenEditor）
const forDisposal = instanceMap.filter(
  (instance) => documentUris.indexOf(getUri(instance)) === -1
);

// 新文档过滤（onOpenEditor）
const newDocuments = validDocuments.filter(
  doc => !instanceMap.some(instance => getUri(instance) === getUri(doc))
);
```

**解决的问题**：即使 VS Code 在不同事件中传递不同的 `TextDocument` 对象，相同 URI 的文件会被正确识别为同一个文档，不会创建重复实例。

### 策略 2：增量处理——只处理新文档

**改动**：`src/main.ts:onOpenEditor`

```
过滤出 validDocuments 中尚未有实例的文档 → 只对这些调用 doHighlight
```

**解决的问题**：`onDidChangeVisibleTextEditors` 多次触发时，仅有首次创建实例并更新；后续事件完全跳过已有文档，不再触发 `onUpdate`。

### 策略 3：版本号去重

**改动**：`src/color-highlight.ts`

```typescript
// 新增字段
private lastUpdatedVersion: string | undefined;

// onUpdate 入口
onUpdate(document) {
  const version = this.document.version.toString();
  if (this.lastUpdatedVersion === version) {
    return;  // 版本未变，跳过
  }
  this.updateRange(text, version);
}

// updateRange 入口（防范抖路径绕过）
async updateRange(text, version) {
  if (this.lastUpdatedVersion === version) {
    return;  // 已被成功更新
  }
  // ...锁逻辑...
}

// runUpdate 完成时记录版本
this.lastUpdatedVersion = actualVersion;
```

**解决的问题**：
- `onUpdate` 入口：版本未变则完全跳过，不触发任何后续逻辑
- `updateRange` 入口：捕获 `onDocumentChanged` 直接调用 `updateRange` 的路径，防止防抖到期后重复渲染

### 策略 4：异步锁串行化

**改动**：`src/color-highlight.ts`

```typescript
// 新增字段
private updatePromise: Promise<void> | undefined;

// updateRange 锁逻辑
async updateRange(text, version) {
  // 快速路径：已更新过此版本
  if (this.lastUpdatedVersion === version) return;

  // 锁等待
  if (this.updatePromise) {
    await this.updatePromise;
    // 等待后重新检查——之前的更新可能已覆盖本请求
    if (this.lastUpdatedVersion === this.document.version.toString()) {
      return;
    }
  }

  // 执行更新
  this.updatePromise = this.runUpdate(text, version);
  await this.updatePromise;
  this.updatePromise = undefined;
}
```

**解决的问题**：多个并发 `updateRange` 调用被串行化。等待锁释放后重新检查版本号，如果等待期间已被其他并发的更新覆盖，则跳过自身。保证任意时刻最多只有一个 `runUpdate` 在执行。

### 策略 5：`onDidChangeTextDocument` 防抖

**改动**：`src/color-highlight.ts`（原实现已存在，150ms 防抖）

```typescript
private onDocumentChanged(document: vscode.TextDocument): void {
  if (this.disposed || this.document.uri.toString() !== document.uri.toString()) return;

  if (this.updateTimeout) clearTimeout(this.updateTimeout);

  const text = this.document.getText();
  const version = this.document.version.toString();

  this.updateTimeout = setTimeout(() => {
    this.updateTimeout = undefined;
    this.updateRange(text, version);
  }, 150);
}
```

**解决的问题**：快速连续输入（如打字）产生的 N 次 `onDidChangeTextDocument` 事件合并为一次 `updateRange` 调用，只有最后一次的实际内容被扫描和渲染。

---

## 优化后完整时序

### 打开新文件

```
onDidChangeVisibleTextEditors (第 1 次)
  → onOpenEditor
    → URI 比较：instanceMap 中无此文档
    → findOrCreateInstance → 创建实例 → onUpdate
      → lastUpdatedVersion 为 undefined → 不跳过
      → updateRange → runUpdate(v1) 开始异步扫描

[文档可能因加载触发 onDidChangeTextDocument]
  → onDocumentChanged → 150ms 防抖队列

runUpdate(v1) 完成
  → actualVersion = v1（或 v2，若加载改变了版本）
  → 版本匹配或丢弃
  → 设置 lastUpdatedVersion

150ms 后防抖到期 → updateRange(text, v1)
  → lastUpdatedVersion(v1) === version(v1) → 立即跳过！✓
```

### 再次触发 `onDidChangeVisibleTextEditors`

```
onDidChangeVisibleTextEditors (第 2 次)
  → onOpenEditor
    → URI 比较：instanceMap 中已有此文档
    → newDocuments 为空 → doHighlight 不执行 → 无操作 ✓
```

### 用户键入文字

```
按键 1 → onDidChangeTextDocument(v2) → 防抖 150ms
按键 2 → onDidChangeTextDocument(v3) → 重置防抖 150ms
按键 3 → onDidChangeTextDocument(v4) → 重置防抖 150ms
...
停止按键后 150ms → updateRange(text_v4, v4)
  → lastUpdatedVersion(v1) !== v4 → 继续
  → updatePromise 为 undefined → 执行
  → runUpdate(v4) → 扫描 → 渲染
  → lastUpdatedVersion = v4
```

### 切换标签（已有实例）

```
onDidChangeVisibleTextEditors
  → onOpenEditor
    → URI 比较：实例已存在
    → newDocuments 为空 → 无操作 ✓
```

---

## 改动文件清单

| 文件 | 改动 |
|------|------|
| `src/main.ts` | 新增 `getUri()` 辅助函数；`findOrCreateInstance` 改用 URI 比较；`onOpenEditor` 改用 URI 比较 + 增量过滤；增加日志 |
| `src/color-highlight.ts` | 新增 `lastUpdatedVersion` / `updatePromise` 字段；`onUpdate` 版本去重；`updateRange` 前置版本检查 + 异步锁；提取 `runUpdate()`；增加日志 |

## 效果

- 相同 URI 的文件不会创建重复的 `DocumentHighlight` 实例
- 同一个文档版本不会产生冗余的 `Promise.all(strategies)` 调用
- `setDecorations` 每个有意义的变更最多调用一次
- 切换标签不再重新扫描已高亮的文档
- 快速连续输入的 N 次文档变更合并为一次扫描
