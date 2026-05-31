import { resolveNormalVars, findNormalVarsInText } from '@/strategies/normal-vars';

describe('normal-vars', () => {
  describe('resolveNormalVars', () => {
    it('should resolve quoted hex colors', async () => {
      const varColor = await resolveNormalVars('TestColorRed = "#f56c6c"');
      expect(varColor['TestColorRed']).toBe('rgb(245, 108, 108)');
    });

    it('should resolve unquoted hex colors', async () => {
      const varColor = await resolveNormalVars('TestColorRed = #f56c6c');
      expect(varColor['TestColorRed']).toBe('rgb(245, 108, 108)');
    });

    it('should resolve recursive variable references', async () => {
      const varColor = await resolveNormalVars([
        'TestColorRed = "#f56c6c"',
        'TestColorDanger = TestColorRed',
      ].join('\n'));
      expect(varColor['TestColorDanger']).toBe('rgb(245, 108, 108)');
    });

    it('should skip non-color variables', async () => {
      const varColor = await resolveNormalVars([
        'Timeout = 30',
        'TestColorRed = "#f56c6c"',
      ].join('\n'));
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['TestColorRed']).toBe('rgb(245, 108, 108)');
    });

    it('should skip forward references', async () => {
      const varColor = await resolveNormalVars([
        'TestColorDanger = TestColorRed',
        'TestColorRed = "#f56c6c"',
      ].join('\n'));
      expect(Object.keys(varColor)).toHaveLength(1);
      expect(varColor['TestColorRed']).toBe('rgb(245, 108, 108)');
    });

    it('should skip vars with only name', async () => {
      const varColor = await resolveNormalVars('TestColorRed');
      expect(Object.keys(varColor)).toHaveLength(0);
    });

    it('should resolve multi-hop references', async () => {
      const varColor = await resolveNormalVars([
        'TestColorRed = "#f56c6c"',
        'TestColorDanger = TestColorRed',
        'TestColorError = TestColorDanger',
      ].join('\n'));
      expect(varColor['TestColorError']).toBe('rgb(245, 108, 108)');
    });

    it('should resolve named colors', async () => {
      const varColor = await resolveNormalVars('TestColor = "red"');
      expect(varColor['TestColor']).toBe('rgb(255, 0, 0)');
    });

    it('should handle var keyword prefix', async () => {
      const varColor = await resolveNormalVars('var TestColorRed = "#f56c6c"');
      expect(varColor['TestColorRed']).toBe('rgb(245, 108, 108)');
    });

    it('should handle := syntax', async () => {
      const varColor = await resolveNormalVars('TestColorRed := "#f56c6c"');
      expect(varColor['TestColorRed']).toBe('rgb(245, 108, 108)');
    });

    it('should handle trailing comments', async () => {
      const varColor = await resolveNormalVars('TestColorBlue = "#409eff" // primary blue');
      expect(varColor['TestColorBlue']).toBe('rgb(64, 158, 255)');
    });

    it('should handle reference with trailing comment', async () => {
      const varColor = await resolveNormalVars([
        'TestColorRed = "#f56c6c"',
        'TestColorDanger = TestColorRed // danger alias',
      ].join('\n'));
      expect(varColor['TestColorDanger']).toBe('rgb(245, 108, 108)');
    });
  });

  describe('findNormalVarsInText', () => {
    it('should find usage on right side of =', () => {
      const varColor = { 'TestColorRed': 'rgb(245, 108, 108)' };
      const text = 'TestColorDanger = TestColorRed';
      const result = findNormalVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(text.slice(result[0].start, result[0].end)).toBe('TestColorRed');
    });

    it('should skip variable name on left side of =', () => {
      const varColor = { 'TestColorRed': 'rgb(245, 108, 108)', 'TestColorDanger': 'rgb(245, 108, 108)' };
      const text = 'TestColorDanger = TestColorRed';
      const result = findNormalVarsInText(text, varColor);
      const names = result.map(m => text.slice(m.start, m.end));
      expect(names).not.toContain('TestColorDanger');
      expect(names).toContain('TestColorRed');
    });

    it('should find usage as function argument', () => {
      const varColor = { 'TestColorRed': 'rgb(245, 108, 108)' };
      const text = 'fmt.Println(TestColorRed)';
      const result = findNormalVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(text.slice(result[0].start, result[0].end)).toBe('TestColorRed');
    });

    it('should skip function name before (', () => {
      const varColor = { 'TestColorRed': 'rgb(245, 108, 108)' };
      const text = 'func TestColorRed() string';
      const result = findNormalVarsInText(text, varColor);
      expect(result).toHaveLength(0);
    });

    it('should not match as substring of longer name', () => {
      const varColor = { 'TestColor': 'rgb(255, 0, 0)' };
      const text = 'TestColorRed = "#f56c6c"';
      const result = findNormalVarsInText(text, varColor);
      expect(result).toHaveLength(0);
    });

    it('should match longer name before shorter', () => {
      const varColor = { 'Color': 'rgb(0,0,0)', 'ColorRed': 'rgb(255,0,0)' };
      const text = 'X = ColorRed';
      const result = findNormalVarsInText(text, varColor);
      expect(result).toHaveLength(1);
      expect(text.slice(result[0].start, result[0].end)).toBe('ColorRed');
    });
  });
});
