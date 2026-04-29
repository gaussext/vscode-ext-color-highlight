import * as vscode from 'vscode';
import { DocumentHighlight } from './color-highlight';
import { ViewConfig } from './types';

const COMMAND_NAME = 'extension.colorHighlight';
let instanceMap: DocumentHighlight[] = [];
let config: vscode.WorkspaceConfiguration;

function getUri(docOrInstance: vscode.TextDocument | DocumentHighlight): string {
  return docOrInstance instanceof DocumentHighlight
    ? docOrInstance.getDocument().uri.toString()
    : docOrInstance.uri.toString();
}

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

  const docUri = getUri(document);
  const found = instanceMap.find((instance) => getUri(instance) === docUri);

  if (!found) {
    const instance = new DocumentHighlight(document, config as unknown as ViewConfig);
    instanceMap.push(instance);
    console.log(`[ColorHighlight] findOrCreateInstance NEW ${docUri}`);
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
  const documentUris = documents.map(getUri);

  console.log(`[ColorHighlight] onOpenEditor START mapLen=${instanceMap.length} uris=${JSON.stringify(documentUris)}`);

  instanceMap.forEach((inst, i) => {
    console.log(`[ColorHighlight]   instanceMap[${i}] uri=${getUri(inst)} disposed=${inst['disposed']}`);
  });

  const forDisposal = instanceMap.filter(
    (instance) => documentUris.indexOf(getUri(instance)) === -1
  );
  console.log(`[ColorHighlight]   forDisposal=${forDisposal.length}`);

  instanceMap = instanceMap.filter(
    (instance) => documentUris.indexOf(getUri(instance)) > -1
  );
  forDisposal.forEach(instance => instance.dispose());

  console.log(`[ColorHighlight]   after cleanup mapLen=${instanceMap.length}`);

  const validDocuments = documents.filter(doc => isValidDocument(config as unknown as ViewConfig, doc));

  const newDocuments = validDocuments.filter(doc => {
    const docUri = getUri(doc);
    const found = instanceMap.some(instance => {
      const instUri = getUri(instance);
      const match = instUri === docUri;
      if (match) {
        console.log(`[ColorHighlight]   MATCH: doc=${docUri} == inst=${instUri}`);
      }
      return match;
    });
    if (!found) {
      console.log(`[ColorHighlight]   NEW DOC: ${docUri}`);
    }
    return !found;
  });

  console.log(`[ColorHighlight] onOpenEditor DONE editors=${editors.length} valid=${validDocuments.length} new=${newDocuments.length}`);
  doHighlight(newDocuments);
}