import { findWords } from '@/find/words';

describe('words', () => {
  describe('findWords', () => {
    it('should find red color word', async () => {
      const text = 'red';
      const result = await findWords(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find blue color word', async () => {
      const text = 'blue';
      const result = await findWords(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(0, 0, 255)');
    });

    it('should find green color word', async () => {
      const text = 'green';
      const result = await findWords(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(0, 128, 0)');
    });

    it('should find multiple color words', async () => {
      const text = 'red and blue';
      const result = await findWords(text);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-color words', async () => {
      const text = 'hello world';
      const result = await findWords(text);
      expect(result).toHaveLength(0);
    });

    it('should not match color words with hyphen prefix', async () => {
      const text = 'not-red';
      const result = await findWords(text);
      expect(result).toHaveLength(0);
    });

    it('should not match color words after @ (LESS variable)', async () => {
      const text = '@red';
      const result = await findWords(text);
      expect(result).toHaveLength(0);
    });

    it('should not match color words after # (ID selector)', async () => {
      const text = '#red';
      const result = await findWords(text);
      expect(result).toHaveLength(0);
    });

    it('should find color word in sentence', async () => {
      const text = 'The sky is blue';
      const result = await findWords(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(0, 0, 255)');
    });

    it('should handle color words at word boundaries', async () => {
      const text = 'color: red; background: blue;';
      const result = await findWords(text);
      expect(result).toHaveLength(2);
    });
  });
});