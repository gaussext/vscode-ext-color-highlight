import Color from 'color';
import * as webColors from 'color-name';
import { ColorMatch } from '../types';

const preparedRePart = Object.keys(webColors)
  .map(color => `\\b${color}\\b`)
  .join('|');

const colorWeb = new RegExp('.?(' + preparedRePart + ')(?!-)', 'g');

export async function findWords(text: string): Promise<ColorMatch[]> {
  let match = colorWeb.exec(text);
  const result: ColorMatch[] = [];

  while (match !== null) {
    const firstChar = match[0][0];
    const matchedColor = match[1];
    const start = match.index + (match[0].length - matchedColor.length);
    const end = colorWeb.lastIndex;

    if (firstChar.length && /[-@#]/.test(firstChar)) {
      match = colorWeb.exec(text);
      continue;
    }

    try {
      const color = Color(matchedColor).rgb().string();
      result.push({ start, end, color });
    } catch (_e) {
      // ignore
    }

    match = colorWeb.exec(text);
  }

  return result;
}