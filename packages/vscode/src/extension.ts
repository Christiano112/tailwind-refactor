import { RefactorEngine } from '@tailwind-refactor/rules';
import * as vscode from 'vscode';

const engine = new RefactorEngine();
let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('tailwind-refactor');
  context.subscriptions.push(diagnosticCollection);

  // Trigger analysis on active editor or text document change
  if (vscode.window.activeTextEditor) {
    analyzeDocument(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => analyzeDocument(e.document)),
    vscode.workspace.onDidOpenTextDocument((doc) => analyzeDocument(doc))
  );

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tailwind-refactor.analyzeFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        analyzeDocument(editor.document);
        vscode.window.showInformationMessage('Tailwind Refactor: Current file analyzed!');
      }
    }),
    vscode.commands.registerCommand('tailwind-refactor.analyzeWorkspace', async () => {
      const files = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx}', '**/node_modules/**');
      let count = 0;
      for (const file of files) {
        const doc = await vscode.workspace.openTextDocument(file);
        analyzeDocument(doc);
        count++;
      }
      vscode.window.showInformationMessage(`Tailwind Refactor: Analyzed ${count} file(s) across workspace!`);
    })
  );

  // Register Quick Fix Code Action Provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
      new TailwindQuickFixProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );
}

function analyzeDocument(document: vscode.TextDocument) {
  if (!['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(document.languageId)) {
    return;
  }

  const code = document.getText();
  const filePath = document.fileName;
  const transformations = engine.analyzeCode(code, filePath);
  const diagnostics: vscode.Diagnostic[] = [];

  for (const t of transformations) {
    if (t.location) {
      const startPos = document.positionAt(t.location.start);
      const endPos = document.positionAt(t.location.end);
      const range = new vscode.Range(startPos, endPos);

      const severity =
        t.confidence === 'safe' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information;

      const diagnostic = new vscode.Diagnostic(range, `${t.reason} -> Replace with '${t.replacement}'`, severity);
      diagnostic.source = 'tailwind-refactor';
      diagnostic.code = t.replacement;
      diagnostics.push(diagnostic);
    }
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

class TailwindQuickFixProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === 'tailwind-refactor' && diagnostic.code) {
        const replacement = String(diagnostic.code);
        const action = new vscode.CodeAction(`💡 Replace with '${replacement}'`, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, diagnostic.range, replacement);
        action.isPreferred = true;
        actions.push(action);
      }
    }

    return actions;
  }
}

export function deactivate() {}
