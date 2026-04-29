import * as vscode from 'vscode';
import { DocumentHighlight } from './color-highlight';
import { ViewConfig } from './types';

const COMMAND_NAME = 'extension.colorHighlight';
let instanceMap: DocumentHighlight[] = [];
let config: vscode.WorkspaceConfiguration;

export function activate(context: vscode.ExtensionContext): void {
  instanceMap = [];
  config = vscode.workspace.getConfiguration('color-highlight');

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(COMMAND_NAME, runHighlightEditorCommand)
  );

  vscode.window.onDidChangeVisibleTextEditors(onOpenEditor, null, context.subscriptions);
  vscode.workspace.onDidChangeConfiguration(onConfigurationChange, null, context.subscriptions);

  onOpenEditor(vscode.window.visibleTextEditors);
}

export function deactivate(): void {
  instanceMap.forEach((instance) => instance.dispose());
  instanceMap = [];
}

function reactivate(): void {
  deactivate();
  instanceMap = [];
  onOpenEditor(vscode.window.visibleTextEditors);
}

function isValidDocument(cfg: ViewConfig, { languageId }: vscode.TextDocument): boolean {
  let isValid = false;

  if (!cfg.enable) {
    return isValid;
  }

  if (cfg.languages.indexOf('*') > -1) {
    isValid = true;
  }

  if (cfg.languages.indexOf(languageId) > -1) {
    isValid = true;
  }

  if (cfg.languages.indexOf(`!${languageId}`) > -1) {
    isValid = false;
  }

  return isValid;
}

async function findOrCreateInstance(document: vscode.TextDocument): Promise<DocumentHighlight | undefined> {
  if (!document) {
    return;
  }

  const found = instanceMap.find((instance) => instance.getDocument() === document);

  if (!found) {
    const instance = new DocumentHighlight(document, config as unknown as ViewConfig);
    instanceMap.push(instance);
    instance.onUpdate();
  }

  return found || instanceMap[instanceMap.length - 1];
}

async function runHighlightEditorCommand(
  editor: vscode.TextEditor,
  _edit: vscode.TextEditorEdit,
  document?: vscode.TextDocument
): Promise<void> {
  if (!document) {
    document = editor && editor.document;
  }

  if (document) {
    const instance = await findOrCreateInstance(document);
    instance?.onUpdate();
  }
}

async function doHighlight(documents: vscode.TextDocument[] = []): Promise<void> {
  if (documents.length) {
    await Promise.all(documents.map(findOrCreateInstance));
  }
}

function onConfigurationChange(): void {
  config = vscode.workspace.getConfiguration('color-highlight');
  reactivate();
}

function onOpenEditor(editors: readonly vscode.TextEditor[]): void {
  const documents = editors.map(({ document }) => document);
  const forDisposal = instanceMap.filter((instance) => documents.indexOf(instance.getDocument()) === -1);

  instanceMap = instanceMap.filter((instance) => documents.indexOf(instance.getDocument()) > -1);
  forDisposal.forEach(instance => instance.dispose());

  const validDocuments = documents.filter(doc => isValidDocument(config as unknown as ViewConfig, doc));
  doHighlight(validDocuments);
}