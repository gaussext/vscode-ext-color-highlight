import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';
import { findHex } from '../find/hex';

const defVarRegLine = /^\s*\$?([-\w]+)\s*=\s*([^;]+)/;

async function findColorValue(value: string): Promise<string | null> {
  const finders = [findHex, findWords, findColorFunctionsInText, findHwb];
  for (const finder of finders) {
    const result = await finder(value);
    if (result.length) {
      return result[0].color;
    }
  }
  return null;
}

// 递归查找 Stylus $变量 引用，depth 防止循环引用
function findUseStylVars(text: string, varColor: Record<string, string>, depth = 0): string | null {
  const match = text.match(/^\$?([-\w]+)$/);
  if (match) {
    const varName = '$' + match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findUseStylVars(varColor[varName] || '', varColor, depth + 1);
    }
  }
  return null;
}

// 逐行解析 Stylus $变量 定义（支持 $ 前缀或无前缀），解析为颜色值映射表
export async function resolveStylVars(text: string): Promise<Record<string, string>> {
  const lines = text.split(/\r?\n/);
  const varColor: Record<string, string> = {};
  const seen = new Set<string>();

  for (const line of lines) {
    const matcher = line.match(defVarRegLine);
    if (!matcher) continue;
    const bareName = matcher[1];
    const key = '$' + bareName;
    const value = matcher[2];
    if (seen.has(bareName)) continue;
    seen.add(bareName);

    // 先尝试直接颜色值，再尝试 $变量 引用
    const directColor = await findColorValue(value);
    if (directColor) {
      varColor[key] = directColor;
    } else {
      const refColor = findUseStylVars(value, varColor);
      if (refColor) {
        varColor[key] = refColor;
      }
    }
  }

  return varColor;
}

// 在文本中查找 Stylus $变量 使用位置，通过负向前瞻跳过定义行，长名优先匹配，去重防止重叠
export function findStylVarsInText(text: string, varColor: Record<string, string>): ColorMatch[] {
  const sortedKeys = sortStringsInDescendingOrder(Object.keys(varColor));
  const result: ColorMatch[] = [];
  const used = new Set<number>();
  for (const key of sortedKeys) {
    const bareName = key.slice(1);
    const regex = new RegExp(`\\$?${bareName}(?!-|\\s*=)`, 'g');
    for (const match of text.matchAll(regex)) {
      if (used.has(match.index)) continue;
      used.add(match.index);
      result.push({ start: match.index, end: match.index + match[0].length, color: varColor[key] });
    }
  }
  return result;
}

// 注入全局变量后解析并查找 Stylus $变量 引用，只对原始文本做位置匹配
export async function findStylVars(injectContent: string, text: string): Promise<ColorMatch[]> {
  const fullText = injectContent + '\n' + text;
  const varColor = await resolveStylVars(fullText);
  if (!Object.keys(varColor).length) return [];
  return findStylVarsInText(text, varColor);
}
