import { findHexRGBA } from './hex';
import { findWords } from './words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from './functions';
import { findHwb } from './hwb';
import { loadGlobalVariables } from '../lib/global-importer';

const setVariable = /^\s*(--[-\w]+)\s*:\s*(.*)$/gm;

/**
 * Recursively finds CSS variable values.
 * @param {*} text 
 * @param {*} varColor 
 * @param {*} depth 
 * @returns 
 */
function findVar(text, varColor, depth = 0) {
  const varRegex = /var\((--[-\w]+)\)/g;
  const match = varRegex.exec(text);
  if (match !== null) {
    const varName = match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findVar(varColor[varName], varColor, depth + 1);
    }
  }
}

/**
 * @export
 * @param {string} text
 * @returns {{
 *  start: number,
 *  end: number,
 *  color: string
 * }}
 */
export async function findCssVars(text, importerOptions) {
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

    const v = findVar(value, varColor);
    if (v) {
      varNames.push(name);
      varColor[name] = v;
    }

    match = setVariable.exec(fullText);
  }

  if (!varNames.length) {
    return [];
  }

  varNames = sortStringsInDescendingOrder(varNames);

  const varNamesRegex = new RegExp(`var\\((${varNames.join('|')})\\)`, 'g');

  match = varNamesRegex.exec(text);

  while (match !== null) {
    const start = match.index;
    const end = varNamesRegex.lastIndex;
    const varName = match[1];

    result.push({
      start,
      end,
      color: varColor[varName],
    });

    match = varNamesRegex.exec(text);
  }

  return result;
}
