import Color from 'color';
import { ColorMatch } from '../types';

const colorHwb = /(hwb)\(\s*\d+\s*,\s*(100|0*\d{1,2})%\s*,\s*(100|0*\d{1,2})%\s*(?:,\s*[\d.]+)?\s*\)/gi;

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