import { resolveCssVars, findCssVarsInText } from '@/strategies/css-vars';

describe('css-vars', () => {
  describe('resolveCssVars', () => {
    it('should resolve direct hex colors', async () => {
      const varColor = await resolveCssVars('--primary: #ff0000;\n--secondary: #00ff00;\n.other { color: red; }');
      expect(varColor['--primary']).toBe('rgb(255, 0, 0)');
      expect(varColor['--secondary']).toBe('rgb(0, 255, 0)');
      expect(Object.keys(varColor)).toHaveLength(2);
    });

    it('should resolve recursive var() references', async () => {
      const varColor = await resolveCssVars([
        '--c: #0000ff;',
        '--b: var(--c);',
        '--a: var(--b);',
      ].join('\n'));
      expect(varColor['--c']).toBe('rgb(0, 0, 255)');
      expect(varColor['--b']).toBe('rgb(0, 0, 255)');
      expect(varColor['--a']).toBe('rgb(0, 0, 255)');
    });

    it('should resolve rgb() and hwb() values', async () => {
      const varColor = await resolveCssVars('--a: rgb(255, 0, 0);\n--b: hwb(0, 0%, 0%);');
      expect(varColor['--a']).toContain('rgb(255, 0, 0)');
      expect(varColor['--b']).toBe('rgb(255, 0, 0)');
    });

    it('should skip non-color variables', async () => {
      const varColor = await resolveCssVars('--spacing: 16px;\n--color: #ff0000;\n--margin: 10px;');
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['--color']).toBe('rgb(255, 0, 0)');
    });
  });

  describe('findCssVarsInText', () => {
    it('should find var() usages matching the given varColor', () => {
      const varColor = { '--primary': 'rgb(255, 0, 0)' };
      const result = findCssVarsInText('.foo { color: var(--primary); }', varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should return empty when no var() matches varColor', () => {
      const varColor = { '--primary': 'rgb(255, 0, 0)' };
      const result = findCssVarsInText('.foo { color: #ff0000; }', varColor);
      expect(result).toHaveLength(0);
    });

    it('should only match --xxx inside var() without var wrapper', () => {
      const varColor = { '--primary': 'rgb(255, 0, 0)' };
      const text = '.foo { color: var(--primary); }';
      const result = findCssVarsInText(text, varColor);
      expect(text.slice(result[0].start, result[0].end)).toBe('--primary');
    });

    it('should handle multiple usages of different variables', () => {
      const varColor = { '--a': 'rgb(255,0,0)', '--b': 'rgb(0,255,0)' };
      const text = '.x { color: var(--a); }\n.y { color: var(--b); }';
      const result = findCssVarsInText(text, varColor);
      expect(result).toHaveLength(2);
    });
  });
});
