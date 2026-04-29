import { findHsla } from '@/find/hsla';

describe('hsla', () => {
  describe('findHsla', () => {
    it('should find hsl() function', async () => {
      const text = 'hsl(120, 100%, 50%)';
      const result = await findHsla(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('hsl(120, 100%, 50%)');
    });

    it('should find hsla() function', async () => {
      const text = 'hsla(120, 100%, 50%, 0.5)';
      const result = await findHsla(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('hsla(120, 100%, 50%, 0.5)');
    });

    it('should find multiple hsla/hsl functions', async () => {
      const text = 'hsl(0, 100%, 50%) and hsla(120, 100%, 50%, 0.5)';
      const result = await findHsla(text);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for no hsla/hsl', async () => {
      const text = 'not a color';
      const result = await findHsla(text);
      expect(result).toHaveLength(0);
    });

    it('should handle hsla with spaces', async () => {
      const text = 'hsl( 120 , 100% , 50% )';
      const result = await findHsla(text);
      expect(result).toHaveLength(1);
    });

    it('should find hsl with 0 alpha', async () => {
      const text = 'hsla(120, 100%, 50%, 0)';
      const result = await findHsla(text);
      expect(result).toHaveLength(1);
    });

    it('should find hsl with decimal alpha', async () => {
      const text = 'hsla(120, 100%, 50%, 0.5)';
      const result = await findHsla(text);
      expect(result).toHaveLength(1);
    });
  });
});