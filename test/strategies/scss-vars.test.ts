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

    it('should resolve backward references with underscore names', async () => {
      const varColor = await resolveScssVars([
        '$color_red: #f56c6c;',
        '$color_green: #67c23a;',
        '$color_blue: #409eff;',
        '$color_danger: $color_red;',
        '$color_success: $color_green;',
        '$color_primary: $color_blue;',
      ].join('\n'));
      expect(varColor['$color_red']).toBe('rgb(245, 108, 108)');
      expect(varColor['$color_green']).toBe('rgb(103, 194, 58)');
      expect(varColor['$color_blue']).toBe('rgb(64, 158, 255)');
      expect(varColor['$color_danger']).toBe('rgb(245, 108, 108)');
      expect(varColor['$color_success']).toBe('rgb(103, 194, 58)');
      expect(varColor['$color_primary']).toBe('rgb(64, 158, 255)');
    });

    it('should skip forward references with underscore names', async () => {
      const varColor = await resolveScssVars([
        '$color_danger: $color_red;',
        '$color_red: #f56c6c;',
      ].join('\n'));
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['$color_red']).toBe('rgb(245, 108, 108)');
    });

    it('should resolve multi-hop references with underscore names', async () => {
      const varColor = await resolveScssVars([
        '$color_red: #f56c6c;',
        '$color_danger: $color_red;',
        '$color_error: $color_danger;',
      ].join('\n'));
      expect(varColor['$color_error']).toBe('rgb(245, 108, 108)');
    });
  });

  describe('findScssVarsInText', () => {
    it('should find $var usages matching the given varColor', () => {
      const varColor = { '$primary': 'rgb(255, 0, 0)' };
      const text = '.foo { color: $primary; }';
      const result = findScssVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
      expect(text.slice(result[0].start, result[0].end)).toBe('$primary');
    });

    it('should skip definition name (left of colon) but highlight references (right of colon)', () => {
      const varColor = { '$color_red': 'rgb(245, 108, 108)', '$color_danger': 'rgb(245, 108, 108)' };
      const text = '$color_danger: $color_red;';
      const result = findScssVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(text.slice(result[0].start, result[0].end)).toBe('$color_red');
    });

    it('should highlight usage on separate line', () => {
      const varColor = { '$primary': 'rgb(255, 0, 0)' };
      const text = '$primary: #ff0000;\n.foo { color: $primary; }';
      const result = findScssVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(text.slice(result[0].start, result[0].end)).toBe('$primary');
      expect(text.slice(result[0].start, result[0].end)).not.toBe('#ff0000');
    });

    it('should return empty when no $var matches varColor', () => {
      const varColor = { '$primary': 'rgb(255, 0, 0)' };
      const result = findScssVarsInText('.foo { color: #ff0000; }', varColor);
      expect(result).toHaveLength(0);
    });
  });
});
