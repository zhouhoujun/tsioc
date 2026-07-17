import { Component, OnDestroy } from '@tsdi/components';
import { clampConsoleTextCursor } from '@tsdi/components/console';
import { Inject, Optional } from '@tsdi/ioc';
import { AGENT_OPTIONS } from '../tokens';
import { AgentOptions, defaultAgentOptions } from '../options';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentScheduler } from '../scheduler/AgentScheduler';
import { ToolRegistry } from '../tools/ToolRegistry';
import { SessionStore } from '../memory/SessionStore';
import { ToolApprovalManager } from '../tools/ToolApprovalManager';
import { AgentConsoleUiDelegate } from './AgentConsoleUiDelegate';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleApprovalRequest, AgentConsoleSelectOption, AgentConsoleSessionMeta, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { mergeAgentConsoleTheme } from './AgentConsoleTheme';
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
export class AgentConsoleComponent implements OnDestroy {
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
        @Optional() @Inject(AgentConsoleUiDelegate) private uiDelegate?: AgentConsoleUiDelegate | null,
        @Optional() private sessionStore?: SessionStore | null,
        @Optional() private approvalManager?: ToolApprovalManager | null
    ) {
        this.state.setTitle(this.options.ui?.title ?? defaultAgentOptions.ui!.title!);
        this.state.setProvider(this.options.model?.provider ?? '');
        this.state.setModel(this.options.model?.model ?? '');
        this.state.setModelProfile(this.resolveInitialModelProfile());
        this.state.setTheme(mergeAgentConsoleTheme(this.options.ui?.theme));
        this.state.setConsoleOptions(this.options.ui?.console);
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
        if (this.uiDelegate) {
            this.uiDelegate.notify(message, duration);
            return;
        }
        this.state.setNotice(message);
    }

    protected notifyBusyState(message = 'Wait for the current turn to finish.'): void {
        this.notify(message);
    }

    protected async refreshSessionsFromDelegate(): Promise<void> {
        if (!this.uiDelegate) {
            return;
        }
        const sessions = await this.uiDelegate.listSessions();
        if (!sessions.length) {
            return;
        }
        this.state.setSessions(sessions.map(item => ({
            id: item.id,
            current: !!item.current
        })));
    }

    protected async selectApprovalRequest(
        requests: AgentConsoleApprovalRequest[],
        selectedIndex = 0
    ): Promise<AgentConsoleApprovalRequest | undefined> {
        if (!requests.length) {
            return undefined;
        }
        if (requests.length === 1 || !this.uiDelegate) {
            return requests[0];
        }
        const selected = await this.uiDelegate.select('Pending approvals', requests.map(request => ({
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
        if (!this.uiDelegate) {
            this.notify([
                'Pending approvals:',
                ...requests.map(request => `  - ${request.id.slice(0, 8)} ${request.toolName}: ${request.reason}`)
            ].join('\n'));
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
            const action = await this.uiDelegate.select(`Approval ${request.id.slice(0, 8)}`, [
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
                const copied = await this.uiDelegate.copyText(request.inputSummary || request.summary);
                this.notify(copied ? 'Copied approval input.' : 'Nothing to copy.');
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
            if (!this.uiDelegate) {
                this.notify(text);
                return;
            }
            const copied = await this.uiDelegate.copyText(text);
            this.notify(copied
                ? `Copied ${label}.`
                : `Nothing to copy for ${label}.`);
        };
    }

    get activateSelectedSessionActionHandler(): (sessionId: string) => Promise<void> {
        return async (sessionId: string) => {
            if (this.isTurnInProgress()) {
                this.notifyBusyState('Wait for the current turn to finish before switching sessions.');
                return;
            }
            if (!this.uiDelegate || !sessionId) {
                return;
            }
            await this.uiDelegate.switchSession(sessionId);
            this.state.setSessionsFocused(false);
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
        if (this.uiDelegate) {
            return this.uiDelegate.select(title, options, selectedIndex, hint);
        }
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
        this.state.resolveApprovalAction = this.resolveApprovalActionHandler;
        this.bridge.bindState(this.sessionState);
        this.bridge.subscribe();
        if (!this.state.messages.length) {
            this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
        }
        await this.refreshTools();
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    onDestroy(): void {
        this.destroyed = true;
        this.clearStreamingMessageState();
        this.state.copyFocusedTextAction = undefined;
        this.state.activateSelectedSessionAction = undefined;
        this.state.resolveApprovalAction = undefined;
        this.dispose();
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

    protected enrichPromptWithMentions(input: string): string {
        const text = String(input || '');
        const matches = text.match(/(^|\s)@([a-zA-Z0-9_.-]+)/g) || [];
        const mentions = Array.from(new Set(matches.map(item => item.trim())));
        if (!mentions.length) {
            return text;
        }
        const toolMap = new Map((this.state.tools || []).map(tool => [tool.name, tool]));
        const contextLines: string[] = [];
        mentions.forEach(mention => {
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
                    }
                    break;
                }
            }
        });
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

    protected async handleCommand(value: string): Promise<boolean> {
        const parsed = this.parseSlashCommandLine(value);
        if (!parsed.command.startsWith('/')) {
            return false;
        }
        const resolved = this.resolveUniqueCommandPrefix(parsed.command);
        if (!this.state.commandHints.includes(resolved.command)) {
            if (this.uiDelegate) {
                this.uiDelegate.notify(resolved.matches.length
                    ? `Ambiguous command: ${parsed.command}  (${resolved.matches.join(', ')})`
                    : `Unknown command: ${parsed.command}`);
            }
            return true;
        }
        switch (resolved.command) {
            case '/help':
                if (!this.uiDelegate) { return true; }
                const helpSelection = await this.uiDelegate.select('Help', [
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
                if (!this.uiDelegate) { return true; }
                await this.switchModel();
                return true;
            case '/tools':
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
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (this.uiDelegate) {
                    await this.uiDelegate.switchSession(undefined);
                    this.uiDelegate.notify('Started a new session.');
                }
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
                if (parsed.args && this.uiDelegate) {
                    const copied = await this.uiDelegate.copy(parsed.args);
                    this.uiDelegate.notify(copied
                        ? `Copied ${parsed.args} to clipboard.`
                        : 'Nothing to copy.');
                    return true;
                }
                const msgs = this.state.messages;
                for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i].role === 'assistant' && msgs[i].content) {
                        if (this.uiDelegate) { await this.uiDelegate.copyText(msgs[i].content); }
                        return true;
                    }
                }
                if (this.uiDelegate) { this.uiDelegate.notify('Nothing to copy.'); }
                return true;
            }
            case '/session': {
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (!this.uiDelegate) { return true; }
                await this.refreshSessionsFromDelegate();
                if (parsed.args) {
                    await this.uiDelegate.switchSession(parsed.args);
                    return true;
                }
                const sessions = await this.uiDelegate.listSessions();
                if (!sessions.length) {
                    this.uiDelegate.notify('No sessions available.');
                    return true;
                }
                const selected = await this.uiDelegate.select('Sessions', sessions.map(item => ({
                    label: item.id,
                    value: item.id,
                    description: item.detail || (item.current ? 'current' : 'switch')
                })), Math.max(0, sessions.findIndex(item => item.current)));
                if (selected) {
                    await this.uiDelegate.switchSession(selected);
                }
                return true;
            }
            case '/new':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (this.uiDelegate) {
                    await this.uiDelegate.switchSession(parsed.args || undefined);
                }
                return true;
            case '/sessions':
                await this.refreshSessionsFromDelegate();
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
                if (!pend.length) { if (this.uiDelegate) { this.uiDelegate.notify('No pending approvals.'); } return true; }
                if (parsed.args) {
                    const exact = pend.find((item: any) => item.id === parsed.args);
                    const matches = exact ? [exact] : pend.filter((item: any) => item.id.startsWith(parsed.args));
                    if (matches.length === 1) {
                        const applied = isApprove ? this.approvalManager.approve(matches[0].id) : this.approvalManager.reject(matches[0].id);
                        if (this.uiDelegate) {
                            this.uiDelegate.notify(applied
                                ? `${isApprove ? 'Approved' : 'Denied'} ${matches[0].toolName} (${matches[0].id.slice(0, 8)}).`
                                : `Approval request ${matches[0].id.slice(0, 8)} is no longer pending.`);
                        }
                    } else if (this.uiDelegate) {
                        this.uiDelegate.notify(matches.length > 1
                            ? `Approval id "${parsed.args}" is ambiguous.`
                            : `Approval id "${parsed.args}" not found.`);
                    }
                    return true;
                }
                const req = pend.length === 1 ? pend[0] : null;
                if (!req && this.uiDelegate) {
                    const sel = await this.uiDelegate.select(isApprove ? 'Approve' : 'Deny',
                        pend.map((r: any) => ({ label: r.toolName + ' (' + r.id.slice(0, 8) + ')', value: r.id, description: r.reason })));
                    if (!sel) { return true; }
                    const found = pend.find((r: any) => r.id === sel);
                    if (found) {
                        const applied = isApprove ? this.approvalManager.approve(found.id) : this.approvalManager.reject(found.id);
                        this.uiDelegate.notify(applied
                            ? `${isApprove ? 'Approved' : 'Denied'} ${found.toolName} (${found.id.slice(0, 8)}).`
                            : `Approval request ${found.id.slice(0, 8)} is no longer pending.`);
                    }
                    return true;
                }
                if (req) {
                    const applied = isApprove ? this.approvalManager.approve(req.id) : this.approvalManager.reject(req.id);
                    if (this.uiDelegate) {
                        this.uiDelegate.notify(applied
                            ? `${isApprove ? 'Approved' : 'Denied'} ${req.toolName} (${req.id.slice(0, 8)}).`
                            : `Approval request ${req.id.slice(0, 8)} is no longer pending.`);
                    }
                }
                return true;
            }
            case '/quit':
            case '/exit':
                if (this.uiDelegate) { this.uiDelegate.quit(); }
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

    protected readonly MODEL_PROVIDER_CHOICES = [
        { key: 'deepseek', label: 'DeepSeek', provider: 'deepseek' },
        { key: 'openai', label: 'OpenAI', provider: 'openai' },
        { key: 'openai-compatible', label: 'Custom OpenAI-Compatible', provider: 'openai-compatible' },
        { key: 'anthropic', label: 'Custom Anthropic-Compatible', provider: 'anthropic' }
    ];
    protected readonly PROVIDER_MODELS: Record<string, string[]> = {
        deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'], openai: ['gpt-4o-mini', 'gpt-4.1'],
        'openai-compatible': [], anthropic: []
    };
    protected readonly PROVIDER_DEFAULT_MODELS: Record<string, string> = {
        deepseek: 'deepseek-v4-flash', openai: 'gpt-4o-mini',
        'openai-compatible': 'custom-model', anthropic: 'claude-sonnet-4-20250514'
    };
    protected readonly PROVIDER_STRONG_MODELS: Record<string, string> = {
        deepseek: 'deepseek-v4-pro', openai: 'gpt-4.1',
        'openai-compatible': 'custom-model', anthropic: 'claude-sonnet-4-20250514'
    };
    protected readonly PROVIDER_BASE_URLS: Record<string, string | undefined> = {
        deepseek: 'https://api.deepseek.com', openai: 'https://api.openai.com',
        'openai-compatible': undefined, anthropic: 'https://api.anthropic.com'
    };

    protected async switchModel(): Promise<void> {
        if (!this.uiDelegate) { return; }
        const currProv = this.state.provider;
        const currModel = this.state.model;
        let provider = currProv;
        let flashModel = currProv ? currModel : '';
        let strongModel = currProv ? currModel : '';

        while (true) {
            const prov = await this.uiDelegate.select('Model providers', this.MODEL_PROVIDER_CHOICES.map((i: any) => ({
                label: i.label, value: i.provider,
                description: i.provider
            })), Math.max(0, this.MODEL_PROVIDER_CHOICES.findIndex((p: any) => p.provider === provider)));
            if (!prov) { return; }
            if (prov !== provider) {
                provider = prov;
                flashModel = '';
                strongModel = '';
            } else {
                provider = prov;
            }
            const models = this.PROVIDER_MODELS[provider] || [];
            const defModel = flashModel || this.PROVIDER_DEFAULT_MODELS[provider] || 'custom-model';
            const strongDef = strongModel || this.PROVIDER_STRONG_MODELS[provider] || defModel;
            const flash = models.length
                ? await this.uiDelegate.select('Flash model for ' + provider, models.map((m: string) => ({ label: m, value: m })), Math.max(0, models.indexOf(defModel)))
                : await this.uiDelegate.prompt('Flash model [' + defModel + ']:');
            if (this.isCancelPromptValue(flash)) { return; }
            if (models.length && !flash) {
                continue;
            }
            flashModel = flash || defModel;

            const strong = models.length
                ? await this.uiDelegate.select('Strong model for ' + provider, models.map((m: string) => ({ label: m, value: m })), Math.max(0, models.indexOf(strongDef)))
                : await this.uiDelegate.prompt('Strong model [' + strongDef + ']:');
            if (this.isCancelPromptValue(strong)) { return; }
            if (models.length && !strong) {
                continue;
            }
            strongModel = strong || strongDef;
            break;
        }

        let baseUrl = this.PROVIDER_BASE_URLS[provider];
        if (provider === 'openai-compatible' || provider === 'anthropic') {
            const input = await this.uiDelegate.prompt('Base URL [' + (baseUrl || '') + ']:');
            if (this.isCancelPromptValue(input)) { return; }
            if (input) { baseUrl = input; }
        }
        const existingApiKey = currProv === provider ? this.options.model?.apiKey : undefined;
        const keyLabel = existingApiKey ? '******' : '(required)';
        const keyInput = await this.uiDelegate.prompt('API key for ' + provider + ' [' + keyLabel + ']:', true);
        if (this.isCancelPromptValue(keyInput)) { return; }
        const apiKey = keyInput || existingApiKey;
        if (!apiKey) { return; }
        await this.uiDelegate.applyModelProfile({ provider, flashModel, strongModel, baseUrl, apiKey });
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
        const prompt = this.enrichPromptWithMentions(draft);
        this.draftLines = [];
        this.multilineMode = false;
        this.state.pushInputHistory(draft);
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
            if (typeof (this.runtime as any).runStreamingTurn === 'function') {
                const stream = (this.runtime as any).runStreamingTurn(this.state.sessionId, prompt);
                for await (const chunk of stream) {
                    if (chunk.type === 'text' && chunk.content) {
                        asstMsg.content += chunk.content;
                        this.scheduleStreamingAssistantMessageFlush(asstMsg);
                    } else if (chunk.type === 'reasoning' && chunk.content) { this.state.setStatus('reasoning'); }
                    else if (chunk.type === 'done' && chunk.usage) { this.state.setTokenUsage(chunk.usage); }
                }
            } else { await this.runtime.runTurn(this.state.sessionId, prompt); }
            const messages = await this.runtime.getMessages(this.state.sessionId);
            this.clearStreamingMessageState();
            this.state.batch(() => {
                this.state.setMessages(messages);
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
        if (this.multilineMode) {
            this.draftLines.push(value);
            return;
        }
        const prompt = this.enrichPromptWithMentions(value);
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
            if (typeof (this.runtime as any).runStreamingTurn === 'function') {
                try {
                    const stream = (this.runtime as any).runStreamingTurn(this.state.sessionId, prompt);
                    for await (const chunk of stream) {
                        if (chunk.type === 'text' && chunk.content) {
                            assistantMessage.content += chunk.content;
                            this.scheduleStreamingAssistantMessageFlush(assistantMessage);
                        } else if (chunk.type === 'reasoning' && chunk.content) {
                            this.state.setStatus('reasoning');
                            this.state.pushActivity('model', `Reasoning: ${this.state.summarize(chunk.content)}`);
                        } else if (chunk.type === 'tool_call') {
                            this.state.pushActivity('tool', `Tool call: ${chunk.content || '...'}`);
                        } else if (chunk.type === 'done' && chunk.usage) {
                            this.state.setTokenUsage(chunk.usage);
                        }
                    }
                } finally {
                    const messages = await this.runtime.getMessages(this.state.sessionId);
                    this.clearStreamingMessageState();
                    this.state.batch(() => {
                        this.state.setMessages(messages);
                    });
                }
            } else {
                await this.runtime.runTurn(this.state.sessionId, prompt);
                const messages = await this.runtime.getMessages(this.state.sessionId);
                this.state.batch(() => {
                    this.state.setMessages(messages);
                });
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

    protected clearStreamingMessageState(): void {
        if (this.streamMessageTimer) {
            clearTimeout(this.streamMessageTimer);
            this.streamMessageTimer = undefined;
        }
        this.streamMessageText = '';
    }

    protected async refreshTools(): Promise<void> {
        if (!this.toolRegistry) {
            this.state.setTools([]);
            return;
        }
        const definitions = this.toolRegistry.getToolDefinitions(this.state.sessionId);
        const tools = await Promise.all(definitions.map(async def => {
            const active = this.toolRegistry && typeof this.toolRegistry.isToolActive === 'function'
                ? await this.toolRegistry.isToolActive(this.state.sessionId, def.name)
                : def.activation?.activated ?? true;
            return this.state.toToolItem(def, active);
        }));
        tools.sort((a, b) => a.name.localeCompare(b.name));
        this.state.setTools(tools);
    }

}
