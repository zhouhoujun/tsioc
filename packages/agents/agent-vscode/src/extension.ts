import { AgentConsolePanel } from './AgentConsolePanel';
import { ExtensionContextLike, VsCodeHost } from './host';

let activePanel: AgentConsolePanel | null = null;

export function activateWithHost(context: ExtensionContextLike, vscode: VsCodeHost): AgentConsolePanel {
    const panel = new AgentConsolePanel(vscode, context);
    activePanel = panel;
    context.subscriptions.push(
        vscode.commands.registerCommand('tsdiAgent.openConsole', () => panel.open()),
        vscode.commands.registerCommand('tsdiAgent.refreshConsole', () => panel.refresh()),
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('tsdiAgent')) {
                panel.refresh();
            }
        }),
        panel
    );
    return panel;
}

export function activate(context: ExtensionContextLike): void {
    // VS Code is an extension-host dependency and must stay external to the bundle.
    const vscode = require('vscode') as VsCodeHost;
    activateWithHost(context, vscode);
}

export function deactivate(): void {
    activePanel?.dispose();
    activePanel = null;
}
