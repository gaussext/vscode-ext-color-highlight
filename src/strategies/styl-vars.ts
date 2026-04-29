import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';
import { findHex } from '../find/hex';

const setVariable = /^\s*\$?([-\w]+)\s*=\s*(.*)$/gm;
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
  const defLines = text.match(setVariable) || [];
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
  const varNamesRegex = new RegExp(`\\$?(${sortedVarNames.join('|')})(?!-|\\s*=)`, 'g');
  let match = varNamesRegex.exec(text);
  const result: ColorMatch[] = [];

  while (match !== null) {
    const start = match.index;
    const end = varNamesRegex.lastIndex;
    const varName = match[1];

    result.push({ start, end, color: varColor[varName] });
    match = varNamesRegex.exec(text);
  }

  return result;
}
