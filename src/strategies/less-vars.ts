import { findWords } from '../find/words';
import { findColorFunctionsInText } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';
import { findHex } from '../find/hex';

const defVarRegLine = /^\s*@([-\w]+)\s*:\s*([^;]+)/;

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

// 递归查找 @变量 引用，depth 防止循环引用
function findUseLessVars(text: string, varColor: Record<string, string>, depth = 0): string | null {
  const match = text.match(/^@([-\w]+)$/);
  if (match) {
    const varName = '@' + match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findUseLessVars(varColor[varName] || '', varColor, depth + 1);
    }
  }
  return null;
}

// 逐行解析 Less @变量 定义，解析为颜色值映射表
export async function resolveLessVars(text: string): Promise<Record<string, string>> {
  const lines = text.split(/\r?\n/);
  const varColor: Record<string, string> = {};
  const seen = new Set<string>();

  for (const line of lines) {
    const matcher = line.match(defVarRegLine);
    if (!matcher) continue;
    const bareName = matcher[1];
    const key = '@' + bareName;
    const value = matcher[2];
    if (seen.has(bareName)) continue;
    seen.add(bareName);

    // 先尝试直接颜色值，再尝试 @变量 引用
    const directColor = await findColorValue(value);
    if (directColor) {
      varColor[key] = directColor;
    } else {
      const refColor = findUseLessVars(value, varColor);
      if (refColor) {
        varColor[key] = refColor;
      }
    }
  }

  return varColor;
}

export function findLessVarsInText(text: string, varColor: Record<string, string>): ColorMatch[] {
  const useVarRegex = /@([-\w]+)/g;
  const result: ColorMatch[] = [];
  for (const match of text.matchAll(useVarRegex)) {
    const key = '@' + match[1];
    if (!varColor[key]) continue;
    // 提取匹配所在行，判断是否为定义行
    const lineStart = text.lastIndexOf('\n', match.index) + 1;
    const lineEnd = text.indexOf('\n', match.index);
    const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    // 定义行上只跳过冒号左侧的变量名（即被定义的变量），右侧的引用仍需高亮
    if (defVarRegLine.test(line)) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1 && match.index - lineStart < colonIdx) continue;
    }
    result.push({ start: match.index, end: match.index + match[0].length, color: varColor[key] });
  }
  return result;
}

// 注入全局变量后解析并查找 @变量 引用，只对原始文本做位置匹配
export async function findLessVars(injectContent: string, text: string): Promise<ColorMatch[]> {
  const fullText = injectContent + '\n' + text;
  const varColor = await resolveLessVars(fullText);
  if (!Object.keys(varColor).length) return [];
  return findLessVarsInText(text, varColor);
}
