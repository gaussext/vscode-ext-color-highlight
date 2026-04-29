import { loadGlobalVariables } from '../importer/global-importer';
import { ColorMatch, ImporterOptions } from '../types';
import { resolveVariables } from './shared';

const setVariable = /^\s*@([-\w]+)\s*:\s*(.*)$/gm;

export async function findLessVars(text: string, importerOptions: ImporterOptions): Promise<ColorMatch[]> {
  const injectContent = loadGlobalVariables(importerOptions);
  const fullText = `${injectContent}\n${text}`;

  return resolveVariables({
    text,
    fullText,
    defRegex: setVariable,
    usageRegexBuilder: (sortedNames) =>
      new RegExp(`\\@(${sortedNames.join('|')})(?!-|\\s*:)`, 'g'),
  });
}