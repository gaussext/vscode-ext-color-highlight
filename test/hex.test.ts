import { findHexRGBA, findHexRGB } from '../src/find/hex';

describe('hex', () => {
  describe('findHexRGBA', () => {
    it('should find 6-digit hex color', async () => {
      const text = '#ff0000';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find 3-digit hex color', async () => {
      const text = '#f00';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find 8-digit hex color with alpha', async () => {
      const text = '#ff000080';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toContain('rgba(255, 0, 0');
    });

    it('should find 4-digit hex color with alpha', async () => {
      const text = '#f008';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toContain('rgba(255, 0, 0');
    });

    it('should find uppercase hex color', async () => {
      const text = '#FF0000';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find 0x hex prefix', async () => {
      const text = '0xFF0000';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should return empty array for invalid hex', async () => {
      const text = 'not-a-color';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(0);
    });

    it('should find multiple hex colors', async () => {
      const text = '#ff0000 #00ff00 #0000ff';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(3);
    });

    it('should find multiple hex colors', async () => {
      const text = '#ff0000; #00ff00 #0000ff';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(3);
    });

    it('should handle hex in CSS property', async () => {
      const text = 'color: #ff0000;';
      const result = await findHexRGB(text);
      expect(result).toHaveLength(1);
    });
  });

  describe('findHexARGB', () => {
    it('should find 6-digit hex color as ARGB', async () => {
      const text = '#ff0000;';
      const result = await findHexRGBA(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find 8-digit hex color and convert alpha', async () => {
      const text = '#80ff0000';
      const result = await findHexRGBA(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgba(255, 0, 0, 0.5)');
    });
  });
});