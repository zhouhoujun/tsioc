import type { AgentConsoleAppAuthorizer, AgentConsoleAppStatus } from './AgentConsoleApps';
import type { AgentIdeBridge } from './AgentIdeBridge';
import type { AgentEditorBridge } from './AgentEditorBridge';
import { formatAgentUiDateTime, formatAgentUiLabel, formatAgentUiNotice } from './agent-ui.i18n';
import { AgentConsoleDiagnosticsHost } from './AgentConsoleDiagnosticsHost';
import { backgroundTaskCommandHost, extensionCommandHost, rpcCommandHost } from './AgentConsoleHostFactories';
import { runBackgroundTasksCommandView } from './AgentConsoleBackgroundTaskCommands';
import { runFeedbackCommandView } from './AgentConsoleFeedbackCommand';
import { runIdeCommand } from './AgentConsoleIdeCommands';
import {
    formatPluginDetail as formatPluginDetailView,
    formatPluginLine as formatPluginLineView,
    formatSkillDetail as formatSkillDetailView,
    formatSkillLine as formatSkillLineView,
    insertAppMention as insertAppMentionView,
    resolveAppAuthorizer as resolveAppAuthorizerView,
    resolveApps as resolveAppsView,
    runAppsCommand as runAppsCommandView,
    runPluginsCommand as runPluginsCommandView,
    runSkillsCommand as runSkillsCommandView
} from './AgentConsoleExtensionCommands';
import {
    runApproveRetryCommand as runApproveRetryCommandView,
    runMcpCommand as runMcpCommandView,
    runUnshareCommand as runUnshareCommandView
} from './AgentConsoleRpcCommands';

/** Extension, share, background, IDE and editor command projections. */
export abstract class AgentConsoleIntegrationHost extends AgentConsoleDiagnosticsHost {
    protected abstract appRpc?: { request(method: string, params?: any, context?: any): Promise<any> } | null;
    protected abstract ideBridge?: AgentIdeBridge | null;
    protected abstract editorBridge?: AgentEditorBridge | null;
    abstract get copyFocusedTextActionHandler(): (text: string, label: string) => Promise<void>;
    protected abstract isTurnInProgress(): boolean;
    protected abstract notifyBusyState(message?: string): void;
    protected abstract pushCommandOutput(command: string, text: string, kind?: any): void;
    protected abstract rpcRequestContext(requestId?: string): { requestId?: string; sessionEpoch: number; signal?: AbortSignal };

    protected async runSkillsCommand(args?: string): Promise<boolean> {
        return runSkillsCommandView(extensionCommandHost(this), args);
    }

    protected formatSkillLine(skill: any): string {
        return formatSkillLineView(skill);
    }

    protected formatSkillDetail(skill: any): string {
        return formatSkillDetailView(skill);
    }

    protected async runMcpCommand(args?: string): Promise<boolean> {
        return runMcpCommandView(rpcCommandHost(this), args);
    }

    protected async runPluginsCommand(args?: string): Promise<boolean> {
        return runPluginsCommandView(extensionCommandHost(this), args);
    }

    protected resolveApps(): AgentConsoleAppStatus[] {
        return resolveAppsView(extensionCommandHost(this));
    }

    protected resolveAppAuthorizer(): AgentConsoleAppAuthorizer | undefined {
        return resolveAppAuthorizerView(extensionCommandHost(this));
    }

    protected async runAppsCommand(args?: string): Promise<boolean> {
        return runAppsCommandView(extensionCommandHost(this), args);
    }

    protected insertAppMention(app: AgentConsoleAppStatus): void {
        return insertAppMentionView(extensionCommandHost(this), app);
    }

    protected formatPluginLine(plugin: any): string {
        return formatPluginLineView(plugin);
    }

    protected formatPluginDetail(plugin: any, contributions?: any): string {
        return formatPluginDetailView(plugin, contributions);
    }

    protected async runShareCommand(args?: string): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (this.appRpc) {
            try {
                const share = await this.appRpc.request('session.share.create', { sessionId }, this.rpcRequestContext());
                const token = String(share?.token || '').trim();
                if (!token) {
                    this.notify(formatAgentUiNotice(this.translator, 'sharingNotAvailable'));
                    return true;
                }
                const url = String(share?.url || `/api/share/${token}`).trim();
                await this.openSharePanel(token, url);
                return true;
            } catch (error: any) {
                this.notify(formatAgentUiNotice(this.translator, 'failedCreateShare', { error: error?.message || String(error) }));
                return true;
            }
        }
        this.notify(formatAgentUiNotice(this.translator, 'sharingRequiresGateway2'));
        return true;
    }

    protected async runUnshareCommand(args?: string): Promise<boolean> {
        return runUnshareCommandView(rpcCommandHost(this), args);
    }

    protected async revokeShare(token: string): Promise<boolean> {
        try {
            const result = await this.appRpc?.request('session.share.revoke', { token });
            if (result?.revoked === false) {
                this.notify(formatAgentUiNotice(this.translator, 'shareTokenNoLongerActive', { token: String(token).slice(0, 12) }));
                return true;
            }
            this.notify(formatAgentUiNotice(this.translator, 'shareTokenRevoked', { token: String(token).slice(0, 12) }));
        } catch (error: any) {
            this.notify(formatAgentUiNotice(this.translator, 'failedRevokeShare', { error: error?.message || String(error) }));
        }
        return true;
    }

    protected async openSharePanel(token: string, url: string): Promise<void> {
        const fullUrl = this.state.consoleOptions?.shareBaseUrl
            ? `${this.state.consoleOptions.shareBaseUrl.replace(/\/+$/, '')}${url}`
            : url;
        const selected = await this.select(formatAgentUiNotice(this.translator, 'sessionShareTitle'), [
            { label: formatAgentUiNotice(this.translator, 'shareCreated'), value: 'info', description: `token ${String(token).slice(0, 8)}… · ${formatAgentUiDateTime(Date.now(), this.translator)}` },
            { label: fullUrl, value: 'copy', description: formatAgentUiNotice(this.translator, 'shareCopyDescription') },
            { label: formatAgentUiNotice(this.translator, 'shareRevoke', { id: String(token).slice(0, 8) }), value: 'revoke', description: formatAgentUiNotice(this.translator, 'shareRevokeDescription') }
        ], 1, formatAgentUiLabel(this.translator, 'agent.hint.enterSelectClose', 'enter select   esc close'));
        if (!selected) return;
        if (selected === 'copy') {
            await this.copyFocusedTextActionHandler(fullUrl, formatAgentUiNotice(this.translator, 'shareLinkLabel'));
            return;
        }
        if (selected === 'revoke') {
            await this.revokeShare(token);
        }
    }

    protected async runApproveRetryCommand(): Promise<boolean> {
        return runApproveRetryCommandView(rpcCommandHost(this));
    }

    protected async runFeedbackCommand(): Promise<boolean> {
        return runFeedbackCommandView((message: string) => this.notify(message), this.translator);
    }

    protected async runBackgroundTasksCommand(args?: string): Promise<boolean> {
        return runBackgroundTasksCommandView(backgroundTaskCommandHost(this), args);
    }

    protected async runIdeCommand(args?: string): Promise<boolean> {
        return runIdeCommand(this.ideBridge, (message: string) => this.notify(message), (command: string, text: string) => this.pushCommandOutput(command, text), args, this.translator);
    }

    protected async runEditorCommand(args?: string): Promise<boolean> {
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return true;
        }
        const initial = String(args || '').trim() || this.state.input;
        const result = await this.openExternalEditor(initial);
        if (!result) {
            return true;
        }
        if (result.cancelled || result.content === undefined) {
            this.notify(formatAgentUiNotice(this.translator, 'editorClosedChanges'));
            return true;
        }
        this.state.setInput(result.content, result.content.length);
        this.notify(formatAgentUiNotice(this.translator, 'draftUpdatedEditor', { length: result.content.length }));
        return true;
    }

    protected async openExternalEditor(initial: string): Promise<{ content?: string; cancelled?: boolean } | undefined> {
        if (!this.editorBridge?.available) {
            this.notify(formatAgentUiNotice(this.translator, 'externalEditorAvailable'));
            return undefined;
        }
        try {
            return await this.editorBridge.open(initial);
        } catch (error: any) {
            this.notify(error?.message || formatAgentUiNotice(this.translator, 'externalEditorStartFailed'));
            return undefined;
        }
    }
}
