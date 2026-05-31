import { findHex } from '../find/hex';
import { findWords } from '../find/words';
import { findColorFunctionsInText } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';

const defVarRegLine = /^\s*(?:var\s+)?(\w+)\s*(?::)?=\s*(.+)$/;

async function findColorValue(value: string): Promise<string | null> {
  const stripped = value.replace(/^"(.*)"$/, '$1');
  const finders = [findHex, findWords, findColorFunctionsInText, findHwb];
  for (const finder of finders) {
    const result = await finder(stripped);
    if (result.length) {
      return result[0].color;
    }
  }
  return null;
}

function findUseNormalVars(text: string, varColor: Record<string, string>, depth = 0): string | null {
  const match = text.match(/^(\w+)$/);
  if (match) {
    const varName = match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findUseNormalVars(varColor[varName] || '', varColor, depth + 1);
    }
  }
  return null;
}

export async function resolveNormalVars(text: string): Promise<Record<string, string>> {
  const lines = text.split(/\r?\n/);
  const varColor: Record<string, string> = {};
  const seen = new Set<string>();

  for (const line of lines) {
    const matcher = line.match(defVarRegLine);
    if (!matcher) continue;
    const bareName = matcher[1];
    const value = matcher[2].trim().replace(/\s*\/\/.*$/, '').trim();
    if (seen.has(bareName)) continue;
    seen.add(bareName);

    const directColor = await findColorValue(value);
    if (directColor) {
      varColor[bareName] = directColor;
    } else {
      const refColor = findUseNormalVars(value, varColor);
      if (refColor) {
        varColor[bareName] = refColor;
      }
    }
  }

  return varColor;
}

export function findNormalVarsInText(text: string, varColor: Record<string, string>): ColorMatch[] {
  const result: ColorMatch[] = [];
  const sortedKeys = Object.keys(varColor).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key}\\b(?!(\\s*=|\\())`, 'g');
    for (const match of text.matchAll(regex)) {
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      const lineEnd = text.indexOf('\n', match.index);
      const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

      if (defVarRegLine.test(line)) {
        const equalsIdx = line.indexOf('=');
        if (equalsIdx !== -1 && match.index - lineStart < equalsIdx) continue;
      }

      result.push({ start: match.index, end: match.index + match[0].length, color: varColor[key] });
    }
  }

  return result;
}

export async function findNormalVars(injectContent: string, text: string): Promise<ColorMatch[]> {
  const fullText = injectContent + '\n' + text;
  const varColor = await resolveNormalVars(fullText);
  if (!Object.keys(varColor).length) return [];
  return findNormalVarsInText(text, varColor);
}
