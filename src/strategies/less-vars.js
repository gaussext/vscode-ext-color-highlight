import { findHexRGBA } from './hex';
import { findWords } from './words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from './functions';
import { findHwb } from './hwb';
import { loadGlobalVariables } from '../lib/global-importer';

const setVariable = /^\s*\@([-\w]+)\s*:\s*(.*)$/gm;

/**
 * @export
 * @param {string} text
 * @returns {{
 *  start: number,
 *  end: number,
 *  color: string
 * }}
 */
export async function findLessVars(text, importerOptions) {
  const injectContent = loadGlobalVariables(importerOptions);
  const fullText = `${injectContent}
  ${text}`;
  let match = setVariable.exec(fullText);
  let result = [];

  const varColor = {};
  let varNames = [];

  while (match !== null) {
    const name = match[1];
    const value = match[2];
    const values = await Promise.race([
      findHexRGBA(value),
      findWords(value),
      findColorFunctionsInText(value),
      findHwb(value)
    ]);

    if (values.length) {
      varNames.push(name);
      varColor[name] = values[0].color;
    }

    match = setVariable.exec(text);
  }

  if (!varNames.length) {
    return [];
  }

  varNames = sortStringsInDescendingOrder(varNames);

  const varNamesRegex = new RegExp(`\\@(${varNames.join('|')})(?!-|\\s*:)`, 'g');

  match = varNamesRegex.exec(text);

  while (match !== null) {
    const start = match.index;
    const end = varNamesRegex.lastIndex;
    const varName = match[1];

    result.push({
      start,
      end,
      color: varColor[varName]
    });

    match = varNamesRegex.exec(text);
  }


  return result;
}
