import { findHexRGBA, findHexRGB } from '../find/hex';
import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { loadGlobalVariables } from '../importer/global-importer';
import { ColorMatch, ImporterOptions } from '../types';

// 全局版：用于 match 提取所有定义行
const defVarRegGlobal = /^\s*(--[-\w]+)\s*:\s*(.*)$/gm;
// 非全局版：用于解析单行定义
const defVarRegLine = /^\s*(--[-\w]+)\s*:\s*(.*)$/;
// 非全局版：用于解析 var() 引用
const useVarRegLine = /var\((--[-\w]+)\)/;

function findUseCssVars(text: string, varColor: Record<string, string>, depth = 0): string | null {
  const match = text.match(useVarRegLine);
  if (match) {
    const varName = match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findUseCssVars(varColor[varName] || '', varColor, depth + 1);
    }
  }
  return null;
}

async function findColorValue(value: string): Promise<string | null> {
  const finders = [findHexRGB, findHexRGBA, findWords, findColorFunctionsInText, findHwb];
  for (const finder of finders) {
    const result = await finder(value);
    if (result.length) {
      return result[0].color;
    }
  }
  return null;
}

export async function findCssVars(text: string, importerOptions: ImporterOptions): Promise<ColorMatch[]> {
  const injectContent = loadGlobalVariables(importerOptions);
  const fullText = `${injectContent}\n${text}`;

  // 第一轮：提取所有定义行
  const defLines = fullText.match(defVarRegGlobal) || [];
  const varColor: Record<string, string> = {};
  const varNames: string[] = [];
  const seen = new Set<string>();

  for (const line of defLines) {
    const matcher = line.match(defVarRegLine);
    if (!matcher) continue;
    const name = matcher[1];
    const value = matcher[2];
    if (seen.has(name)) continue;
    seen.add(name);

    const directColor = await findColorValue(value);
    if (directColor) {
      varNames.push(name);
      varColor[name] = directColor;
    }

    // 尝试解析变量引用（可能依赖后续定义）
    const refColor = findUseCssVars(value, varColor);
    if (refColor && !directColor) {
      varNames.push(name);
      varColor[name] = refColor;
    }
  }

  // 第二轮：处理依赖其他变量的定义（仅处理尚未成功的变量）
  for (const line of defLines) {
    const matcher = line.match(defVarRegLine);
    if (!matcher) continue;
    const name = matcher[1];
    const value = matcher[2];
    if (varColor[name]) continue; // 已被解析

    const refColor = findUseCssVars(value, varColor);
    if (refColor) {
      varNames.push(name);
      varColor[name] = refColor;
    }
  }

  if (!varNames.length) {
    return [];
  }

  const sortedVarNames = sortStringsInDescendingOrder([...new Set(varNames)]);
  const varNamesRegex = new RegExp(`var\\((${sortedVarNames.join('|')})\\)`, 'g');
  
  // 使用 match 提取所有引用
  const usages = text.match(varNamesRegex) || [];
  const result: ColorMatch[] = [];
  let index = 0;
  for (const usage of usages) {
    const start = text.indexOf(usage, index);
    const end = start + usage.length;
    // 提取变量名：去掉 "var(" 和 ")"
    const varName = usage.slice(4, -1);
    result.push({
      start,
      end,
      color: varColor[varName],
    });
    index = end;
  }

  return result;
}