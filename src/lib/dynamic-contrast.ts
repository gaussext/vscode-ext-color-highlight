import * as webColors from 'color-name';

export function getColorContrast(color: string): string {
  const rgbExp = /^rgba?[\s+]?\(\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*(?:,\s*([\d.]+)\s*)?\)/im;
  const hexExp = /^(?:#)|([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/igm;
  let rgb = color.match(rgbExp);
  let hex = color.match(hexExp);
  let r: number, g: number, b: number;

  if (rgb) {
    r = parseInt(rgb[1], 10);
    g = parseInt(rgb[2], 10);
    b = parseInt(rgb[3], 10);
  } else if (hex) {
    let hexVal = hex.length > 1 ? hex[1] : hex[0];
    if (hexVal && hexVal.length === 3) {
      hexVal = hexVal[0] + hexVal[0] + hexVal[1] + hexVal[1] + hexVal[2] + hexVal[2];
    }
    if (hexVal) {
      r = parseInt(hexVal.substr(0, 2), 16);
      g = parseInt(hexVal.substr(2, 2), 16);
      b = parseInt(hexVal.substr(4, 2), 16);
    } else {
      return '#000000';
    }
  } else {
    const namedColor = (webColors as Record<string, [number, number, number]>)[color.toLowerCase()];
    if (namedColor) {
      [r, g, b] = namedColor;
    } else {
      return '#000000';
    }
  }

  const luminance = relativeLuminance(r, g, b);
  const luminanceWhite = 1.0;
  const luminanceBlack = 0.0;

  const contrastWhite = contrastRatio(luminance, luminanceWhite);
  const contrastBlack = contrastRatio(luminance, luminanceBlack);

  return contrastWhite > contrastBlack ? '#FFFFFF' : '#000000';
}

function contrastRatio(l1: number, l2: number): number {
  if (l2 < l1) {
    return (0.05 + l1) / (0.05 + l2);
  } else {
    return (0.05 + l2) / (0.05 + l1);
  }
}

function relativeLuminance(r8: number, g8: number, b8: number): number {
  const bigR = srgb8ToLinear(r8);
  const bigG = srgb8ToLinear(g8);
  const bigB = srgb8ToLinear(b8);
  return 0.2126 * bigR + 0.7152 * bigG + 0.0722 * bigB;
}

const srgb8ToLinear = (function() {
  const srgbLookupTable = new Float64Array(256);
  for (let i = 0; i < 256; ++i) {
    const c = i / 255.0;
    srgbLookupTable[i] = (c <= 0.04045)
      ? c / 12.92
      : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return function srgb8ToLinear(c8: number): number {
    const index = Math.min(Math.max(c8, 0), 255) & 0xff;
    return srgbLookupTable[index];
  };
}());