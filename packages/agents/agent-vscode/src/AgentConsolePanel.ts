import { buildAgentWebviewHtml, normalizeGatewayUrl } from './webview-html';
import { ExtensionContextLike, TextEditorLike, VsCodeHost, WebviewPanelLike } from './host';

function createNonce(): string {
    let value = '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return value;
}

export class AgentConsolePanel {
    private panel: WebviewPanelLike | null = null;

    constructor(private readonly vscode: VsCodeHost, private readonly context: ExtensionContextLike) {}

    open(): WebviewPanelLike | null {
        if (this.panel) {
            this.panel.reveal(this.vscode.ViewColumn.Beside);
            return this.panel;
        }
        try {
            const config = this.vscode.workspace.getConfiguration('tsdiAgent');
            const baseUrl = normalizeGatewayUrl(config.get('gatewayUrl', 'http://127.0.0.1:3000'));
            const mediaRoot = this.vscode.Uri.joinPath(this.context.extensionUri, 'media');
            const panel = this.vscode.window.createWebviewPanel('tsdiAgent.console', 'TSDI Agent', this.vscode.ViewColumn.Beside, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [mediaRoot]
            });
            const scriptUri = panel.webview.asWebviewUri(this.vscode.Uri.joinPath(mediaRoot, 'agent-console.js')).toString();
            panel.webview.html = buildAgentWebviewHtml({
                cspSource: panel.webview.cspSource,
                scriptUri,
                baseUrl,
                token: config.get('token', ''),
                sessionId: config.get('sessionId', ''),
                workspace: this.vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                nonce: createNonce()
            });
            panel.onDidDispose(() => { this.panel = null; });
            panel.onDidReceiveMessage((message: unknown) => this.handleMessage(panel, message));
            this.postIdeContext(panel, this.vscode.window.activeTextEditor);
            this.vscode.window.onDidChangeActiveTextEditor(editor => this.postIdeContext(panel, editor));
            this.panel = panel;
            return panel;
        } catch (error) {
            this.vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    private handleMessage(panel: WebviewPanelLike, message: unknown): void {
        if (!message || typeof message !== 'object') {
            return;
        }
        const request = message as { type?: string };
        if (request.type === 'tsdiAgent.refreshIdeContext') {
            this.postIdeContext(panel, this.vscode.window.activeTextEditor);
        }
    }

    private postIdeContext(panel: WebviewPanelLike, editor: TextEditorLike | null | undefined): void {
        void panel.webview.postMessage({
            type: 'tsdiAgent.ideContext',
            activeFile: editor?.document?.fileName,
            selection: editor?.selection
                ? {
                    startLine: editor.selection.start.line + 1,
                    endLine: editor.selection.end.line + 1
                }
                : undefined
        });
    }

    refresh(): void {
        if (!this.panel) {
            this.open();
            return;
        }
        this.panel.dispose();
        this.panel = null;
        this.open();
    }

    dispose(): void {
        this.panel?.dispose();
        this.panel = null;
    }
}
