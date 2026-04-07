import * as vscode from 'vscode';
import { setupCanvasProvider } from './canvasProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "git-branch-versioner" is now active!');

  // Register command to open Webview Panel
  let disposable = vscode.commands.registerCommand('git-branch-versioner.openCanvas', () => {
    setupCanvasProvider(context);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
