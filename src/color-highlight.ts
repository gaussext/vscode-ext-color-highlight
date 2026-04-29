import * as vscode from 'vscode';
import { findScssVars } from './strategies/scss-vars';
import { findLessVars } from './strategies/less-vars';
import { findStylVars } from './strategies/styl-vars';
import { findCssVars } from './strategies/css-vars';
import { findColorFunctionsInText } from './find/functions';
import { findRgbNoFn } from './find/rgbWithoutFunction';
import { findHslNoFn } from './find/hslWithoutFunction';
import { findHex } from './find/hex';
import { findHwb } from './find/hwb';
import { findWords } from './find/words';
import { DecorationMap } from './lib/decoration-map';
import { ViewConfig, ColorMatch } from './types';
import { loadGlobalVariables } from './importer/global-importer';

const colorWordsLanguages = ['css', 'scss', 'sass', 'less', 'stylus'];

export class DocumentHighlight {
  private disposed = false;
  private document: vscode.TextDocument;
  // eslint-disable-next-line no-unused-vars
  private strategies: Array<(text: string) => Promise<ColorMatch[]>>;
  private decorations!: DecorationMap;
  private listener!: vscode.Disposable;
  private updateTimeout: ReturnType<typeof setTimeout> | undefined;
  private lastUpdatedVersion: string | undefined;
  private updatePromise: Promise<void> | undefined;

  public getDocument(): vscode.TextDocument {
    return this.document;
  }

  constructor(document: vscode.TextDocument, viewConfig: ViewConfig) {
    this.disposed = false;
    this.document = document;
    this.strategies = [findColorFunctionsInText, findHwb];

    this.strategies.push(findHex);

    if (colorWordsLanguages.indexOf(document.languageId) > -1 || viewConfig.matchWords) {
      this.strategies.push(findWords);
    }

    if (viewConfig.matchRgbWithNoFunction) {
      let isValid = false;

      if (viewConfig.rgbWithNoFunctionLanguages.indexOf('*') > -1) {
        isValid = true;
      }

      if (viewConfig.rgbWithNoFunctionLanguages.indexOf(document.languageId) > -1) {
        isValid = true;
      }

      if (viewConfig.rgbWithNoFunctionLanguages.indexOf(`!${document.languageId}`) > -1) {
        isValid = false;
      }

      if (isValid) {
        this.strategies.push(findRgbNoFn);
      }
    }

    if (viewConfig.matchHslWithNoFunction) {
      let isValid = false;

      if (viewConfig.hslWithNoFunctionLanguages.indexOf('*') > -1) {
        isValid = true;
      }

      if (viewConfig.hslWithNoFunctionLanguages.indexOf(document.languageId) > -1) {
        isValid = true;
      }

      if (viewConfig.hslWithNoFunctionLanguages.indexOf(`!${document.languageId}`) > -1) {
        isValid = false;
      }

      if (isValid) {
        this.strategies.push(findHslNoFn);
      }
    }
    const injectContent = loadGlobalVariables({ globalPaths: viewConfig.globalPaths });
    this.strategies.push(text => findCssVars(injectContent + '\n' + text));
    this.strategies.push(text => findLessVars(injectContent + '\n' + text));
    this.strategies.push(text =>findScssVars(injectContent + '\n' + text));
    this.strategies.push(text => findStylVars(injectContent + '\n' + text));

    this.initialize(viewConfig);
  }

  private initialize(viewConfig: ViewConfig): void {
    this.decorations = new DecorationMap(viewConfig);
    this.listener = vscode.workspace.onDidChangeTextDocument(({ document }) => this.onDocumentChanged(document));
  }

  private onDocumentChanged(document: vscode.TextDocument): void {
    if (this.disposed || this.document.uri.toString() !== document.uri.toString()) {
      return;
    }

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    const text = this.document.getText();
    const version = this.document.version.toString();

    this.updateTimeout = setTimeout(() => {
      this.updateTimeout = undefined;
      this.updateRange(text, version);
    }, 150);
  }

  onUpdate(document: vscode.TextDocument = this.document): void {
    if (this.disposed || this.document.uri.toString() !== document.uri.toString()) {
      return;
    }

    const version = this.document.version.toString();
    if (this.lastUpdatedVersion === version) return;

    const text = this.document.getText();

    this.updateRange(text, version);
  }

  async updateRange(text: string, version: string): Promise<void> {
    if (this.lastUpdatedVersion === version) return;

    if (this.updatePromise) {
      await this.updatePromise;
      if (this.lastUpdatedVersion === this.document.version.toString()) return;
    }

    this.updatePromise = this.runUpdate(text, version);
    await this.updatePromise;
    this.updatePromise = undefined;
  }

  private async runUpdate(text: string, version: string): Promise<void> {
    try {
      const colorRanges = await this.getColorRanges(text, version);
      if (!colorRanges || this.disposed) return;

      this.applyDecorations(colorRanges);
      this.lastUpdatedVersion = version;
    } catch (error) {
      console.error(error);
    }
  }

  private async getColorRanges(text: string, version: string): Promise<Record<string, ColorMatch[]> | undefined> {
    const result = await Promise.all(this.strategies.map(fn => fn(text)));
    const actualVersion = this.document.version.toString();
    if (actualVersion !== version) return;
    return groupByColor(concatAll(result));
  }

  private applyDecorations(colorRanges: Record<string, ColorMatch[]>): void {
    const updateStack: Record<string, vscode.Range[]> = {};
    this.decorations.keys().forEach(color => {
      updateStack[color] = [];
    });

    for (const color in colorRanges) {
      updateStack[color] = colorRanges[color].map(item => {
        return new vscode.Range(
          this.document.positionAt(item.start),
          this.document.positionAt(item.end)
        );
      });
    }

    for (const color in updateStack) {
      const decoration = this.decorations.get(color);

      vscode.window.visibleTextEditors
        .filter(({ document }) => document.uri === this.document.uri)
        .forEach(editor => editor.setDecorations(decoration, updateStack[color]));
    }
  }

  dispose(): void {
    this.disposed = true;

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = undefined;
    }

    this.decorations.dispose();
    this.listener.dispose();

    this.decorations = null as unknown as DecorationMap;
    this.document = null as unknown as vscode.TextDocument;
    this.listener = null as unknown as vscode.Disposable;
  }
}

function groupByColor(results: ColorMatch[]): Record<string, ColorMatch[]> {
  return results.reduce((collection, item) => {
    if (!collection[item.color]) {
      collection[item.color] = [];
    }
    collection[item.color].push(item);
    return collection;
  }, {} as Record<string, ColorMatch[]>);
}

function concatAll(arr: ColorMatch[][]): ColorMatch[] {
  return arr.reduce((result, item) => result.concat(item), []);
}
