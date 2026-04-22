import { findColorFunctionsInText, sortStringsInDescendingOrder } from '../src/find/functions';

describe('functions', () => {
  describe('findColorFunctionsInText', () => {
    it('should find rgb() function', async () => {
      const text = 'rgb(255, 0, 0)';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find rgba() function with alpha', async () => {
      const text = 'rgba(255, 0, 0, 0.5)';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(1);
    });

    it('should find hsl() function', async () => {
      const text = 'hsl(120, 100%, 50%)';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(1);
    });

    it('should find hsla() function', async () => {
      const text = 'hsla(120, 100%, 50%, 0.5)';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(1);
    });

    it('should find lch() function', async () => {
      const text = 'lch(50% 100 180)';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(1);
    });

    it('should find oklch() function', async () => {
      const text = 'oklch(50% 0.2 180)';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(1);
    });

    it('should find multiple color functions', async () => {
      const text = 'rgb(255, 0, 0) and hsl(120, 100%, 50%)';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for no color functions', async () => {
      const text = 'not a color function';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(0);
    });

    it('should handle color functions with spaces', async () => {
      const text = 'rgb( 255 , 0 , 0 )';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(1);
    });

    it('should find color functions with percentage values', async () => {
      const text = 'hsl(120, 50%, 75%)';
      const result = await findColorFunctionsInText(text);
      expect(result).toHaveLength(1);
    });
  });

  describe('sortStringsInDescendingOrder', () => {
    it('should sort strings in descending order', () => {
      const arr = ['apple', 'banana', 'cherry'];
      const result = sortStringsInDescendingOrder(arr);
      expect(result).toEqual(['cherry', 'banana', 'apple']);
    });

    it('should handle single element', () => {
      const arr = ['apple'];
      const result = sortStringsInDescendingOrder(arr);
      expect(result).toEqual(['apple']);
    });

    it('should handle empty array', () => {
      const arr: string[] = [];
      const result = sortStringsInDescendingOrder(arr);
      expect(result).toEqual([]);
    });
  });
});