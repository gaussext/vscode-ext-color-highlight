import { findHexRGB, findHexRGBA } from '../find/hex';
import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { parseImports } from '../importer/sass-importer';
import { loadGlobalVariables } from '../importer/global-importer';
import { ColorMatch, ImporterOptions } from '../types';

const setVariable = /^\s*\$([-\w]+)\s*:\s*(.*)$/gm;
const defVarRegLine = /^\s*\$([-\w]+)\s*:\s*(.*)$/;

async function findColorValue(value: string): Promise<string | null> {
  const finders = [findHexRGB, findHexRGBA, findWords, findColorFunctionsInText, findHwb];
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

export async function findScssVars(text: string, importerOptions: ImporterOptions): Promise<ColorMatch[]> {
  let textWithImports = text;

  try {
    textWithImports = await parseImports(importerOptions);
  } catch (_err) {
    console.log('Error during imports loading, falling back to local variables parsing');
  }

  const injectContent = loadGlobalVariables(importerOptions);
  const fullText = `${injectContent}\n${textWithImports}`;

  const defLines = fullText.match(setVariable) || [];
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

    const refColor = findUseScssVars(value, varColor);
    if (refColor && !directColor) {
      varNames.push(name);
      varColor[name] = refColor;
    }
  }

  for (const line of defLines) {
    const matcher = line.match(defVarRegLine);
    if (!matcher) continue;
    const name = matcher[1];
    const value = matcher[2];
    if (varColor[name]) continue;

    const refColor = findUseScssVars(value, varColor);
    if (refColor) {
      varNames.push(name);
      varColor[name] = refColor;
    }
  }

  if (!varNames.length) {
    return [];
  }

  const sortedVarNames = sortStringsInDescendingOrder([...new Set(varNames)]);
  const varNamesRegex = new RegExp(`\\$(${sortedVarNames.join('|')})(?!-|\\s*:)`, 'g');
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
