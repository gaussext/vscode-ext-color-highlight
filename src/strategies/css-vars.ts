import { loadGlobalVariables } from '../importer/global-importer';
import { ColorMatch, ImporterOptions } from '../types';
import { resolveVariables } from './shared';

const defVarReg = /^\s*(--[-\w]+)\s*:\s*(.*)$/gm;

/**
 * Recursively resolve var() references using the known variable map.
 * Handles chains like --a: var(--b); --b: red; with a max depth of 5.
 */
async function resolveVarReference(value: string, knownVars: Record<string, string>, depth = 0): Promise<string | null> {
  if (depth > 5) return null;

  const match = /var\((--[-\w]+)\)/.exec(value);
  if (!match) return null;

  const varName = match[1];
  if (knownVars[varName]) {
    return knownVars[varName];
  }

  return resolveVarReference(knownVars[varName] || '', knownVars, depth + 1);
}

export async function findCssVars(text: string, importerOptions: ImporterOptions): Promise<ColorMatch[]> {
  const injectContent = loadGlobalVariables(importerOptions);
  const fullText = `${injectContent}\n${text}`;

  return resolveVariables({
    text,
    fullText,
    defRegex: defVarReg,
    usageRegexBuilder: (sortedNames) =>
      new RegExp(`var\\((${sortedNames.join('|')})\\)`, 'g'),
    extraResolve: (value, knownVars) => resolveVarReference(value, knownVars),
  });
}