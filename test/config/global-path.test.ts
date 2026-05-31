import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { findScssVars } from '@/strategies/scss-vars';

const injectContent = [
  '$color_red: #f56c6c;',
  '$color_green: #67c23a;',
  '$color_blue: #409eff;',
  '$color_yellow: #fdd835;',
  '',
  '$color_danger: $color_red;',
  '$color_success: $color_green;',
  '$color_primary: $color_blue;',
  '$color_warning: $color_yellow;',
  '',
  '$color_text: #606266;',
  '$color_text_light: #9099a4;',
].join('\n');

const documentText = [
  '.test {',
  '  color: $color_red;',
  '  color: $color_green;',
  '  color: $color_blue;',
  '  color: $color_yellow;',
  '}',
].join('\n');

let tmpDir: string;
let varsFile: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'color-highlight-test-'));
  varsFile = path.join(tmpDir, '_variables.scss');
  fs.writeFileSync(varsFile, injectContent, 'utf-8');
});

function rimraf(dir: string): void {
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        rimraf(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    fs.rmdirSync(dir);
  }
}

afterEach(() => {
  rimraf(tmpDir);
});

describe('global-path', () => {
  describe('findScssVars', () => {
    it('should resolve all 4 direct colors from file-based injectContent', async () => {
      const fileContent = fs.readFileSync(varsFile, 'utf-8');
      const result = await findScssVars(fileContent, documentText);
      expect(result).toHaveLength(4);
    });

    it('should match $color_red with correct color', async () => {
      const fileContent = fs.readFileSync(varsFile, 'utf-8');
      const result = await findScssVars(fileContent, documentText);
      const match = result.find(m => documentText.slice(m.start, m.end) === '$color_red');
      expect(match).toBeDefined();
      expect(match!.color).toBe('rgb(245, 108, 108)');
    });

    it('should match $color_green with correct color', async () => {
      const fileContent = fs.readFileSync(varsFile, 'utf-8');
      const result = await findScssVars(fileContent, documentText);
      const match = result.find(m => documentText.slice(m.start, m.end) === '$color_green');
      expect(match).toBeDefined();
      expect(match!.color).toBe('rgb(103, 194, 58)');
    });

    it('should match $color_blue with correct color', async () => {
      const fileContent = fs.readFileSync(varsFile, 'utf-8');
      const result = await findScssVars(fileContent, documentText);
      const match = result.find(m => documentText.slice(m.start, m.end) === '$color_blue');
      expect(match).toBeDefined();
      expect(match!.color).toBe('rgb(64, 158, 255)');
    });

    it('should match $color_yellow with correct color', async () => {
      const fileContent = fs.readFileSync(varsFile, 'utf-8');
      const result = await findScssVars(fileContent, documentText);
      const match = result.find(m => documentText.slice(m.start, m.end) === '$color_yellow');
      expect(match).toBeDefined();
      expect(match!.color).toBe('rgb(253, 216, 53)');
    });

    it('should not match variables only defined as references in injectContent', async () => {
      const fileContent = fs.readFileSync(varsFile, 'utf-8');
      const result = await findScssVars(fileContent, documentText);
      const dangerMatch = result.find(m => documentText.slice(m.start, m.end) === '$color_danger');
      expect(dangerMatch).toBeUndefined();
    });

    it('each match position should be within documentText bounds', async () => {
      const fileContent = fs.readFileSync(varsFile, 'utf-8');
      const result = await findScssVars(fileContent, documentText);
      for (const m of result) {
        expect(m.start).toBeGreaterThanOrEqual(0);
        expect(m.end).toBeLessThanOrEqual(documentText.length);
        expect(m.start).toBeLessThan(m.end);
      }
    });
  });
});
