import Color from 'color';
import { ColorMatch } from '../types';

const colorHex = /.?((?:[#]|\b0x)([a-f0-9]{6}([a-f0-9]{2})?|[a-f0-9]{3}([a-f0-9]{1})?))\b/gi;

async function findHex(text: string, useARGB: boolean): Promise<ColorMatch[]> {
  let match = colorHex.exec(text);
  const result: ColorMatch[] = [];

  while (match !== null) {
    const firstChar = match[0][0];
    const matchedColor = match[1];
    const start = match.index + (match[0].length - matchedColor.length);
    const end = colorHex.lastIndex;
    let matchedHex = '#' + match[2];

    if (firstChar.length && /\w/.test(firstChar)) {
      match = colorHex.exec(text);
      continue;
    }

    try {
      let color: string;
      if (useARGB) {
        let alphaInt = 1;
        if (match[2].length === 8) {
          alphaInt = Math.round((parseInt(match[2].substring(0, 2), 16) * 100) / 255) / 100;
          matchedHex = '#' + match[2].substring(2);
        }
        color = Color(matchedHex).alpha(alphaInt).rgb().string();
      } else {
        color = Color(matchedHex).rgb().string();
      }

      result.push({ start, end, color });
    } catch (_e) {
      // ignore
    }

    match = colorHex.exec(text);
  }

  return result;
}

export async function findHexARGB(text: string): Promise<ColorMatch[]> {
  return findHex(text, true);
}

export async function findHexRGBA(text: string): Promise<ColorMatch[]> {
  return findHex(text, false);
}