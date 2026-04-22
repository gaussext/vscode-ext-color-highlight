import { findHexRGB, findHexRGBA } from '../find/hex';
import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { parseImports } from '../importer/sass-importer';
import { loadGlobalVariables } from '../importer/global-importer';
import { ColorMatch, ImporterOptions } from '../types';

const setVariable = /^\s*\$([-\w]+)\s*:\s*(.*)$/gm;

export async function findScssVars(text: string, importerOptions: ImporterOptions): Promise<ColorMatch[]> {
  let textWithImports = text;

  try {
    textWithImports = await parseImports(importerOptions);
  } catch (_err) {
    console.log('Error during imports loading, falling back to local variables parsing');
  }

  const injectContent = loadGlobalVariables(importerOptions);
  const fullText = `${injectContent}\n${textWithImports}`;
  let match = setVariable.exec(fullText);
  const result: ColorMatch[] = [];
  const varColor: Record<string, string> = {};
  const varNames: string[] = [];

  while (match !== null) {
    const name = match[1];
    const value = match[2];
    const values = await Promise.race([
      findHexRGB(value),
      findHexRGBA(value),
      findWords(value),
      findColorFunctionsInText(value),
      findHwb(value)
    ]);

    if (values.length) {
      varNames.push(name);
      varColor[name] = values[0].color;
    }

    match = setVariable.exec(fullText);
  }

  if (!varNames.length) {
    return [];
  }

  const sortedVarNames = sortStringsInDescendingOrder(varNames);
  const varNamesRegex = new RegExp(`\\$(${sortedVarNames.join('|')})(?!-|\\s*:)`, 'g');
  match = varNamesRegex.exec(text);

  while (match !== null) {
    const start = match.index;
    const end = varNamesRegex.lastIndex;
    const varName = match[1];

    result.push({ start, end, color: varColor[varName] });
    match = varNamesRegex.exec(text);
  }

  return result;
}