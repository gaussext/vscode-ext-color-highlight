import { findHexRGBA } from '../find/hex';
import { findWords } from '../find/words';
import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../find/functions';
import { findHwb } from '../find/hwb';
import { loadGlobalVariables } from '../importer/global-importer';
import { ColorMatch, ImporterOptions } from '../types';

const defVarReg = /^\s*(--[-\w]+)\s*:\s*(.*)$/gm;
const useVarReg = /var\((--[-\w]+)\)/g;

function findVar(text: string, varColor: Record<string, string>, depth = 0): string | null {
  const match = useVarReg.exec(text);
  if (match !== null) {
    const varName = match[1];
    if (varColor[varName]) {
      return varColor[varName];
    } else if (depth < 5) {
      return findVar(varColor[varName] || '', varColor, depth + 1);
    }
  }
  return null;
}

export async function findCssVars(text: string, importerOptions: ImporterOptions): Promise<ColorMatch[]> {
  console.log(importerOptions);
  
  const injectContent = loadGlobalVariables(importerOptions);
  
  const fullText = `${injectContent}\n${text}`;
  // console.log(fullText);
  let match = defVarReg.exec(fullText);
  const result: ColorMatch[] = [];
  const varColor: Record<string, string> = {};
  const varNames: string[] = [];

  while (match !== null) {
    const name = match[1];
    const value = match[2];
    
    const values = await Promise.race([
      findHexRGBA(value),
      findWords(value),
      findColorFunctionsInText(value),
      findHwb(value),
    ]);
    console.log(name, value, values);
    if (values.length) {
      varNames.push(name);
      varColor[name] = values[0].color;
    }

    console.log(varColor);
    const v = findVar(value, varColor);
    console.log(v);
    if (v) {
      varNames.push(name);
      varColor[name] = v;
    }

    match = defVarReg.exec(fullText);
  }

  console.log(varNames);
  
  if (!varNames.length) {
    return [];
  }

  const sortedVarNames = sortStringsInDescendingOrder(varNames);
  const varNamesRegex = new RegExp(`var\\((${sortedVarNames.join('|')})\\)`, 'g');
  match = varNamesRegex.exec(text);

  while (match !== null) {
    const start = match.index;
    const end = varNamesRegex.lastIndex;
    const varName = match[1];

    console.log(varName);
    
    result.push({
      start,
      end,
      color: varColor[varName],
    });

    match = varNamesRegex.exec(text);
  }
  console.log(result);
  
  return result;
}