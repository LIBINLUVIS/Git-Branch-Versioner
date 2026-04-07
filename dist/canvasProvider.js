"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasViewProvider = void 0;
exports.setupCanvasProvider = setupCanvasProvider;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const rest_1 = require("@octokit/rest");
// ─── Shared message handler ────────────────────────────────────────────────────
async function handleWebviewMessage(message, postMessage, context) {
    switch (message.type) {
        case 'fetchRepos': {
            try {
                const session = await vscode.authentication.getSession('github', ['repo', 'read:user'], { createIfNone: true });
                if (session) {
                    const octokit = new rest_1.Octokit({ auth: session.accessToken });
                    const [{ data: reposData }, { data: userData }] = await Promise.all([
                        octokit.rest.repos.listForAuthenticatedUser({ sort: 'updated', per_page: 50 }),
                        octokit.rest.users.getAuthenticated(),
                    ]);
                    const repos = reposData.map(r => ({ id: r.id, name: r.name, full_name: r.full_name }));
                    const userName = (userData.name ?? userData.login ?? 'You').split(' ')[0];
                    postMessage({ type: 'reposFetched', repos, userName });
                }
            }
            catch (e) {
                vscode.window.showErrorMessage('GitHub Auth Failed: ' + e.message);
            }
            break;
        }
        case 'fetchBranches': {
            try {
                const [owner, repo] = message.repoFullName.split('/');
                const session = await vscode.authentication.getSession('github', ['repo', 'read:user']);
                if (session) {
                    const octokit = new rest_1.Octokit({ auth: session.accessToken });
                    const { data: branchList } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });
                    const branches = await Promise.all(branchList.slice(0, 20).map(async (b) => {
                        let commitMessage = '';
                        try {
                            const { data: commitData } = await octokit.rest.repos.getCommit({ owner, repo, ref: b.commit.sha });
                            commitMessage = commitData.commit.message.split('\n')[0];
                        }
                        catch (_) { /* ignore */ }
                        return { name: b.name, commit: b.commit.sha, commitMessage };
                    }));
                    postMessage({ type: 'branchesFetched', branches });
                    const savedState = context.globalState.get(`canvas_state_${message.repoFullName}`);
                    if (savedState) {
                        postMessage({ type: 'stateLoaded', state: savedState });
                    }
                }
            }
            catch (e) {
                vscode.window.showErrorMessage('Failed to fetch branches: ' + e.message);
            }
            break;
        }
        case 'saveState': {
            const { repoId, state } = message;
            if (repoId && state) {
                await context.globalState.update(`canvas_state_${repoId}`, state);
                postMessage({ type: 'stateSaved' });
            }
            break;
        }
    }
}
// ─── WebviewViewProvider — loads in the sidebar automatically ─────────────────
class CanvasViewProvider {
    extensionPath;
    context;
    static viewType = 'gitBranchVersioner.welcome';
    constructor(extensionPath, context) {
        this.extensionPath = extensionPath;
        this.context = context;
    }
    resolveWebviewView(webviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.extensionPath, 'webview-ui', 'dist'))],
        };
        webviewView.webview.html = getWebviewContent(webviewView.webview, this.extensionPath);
        webviewView.webview.onDidReceiveMessage((message) => handleWebviewMessage(message, (msg) => webviewView.webview.postMessage(msg), this.context), undefined, this.context.subscriptions);
    }
}
exports.CanvasViewProvider = CanvasViewProvider;
// ─── Editor-tab panel (keeping as fallback / command) ─────────────────────────
function setupCanvasProvider(context) {
    const panel = vscode.window.createWebviewPanel('branchVersioner', 'Git Branch Versioner', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview-ui', 'dist'))],
    });
    panel.webview.html = getWebviewContent(panel.webview, context.extensionPath);
    panel.webview.onDidReceiveMessage((message) => handleWebviewMessage(message, (msg) => panel.webview.postMessage(msg), context), undefined, context.subscriptions);
}
// ─── Shared HTML builder ──────────────────────────────────────────────────────
function getWebviewContent(webview, extensionPath) {
    const basePath = path.join(extensionPath, 'webview-ui', 'dist');
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(basePath, 'assets', 'index.js')));
    const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(basePath, 'assets', 'index.css')));
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Git Branch Versioner</title>
  <link href="${styleUri}" rel="stylesheet">
</head>
<body style="padding:0;margin:0;width:100vw;height:100vh;overflow:hidden;">
  <div id="root" style="width:100%;height:100%;"></div>
  <script nonce="${nonce}">window.vscode = acquireVsCodeApi();</script>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=canvasProvider.js.map