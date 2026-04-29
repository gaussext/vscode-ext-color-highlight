import { resolveScssVars, findScssVarsInText } from '@/strategies/scss-vars';

describe('scss-vars', () => {
  describe('resolveScssVars', () => {
    it('should resolve direct hex colors', async () => {
      const varColor = await resolveScssVars('$primary: #ff0000;\n$secondary: #00ff00;');
      expect(varColor['$primary']).toBe('rgb(255, 0, 0)');
      expect(varColor['$secondary']).toBe('rgb(0, 255, 0)');
      expect(Object.keys(varColor)).toHaveLength(2);
    });

    it('should resolve recursive $variable references', async () => {
      const varColor = await resolveScssVars([
        '$c: #0000ff;',
        '$b: $c;',
        '$a: $b;',
      ].join('\n'));
      expect(varColor['$a']).toBe('rgb(0, 0, 255)');
      expect(varColor['$b']).toBe('rgb(0, 0, 255)');
    });

    it('should skip non-color variables', async () => {
      const varColor = await resolveScssVars('$spacing: 16px;\n$color: #ff0000;\n$margin: 10px;');
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['$color']).toBe('rgb(255, 0, 0)');
    });

    it('should skip forward references', async () => {
      const varColor = await resolveScssVars([
        '$a: $b;',
        '$b: #ff0000;',
      ].join('\n'));
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['$b']).toBe('rgb(255, 0, 0)');
    });
  });

  describe('findScssVarsInText', () => {
    it('should find $var usages matching the given varColor', () => {
      const varColor = { '$primary': 'rgb(255, 0, 0)' };
      const result = findScssVarsInText('.foo { color: $primary; }', varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should skip definition lines', () => {
      const varColor = { '$primary': 'rgb(255, 0, 0)' };
      const result = findScssVarsInText('$primary: #ff0000;\n.foo { color: $primary; }', varColor);
      expect(result).toHaveLength(1);
    });

    it('should return empty when no $var matches varColor', () => {
      const varColor = { '$primary': 'rgb(255, 0, 0)' };
      const result = findScssVarsInText('.foo { color: #ff0000; }', varColor);
      expect(result).toHaveLength(0);
    });
  });
});
