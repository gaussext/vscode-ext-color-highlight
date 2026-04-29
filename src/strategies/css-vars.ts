import { findHex } from '../find/hex';
import { findWords } from '../find/words';
import { findColorFunctionsInText } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';

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

export async function resolveCssVars(text: string): Promise<Record<string, string>> {
  const lines = text.split(/\r?\n/);
  const varColor: Record<string, string> = {};
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
      varColor[name] = directColor;
    } else {
      const refColor = findUseCssVars(value, varColor);
      if (refColor) {
        varColor[name] = refColor;
      }
    }
  }

  return varColor;
}

export function findCssVarsInText(text: string, varColor: Record<string, string>): ColorMatch[] {
  const useVarRegex = /(?<=var\()(--[-\w]+)(?=\))/g;
  const result: ColorMatch[] = [];
  for (const match of text.matchAll(useVarRegex)) {
    if (varColor[match[1]]) {
      result.push({ start: match.index, end: match.index + match[0].length, color: varColor[match[1]] });
    }
  }
  return result;
}

export async function findCssVars(injectContent: string, text: string): Promise<ColorMatch[]> {
  const fullText = injectContent + '\n' + text;
  const varColor = await resolveCssVars(fullText);
  if (!Object.keys(varColor).length) return [];
  return findCssVarsInText(text, varColor);
}
