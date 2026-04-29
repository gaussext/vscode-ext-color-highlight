import { ColorMatch } from '../types';
import { resolveVariables } from './shared';

const setVariable = /^\s*\$?([-\w]+)\s*=\s*(.*)$/gm;

export async function findStylVars(text: string): Promise<ColorMatch[]> {
  return resolveVariables({
    text,
    defRegex: setVariable,
    usageRegexBuilder: (sortedNames) =>
      new RegExp(`\\$?(${sortedNames.join('|')})(?!-|\\s*=)`, 'g'),
  });
}