import { resolveStylVars, findStylVarsInText, findStylVars } from '@/strategies/styl-vars';

describe('styl-vars', () => {
  describe('resolveStylVars', () => {
    it('should resolve $prefixed hex colors', async () => {
      const varColor = await resolveStylVars('$z-primary = #ff0000');
      expect(varColor['z-primary']).toBe('rgb(255, 0, 0)');
    });

    it('should resolve unprefixed hex colors', async () => {
      const varColor = await resolveStylVars('z-primary = #00ff00');
      expect(varColor['z-primary']).toBe('rgb(0, 255, 0)');
    });

    it('should resolve recursive $variable references', async () => {
      const varColor = await resolveStylVars([
        '$z-c = #0000ff',
        '$z-b = $z-c',
        '$z-a = $z-b',
      ].join('\n'));
      expect(varColor['z-a']).toBe('rgb(0, 0, 255)');
      expect(varColor['z-b']).toBe('rgb(0, 0, 255)');
    });

    it('should skip forward references', async () => {
      const varColor = await resolveStylVars([
        '$z-a = $z-b',
        '$z-b = #ff0000',
      ].join('\n'));
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['z-b']).toBe('rgb(255, 0, 0)');
    });
  });

  describe('findStylVarsInText', () => {
    it('should find $var usages matching the given varColor', () => {
      const varColor = { 'z-primary': 'rgb(255, 0, 0)' };
      const result = findStylVarsInText('.foo\n  color $z-primary', varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find unprefixed var usages', () => {
      const varColor = { 'z-primary': 'rgb(255, 0, 0)' };
      const result = findStylVarsInText('.foo\n  color z-primary', varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find references on definition lines', () => {
      const varColor = { 'z-primary': 'rgb(255,0,0)', 'z-accent': 'rgb(0,255,0)' };
      const result = findStylVarsInText('$z-accent = $z-primary', varColor);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255,0,0)');
    });
  });

  describe('findStylVars', () => {
    it('should resolve $prefixed direct color in variable definition', async () => {
      const text = '$z-primary = #ff0000\n.foo\n  color $z-primary';
      const result = await findStylVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should resolve unprefixed direct color in variable definition', async () => {
      const text = 'z-primary = #ff0000\n.foo\n  color z-primary';
      const result = await findStylVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should resolve single-level recursive reference with $', async () => {
      const text = [
        '$z-primary = #00ff00',
        '$z-accent = $z-primary',
        '.foo',
        '  color $z-accent',
      ].join('\n');
      const result = await findStylVars(text);
      expect(result).toHaveLength(2);
      expect(result[0].color).toBe('rgb(0, 255, 0)');
      expect(result[1].color).toBe('rgb(0, 255, 0)');
    });

    it('should resolve multi-level recursive chain', async () => {
      const text = [
        '$z-c = #0000ff',
        '$z-b = $z-c',
        '$z-a = $z-b',
        'div',
        '  border $z-a',
      ].join('\n');
      const result = await findStylVars(text);
      expect(result).toHaveLength(3);
      expect(result[0].color).toBe('rgb(0, 0, 255)');
      expect(result[1].color).toBe('rgb(0, 0, 255)');
      expect(result[2].color).toBe('rgb(0, 0, 255)');
    });

    it('should resolve only top-down references (no forward ref)', async () => {
      const text = [
        '$z-a = $z-b',
        '$z-b = #ff0000',
        '.foo',
        '  color $z-a',
      ].join('\n');
      const result = await findStylVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should skip duplicate variable definitions', async () => {
      const text = [
        '$z-primary = #ff0000',
        '$z-primary = #00ff00',
        '.foo',
        '  color $z-primary',
      ].join('\n');
      const result = await findStylVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should return accurate position for $variable usage', async () => {
      const text = '.foo\n  color $z-primary';
      const prefix = '$z-primary = #ff0000\n';
      const fullText = prefix + text;
      const result = await findStylVars(fullText);
      expect(result).toHaveLength(1);
      const expectedStart = prefix.length + '.foo\n  color '.length;
      expect(result[0].start).toBe(expectedStart);
      expect(result[0].end).toBe(expectedStart + '$z-primary'.length);
    });

    it('should not match variable definition line as usage', async () => {
      const text = [
        '$z-primary = #ff0000',
        '.foo',
        '  color $z-primary',
      ].join('\n');
      const result = await findStylVars(text);
      expect(result).toHaveLength(1);
    });

    it('should handle multiple usages of different variables', async () => {
      const text = [
        '$z-primary = #ff0000',
        '$z-secondary = #00ff00',
        '.a',
        '  color $z-primary',
        '.b',
        '  color $z-secondary',
      ].join('\n');
      const result = await findStylVars(text);
      expect(result).toHaveLength(2);
      const colors = result.map(r => r.color);
      expect(colors).toContain('rgb(255, 0, 0)');
      expect(colors).toContain('rgb(0, 255, 0)');
    });

    it('should return empty array for no Stylus variables', async () => {
      const text = '.foo\n  color #ff0000';
      const result = await findStylVars(text);
      expect(result).toHaveLength(0);
    });

    it('should handle rgb() in variable value', async () => {
      const text = '$z-primary = rgb(255, 0, 0)\n.foo\n  color $z-primary';
      const result = await findStylVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toContain('rgb(255, 0, 0)');
    });

    it('should handle color-word variable values', async () => {
      const text = '$z-primary = red\n.foo\n  color $z-primary';
      const result = await findStylVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });
  });

  describe('performance', () => {
    const LARGE_COUNT = 500;

    it(`should resolve ${LARGE_COUNT} variable definitions quickly`, async () => {
      const defs: string[] = [];
      for (let i = 0; i < LARGE_COUNT; i++) {
        defs.push(`$z-${String(i).padStart(3, '0')} = #${String(i).padStart(6, '0').slice(0, 6)}`);
      }
      defs.push(`.foo\n  color $z-000`);
      const text = defs.join('\n');

      const start = Date.now();
      const result = await findStylVars(text);
      const elapsed = Date.now() - start;

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(elapsed).toBeLessThan(10000);
    });
  });
});
