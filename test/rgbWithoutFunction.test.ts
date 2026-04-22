import { findRgbNoFn } from '../src/find/rgbWithoutFunction';

describe('rgbWithoutFunction', () => {
  describe('findRgbNoFn', () => {
    it('should find RGB without function (comma separated)', async () => {
      const text = '255, 0, 0';
      const result = await findRgbNoFn(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find RGB without function (space separated)', async () => {
      const text = '255 0 0';
      const result = await findRgbNoFn(text);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid RGB', async () => {
      const text = 'not rgb color';
      const result = await findRgbNoFn(text);
      expect(result).toHaveLength(0);
    });

    it('should handle RGB at end of line', async () => {
      const text = 'color: 255, 0, 0;';
      const result = await findRgbNoFn(text);
      expect(result).toHaveLength(1);
    });

    it('should find multiple RGB colors', async () => {
      const text = '255, 0, 0; 0, 255, 0';
      const result = await findRgbNoFn(text);
      expect(result).toHaveLength(2);
    });
  });
});