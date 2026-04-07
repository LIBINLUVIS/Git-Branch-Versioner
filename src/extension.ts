import * as vscode from 'vscode';
import { CanvasViewProvider, setupCanvasProvider } from './canvasProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Git Branch Versioner is now active!');

  // ── Register the sidebar WebviewViewProvider ─────────────────────────────────
  // This makes the full React UI load automatically when the activity bar icon
  // is clicked — no extra button press needed.
  const provider = new CanvasViewProvider(context.extensionPath, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CanvasViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // ── Keep the command to open as a full editor tab (optional) ─────────────────
  const disposable = vscode.commands.registerCommand('git-branch-versioner.openCanvas', () => {
    setupCanvasProvider(context);
  });
  context.subscriptions.push(disposable);
}

export function deactivate() {}
