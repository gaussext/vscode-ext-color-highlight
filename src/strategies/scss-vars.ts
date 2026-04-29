import { parseImports } from '../importer/sass-importer';
import { loadGlobalVariables } from '../importer/global-importer';
import { ColorMatch, ImporterOptions } from '../types';
import { resolveVariables } from './shared';

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

  return resolveVariables({
    text,
    fullText,
    defRegex: setVariable,
    usageRegexBuilder: (sortedNames) =>
      new RegExp(`\\$(${sortedNames.join('|')})(?!-|\\s*:)`, 'g'),
  });
}