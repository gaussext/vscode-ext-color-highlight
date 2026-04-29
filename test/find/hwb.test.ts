import { findHwb } from '@/find/hwb';

describe('hwb', () => {
  describe('findHwb', () => {
    it('should find hwb() function', async () => {
      const text = 'hwb(0, 100%, 0%)';
      const result = await findHwb(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 255, 255)');
    });

    it('should find hwb() function with white', async () => {
      const text = 'hwb(0, 100%, 0%)';
      const result = await findHwb(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 255, 255)');
    });

    it('should find hwb() function with black', async () => {
      const text = 'hwb(0, 0%, 100%)';
      const result = await findHwb(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(0, 0, 0)');
    });

    it('should find hwb() function with alpha', async () => {
      const text = 'hwb(0, 0%, 0%, 0.5)';
      const result = await findHwb(text);
      expect(result).toHaveLength(1);
    });

    it('should find multiple hwb() functions', async () => {
      const text = 'hwb(0, 0%, 0%) and hwb(120, 50%, 50%)';
      const result = await findHwb(text);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for invalid hwb', async () => {
      const text = 'not hwb color';
      const result = await findHwb(text);
      expect(result).toHaveLength(0);
    });

    it('should handle hwb with spaces', async () => {
      const text = 'hwb( 0 , 50% , 50% )';
      const result = await findHwb(text);
      expect(result).toHaveLength(1);
    });

    it('should handle hwb with leading zeros', async () => {
      const text = 'hwb(0, 50%, 25%)';
      const result = await findHwb(text);
      expect(result).toHaveLength(1);
    });
  });
});