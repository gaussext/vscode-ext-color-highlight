import { findHexRGB, findHexRGBA } from '../find/hex';
import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { ColorMatch } from '../types';

const colorFinders = [
  findHexRGB,
  findHexRGBA,
  findWords,
  findColorFunctionsInText,
  findHwb,
] as const;

/**
 * Resolve a variable value to a normalized color string.
 * Tests all color-finding strategies and returns the first match.
 */
export async function resolveColorValue(value: string): Promise<string | null> {
  const results = await Promise.all(colorFinders.map(fn => fn(value)));
  for (const result of results) {
    if (result.length > 0) {
      return result[0].color;
    }
  }
  return null;
}

export interface VariableResolveOptions {
  /** Original document text (used for usage replacement) */
  text: string;
  /** Extended text with global variables injected (used for definition scanning) */
  fullText?: string;
  /** Regex to find variable definitions (must capture name in group 1, value in group 2) */
  defRegex: RegExp;
  /** Builder that creates a regex to find variable usages from sorted variable names */
  usageRegexBuilder: (sortedNames: string[]) => RegExp;
  /**
   * Optional handler for values that aren't direct colors (e.g. var() references).
   * Called with the raw value and the accumulated known-variable map.
   */
  extraResolve?: (value: string, knownVars: Record<string, string>) => Promise<string | null>;
}

/**
 * Generic variable resolution flow:
 * 1. Scan definitions using defRegex → resolve each value to a color
 * 2. Build a usage regex from resolved variable names
 * 3. Replace usages in the original text with color matches
 */
export async function resolveVariables(options: VariableResolveOptions): Promise<ColorMatch[]> {
  const { text, defRegex, usageRegexBuilder, extraResolve } = options;
  const searchText = options.fullText ?? text;
  let match = defRegex.exec(searchText);
  const varColor: Record<string, string> = {};
  const varNames: string[] = [];

  while (match !== null) {
    const name = match[1];
    const value = match[2];

    let color = await resolveColorValue(value);

    if (!color && extraResolve) {
      color = await extraResolve(value, varColor);
    }

    if (color) {
      varNames.push(name);
      varColor[name] = color;
    }

    match = defRegex.exec(searchText);
  }

  if (varNames.length === 0) {
    return [];
  }

  const sortedVarNames = sortStringsInDescendingOrder(varNames);
  const usageRegex = usageRegexBuilder(sortedVarNames);
  const result: ColorMatch[] = [];
  match = usageRegex.exec(text);

  while (match !== null) {
    const start = match.index;
    const end = usageRegex.lastIndex;
    const varName = match[1];
    result.push({ start, end, color: varColor[varName] });
    match = usageRegex.exec(text);
  }

  return result;
}
