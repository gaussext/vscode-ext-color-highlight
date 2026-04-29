import { findCssVars } from '@/strategies/css-vars';

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
      const expectedStart = prefix.length + '.foo { color: var('.length;
      expect(result[0].start).toBe(expectedStart);
      expect(result[0].end).toBe(expectedStart + '--primary'.length);
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

    it('should highlight var() references in :root definitions', async () => {
      const text = [
        ':root {',
        '  --test-color-red: #f56c6c;',
        '  --test-color-green: #67c23a;',
        '  --test-color-blue: #409eff;',
        '  --test-color-yellow: #fdd835;',
        '',
        '  --test-color-primary: var(--test-color-blue);',
        '  --test-color-success: var(--test-color-green);',
        '  --test-color-danger: var(--test-color-red);',
        '  --test-color-warning: var(--test-color-yellow);',
        '',
        '  --test-color-1: var(--test-color-primary);',
        '  --test-color-11: var(--test-color-1);',
        '  --test-color-111: var(--test-color-11);',
        '  --test-color-1111: var(--test-color-111);',
        '  --test-color-11111: var(--test-color-1111);',
        '  --test-color-111111: var(--test-color-11111);',
        '  --test-color-1111111: var(--test-color-111111);',
        '  --test-color-11111111: var(--test-color-1111111);',
        '}',
      ].join('\n');
      const result = await findCssVars(text);
      expect(result).toHaveLength(12);
      for (const r of result) {
        expect(r.color).toBeTruthy();
        expect(r.color).not.toBe('');
      }
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

    it('should perform well with 1000 definitions and 1000 references using random color functions', async () => {
      const defs: string[] = [];
      const refs: string[] = [];
      const COUNT = 1000;
      const colorFuncs = ['rgb', 'hsl', 'hwb'];

      for (let i = 0; i < COUNT; i++) {
        const func = colorFuncs[i % 3];
        const r = () => Math.floor(Math.random() * 256);
        const h = () => Math.floor(Math.random() * 361);
        const p = () => Math.floor(Math.random() * 101);
        const value = func === 'rgb'
          ? `rgb(${r()}, ${r()}, ${r()})`
          : func === 'hsl'
            ? `hsl(${h()}, ${p()}%, ${p()}%)`
            : `hwb(${h()}, ${p()}%, ${p()}%)`;
        defs.push(`--var-${i}: ${value};`);
        refs.push(`.ref-${i} { color: var(--var-${i}); }`);
      }

      const text = defs.join('\n') + '\n' + refs.join('\n');

      const start = Date.now();
      const result = await findCssVars(text);
      const elapsed = Date.now() - start;

      expect(result.length).toBe(COUNT);
      expect(elapsed).toBeLessThan(30000);
    });
  });
});
