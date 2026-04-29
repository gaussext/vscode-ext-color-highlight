import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';
import { findHex } from '../find/hex';

const defVarRegLine = /^\s*\$?([-\w]+)\s*=\s*(.*)$/;

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
    const varName = match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findUseStylVars(varColor[varName] || '', varColor, depth + 1);
    }
  }
  return null;
}

export async function findStylVars(text: string): Promise<ColorMatch[]> {
  const lines = text.split('\n');
  const varColor: Record<string, string> = {};
  const varNames: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
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

    const refColor = findUseStylVars(value, varColor);
    if (refColor && !directColor) {
      varNames.push(name);
      varColor[name] = refColor;
    }
  }

  if (!varNames.length) {
    return [];
  }

  const sortedVarNames = sortStringsInDescendingOrder([...new Set(varNames)]);
  const result: ColorMatch[] = [];
  let lineStart = 0;
  for (const line of lines) {
    if (!defVarRegLine.test(line)) {
      for (const varName of sortedVarNames) {
        const match = line.match(new RegExp(`\\$?${varName}(?!-|\\s*=)`));
        if (match) {
          const start = lineStart + match.index!;
          const end = start + match[0].length;
          result.push({ start, end, color: varColor[varName] });
          break;
        }
      }
    }
    lineStart += line.length + 1;
  }

  return result;
}
