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

export async function resolveStylVars(text: string): Promise<Record<string, string>> {
  const lines = text.split('\n');
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

export function findStylVarsInText(text: string, varColor: Record<string, string>): ColorMatch[] {
  const sortedKeys = sortStringsInDescendingOrder(Object.keys(varColor));
  const lines = text.split('\n');
  const result: ColorMatch[] = [];
  let lineStart = 0;
  for (const line of lines) {
    for (const key of sortedKeys) {
      const bareName = key.slice(1);
      const match = line.match(new RegExp(`\\$?${bareName}(?!-|\\s*=)`));
      if (match) {
        const start = lineStart + match.index!;
        const end = start + match[0].length;
        result.push({ start, end, color: varColor[key] });
        break;
      }
    }
    lineStart += line.length + 1;
  }

  return result;
}

export async function findStylVars(text: string): Promise<ColorMatch[]> {
  const varColor = await resolveStylVars(text);
  if (!Object.keys(varColor).length) return [];
  return findStylVarsInText(text, varColor);
}
