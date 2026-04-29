import { findCssVars } from '../src/strategies/css-vars';

describe('css-vars', () => {
  describe('findCssVars', () => {
    it('should resolve direct color in variable definition', async () => {
      const text = '--primary: #ff0000;\n.foo { color: var(--primary); }';
      const result = await findCssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should resolve single-level recursive reference', async () => {
      const text = [
        '--primary: #00ff00;',
        '--accent: var(--primary);',
        '.foo { color: var(--accent); }',
      ].join('\n');
      const result = await findCssVars(text);
      expect(result).toHaveLength(2);
      expect(result[0].color).toBe('rgb(0, 255, 0)');
      expect(result[1].color).toBe('rgb(0, 255, 0)');
    });

    it('should resolve multi-level recursive chain', async () => {
      const text = [
        '--c: #0000ff;',
        '--b: var(--c);',
        '--a: var(--b);',
        'div { border: var(--a); }',
      ].join('\n');
      const result = await findCssVars(text);
      expect(result).toHaveLength(3);
      expect(result[0].color).toBe('rgb(0, 0, 255)');
      expect(result[1].color).toBe('rgb(0, 0, 255)');
      expect(result[2].color).toBe('rgb(0, 0, 255)');
    });

    it('should resolve only top-down references (no forward ref)', async () => {
      const text = [
        '--a: var(--b);',
        '--b: #ff0000;',
        '.foo { color: var(--a); }',
      ].join('\n');
      const result = await findCssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should skip duplicate variable definitions', async () => {
      const text = [
        '--primary: #ff0000;',
        '--primary: #00ff00;',
        '.foo { color: var(--primary); }',
      ].join('\n');
      const result = await findCssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should return accurate position for var() usage', async () => {
      const text = '.foo { color: var(--primary); }';
      const prefix = '--primary: #ff0000;\n';
      const result = await findCssVars(prefix + text);
      expect(result).toHaveLength(1);
      const expectedStart = prefix.length + '.foo { color: '.length;
      expect(result[0].start).toBe(expectedStart);
      expect(result[0].end).toBe(expectedStart + 'var(--primary)'.length);
    });

    it('should handle multiple usages of different variables', async () => {
      const text = [
        '--primary: #ff0000;',
        '--secondary: #00ff00;',
        '.a { color: var(--primary); }',
        '.b { color: var(--secondary); }',
      ].join('\n');
      const result = await findCssVars(text);
      expect(result).toHaveLength(2);
      const colors = result.map(r => r.color);
      expect(colors).toContain('rgb(255, 0, 0)');
      expect(colors).toContain('rgb(0, 255, 0)');
    });

    it('should return empty array for no CSS variables', async () => {
      const text = '.foo { color: #ff0000; }';
      const result = await findCssVars(text);
      expect(result).toHaveLength(0);
    });

    it('should handle rgb() in variable value', async () => {
      const text = '--primary: rgb(255, 0, 0);\n.foo { color: var(--primary); }';
      const result = await findCssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toContain('rgb(255, 0, 0)');
    });

    it('should handle hwb() in variable value', async () => {
      const text = '--primary: hwb(0, 0%, 0%);\n.foo { color: var(--primary); }';
      const result = await findCssVars(text);
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });
  });

  describe('performance', () => {
    const LARGE_COUNT = 500;

    it(`should resolve ${LARGE_COUNT} variable definitions quickly`, async () => {
      const defs: string[] = [];
      for (let i = 0; i < LARGE_COUNT; i++) {
        defs.push(`--var-${i}: #${String(i).padStart(6, '0').slice(0, 6)};`);
      }
      defs.push(`.foo { color: var(--var-0); }`);
      const text = defs.join('\n');

      const start = Date.now();
      const result = await findCssVars(text);
      const elapsed = Date.now() - start;

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(elapsed).toBeLessThan(10000);
    });
  });
});
