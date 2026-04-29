import { findHslNoFn } from '@/find/hslWithoutFunction';

describe('hslWithoutFunction', () => {
  describe('findHslNoFn', () => {
    it('should find HSL without function (comma separated)', async () => {
      const text = '120, 100%, 50%';
      const result = await findHslNoFn(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('hsl(120, 100%, 50%)');
    });

    it('should find HSL without function (space separated)', async () => {
      const text = '120 100% 50%';
      const result = await findHslNoFn(text);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid HSL', async () => {
      const text = 'not hsl color';
      const result = await findHslNoFn(text);
      expect(result).toHaveLength(0);
    });

    it('should handle HSL at end of line', async () => {
      const text = 'color: 120, 100%, 50%';
      const result = await findHslNoFn(text);
      expect(result).toHaveLength(1);
    });

    it('should find multiple HSL colors', async () => {
      const text = '120, 100%, 50%; 0, 100%, 50%';
      const result = await findHslNoFn(text);
      expect(result).toHaveLength(2);
    });
  });
});