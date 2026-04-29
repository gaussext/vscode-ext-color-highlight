import { resolveScssVars, findScssVarsInText, findScssVars } from '@/strategies/scss-vars';

describe('scss-vars', () => {
  describe('resolveScssVars', () => {
    it('should resolve direct hex colors', async () => {
      const varColor = await resolveScssVars('$primary: #ff0000;\n$secondary: #00ff00;');
      expect(varColor['primary']).toBe('rgb(255, 0, 0)');
      expect(varColor['secondary']).toBe('rgb(0, 255, 0)');
      expect(Object.keys(varColor)).toHaveLength(2);
    });

    it('should resolve recursive $variable references', async () => {
      const varColor = await resolveScssVars([
        '$c: #0000ff;',
        '$b: $c;',
        '$a: $b;',
      ].join('\n'));
      expect(varColor['a']).toBe('rgb(0, 0, 255)');
      expect(varColor['b']).toBe('rgb(0, 0, 255)');
    });

    it('should skip non-color variables', async () => {
      const varColor = await resolveScssVars('$spacing: 16px;\n$color: #ff0000;\n$margin: 10px;');
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['color']).toBe('rgb(255, 0, 0)');
    });

    it('should skip forward references', async () => {
      const varColor = await resolveScssVars([
        '$a: $b;',
        '$b: #ff0000;',
      ].join('\n'));
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['b']).toBe('rgb(255, 0, 0)');
    });
  });

  describe('findScssVarsInText', () => {
    it('should find $var usages matching the given varColor', () => {
      const varColor = { 'primary': 'rgb(255, 0, 0)' };
      const result = findScssVarsInText('.foo { color: $primary; }', varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should skip definition lines', () => {
      const varColor = { 'primary': 'rgb(255, 0, 0)' };
      const result = findScssVarsInText('$primary: #ff0000;\n.foo { color: $primary; }', varColor);
      expect(result).toHaveLength(1);
    });

    it('should return empty when no $var matches varColor', () => {
      const varColor = { 'primary': 'rgb(255, 0, 0)' };
      const result = findScssVarsInText('.foo { color: #ff0000; }', varColor);
      expect(result).toHaveLength(0);
    });
  });

  describe('findScssVars', () => {
    it('should resolve direct color in variable definition', async () => {
      const text = '$primary: #ff0000;\n.foo { color: $primary; }';
      const result = await findScssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should resolve direct color in definition', async () => {
      const text = [
        '$primary: #00ff00;',
        '.foo { color: $primary; }',
      ].join('\n');
      const result = await findScssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(0, 255, 0)');
    });

    it('should resolve direct color and match referenced usage in definition', async () => {
      const text = [
        '$c: #0000ff;',
        '$b: $c;',
        '$a: $b;',
        'div { border: $a; }',
      ].join('\n');
      const result = await findScssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(0, 0, 255)');
    });

    it('should not resolve forward references', async () => {
      const text = [
        '$a: $b;',
        '$b: #ff0000;',
        '.foo { color: $a; }',
      ].join('\n');
      const result = await findScssVars(text);
      expect(result).toHaveLength(0);
    });

    it('should skip duplicate variable definitions', async () => {
      const text = [
        '$primary: #ff0000;',
        '$primary: #00ff00;',
        '.foo { color: $primary; }',
      ].join('\n');
      const result = await findScssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should return accurate position for $variable usage', async () => {
      const text = '.foo { color: $primary; }';
      const prefix = '$primary: #ff0000;\n';
      const result = await findScssVars(prefix + text);
      expect(result).toHaveLength(1);
      const expectedStart = prefix.length + '.foo { color: '.length;
      expect(result[0].start).toBe(expectedStart);
      expect(result[0].end).toBe(expectedStart + '$primary'.length);
    });

    it('should not match variable definition line as usage', async () => {
      const text = [
        '$primary: #ff0000;',
        '.foo { color: $primary; }',
      ].join('\n');
      const result = await findScssVars(text);
      expect(result).toHaveLength(1);
    });

    it('should handle multiple usages of different variables', async () => {
      const text = [
        '$primary: #ff0000;',
        '$secondary: #00ff00;',
        '.a { color: $primary; }',
        '.b { color: $secondary; }',
      ].join('\n');
      const result = await findScssVars(text);
      expect(result).toHaveLength(2);
      const colors = result.map(r => r.color);
      expect(colors).toContain('rgb(255, 0, 0)');
      expect(colors).toContain('rgb(0, 255, 0)');
    });

    it('should return empty array for no SCSS variables', async () => {
      const text = '.foo { color: #ff0000; }';
      const result = await findScssVars(text);
      expect(result).toHaveLength(0);
    });

    it('should handle rgb() in variable value', async () => {
      const text = '$primary: rgb(255, 0, 0);\n.foo { color: $primary; }';
      const result = await findScssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toContain('rgb(255, 0, 0)');
    });

    it('should handle color-word variable values', async () => {
      const text = '$primary: red;\n.foo { color: $primary; }';
      const result = await findScssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });
  });

  describe('performance', () => {
    const LARGE_COUNT = 500;

    it(`should resolve ${LARGE_COUNT} variable definitions quickly`, async () => {
      const defs: string[] = [];
      for (let i = 0; i < LARGE_COUNT; i++) {
        defs.push(`$var-${i}: #${String(i).padStart(6, '0').slice(0, 6)};`);
      }
      defs.push(`.foo { color: $var-0; }`);
      const text = defs.join('\n');

      const start = Date.now();
      const result = await findScssVars(text);
      const elapsed = Date.now() - start;

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(elapsed).toBeLessThan(10000);
    });
  });
});
