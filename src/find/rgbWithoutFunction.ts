import Color from 'color';
import { ColorMatch } from '../types';

const colorRgb = /([.\d]{1,5})[^\S\n]*(?<commaOrSpace>[^\S\n]|,)[^\S\n]*([.\d]{1,5})[^\S\n]*\k<commaOrSpace>[^\S\n]*([.\d]{1,5})(?:;| |$)/g;

export async function findRgbNoFn(text: string): Promise<ColorMatch[]> {
  let match = colorRgb.exec(text);
  const result: ColorMatch[] = [];

  while (match !== null) {
    const [matchedColor, red, , green, blue] = match;
    const start = match.index + (match[0].length - matchedColor.length);
    const end = colorRgb.lastIndex;

    try {
      const color = Color.rgb(
        parseInt(red),
        parseInt(green),
        parseInt(blue)
      ).string();
      result.push({ start, end, color });
    } catch (e) {
      console.error(e);
    }

    match = colorRgb.exec(text);
  }

  return result;
}