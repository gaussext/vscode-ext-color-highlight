import { ColorMatch } from '../types';

const colorHsla = /(hsla?\([\d]{1,3},\s*[\d]{1,3}%,\s*[\d]{1,3}%(,\s*\d?\.?\d+)?\))/gi;

export async function findHsla(text: string): Promise<ColorMatch[]> {
  let match = colorHsla.exec(text);
  const result: ColorMatch[] = [];

  while (match !== null) {
    const start = match.index;
    const end = colorHsla.lastIndex;
    const color = match[0];

    result.push({ start, end, color });
    match = colorHsla.exec(text);
  }

  return result;
}