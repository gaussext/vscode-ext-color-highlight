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
    const varName = match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findUseScssVars(varColor[varName] || '', varColor, depth + 1);
    }
  }
  return null;
}

export async function resolveScssVars(text: string): Promise<Record<string, string>> {
  const lines = text.split('\n');
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
      const refColor = findUseScssVars(value, varColor);
      if (refColor) {
        varColor[name] = refColor;
      }
    }
  }

  return varColor;
}

export function findScssVarsInText(text: string, varColor: Record<string, string>): ColorMatch[] {
  const useVarRegex = /\$([-\w]+)/;
  const lines = text.split('\n');
  const result: ColorMatch[] = [];
  let lineStart = 0;
  for (const line of lines) {
    if (!defVarRegLine.test(line)) {
      const match = line.match(useVarRegex);
      if (match && varColor[match[1]]) {
        const start = lineStart + match.index!;
        const end = start + match[0].length;
        result.push({ start, end, color: varColor[match[1]] });
      }
    }
    lineStart += line.length + 1;
  }

  return result;
}

export async function findScssVars(text: string): Promise<ColorMatch[]> {
  const varColor = await resolveScssVars(text);
  if (!Object.keys(varColor).length) return [];
  return findScssVarsInText(text, varColor);
}
