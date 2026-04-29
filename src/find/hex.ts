import Color from 'color';
import { ColorMatch } from '../types';

const colorHex = /(?:^|[^.a-zA-Z0-9])(?:[#]|0x)([a-fA-F0-9]{6}([a-fA-F0-9]{2})?|[a-fA-F0-9]{3}([a-fA-F0-9]{1})?)(?=[^a-fA-F0-9]|$)/gi;

async function findHex(text: string, useARGB: boolean): Promise<ColorMatch[]> {
  let match = colorHex.exec(text);
  const result: ColorMatch[] = [];

  while (match !== null) {
    const prefix = match[0].slice(0, match[0].indexOf(match[1]));
    const matchedColor = match[1];
    const colorPrefix = prefix.match(/([#]|0x)$/)?.[0] || '';
    const start = match.index + prefix.length - colorPrefix.length;
    const end = start + matchedColor.length + colorPrefix.length;
    const hexValue = '#' + matchedColor;

    try {
      let color: string;
      if (useARGB && matchedColor.length >= 8) {
        const alphaHex = matchedColor.substring(0, 2);
        const colorHexValue = '#' + matchedColor.substring(2);
        const alphaInt = Math.round((parseInt(alphaHex, 16) * 100) / 255) / 100;
        color = Color(colorHexValue).alpha(alphaInt).rgb().string();
      } else {
        color = Color(hexValue).rgb().string();
      }

      result.push({ start, end, color });
    } catch (_e) {
      // ignore
    }

    match = colorHex.exec(text);
  }

  return result;
}

export async function findHexRGBA(text: string): Promise<ColorMatch[]> {
  return findHex(text, true);
}

export async function findHexRGB(text: string): Promise<ColorMatch[]> {
  return findHex(text, false);
}