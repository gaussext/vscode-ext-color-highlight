import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function loadGlobalVariables(options: { globalPaths?: string[] }): string {
  let result = '';
  try {
    options.globalPaths?.forEach(item => {
      const absolutePath = path.join(vscode.workspace.rootPath || '', item);
      if (fs.existsSync(absolutePath)) {
        const content = fs.readFileSync(absolutePath, 'utf-8');
        result += content;
      } else {
        vscode.window.showErrorMessage(`Global file not found: ${absolutePath}`);
      }
    });
  } catch (_error) {
    // silent fail
  }
  return result;
}