import Color from 'color';
import { ColorMatch } from '../types';

const colorHsl = /([.\d]{1,5})[^\S\n]*(?<commaOrSpace>[^\S\n]|,)[^\S\n]*([.\d]{1,5}%)[^\S\n]*\k<commaOrSpace>[^\S\n]*([.\d]{1,5}%)(?:;| |$)/g;

export async function findHslNoFn(text: string): Promise<ColorMatch[]> {
  let match = colorHsl.exec(text);
  const result: ColorMatch[] = [];

  while (match !== null) {
    const [matchedColor, hue, , saturation, lightness] = match;
    const start = match.index + (match[0].length - matchedColor.length);
    const end = colorHsl.lastIndex;

    try {
      const color = Color.hsl(
        parseInt(hue),
        parseInt(saturation),
        parseInt(lightness)
      ).string();
      result.push({ start, end, color });
    } catch (e) {
      console.error(e);
    }

    match = colorHsl.exec(text);
  }

  return result;
}