import Color from 'color';
import { ColorMatch } from '../types';

const colorHwb = /((hwb)\(\d+,\s*(100|0*\d{1,2})%,\s*(100|0*\d{1,2})%(,\s*0?\.?\d+)?\))/gi;

export async function findHwb(text: string): Promise<ColorMatch[]> {
  let match = colorHwb.exec(text);
  const result: ColorMatch[] = [];

  while (match !== null) {
    const start = match.index;
    const end = colorHwb.lastIndex;
    const matchedColor = match[0];

    try {
      const color = Color(matchedColor).rgb().string();
      result.push({ start, end, color });
    } catch (_e) {
      // ignore
    }

    match = colorHwb.exec(text);
  }

  return result;
}