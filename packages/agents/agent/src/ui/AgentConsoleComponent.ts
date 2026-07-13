import { Component, ComponentRef } from '@tsdi/components';
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
import { AgentConsoleSelectOption, AgentConsoleSessionMeta, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { mergeAgentConsoleTheme } from './AgentConsoleTheme';
@Component({
    selector: 'agent-console',
    template: `
    <div class="agent-console">
        <agent-console-status-panel v-show="showStatusPanel"></agent-console-status-panel>
        <agent-console-sessions-panel v-show="showSessionsPanel"></agent-console-sessions-panel>
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
export class AgentConsoleComponent {
    protected unsubscribeState?: () => void;
    protected refreshQueued = false;
    protected multilineMode = false;
    protected draftLines: string[] = [];

    constructor(
        private state: AgentConsoleSessionState,
        private runtime: AgentRuntime,
        private scheduler: AgentScheduler,
        private bridge: AgentConsoleEventBridge,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions,
        @Optional() private toolRegistry?: ToolRegistry | null,
        @Optional() private componentRef?: ComponentRef<AgentConsoleComponent> | null,
        @Optional() @Inject(AgentConsoleUiDelegate) private uiDelegate?: AgentConsoleUiDelegate | null,
        @Optional() private sessionStore?: SessionStore | null,
        @Optional() private approvalManager?: ToolApprovalManager | null
    ) {
        this.state.setTitle(this.options.ui?.title ?? defaultAgentOptions.ui!.title!);
        this.state.setProvider(this.options.model?.provider ?? '');
        this.state.setModel(this.options.model?.model ?? '');
        this.state.setModelProfile(this.resolveInitialModelProfile());
        this.state.setTheme(mergeAgentConsoleTheme(this.options.ui?.theme));
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

    get title(): string {
        return this.state.title;
    }

    get showStatusPanel(): boolean {
        return !!this.state.notice;
    }

    get showSessionsPanel(): boolean {
        return this.state.sessionsFocused;
    }

    get showMessageDetailPanel(): boolean {
        return !!this.state.messageDetailOpen;
    }

    get showActivityPanel(): boolean {
        return !this.state.messages.length && !!this.state.activities.length;
    }

    get showToolsPanel(): boolean {
        return false;
    }

    get showWorkingPanel(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    get showToolRunsPanel(): boolean {
        return this.showWorkingPanel && !!this.state.highlightedToolRun && this.state.highlightedToolRun.status === 'running';
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
        return this.state.selectMenu?.hint || '1-9 select   up/down move   enter confirm   q cancel';
    }

    get selectOptions(): Array<{ label: string; value: string; description?: string }> {
        return this.state.selectMenu?.options?.map((o: any) => ({
            label: o.label,
            value: o.value,
            description: typeof o.detail === 'string' ? o.detail : undefined
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
        this.bridge.bindState(this.sessionState);
        this.bridge.subscribe();
        if (!this.state.messages.length) {
            this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
        }
        await this.refreshTools();
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    onAfterViewInit(): void {
        this.unsubscribeState = this.state.subscribe(() => {
            this.queuePanelRefresh();
        });
    }

    onDestroy(): void {
        this.unsubscribeState?.();
        this.unsubscribeState = undefined;
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
                    { label: '/model', value: '/model', detail: 'Switch provider and model.' },
                    { label: '/sessions', value: '/sessions', detail: 'Browse sessions.' },
                    { label: '/messages', value: '/messages', detail: 'Browse messages.' },
                    { label: '/multiline', value: '/multiline', detail: 'Toggle multiline draft mode.' },
                    { label: '/copy', value: '/copy', detail: 'Copy latest assistant reply.' },
                    { label: '/approvals', value: '/approvals', detail: 'List pending approvals.' },
                    { label: '@workspace', value: '@workspace', detail: 'Inject workspace context.' },
                    { label: '/exit', value: '/exit', detail: 'Exit the chat session.' }
                ], 0, 'up/down move   enter close   q close');
                if (helpSelection) {
                    await this.handleMenuSelection(helpSelection);
                }
                return true;
            case '/model':
                if (!this.uiDelegate) { return true; }
                await this.switchModel();
                return true;
            case '/tools':
                if (!this.uiDelegate) { return true; }
                await this.showToolsList();
                return true;
            case '/clear':
                if (this.sessionStore) { await this.sessionStore.delete(this.state.sessionId); }
                this.state.setMessages([]);
                this.state.setMessagesFocused(false);
                this.state.setSessionsFocused(false);
                this.state.closeMessageDetail();
                if (this.uiDelegate) { this.uiDelegate.notify('Session cleared.'); }
                return true;
            case '/approvals': {
                const pending = this.approvalManager
                    ? this.approvalManager.getPending().filter((r: any) => r.sessionId === this.state.sessionId)
                    : [];
                const msg = pending.length
                    ? 'Pending approvals:\n' + pending.map((r: any) => '  - ' + r.id.slice(0, 8) + ' ' + r.toolName + ': ' + r.reason).join('\n')
                    : 'Pending approvals:\n  (empty)';
                if (this.uiDelegate) { this.uiDelegate.notify(msg); }
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
                if (!this.uiDelegate) { return true; }
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
                    detail: item.detail || (item.current ? 'Current session' : 'Switch to this session')
                })), Math.max(0, sessions.findIndex(item => item.current)));
                if (selected) {
                    await this.uiDelegate.switchSession(selected);
                }
                return true;
            }
            case '/new':
                if (this.uiDelegate) {
                    await this.uiDelegate.switchSession(parsed.args || undefined);
                }
                return true;
            case '/sessions':
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
                        isApprove ? this.approvalManager.approve(matches[0].id) : this.approvalManager.reject(matches[0].id);
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
                        pend.map((r: any) => ({ label: r.toolName + ' (' + r.id.slice(0, 8) + ')', value: r.id, detail: 'Reason: ' + r.reason })));
                    if (!sel) { return true; }
                    const found = pend.find((r: any) => r.id === sel);
                    if (found) { isApprove ? this.approvalManager.approve(found.id) : this.approvalManager.reject(found.id); }
                    return true;
                }
                if (req) { isApprove ? this.approvalManager.approve(req.id) : this.approvalManager.reject(req.id); }
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
        const prov = await this.uiDelegate.select('Model providers', this.MODEL_PROVIDER_CHOICES.map((i: any) => ({
            label: i.label, value: i.provider,
            detail: 'Provider: ' + i.provider + '\nDefault: ' + (this.PROVIDER_DEFAULT_MODELS[i.provider] || 'custom') + '\nStrong: ' + (this.PROVIDER_STRONG_MODELS[i.provider] || this.PROVIDER_DEFAULT_MODELS[i.provider] || 'custom')
        })), Math.max(0, this.MODEL_PROVIDER_CHOICES.findIndex((p: any) => p.provider === currProv)));
        if (!prov) { return; }
        const models = this.PROVIDER_MODELS[prov] || [];
        const defModel = this.PROVIDER_DEFAULT_MODELS[prov] || 'custom-model';
        const strongDef = this.PROVIDER_STRONG_MODELS[prov] || defModel;
        const flash = models.length
            ? await this.uiDelegate.select('Flash model for ' + prov, models.map((m: string) => ({ label: m, value: m })), Math.max(0, models.indexOf(currModel)))
            : await this.uiDelegate.prompt('Flash model [' + defModel + ']:');
        if (!flash || this.isCancelPromptValue(flash)) { return; }
        const strong = models.length
            ? await this.uiDelegate.select('Strong model for ' + prov, models.map((m: string) => ({ label: m, value: m })), Math.max(0, models.indexOf(currModel)))
            : await this.uiDelegate.prompt('Strong model [' + strongDef + ']:');
        if (!strong || this.isCancelPromptValue(strong)) { return; }
        let baseUrl = this.PROVIDER_BASE_URLS[prov];
        if (prov === 'openai-compatible' || prov === 'anthropic') {
            const input = await this.uiDelegate.prompt('Base URL [' + (baseUrl || '') + ']:');
            if (this.isCancelPromptValue(input)) { return; }
            if (input) { baseUrl = input; }
        }
        const keyLabel = currProv === prov && this.options.model?.apiKey ? '******' : '(required)';
        const key = await this.uiDelegate.prompt('API key for ' + prov + ' [' + keyLabel + ']:', true);
        if (!key || this.isCancelPromptValue(key)) { return; }
        await this.uiDelegate.applyModelProfile({ provider: prov, flashModel: flash, strongModel: strong, baseUrl, apiKey: key });
    }

    protected async showToolsList(): Promise<void> {
        if (!this.uiDelegate) { return; }
        const tools = this.state.tools;
        if (!tools.length) { this.uiDelegate.notify('No tools available.'); return; }
        await this.uiDelegate.select('Tools', tools.map((t: any) => ({
            label: t.name + (t.active ? '' : ' [inactive]'), value: t.name,
            detail: 'Tool: ' + t.name + '\nStatus: ' + (t.active ? 'active' : 'inactive') + '\nToolset: ' + (t.toolset || '-')
        })), 0, 'up/down move   enter close   q close');
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
        const draft = this.draftLines.join('\n');
        const prompt = this.enrichPromptWithMentions(draft);
        this.draftLines = [];
        this.multilineMode = false;
        this.state.setInput('');
        this.state.setStatus('running');
        this.state.setLastError('');
        this.state.pushActivity('turn', 'User: ' + this.state.summarize(draft));
        try {
            if (typeof (this.runtime as any).runStreamingTurn === 'function') {
                const userMsg: any = { id: 'user-' + Date.now(), role: 'user' as any, content: prompt, createdAt: Date.now() };
                const asstMsg: any = { id: 'asst-' + Date.now(), role: 'assistant' as any, content: '', createdAt: Date.now() };
                this.state.setMessages([...this.state.messages, userMsg, asstMsg]);
                const stream = (this.runtime as any).runStreamingTurn(this.state.sessionId, prompt);
                for await (const chunk of stream) {
                    if (chunk.type === 'text' && chunk.content) {
                        asstMsg.content += chunk.content;
                        this.state.setMessages([...this.state.messages.slice(0, -1), { ...asstMsg }]);
                    } else if (chunk.type === 'reasoning' && chunk.content) { this.state.setStatus('reasoning'); }
                    else if (chunk.type === 'done' && chunk.usage) { this.state.setTokenUsage(chunk.usage); }
                }
            } else { await this.runtime.runTurn(this.state.sessionId, prompt); }
            this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
        } catch (error: any) {
            this.state.setStatus('error');
            this.state.setLastError(error.message || 'Unknown');
            this.state.pushActivity('error', error.message || 'Unknown');
        }
        if (this.state.status === 'running' || this.state.status === 'reasoning') { this.state.setStatus('idle'); }
    }
    async submit(): Promise<void> {
        const value = this.state.input.trim();
        if (!value) { return; }
        if (value.startsWith('/')) {
            this.state.setInput('');
            if (await this.handleCommand(value)) {
                return;
            }
            this.state.setInput(value, value.length);
        }
        if (this.multilineMode) {
            this.draftLines.push(value);
            return;
        }
        const prompt = this.enrichPromptWithMentions(value);
        this.state.setInput('');
        this.state.setStatus('running');
        this.state.setLastError('');
        this.state.pushActivity('turn', `User: ${this.state.summarize(value)}`);

        try {
            if (typeof (this.runtime as any).runStreamingTurn === 'function') {
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
                    createdAt: Date.now()
                };
                this.state.setMessages([...this.state.messages, userMessage, assistantMessage]);

                try {
                    const stream = (this.runtime as any).runStreamingTurn(this.state.sessionId, prompt);
                    for await (const chunk of stream) {
                        if (chunk.type === 'text' && chunk.content) {
                            assistantMessage.content += chunk.content;
                            this.state.setMessages([
                                ...this.state.messages.slice(0, -1),
                                { ...assistantMessage }
                            ]);
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
                    this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
                }
            } else {
                await this.runtime.runTurn(this.state.sessionId, prompt);
                this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
            }
        } catch (error: any) {
            const message = error?.message || String(error || 'Unknown error');
            this.state.setStatus('error');
            this.state.setLastError(message);
            this.state.pushActivity('error', message);
            const currentMessages = this.state.messages.slice();
            const lastMessage = currentMessages[currentMessages.length - 1];
            if (lastMessage?.role === 'assistant' && !String(lastMessage.content || '').trim()) {
                currentMessages.pop();
            }
            currentMessages.push({
                id: `assistant-error-${Date.now()}`,
                role: 'assistant',
                content: `Error: ${message}`,
                createdAt: Date.now()
            } as AgentMessage);
            this.state.setMessages(currentMessages);
        }

        await this.refreshTools();
        if (this.state.status === 'running' || this.state.status === 'reasoning') {
            this.state.setStatus('idle');
        }
        this.state.setTasksCount(this.scheduler.getTasks().length);
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
        this.bridge.dispose();
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

    protected queuePanelRefresh(): void {
        if (this.refreshQueued) {
            return;
        }
        this.refreshQueued = true;
        Promise.resolve().then(() => {
            this.refreshQueued = false;
            if (this.componentRef?.hostView) {
                void this.componentRef.render();
            }
        });
    }
}
