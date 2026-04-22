import * as vscode from 'vscode';
import { getColorContrast } from './dynamic-contrast';
import { ViewConfig } from '../types';

interface DecorationRule {
  contentText?: string;
  margin?: string;
  width?: string;
  height?: string;
  backgroundColor?: string;
  border?: string;
  color?: string;
  overviewRulerColor?: string;
  after?: object;
  before?: object;
  borderRadius?: string;
}

function createDot(color = ''): DecorationRule {
  return {
    contentText: ' ',
    margin: '0.1em 0.2em 0',
    width: '0.8em',
    height: '0.8em',
    backgroundColor: color,
    border: '0.1em solid #fff',
  };
}

export class DecorationMap {
  private options: ViewConfig;
  private _map: Map<string, vscode.TextEditorDecorationType>;
  private _keys: string[];

  constructor(options: ViewConfig) {
    this.options = options;
    this._map = new Map();
    this._keys = [];
  }

  get(color: string): vscode.TextEditorDecorationType {
    if (!this._map.has(color)) {
      const rules: DecorationRule = {};

      if (this.options.markRuler) {
        rules.overviewRulerColor = color;
      }

      switch (this.options.markerType) {
        case 'outline':
          rules.border = `3px solid ${color}`;
          break;
        case 'foreground':
          rules.color = color;
          break;
        case 'underline':
          rules.color = 'invalid; border-bottom:solid 2px ' + color;
          break;
        case 'dot':
        case 'dotafter':
        case 'dot-after':
        case 'dot_after':
          rules.after = createDot(color);
          break;
        case 'dotbefore':
        case 'dot-before':
        case 'dot_before':
          rules.before = createDot(color);
          break;
        case 'background':
        default:
          rules.backgroundColor = color;
          rules.color = getColorContrast(color);
          rules.border = `3px solid ${color}`;
          rules.borderRadius = '3px';
      }

      this._map.set(color, vscode.window.createTextEditorDecorationType(rules));
      this._keys.push(color);
    }

    return this._map.get(color)!;
  }

  keys(): string[] {
    return this._keys.slice();
  }

  dispose(): void {
    this._map.forEach((decoration) => {
      decoration.dispose();
    });
  }
}