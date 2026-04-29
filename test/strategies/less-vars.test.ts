import { resolveLessVars, findLessVarsInText } from '@/strategies/less-vars';

describe('less-vars', () => {
  describe('resolveLessVars', () => {
    it('should resolve direct hex colors', async () => {
      const varColor = await resolveLessVars('@primary: #ff0000;\n@secondary: #00ff00;');
      expect(varColor['@primary']).toBe('rgb(255, 0, 0)');
      expect(varColor['@secondary']).toBe('rgb(0, 255, 0)');
      expect(Object.keys(varColor)).toHaveLength(2);
    });

    it('should resolve recursive @variable references', async () => {
      const varColor = await resolveLessVars([
        '@c: #0000ff;',
        '@b: @c;',
        '@a: @b;',
      ].join('\n'));
      expect(varColor['@a']).toBe('rgb(0, 0, 255)');
      expect(varColor['@b']).toBe('rgb(0, 0, 255)');
    });

    it('should skip forward references', async () => {
      const varColor = await resolveLessVars([
        '@a: @b;',
        '@b: #ff0000;',
      ].join('\n'));
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['@b']).toBe('rgb(255, 0, 0)');
    });
  });

  describe('findLessVarsInText', () => {
    it('should find @var usages matching the given varColor', () => {
      const varColor = { '@primary': 'rgb(255, 0, 0)' };
      const text = '.foo { color: @primary; }';
      const result = findLessVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
      expect(text.slice(result[0].start, result[0].end)).toBe('@primary');
    });

    it('should skip definition name (left of colon) but highlight references (right of colon)', () => {
      const varColor = { '@color_red': 'rgb(245, 108, 108)', '@color_danger': 'rgb(245, 108, 108)' };
      const text = '@color_danger: @color_red;';
      const result = findLessVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(text.slice(result[0].start, result[0].end)).toBe('@color_red');
    });

    it('should highlight usage on separate line', () => {
      const varColor = { '@primary': 'rgb(255, 0, 0)' };
      const text = '@primary: #ff0000;\n.foo { color: @primary; }';
      const result = findLessVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(text.slice(result[0].start, result[0].end)).toBe('@primary');
    });
  });
});
