import { findHex } from '../find/hex';
import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';

const defVarRegGlobal = /^\s*(--[-\w]+)\s*:\s*(.*)$/gm;
const defVarRegLine = /^\s*(--[-\w]+)\s*:\s*(.*)$/;
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
  const finders = [findHex, findWords, findColorFunctionsInText, findHwb];
  for (const finder of finders) {
    const result = await finder(value);
    if (result.length) {
      return result[0].color;
    }
  }
  return null;
}

export async function findCssVars(text: string): Promise<ColorMatch[]> {
  const defLines = text.match(defVarRegGlobal) || [];
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

    const refColor = findUseCssVars(value, varColor);
    if (refColor && !directColor) {
      varNames.push(name);
      varColor[name] = refColor;
    }
  }

  if (!varNames.length) {
    return [];
  }

  const sortedVarNames = sortStringsInDescendingOrder([...new Set(varNames)]);
  const varNamesRegex = new RegExp(`var\\((${sortedVarNames.join('|')})\\)`, 'g');

  const usages = text.match(varNamesRegex) || [];
  const result: ColorMatch[] = [];
  let index = 0;
  for (const usage of usages) {
    const start = text.indexOf(usage, index);
    const end = start + usage.length;
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
