import { workspace, window } from 'vscode';
const fs = require('fs');
const path = require('path');

export function loadGlobalVariables(options) {
  let result = '';
  try {
    options.globalPaths?.forEach(item => {
      const absolutePath = path.join(workspace.rootPath, item);
      if (fs.existsSync(absolutePath)) {
        const content = fs.readFileSync(absolutePath);
        result += content;
      } else {
        window.showErrorMessage(`Global file not found: ${absolutePath}`);
      }
    });
  } catch (error) {

  }

  return result;
}