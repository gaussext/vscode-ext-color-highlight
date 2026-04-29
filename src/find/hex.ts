import Color from 'color';
import { ColorMatch } from '../types';

const colorHex = /(?:^|[^.a-zA-Z0-9])(?:[#]|0x)([a-fA-F0-9]{6}([a-fA-F0-9]{2})?|[a-fA-F0-9]{3}([a-fA-F0-9]{1})?)(?=[^a-fA-F0-9]|$)/gi;

export async function findHex(text: string): Promise<ColorMatch[]> {
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
      const color = Color(hexValue).rgb().string();
      result.push({ start, end, color });
    } catch (_e) {
      // ignore
    }

    match = colorHex.exec(text);
  }

  return result;
}
