import { findHex } from '@/find/hex';

describe('hex', () => {
  describe('findHexA', () => {
    it('should find 6-digit hex color', async () => {
      const text = '#ff0000';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find 3-digit hex color', async () => {
      const text = '#f00';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find 8-digit hex color with alpha', async () => {
      const text = '#ff000080';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toContain('rgba(255, 0, 0');
    });

    it('should find 4-digit hex color with alpha', async () => {
      const text = '#f008';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toContain('rgba(255, 0, 0');
    });

    it('should find uppercase hex color', async () => {
      const text = '#FF0000';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find 0x hex prefix', async () => {
      const text = '0xFF0000';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should return empty array for invalid hex', async () => {
      const text = 'not-a-color';
      const result = await findHex(text);
      expect(result).toHaveLength(0);
    });

    it('should find multiple hex colors', async () => {
      const text = '#ff0000 #00ff00 #0000ff';
      const result = await findHex(text);
      expect(result).toHaveLength(3);
    });

    it('should find multiple hex colors', async () => {
      const text = '#ff0000; #00ff00 #0000ff';
      const result = await findHex(text);
      expect(result).toHaveLength(3);
    });

    it('should handle hex in CSS property', async () => {
      const text = 'color: #ff0000;';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
    });
  });

  describe('position', () => {
    it('should include # in range for #ffffff', async () => {
      const text = '#ffffff';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(7);
    });

    it('should include # in range in CSS context', async () => {
      const text = 'color: #ff0000;';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].start).toBe(7);
      expect(result[0].end).toBe(14);
    });

    it('should include 0x in range', async () => {
      const text = '0xFF0000';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(8);
    });

    it('should have correct positions for multiple hex colors', async () => {
      const text = '#ff0000 #00ff00';
      const result = await findHex(text);
      expect(result).toHaveLength(2);
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(7);
      expect(result[1].start).toBe(8);
      expect(result[1].end).toBe(15);
    });
  });

  describe('findHex alpha', () => {
    it('should find 6-digit hex color', async () => {
      const text = '#ff0000;';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find 8-digit hex color with alpha', async () => {
      const text = '#ff000080';
      const result = await findHex(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toContain('rgba(255, 0, 0');
    });
  });
});