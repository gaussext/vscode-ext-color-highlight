import { findWords } from '../find/words';
import { findColorFunctionsInText } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';
import { findHex } from '../find/hex';

const defVarRegLine = /^\s*\$([-\w]+)\s*:\s*([^;]+)/;

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

function findUseScssVars(text: string, varColor: Record<string, string>, depth = 0): string | null {
  const match = text.match(/^\$([-\w]+)$/);
  if (match) {
    const varName = '$' + match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findUseScssVars(varColor[varName] || '', varColor, depth + 1);
    }
  }
  return null;
}

export async function resolveScssVars(text: string): Promise<Record<string, string>> {
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

    const directColor = await findColorValue(value);
    if (directColor) {
      varColor[key] = directColor;
    } else {
      const refColor = findUseScssVars(value, varColor);
      if (refColor) {
        varColor[key] = refColor;
      }
    }
  }

  return varColor;
}

export function findScssVarsInText(text: string, varColor: Record<string, string>): ColorMatch[] {
  const useVarRegex = /\$([-\w]+)/g;
  const result: ColorMatch[] = [];
  for (const match of text.matchAll(useVarRegex)) {
    const key = '$' + match[1];
    if (!varColor[key]) continue;
    const lineStart = text.lastIndexOf('\n', match.index) + 1;
    const lineEnd = text.indexOf('\n', match.index);
    const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (defVarRegLine.test(line)) continue;
    result.push({ start: match.index, end: match.index + match[0].length, color: varColor[key] });
  }
  return result;
}

export async function findScssVars(injectContent: string, text: string): Promise<ColorMatch[]> {
  const fullText = injectContent + '\n' + text;
  const varColor = await resolveScssVars(fullText);
  if (!Object.keys(varColor).length) return [];
  return findScssVarsInText(text, varColor);
}
