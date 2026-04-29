import { resolveStylVars, findStylVarsInText } from '@/strategies/styl-vars';

describe('styl-vars', () => {
  describe('resolveStylVars', () => {
    it('should resolve $prefixed hex colors', async () => {
      const varColor = await resolveStylVars('$z-primary = #ff0000');
      expect(varColor['$z-primary']).toBe('rgb(255, 0, 0)');
    });

    it('should resolve unprefixed hex colors', async () => {
      const varColor = await resolveStylVars('z-primary = #00ff00');
      expect(varColor['$z-primary']).toBe('rgb(0, 255, 0)');
    });

    it('should resolve recursive $variable references', async () => {
      const varColor = await resolveStylVars([
        '$z-c = #0000ff',
        '$z-b = $z-c',
        '$z-a = $z-b',
      ].join('\n'));
      expect(varColor['$z-a']).toBe('rgb(0, 0, 255)');
      expect(varColor['$z-b']).toBe('rgb(0, 0, 255)');
    });

    it('should skip forward references', async () => {
      const varColor = await resolveStylVars([
        '$z-a = $z-b',
        '$z-b = #ff0000',
      ].join('\n'));
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['$z-b']).toBe('rgb(255, 0, 0)');
    });
  });

  describe('findStylVarsInText', () => {
    it('should find $var usages matching the given varColor', () => {
      const varColor = { '$z-primary': 'rgb(255, 0, 0)' };
      const text = '.foo\n  color $z-primary';
      const result = findStylVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
      expect(text.slice(result[0].start, result[0].end)).toBe('$z-primary');
    });

    it('should find unprefixed var usages', () => {
      const varColor = { '$z-primary': 'rgb(255, 0, 0)' };
      const text = '.foo\n  color z-primary';
      const result = findStylVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
      expect(text.slice(result[0].start, result[0].end)).toBe('z-primary');
    });

    it('should find references on definition lines', () => {
      const varColor = { '$z-primary': 'rgb(255,0,0)', '$z-accent': 'rgb(0,255,0)' };
      const text = '$z-accent = $z-primary';
      const result = findStylVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255,0,0)');
      expect(text.slice(result[0].start, result[0].end)).toBe('$z-primary');
    });
  });
});
