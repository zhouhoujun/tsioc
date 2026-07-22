import { ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, OnDestroy, RNode } from '@tsdi/components';
import { FileAdapter } from '@tsdi/common';
import {
    clampConsoleTextCursor,
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceAccessor,
    ConsoleTerminalSurfaceLifecycle,
    TerminalInputSequenceResult
} from '@tsdi/components/console';
import { Inject, Optional } from '@tsdi/ioc';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, AgentConsoleAppRpc, AgentMessage, AgentOptions, AgentRuntime, AgentScheduler, ToolApprovalManager, ToolRegistry, defaultAgentOptions } from '@tsdi/agent';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleInputHistoryStore } from './AgentConsoleInputHistoryStore';
import { AgentConsoleApprovalRequest, AgentConsoleSelectOption, AgentConsoleSessionMeta, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { mergeAgentConsoleTheme } from './AgentConsoleTheme';
import { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import { AgentConsoleWorkspaceMentionsProvider } from './AgentConsoleWorkspaceMentions';
import { AgentConsoleSessionService } from './AgentConsoleSessionService';
@Component({
    selector: 'agent-console',
    template: `
    <div class="agent-console">
        <agent-console-brand-panel></agent-console-brand-panel>
        <agent-console-status-panel v-show="showStatusPanel"></agent-console-status-panel>
        <agent-console-sessions-panel v-show="showSessionsPanel"></agent-console-sessions-panel>
        <agent-console-approvals-panel v-show="showApprovalsPanel"></agent-console-approvals-panel>
        <agent-console-messages-panel></agent-console-messages-panel>
        <agent-console-message-detail-panel v-show="showMessageDetailPanel"></agent-console-message-detail-panel>
        <agent-console-activity-panel v-show="showActivityPanel"></agent-console-activity-panel>
        <agent-console-tools-panel v-show="showToolsPanel"></agent-console-tools-panel>
        <agent-console-working-panel v-show="showWorkingPanel"></agent-console-working-panel>
        <agent-console-tool-runs-panel v-show="showToolRunsPanel"></agent-console-tool-runs-panel>
        <agent-console-input-panel></agent-console-input-panel>
        <agent-console-select-panel v-show="showSelectPanel"></agent-console-select-panel>
    </div>
    `
})
export class AgentConsoleComponent implements OnDestroy, ConsoleTerminalInputHandler, ConsoleTerminalSurfaceLifecycle {
    protected static readonly STREAM_MESSAGE_FLUSH_MS = 160;
    protected multilineMode = false;
    protected draftLines: string[] = [];
    protected destroyed = false;
    protected streamMessageTimer?: ReturnType<typeof setTimeout>;
    protected streamMessageText = '';

    constructor(
        private state: AgentConsoleSessionState,
        private runtime: AgentRuntime,
        private scheduler: AgentScheduler,
        private bridge: AgentConsoleEventBridge,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions,
        @Optional() private toolRegistry?: ToolRegistry | null,
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) private appRpc?: AgentConsoleAppRpc | null,
        @Optional() private sessionService?: AgentConsoleSessionService | null,
        @Optional() private approvalManager?: ToolApprovalManager | null,
        @Optional() private workspaceMentionsProvider?: AgentConsoleWorkspaceMentionsProvider | null,
        @Optional() private inputHistoryStore?: AgentConsoleInputHistoryStore | null,
        @Optional() @Inject(ComponentRef) private componentRef?: ComponentRef<AgentConsoleComponent> | null,
        @Optional() @Inject(ConsoleTerminalSurfaceAccessor) private surfaceAccessor?: ConsoleTerminalSurfaceAccessor | null,
        @Optional() @Inject(ApplicationContext) private app?: ApplicationContext | null
    ) {
        this.state.setTitle(this.options.ui?.title ?? defaultAgentOptions.ui!.title!);
        this.state.setProvider(this.options.model?.provider ?? '');
        this.state.setModel(this.options.model?.model ?? '');
        this.state.setModelProfile(this.resolveInitialModelProfile());
        this.state.setTheme(mergeAgentConsoleTheme(this.options.ui?.theme));
        this.state.setConsoleOptions(this.options.ui?.console);
        this.state.setWorkspaceMentionResolver(this.workspaceMentionsProvider || undefined);
    }

    protected resolveInitialModelProfile(): string {
        const model = this.options.model;
        if (model?.defaultProfile === 'strong') {
            return 'strong';
        }
        if (model?.defaultProfile === 'flash' || model?.defaultProfile === 'fast') {
            return 'flash';
        }
        if (model?.thinkingBudget || model?.reasoning) {
            return 'strong';
        }
        return '';
    }

    protected isCancelPromptValue(value?: string): boolean {
        const normalized = String(value || '').trim().toLowerCase();
        return normalized === 'cancel' || normalized === '/cancel' || normalized === 'q';
    }

    protected isTurnInProgress(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    protected notify(message: string, duration?: number): void {
        void duration;
        this.state.setNotice(message);
    }

    protected notifyBusyState(message = 'Wait for the current turn to finish.'): void {
        this.notify(message);
    }

    protected async refreshSessions(): Promise<void> {
        if (!this.sessionService) {
            return;
        }
        const sessions = await this.sessionService.listSessions(this.state.sessionId);
        if (!sessions.length) {
            return;
        }
        this.state.setSessions(sessions.map(item => ({
            id: item.id,
            current: !!item.current
        })));
    }

    protected async refreshPendingApprovals(): Promise<void> {
        if (!this.approvalManager) {
            this.state.setPendingApprovals([]);
            return;
        }
        const pending = this.approvalManager.getPending().filter((request: any) => request.sessionId === this.state.sessionId);
        this.state.setPendingApprovals(pending as AgentConsoleApprovalRequest[]);
    }

    protected async openSession(sessionId?: string): Promise<void> {
        if (this.isTurnInProgress()) {
            this.notifyBusyState('Wait for the current turn to finish before switching sessions.');
            return;
        }
        if (!this.sessionService) {
            return;
        }
        const target = await this.sessionService.ensureSession(sessionId);
        this.state.batch(() => {
            this.state.configure({ sessionId: target.id });
            this.state.setMessagesFocused(false);
            this.state.setSessionsFocused(false);
            this.state.setToolsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.closeMessageDetail();
            this.state.clearActivities();
            this.state.setLastError('');
            this.state.setNotice('');
            this.state.setInput('', 0);
        });
        this.state.setMessages(await this.loadSessionMessages(target.id));
        await this.refreshTools();
        await this.refreshPendingApprovals();
        await this.refreshSessions();
    }

    protected async selectApprovalRequest(
        requests: AgentConsoleApprovalRequest[],
        selectedIndex = 0
    ): Promise<AgentConsoleApprovalRequest | undefined> {
        if (!requests.length) {
            return undefined;
        }
        if (requests.length === 1) {
            return requests[0];
        }
        const selected = await this.select('Pending approvals', requests.map(request => ({
            label: `${request.toolName} (${request.id.slice(0, 8)})`,
            value: request.id,
            description: request.reason,
            detail: [
                `Tool: ${request.toolName}`,
                `Reason: ${request.reason}`,
                request.inputSummary ? `Input: ${request.inputSummary}` : 'Input: -',
                `Timeout: ${request.timeoutMs}ms`
            ].join('\n')
        })), Math.max(0, Math.min(requests.length - 1, selectedIndex)), this.state.consoleOptions.selectCloseHint);
        return requests.find(request => request.id === selected);
    }

    protected async openApprovalInspector(requests: AgentConsoleApprovalRequest[]): Promise<void> {
        if (!requests.length) {
            this.notify('No pending approvals.');
            return;
        }
        let selectedRequestIndex = 0;
        while (true) {
            const request = await this.selectApprovalRequest(requests, selectedRequestIndex);
            if (!request) {
                return;
            }
            selectedRequestIndex = Math.max(0, requests.findIndex(item => item.id === request.id));
            const detail = [
                `Tool: ${request.toolName}`,
                `Reason: ${request.reason}`,
                request.inputSummary ? `Input: ${request.inputSummary}` : 'Input: -',
                `Timeout: ${request.timeoutMs}ms`
            ].join('\n');
            const action = await this.select(`Approval ${request.id.slice(0, 8)}`, [
                {
                    label: 'Approve',
                    value: 'approve',
                    description: 'Allow this request',
                    detail
                },
                {
                    label: 'Deny',
                    value: 'deny',
                    description: 'Reject this request',
                    detail
                },
                {
                    label: 'Copy input',
                    value: 'copy-input',
                    description: 'Copy request input summary',
                    detail
                }
            ], 0, this.state.consoleOptions.selectCloseHint);
            if (!action) {
                if (requests.length === 1) {
                    return;
                }
                continue;
            }
            if (action === 'approve') {
                const approved = this.approvalManager?.approve(request.id);
                this.notify(approved
                    ? `Approved ${request.toolName} (${request.id.slice(0, 8)}).`
                    : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
                return;
            }
            if (action === 'deny') {
                const denied = this.approvalManager?.reject(request.id);
                this.notify(denied
                    ? `Denied ${request.toolName} (${request.id.slice(0, 8)}).`
                    : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
                return;
            }
            if (action === 'copy-input') {
                await this.copyFocusedTextActionHandler(request.inputSummary || request.summary, 'approval input');
                return;
            }
        }
    }

    get title(): string {
        return this.state.title;
    }

    get showStatusPanel(): boolean {
        return !!this.state.notice || !!this.state.lastError || !!this.state.pendingApprovals.length;
    }

    get showSessionsPanel(): boolean {
        return this.state.sessionsFocused;
    }

    get showApprovalsPanel(): boolean {
        return this.state.approvalsFocused;
    }

    get showMessageDetailPanel(): boolean {
        return !!this.state.messageDetailOpen;
    }

    get showActivityPanel(): boolean {
        return !!this.state.visibleActivities.length;
    }

    get showToolsPanel(): boolean {
        return this.state.toolsFocused;
    }

    get showWorkingPanel(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    get showToolRunsPanel(): boolean {
        return !!this.state.highlightedToolRun && (
            this.showWorkingPanel
            || this.state.toolsFocused
        );
    }

    get showSelectPanel(): boolean {
        return !!this.state.selectMenu;
    }

    // ---- generic component bindings ----

    get inputShellStyle(): string {
        return this.state.theme?.inputShell || 'background: #1b2128; color: #c9d1d9; padding: 1 1;';
    }

    get inputValue(): string {
        return this.state.input || '';
    }

    get inputCursor(): number {
        return this.state.inputCursor || 0;
    }

    get selectTitle(): string {
        return this.state.selectMenu?.title || '';
    }

    get selectHint(): string {
        return this.state.selectMenu?.hint || this.state.consoleOptions.selectHint;
    }

    get selectOptions(): Array<{ label: string; value: string; description?: string }> {
        return this.state.selectMenu?.options?.map((o: any) => ({
            label: o.label,
            value: o.value,
            description: o.description || ''
        })) || [];
    }

    get selectIndex(): number {
        return this.state.selectMenu?.selectedIndex ?? 0;
    }

    get theme() {
        return this.state.theme;
    }

    get sessionState(): AgentConsoleSessionState {
        return this.state;
    }

    get sessionId(): string {
        return this.state.sessionId;
    }

    get input(): string {
        return this.state.input;
    }

    set input(value: string) {
        this.state.setInput(value, value.length);
    }

    get messages(): AgentMessage[] {
        return this.state.messages;
    }

    get status(): string {
        return this.state.status;
    }

    get provider(): string {
        return this.state.provider;
    }

    get model(): string {
        return this.state.model;
    }

    get workspace(): string {
        return this.state.workspace;
    }

    get tools() {
        return this.state.tools;
    }

    get activities() {
        return this.state.activities;
    }

    get runningTools(): string[] {
        return this.state.runningTools;
    }

    get toolRuns() {
        return this.state.toolRuns;
    }

    get highlightedToolRun() {
        return this.state.highlightedToolRun;
    }

    get tokenUsage() {
        return this.state.tokenUsage;
    }

    get lastError(): string {
        return this.state.lastError;
    }

    get notice(): string {
        return this.state.notice;
    }

    get selectMenu() {
        return this.state.selectMenu;
    }

    get commandHints(): string[] {
        return this.state.commandHints;
    }

    get tasksCount(): number {
        return this.state.tasksCount;
    }

    get submitActionHandler(): () => Promise<void> {
        return async () => {
            await this.submit();
        };
    }

    get selectActionHandler(): (value: string) => Promise<void> {
        return async (value: string) => {
            await this.state.confirmSelectMenu(value);
        };
    }

    get copyFocusedTextActionHandler(): (text: string, label: string) => Promise<void> {
        return async (text: string, label: string) => {
            if (!text) {
                this.notify(`Nothing to copy for ${label}.`);
                return;
            }
            this.notify(text);
        };
    }

    get activateSelectedSessionActionHandler(): (sessionId: string) => Promise<void> {
        return async (sessionId: string) => {
            if (!sessionId) {
                return;
            }
            await this.openSession(sessionId);
            this.state.setSessionsFocused(false);
        };
    }

    get activateSelectedToolActionHandler(): (toolName: string) => Promise<void> {
        return async (toolName: string) => {
            const name = String(toolName || '').trim();
            if (!name) {
                return;
            }
            const selected = this.state.tools.find(item => item.name === name);
            if (selected?.active) {
                this.notify(`Tool ${name} is already active.`);
                return;
            }
            try {
                const activated = await this.activateTool(name);
                await this.refreshTools();
                this.state.setSelectedToolName(name);
                const current = this.state.tools.find(item => item.name === name);
                this.notify(activated || current?.active
                    ? `Activated ${name}.`
                    : `Tool ${name} could not be activated.`);
            } catch (error: any) {
                this.notify(error?.message || `Failed to activate ${name}.`);
            }
        };
    }

    get resolveApprovalActionHandler(): (decision: 'approve' | 'deny', requestId: string) => Promise<void> {
        return async (decision: 'approve' | 'deny', requestId: string) => {
            if (!this.approvalManager || !requestId) {
                return;
            }
            const request = this.approvalManager.getPending().find((item: any) => item.id === requestId)
                || this.state.selectedApproval
                || { id: requestId, toolName: 'request' };
            const applied = decision === 'approve'
                ? this.approvalManager.approve(requestId)
                : this.approvalManager.reject(requestId);
            const pending = this.approvalManager.getPending().filter((item: any) => item.sessionId === this.state.sessionId);
            this.state.setPendingApprovals(pending as AgentConsoleApprovalRequest[]);
            this.notify(applied
                ? `${decision === 'approve' ? 'Approved' : 'Denied'} ${request.toolName} (${requestId.slice(0, 8)}).`
                : `Approval request ${requestId.slice(0, 8)} is no longer pending.`);
        };
    }

    showNotice(message: string): void {
        this.state.setNotice(message);
    }

    clearNotice(): void {
        this.showNotice('');
    }

    async select(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<string | undefined> {
        return new Promise(resolve => {
            const resolveSelection = async (value: string | undefined) => {
                resolve(value);
            };
            this.state.openSelectMenu(title, options, selectedIndex, hint);
            this.state.selectMenuAction = resolveSelection;
        });
    }

    configure(meta: AgentConsoleSessionMeta): this {
        this.state.configure(meta);
        return this;
    }

    async onInit(): Promise<void> {
        this.state.submitAction = this.submitActionHandler;
        this.state.copyFocusedTextAction = this.copyFocusedTextActionHandler;
        this.state.activateSelectedSessionAction = this.activateSelectedSessionActionHandler;
        this.state.activateSelectedToolAction = this.activateSelectedToolActionHandler;
        this.state.resolveApprovalAction = this.resolveApprovalActionHandler;
        this.bridge.bindState(this.sessionState);
        this.bridge.subscribe();
        this.ensureWorkspaceMentionResolver();
        await this.bootstrapStateFromAppRpc();
        await this.openSession(this.state.sessionId);
        if (!this.inputHistoryStore) {
            this.inputHistoryStore = new AgentConsoleInputHistoryStore(this.appRpc || null, null);
        }
        await this.restoreInputHistory();
        await this.refreshTools();
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    onDestroy(): void {
        this.destroyed = true;
        this.clearStreamingMessageState();
        this.state.copyFocusedTextAction = undefined;
        this.state.activateSelectedSessionAction = undefined;
        this.state.activateSelectedToolAction = undefined;
        this.state.resolveApprovalAction = undefined;
        void this.persistInputHistory();
        this.dispose();
    }

    protected ensureWorkspaceMentionResolver(): void {
        const injected = this.workspaceMentionsProvider
            || this.app?.get(AgentConsoleWorkspaceMentionsProvider, null) as AgentConsoleWorkspaceMentionsProvider | null
            || undefined;
        const injectedFileAdapter = injected ? ((injected as any).fileAdapter as FileAdapter | undefined) : undefined;
        if (injected && injectedFileAdapter) {
            this.workspaceMentionsProvider = injected;
        } else {
            const fileAdapter = this.app?.get(FileAdapter, null) as FileAdapter | null;
            if (fileAdapter) {
                this.workspaceMentionsProvider = new AgentConsoleWorkspaceMentionsProvider(fileAdapter);
            } else {
                this.workspaceMentionsProvider = injected;
            }
        }
        this.state.setWorkspaceMentionResolver(this.workspaceMentionsProvider || undefined);
    }

    protected parseSlashCommandLine(input: string): { raw: string; command: string; args: string } {
        const raw = String(input || '').trim();
        if (!raw.startsWith('/')) {
            return { raw, command: raw, args: '' };
        }
        const firstSpace = raw.indexOf(' ');
        if (firstSpace < 0) {
            return { raw, command: raw, args: '' };
        }
        return {
            raw,
            command: raw.slice(0, firstSpace),
            args: raw.slice(firstSpace + 1).trim()
        };
    }

    protected resolveUniqueCommandPrefix(input: string): { command: string; matches: string[] } {
        const matches = this.state.commandHints.filter(item => item.startsWith(input));
        return {
            command: matches.length === 1 ? matches[0] : input,
            matches
        };
    }

    protected async enrichPromptWithMentions(input: string): Promise<string> {
        const text = String(input || '');
        const matches = text.match(/(^|\s)@([^\s@]+)/g) || [];
        const mentions = Array.from(new Set(matches.map(item => item.trim())));
        if (!mentions.length) {
            return text;
        }
        const toolMap = new Map((this.state.tools || []).map(tool => [tool.name, tool]));
        const contextLines: string[] = [];
        for (const mention of mentions) {
            const name = mention.slice(1);
            switch (name) {
                case 'workspace':
                    contextLines.push(`Workspace: ${this.state.workspace}`);
                    break;
                case 'session':
                    contextLines.push(`Session: ${this.state.sessionId}`);
                    break;
                case 'model':
                    contextLines.push(`Model: ${this.state.provider} / ${this.state.model}`);
                    break;
                case 'tools':
                    contextLines.push(`Tools: ${(this.state.tools || []).map(tool => tool.name).join(', ') || '(none)'}`);
                    break;
                default: {
                    const tool = toolMap.get(name);
                    if (tool) {
                        contextLines.push(`Tool ${tool.name}: toolset=${tool.toolset || 'default'}, active=${tool.active === false ? 'no' : 'yes'}`);
                        break;
                    }
                    contextLines.push(...(await this.workspaceMentionsProvider?.resolveContext(this.state.workspace, name) || []));
                    break;
                }
            }
        }
        if (!contextLines.length) {
            return text;
        }
        return [
            '[Mention Context]',
            ...contextLines,
            '',
            text
        ].join('\n');
    }

    protected async bootstrapStateFromAppRpc(): Promise<void> {
        if (!this.appRpc) {
            return;
        }
        const meta = await this.appRpc.request('app.state');
        if (!meta || typeof meta !== 'object') {
            return;
        }
        if (typeof meta.title === 'string' && meta.title.trim()) {
            this.state.setTitle(meta.title.trim());
        }
        this.state.configure({
            sessionId: typeof meta.sessionId === 'string' ? meta.sessionId : undefined,
            provider: typeof meta.provider === 'string' ? meta.provider : undefined,
            model: typeof meta.model === 'string' ? meta.model : undefined,
            modelProfile: typeof meta.modelProfile === 'string' ? meta.modelProfile : undefined,
            workspace: typeof meta.workspace === 'string' ? meta.workspace : undefined
        });
    }

    protected async restoreInputHistory(): Promise<void> {
        if (!this.inputHistoryStore) {
            return;
        }
        try {
            const workspace = this.resolveHistoryWorkspace();
            const sessionId = this.state.sessionId;
            const entries = await this.inputHistoryStore.load(workspace, sessionId);
            if (entries.length) {
                this.state.setInputHistoryEntries(entries);
            }
        } catch {
        }
    }

    protected async persistInputHistory(): Promise<void> {
        if (!this.inputHistoryStore) {
            return;
        }
        try {
            await this.inputHistoryStore.save(this.state.getInputHistoryEntries(), this.resolveHistoryWorkspace(), this.state.sessionId);
        } catch {
        }
    }

    protected resolveHistoryWorkspace(): string {
        return String(this.state.workspace || (this.options.ui?.console as any)?.workspace || '').trim();
    }


    protected async handleCommand(value: string): Promise<boolean> {
        const parsed = this.parseSlashCommandLine(value);
        if (!parsed.command.startsWith('/')) {
            return false;
        }
        const resolved = this.resolveUniqueCommandPrefix(parsed.command);
        if (!this.state.commandHints.includes(resolved.command)) {
            this.notify(resolved.matches.length
                ? `Ambiguous command: ${parsed.command}  (${resolved.matches.join(', ')})`
                : `Unknown command: ${parsed.command}`);
            return true;
        }
        switch (resolved.command) {
            case '/help':
                const helpSelection = await this.select('Help', [
                    { label: '/model', value: '/model', description: 'switch model' },
                    { label: '/sessions', value: '/sessions', description: 'sessions' },
                    { label: '/messages', value: '/messages', description: 'messages' },
                    { label: '/multiline', value: '/multiline', description: 'multiline' },
                    { label: '/copy', value: '/copy', description: 'copy reply' },
                    { label: '/approvals', value: '/approvals', description: 'approvals' },
                    { label: '@workspace', value: '@workspace', description: 'context' },
                    { label: '/exit', value: '/exit', description: 'exit' }
                ], 0, this.state.consoleOptions.selectCloseHint);
                if (helpSelection) {
                    await this.handleMenuSelection(helpSelection);
                }
                return true;
            case '/model':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (parsed.args) {
                    await this.activateModelProfile(parsed.args);
                    return true;
                }
                await this.openModelSwitcher();
                return true;
            case '/tools':
                if (parsed.args) {
                    await this.activateSelectedToolActionHandler(parsed.args);
                    return true;
                }
                if (!this.state.tools.length) {
                    this.notify('No tools available.');
                    return true;
                }
                this.state.setSessionsFocused(false);
                this.state.setMessagesFocused(false);
                this.state.closeMessageDetail();
                this.state.setToolsFocused(true);
                return true;
            case '/clear':
                await this.openSession(undefined);
                this.notify('Started a new session.');
                return true;
            case '/approvals': {
                const pending = this.approvalManager
                    ? this.approvalManager.getPending().filter((r: any) => r.sessionId === this.state.sessionId)
                    : [];
                if (!pending.length) {
                    this.notify('No pending approvals.');
                    return true;
                }
                this.state.setPendingApprovals(pending as AgentConsoleApprovalRequest[]);
                this.state.setSessionsFocused(false);
                this.state.setToolsFocused(false);
                this.state.setMessagesFocused(false);
                this.state.closeMessageDetail();
                this.state.setApprovalsFocused(true);
                return true;
            }
            case '/copy': {
                if (parsed.args) {
                    switch (parsed.args) {
                        case 'input':
                            await this.copyFocusedTextActionHandler(this.state.input, 'input');
                            return true;
                        case 'workspace':
                            await this.copyFocusedTextActionHandler(this.state.workspace, 'workspace');
                            return true;
                        case 'session':
                            await this.copyFocusedTextActionHandler(this.state.sessionId, 'session');
                            return true;
                        case 'model':
                            await this.copyFocusedTextActionHandler(
                                [this.state.provider, this.state.model].filter(Boolean).join(' / '),
                                'model'
                            );
                            return true;
                        default:
                            this.notify('Nothing to copy.');
                            return true;
                    }
                }
                const msgs = this.state.messages;
                for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i].role === 'assistant' && msgs[i].content) {
                        await this.copyFocusedTextActionHandler(msgs[i].content, 'assistant message');
                        return true;
                    }
                }
                this.notify('Nothing to copy.');
                return true;
            }
            case '/session': {
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.refreshSessions();
                if (parsed.args) {
                    await this.openSession(parsed.args);
                    return true;
                }
                const sessions = await this.sessionService?.listSessions(this.state.sessionId) || [];
                if (!sessions.length) {
                    this.notify('No sessions available.');
                    return true;
                }
                const selected = await this.select('Sessions', sessions.map(item => ({
                    label: item.id,
                    value: item.id,
                    description: item.detail || (item.current ? 'current' : 'switch')
                })), Math.max(0, sessions.findIndex(item => item.current)));
                if (selected) {
                    await this.openSession(selected);
                }
                return true;
            }
            case '/new':
                await this.openSession(parsed.args || undefined);
                return true;
            case '/sessions':
                await this.refreshSessions();
                if (!this.state.sessions.length) {
                    this.notify('No sessions available.');
                    return true;
                }
                this.state.setMessagesFocused(false);
                this.state.setSessionsFocused(true);
                return true;
            case '/messages':
                this.state.setSessionsFocused(false);
                this.state.setMessagesFocused(true);
                return true;
            case '/approve':
            case '/deny': {
                if (!this.approvalManager) { return true; }
                const isApprove = resolved.command === '/approve';
                const pend = this.approvalManager.getPending().filter((r: any) => r.sessionId === this.state.sessionId);
                if (!pend.length) { this.notify('No pending approvals.'); return true; }
                if (parsed.args) {
                    const exact = pend.find((item: any) => item.id === parsed.args);
                    const matches = exact ? [exact] : pend.filter((item: any) => item.id.startsWith(parsed.args));
                    if (matches.length === 1) {
                        const applied = isApprove ? this.approvalManager.approve(matches[0].id) : this.approvalManager.reject(matches[0].id);
                        this.notify(applied
                            ? `${isApprove ? 'Approved' : 'Denied'} ${matches[0].toolName} (${matches[0].id.slice(0, 8)}).`
                            : `Approval request ${matches[0].id.slice(0, 8)} is no longer pending.`);
                    } else {
                        this.notify(matches.length > 1
                            ? `Approval id "${parsed.args}" is ambiguous.`
                            : `Approval id "${parsed.args}" not found.`);
                    }
                    return true;
                }
                const req = pend.length === 1 ? pend[0] : null;
                if (!req) {
                    const sel = await this.select(isApprove ? 'Approve' : 'Deny',
                        pend.map((r: any) => ({ label: r.toolName + ' (' + r.id.slice(0, 8) + ')', value: r.id, description: r.reason })));
                    if (!sel) { return true; }
                    const found = pend.find((r: any) => r.id === sel);
                    if (found) {
                        const applied = isApprove ? this.approvalManager.approve(found.id) : this.approvalManager.reject(found.id);
                        this.notify(applied
                            ? `${isApprove ? 'Approved' : 'Denied'} ${found.toolName} (${found.id.slice(0, 8)}).`
                            : `Approval request ${found.id.slice(0, 8)} is no longer pending.`);
                    }
                    return true;
                }
                if (req) {
                    const applied = isApprove ? this.approvalManager.approve(req.id) : this.approvalManager.reject(req.id);
                    this.notify(applied
                        ? `${isApprove ? 'Approved' : 'Denied'} ${req.toolName} (${req.id.slice(0, 8)}).`
                        : `Approval request ${req.id.slice(0, 8)} is no longer pending.`);
                }
                return true;
            }
            case '/quit':
            case '/exit':
                await this.requestTerminalExit('Closing session...');
                return true;
            case '/multiline':
                this.multilineMode = !this.multilineMode;
                if (!this.multilineMode) { this.draftLines = []; }
                return true;
            case '/cancel':
                this.draftLines = [];
                this.multilineMode = false;
                return true;
            case '/send':
                if (!this.draftLines.length) { return true; }
                await this.submitMultilineDraft();
                return true;
            default:
                return false;
        }
    }

    protected async handleMenuSelection(value: string): Promise<void> {
        const selected = String(value || '').trim();
        if (!selected) {
            return;
        }
        const currentInput = String(this.state.input || '').trim();
        if (currentInput === '/help') {
            this.state.setInput('');
        }
        if (selected.startsWith('/')) {
            await this.handleCommand(selected);
            return;
        }
        if (selected.startsWith('@')) {
            const base = String(this.state.input || '').trim();
            const nextInput = base
                ? `${base} ${selected} `
                : `${selected} `;
            this.state.setInput(nextInput, clampConsoleTextCursor(nextInput, nextInput.length));
            this.state.setInputFocused(true);
        }
    }

    protected async submitMultilineDraft(): Promise<void> {
        if (!this.draftLines.length) { return; }
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return;
        }
        const draft = this.draftLines.join('\n');
        const prompt = await this.enrichPromptWithMentions(draft);
        this.draftLines = [];
        this.multilineMode = false;
        this.state.pushInputHistory(draft);
        await this.persistInputHistory();
        this.clearStreamingMessageState();
        const userMsg: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            createdAt: Date.now()
        };
        const asstMsg: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
        this.state.batch(() => {
            this.state.setInput('');
            this.state.setStatus('running');
            this.state.setLastError('');
            this.state.clearActivities();
            this.state.pushActivity('turn', 'User: ' + this.state.summarize(draft));
            this.state.setMessages([...this.state.messages, userMsg, asstMsg]);
        });
        try {
            const stream = this.appRpc?.stream?.('run.turn_stream', { sessionId: this.state.sessionId, input: prompt });
            if (stream) {
                for await (const chunk of stream) {
                    if (chunk.usage) {
                        this.state.setTokenUsage(chunk.usage);
                    }
                    if (chunk.type === 'text' && chunk.content) {
                        asstMsg.content += chunk.content;
                        this.scheduleStreamingAssistantMessageFlush(asstMsg);
                    } else if (chunk.type === 'reasoning' && chunk.content) {
                        this.state.setStatus('reasoning');
                    } else if (chunk.type === 'done' && chunk.message) {
                        asstMsg.content = chunk.message.content || asstMsg.content;
                        asstMsg.metadata = {
                            ...(chunk.message.metadata || {}),
                            streaming: false
                        };
                        this.replaceStreamingAssistantMessage(asstMsg);
                        this.state.setTokenUsage(chunk.message.metadata?.usage);
                    }
                }
            } else {
                const result = await this.executeTurn(prompt);
                if (result && 'message' in result) {
                    asstMsg.content = result.message.content;
                }
            }
            this.clearStreamingMessageState();
            this.state.batch(() => {
                this.state.setMessages([...this.state.messages]);
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                }
            });
        } catch (error: any) {
            this.clearStreamingMessageState();
            this.state.batch(() => {
                this.state.setStatus('error');
                this.state.setLastError(error.message || 'Unknown');
                this.state.pushActivity('error', error.message || 'Unknown');
                this.state.appendAssistantErrorMessage(error.message || 'Unknown');
            });
        }
    }
    async submit(): Promise<void> {
        const value = this.state.input.trim();
        if (!value) { return; }
        if (value.startsWith('/')) {
            this.state.pushInputHistory(value);
            await this.persistInputHistory();
            this.state.setInput('');
            if (await this.handleCommand(value)) {
                return;
            }
            this.state.setInput(value, value.length);
        }
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return;
        }
        this.state.pushInputHistory(value);
        await this.persistInputHistory();
        if (this.multilineMode) {
            this.draftLines.push(value);
            return;
        }
        const prompt = await this.enrichPromptWithMentions(value);
        this.clearStreamingMessageState();
        const userMessage: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            createdAt: Date.now()
        };
        const assistantMessage: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
        this.state.batch(() => {
            this.state.setInput('');
            this.state.setStatus('running');
            this.state.setLastError('');
            this.state.clearActivities();
            this.state.pushActivity('turn', `User: ${this.state.summarize(value)}`);
            this.state.setMessages([...this.state.messages, userMessage, assistantMessage]);
        });

        try {
            const stream = this.appRpc?.stream?.('run.turn_stream', { sessionId: this.state.sessionId, input: prompt });
            if (stream) {
                try {
                    for await (const chunk of stream) {
                        if (chunk.usage) {
                            this.state.setTokenUsage(chunk.usage);
                        }
                        if (chunk.type === 'text' && chunk.content) {
                            assistantMessage.content += chunk.content;
                            this.scheduleStreamingAssistantMessageFlush(assistantMessage);
                        } else if (chunk.type === 'reasoning' && chunk.content) {
                            this.state.setStatus('reasoning');
                            this.state.pushActivity('model', `Reasoning: ${this.state.summarize(chunk.content)}`);
                        } else if (chunk.type === 'done' && chunk.message) {
                            assistantMessage.content = chunk.message.content || assistantMessage.content;
                            assistantMessage.metadata = {
                                ...(chunk.message.metadata || {}),
                                streaming: false
                            };
                            this.replaceStreamingAssistantMessage(assistantMessage);
                            this.state.setTokenUsage(chunk.message.metadata?.usage);
                        }
                    }
                } finally {
                    this.clearStreamingMessageState();
                }
            } else {
                const result = await this.executeTurn(prompt);
                if (result && 'message' in result) {
                    assistantMessage.content = result.message.content;
                    this.state.batch(() => {
                        this.state.setMessages([...this.state.messages]);
                    });
                }
            }
        } catch (error: any) {
            const message = error?.message || String(error || 'Unknown error');
            this.state.batch(() => {
                this.state.setStatus('error');
                this.state.setLastError(message);
                this.state.pushActivity('error', message);
                this.state.appendAssistantErrorMessage(message);
            });
        }

        await this.refreshTools();
        this.state.batch(() => {
            if (this.state.status === 'running' || this.state.status === 'reasoning') {
                this.state.setStatus('idle');
            }
            this.state.setTasksCount(this.scheduler.getTasks().length);
        });
    }

    async schedulePrompt(prompt: string, delayMs: number): Promise<void> {
        await this.scheduler.schedule({
            id: `task-${Date.now()}`,
            sessionId: this.state.sessionId,
            prompt,
            runAt: Date.now() + delayMs,
            scheduleType: 'once'
        });
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    dispose(): void {
        this.clearStreamingMessageState();
        this.bridge.dispose();
    }

    getTerminalRoot(): RNode | RNode[] | undefined {
        const rootNodes = this.componentRef?.hostView?.rootNodes;
        if (rootNodes?.length) {
            return rootNodes;
        }
        return undefined;
    }

    shouldPlaceTerminalCursor(): boolean {
        return this.state.shouldRenderTerminalCursor();
    }

    resolveTerminalCursorMode(): 'prompt' | 'bottom' {
        return this.state.resolveTerminalCursorMode();
    }

    getTerminalRenderedLines(): string[] {
        return this.surfaceAccessor?.getLastRenderedLines() || [];
    }

    getTerminalRenderedText(stripAnsi: (value: string) => string): string {
        return this.surfaceAccessor?.getLastRenderedText(stripAnsi) || '';
    }

    protected scheduleStreamingAssistantMessageFlush(message: AgentMessage): void {
        const shouldFlushImmediately = !this.streamMessageText;
        this.streamMessageText = message.content || '';
        if (shouldFlushImmediately) {
            this.flushStreamingAssistantMessage(message);
            return;
        }
        if (this.streamMessageTimer || this.destroyed) {
            return;
        }
        this.streamMessageTimer = setTimeout(() => {
            this.streamMessageTimer = undefined;
            this.flushStreamingAssistantMessage(message);
        }, AgentConsoleComponent.STREAM_MESSAGE_FLUSH_MS);
    }

    protected flushStreamingAssistantMessage(message?: AgentMessage): void {
        if (this.streamMessageTimer) {
            clearTimeout(this.streamMessageTimer);
            this.streamMessageTimer = undefined;
        }
        if (this.destroyed) {
            this.streamMessageText = '';
            return;
        }
        const current = this.state.messages.slice();
        const last = current[current.length - 1];
        if (last?.role === 'assistant') {
            current[current.length - 1] = {
                ...(message || last),
                content: this.streamMessageText,
                metadata: {
                    ...(message?.metadata || last.metadata || {}),
                    streaming: true
                }
            };
            this.state.setMessages(current);
        }
    }

    protected replaceStreamingAssistantMessage(message: AgentMessage): void {
        if (this.destroyed) {
            return;
        }
        const current = this.state.messages.slice();
        const last = current[current.length - 1];
        if (last?.role !== 'assistant') {
            return;
        }
        current[current.length - 1] = {
            ...last,
            ...message,
            metadata: {
                ...(last.metadata || {}),
                ...(message.metadata || {})
            }
        };
        this.state.setMessages(current);
    }

    protected clearStreamingMessageState(): void {
        if (this.streamMessageTimer) {
            clearTimeout(this.streamMessageTimer);
            this.streamMessageTimer = undefined;
        }
        this.streamMessageText = '';
    }

    protected async loadSessionMessages(sessionId = this.state.sessionId): Promise<AgentMessage[]> {
        return this.sessionService?.loadMessages(sessionId) || this.runtime.getMessages(sessionId);
    }

    async handleTerminalInput(
        decoded: TerminalInputSequenceResult,
        chunk: Buffer | string
    ): Promise<void> {
        const rawChunk = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
        const submitOnEnter = /[\r\n]/.test(rawChunk);
        const outcome = await this.state.processDecodedInput(decoded, chunk, {
            isClosed: this.destroyed,
            onExit: (message: string) => {
                void this.requestTerminalExit(message);
            },
            hasActiveTextPrompt: false,
            lastRenderedLines: this.getTerminalRenderedLines()
        });
        if (!outcome.handled && decoded.text) {
            await this.state.processRawChunk(decoded.text, {
                submitOnEnter,
                hasSelectMenu: !!this.state.selectMenu
            });
            return;
        }
        switch (outcome.action) {
            case 'submit':
                await this.submit();
                return;
            case 'textInput':
                await this.state.processRawChunk(rawChunk, {
                    submitOnEnter,
                    hasSelectMenu: !!this.state.selectMenu
                });
                return;
            case 'draftNavigation':
                switch (outcome.value) {
                    case 'left':
                        this.state.moveInputCursor(-1);
                        return;
                    case 'right':
                        this.state.moveInputCursor(1);
                        return;
                    case 'home':
                        this.state.moveInputCursorToEdge('start');
                        return;
                    case 'end':
                        this.state.moveInputCursorToEdge('end');
                        return;
                    default:
                        return;
                }
            case 'altNewline':
                await this.state.processRawChunk('\n', {
                    submitOnEnter: false,
                    altKey: true,
                    hasSelectMenu: !!this.state.selectMenu
                });
                return;
            default:
                return;
        }
    }

    protected async requestTerminalExit(message?: string): Promise<void> {
        const exitMessage = String(message || '').trim();
        if (!this.app) {
            if (exitMessage) {
                this.notify(exitMessage);
            }
            return;
        }
        await this.app.close();
        if (exitMessage && typeof process !== 'undefined' && process.stdout?.write) {
            process.stdout.write(`${exitMessage}\n`);
        }
    }

    protected async executeTurn(input: string): Promise<import('@tsdi/agent').AgentTurnResult | void> {
        if (this.appRpc) {
            await this.appRpc.request('run.turn', { sessionId: this.state.sessionId, input });
            return;
        }
        return this.runtime.runTurn(this.state.sessionId, input);
    }

    protected async loadTools(): Promise<any[]> {
        if (this.appRpc) {
            const tools = await this.appRpc.request('tools.list', { sessionId: this.state.sessionId });
            return Array.isArray(tools) ? tools : [];
        }
        if (!this.toolRegistry) {
            return [];
        }
        return this.toolRegistry.getToolDefinitions(this.state.sessionId) as any[];
    }

    protected getModelProfileOptions(): AgentConsoleSelectOption[] {
        const model = this.options.model as AgentUiResolvedModelProfile | undefined;
        const profiles = model?.profiles || {};
        const entries = Object.entries(profiles).filter(([, profile]) => !!profile);
        if (!entries.length) {
            return [];
        }
        const currentProfile = String(model?.defaultProfile || this.state.modelProfile || '').trim();
        return entries.map(([name, profile]) => {
            const merged = this.resolveModelProfileConfig(name);
            const selected = currentProfile === name;
            return {
                label: selected ? `${name} [current]` : name,
                value: name,
                description: [merged.provider, merged.model].filter(Boolean).join(' / '),
                detail: [
                    `Profile: ${name}`,
                    `Provider: ${merged.provider || '-'}`,
                    `Model: ${merged.model || '-'}`,
                    merged.baseUrl ? `Base URL: ${merged.baseUrl}` : '',
                    profile?.reasoning != null ? `Reasoning: ${profile.reasoning ? 'on' : 'off'}` : '',
                    profile?.thinkingBudget != null ? `Thinking budget: ${profile.thinkingBudget}` : ''
                ].filter(Boolean).join('\n')
            };
        });
    }

    protected async loadModelProfileOptions(): Promise<AgentConsoleSelectOption[]> {
        if (this.appRpc) {
            const profiles = await this.appRpc.request('model.list');
            return Array.isArray(profiles)
                ? profiles.map((profile: any) => ({
                    label: profile?.selected ? `${profile.name} [current]` : String(profile?.name || ''),
                    value: String(profile?.name || ''),
                    description: [profile?.provider, profile?.model].filter(Boolean).join(' / '),
                    detail: [
                        `Profile: ${profile?.name || '-'}`,
                        `Provider: ${profile?.provider || '-'}`,
                        `Model: ${profile?.model || '-'}`,
                        profile?.baseUrl ? `Base URL: ${profile.baseUrl}` : '',
                        profile?.reasoning != null ? `Reasoning: ${profile.reasoning ? 'on' : 'off'}` : '',
                        profile?.thinkingBudget != null ? `Thinking budget: ${profile.thinkingBudget}` : ''
                    ].filter(Boolean).join('\n')
                })).filter((item: AgentConsoleSelectOption) => !!item.value)
                : [];
        }
        return this.getModelProfileOptions();
    }

    protected resolveModelProfileConfig(profileName: string): AgentUiResolvedModelProfile {
        const model = (this.options.model || {}) as AgentUiResolvedModelProfile;
        const baseHeaders = model.headers ? { ...model.headers } : undefined;
        const profile = model.profiles?.[profileName] || {} as AgentUiResolvedModelProfile;
        return {
            ...model,
            ...profile,
            headers: {
                ...(baseHeaders || {}),
                ...(profile.headers || {})
            }
        };
    }

    protected async openModelSwitcher(): Promise<void> {
        const options = await this.loadModelProfileOptions();
        if (!options.length) {
            this.notify('No model profiles configured.');
            return;
        }
        const currentProfile = String(
            this.appRpc ? this.state.modelProfile : (this.options.model?.defaultProfile || this.state.modelProfile || '')
        ).trim();
        const selected = await this.select(
            'Model profiles',
            options,
            Math.max(0, options.findIndex(item => item.value === currentProfile || item.label.startsWith(`${currentProfile} [`)))
        );
        if (selected) {
            await this.activateModelProfile(selected);
        }
    }

    protected async activateModelProfile(profileName: string): Promise<void> {
        const name = String(profileName || '').trim();
        if (!name) {
            return;
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('model.activate', { sessionId: this.state.sessionId, name });
            this.state.batch(() => {
                this.state.setModelProfile(String(result?.modelProfile || name));
                if (result?.provider) {
                    this.state.setProvider(String(result.provider));
                }
                if (result?.model) {
                    this.state.setModel(String(result.model));
                }
            });
            this.notify(`Switched model profile to ${name}.`);
            return;
        }
        const profiles = this.options.model?.profiles || {};
        if (!profiles[name]) {
            this.notify(`Unknown model profile: ${name}`);
            return;
        }
        this.options.model = this.options.model || {};
        this.options.model.defaultProfile = name;
        const resolved = this.resolveModelProfileConfig(name);
        this.state.batch(() => {
            this.state.setModelProfile(name);
            if (resolved.provider) {
                this.state.setProvider(resolved.provider);
            }
            if (resolved.model) {
                this.state.setModel(resolved.model);
            }
        });
        this.notify(`Switched model profile to ${name}.`);
    }

    protected async activateTool(name: string): Promise<boolean> {
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.activate', { sessionId: this.state.sessionId, name });
            return result?.activated !== false;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.activateTool !== 'function') {
            return false;
        }
        return !!(await this.toolRegistry.activateTool(this.state.sessionId, name));
    }

    protected async refreshTools(): Promise<void> {
        const definitions = await this.loadTools();
        if (!definitions.length) {
            this.state.setTools([]);
            return;
        }
        const tools = await Promise.all(definitions.map(async def => {
            const active = this.appRpc
                ? def.activation?.activated ?? true
                : this.toolRegistry && typeof this.toolRegistry.isToolActive === 'function'
                ? await this.toolRegistry.isToolActive(this.state.sessionId, def.name)
                : def.activation?.activated ?? true;
            return this.state.toToolItem(def, active);
        }));
        tools.sort((a, b) => a.name.localeCompare(b.name));
        this.state.setTools(tools);
    }

}
