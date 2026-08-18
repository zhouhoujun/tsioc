import { ApplicationContext, formatCompactNumber } from '@tsdi/core';
import { Component, ComponentRef, OnDestroy, RNode } from '@tsdi/components';
import { AudioCaptureAdapter, AudioPlaybackAdapter, AudioPlaybackFormat, FileAdapter } from '@tsdi/common';
import {
    clampConsoleTextCursor,
    ConsoleTextChunk,
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceAccessor,
    ConsoleTerminalSurfaceLifecycle,
    decodeConsoleTextChunk,
    SelectMenuMouseEvent,
    shouldSkipConsoleHistoryEntry,
    TerminalInputSequenceResult
} from '@tsdi/components/console';
import { Buffer } from 'buffer';
import { Inject, Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import type { SshClient, SshConnectionManager, SshHostConfig, SshShellSession } from '@tsdi/agent-ssh';
import type { BackgroundTaskManager, BackgroundTaskRecord } from '@tsdi/agent-tools';
import { AGENT_CONSOLE_APP_RPC, AGENT_OPTIONS, AGENT_PERSONALITY_PRESETS, AgentConsoleAppRpc, AgentMessage, AgentOptions, AgentRuntime, AgentScheduler, AgentSessionSection, AgentSessionSectionInfo, AgentTurnMessageInput, ProjectMemoryService, describeSandboxCapabilities, detectSandboxExecTool, normalizeAgentWorkspaceIdentity, SessionSearchMatch, ToolApprovalManager, ToolRegistry, defaultAgentOptions, initAgentsDoc } from '@tsdi/agent';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentIdeBridge, AGENT_IDE_BRIDGE } from './AgentIdeBridge';
import { AgentEditorBridge, AGENT_EDITOR_BRIDGE } from './AgentEditorBridge';
import { AgentConsoleInputHistoryStore } from './AgentConsoleInputHistoryStore';
import { AgentConsoleModelStore } from './AgentConsoleModelStore';
import { AgentConsoleApprovalRequest, AgentConsoleHealthItem, AgentConsolePendingAttachment, AgentConsolePlanTodoItem, AgentConsoleSelectOption, AgentConsoleSessionItem, AgentConsoleSessionMeta, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { agentConsoleThemeNames, agentConsoleThemes, AgentConsoleThemeName, AgentConsoleThemeStore, isAgentConsoleThemeName, mergeAgentConsoleTheme } from './AgentConsoleTheme';
import { AgentConsoleStatuslineField, AgentConsoleStatuslineStore, defaultAgentConsoleStatusline, isAgentConsoleStatuslineField, normalizeAgentConsoleStatusline } from './AgentConsoleStatusline';
import { AgentConsoleTitleField, AgentConsoleTitleStore, defaultAgentConsoleTitle, isAgentConsoleTitleField, normalizeAgentConsoleTitle } from './AgentConsoleTitle';
import { AgentConsoleRawModeStore } from './AgentConsoleRawMode';
import { AgentConsoleSettingsData, AgentConsoleSettingsStore } from './AgentConsoleSettingsStore';
import { AgentConsoleAppAuthorizer, AgentConsoleAppStatus, extractAgentConsoleAppMentions, resolveAgentConsoleApps } from './AgentConsoleApps';
import { AgentConsoleStashStore } from './AgentConsoleStash';
import { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import { AgentConsoleMentionCatalogItem, AgentConsoleWorkspaceMentionsProvider } from './AgentConsoleWorkspaceMentions';
import { AGENT_CONSOLE_DEFAULT_KEYMAP, AGENT_CONSOLE_GLOBAL_ACTIONS, AGENT_CONSOLE_KEYMAP_CONTEXTS, AgentConsoleGlobalAction, AgentConsoleKeymap, AgentConsoleKeymapContext, AgentConsoleKeymapStore, fuzzyMatchAgentConsoleCommand, isAgentConsoleGlobalAction, isAgentConsoleKeymapContext, isAgentConsoleMessageNavigationAction, isAgentConsoleThreadNavigationAction } from './AgentConsoleKeymap';
import { AgentConsoleSessionProjectGroup, AgentConsoleSessionService, AgentSessionExportFormat, AgentSessionExportResult } from './AgentConsoleSessionService';
import { VIM_ACTION_NAMES, isConsoleVimAction } from './AgentConsoleVim';

const SSH_SHELL_DETACH_SEQUENCE = '\x1d';
interface AgentConsoleQueuedPrompt {
    input: string;
    attachments: AgentConsolePendingAttachment[];
    command?: boolean;
}
@Component({
    selector: 'agent-console',
    template: `
    <div class="agent-console">
        <agent-console-brand-panel></agent-console-brand-panel>
        <agent-console-status-panel v-show="showStatusPanel"></agent-console-status-panel>
        <agent-console-sessions-panel v-show="showSessionsPanel"></agent-console-sessions-panel>
        <agent-console-approvals-panel v-show="showApprovalsPanel"></agent-console-approvals-panel>
        <agent-console-messages-panel></agent-console-messages-panel>
        <agent-console-tasks-panel v-show="showTasksPanel"></agent-console-tasks-panel>
        <agent-console-jobs-panel v-show="showJobsPanel"></agent-console-jobs-panel>
        <agent-console-review-panel v-show="showReviewPanel"></agent-console-review-panel>
        <agent-console-git-snapshot-panel v-show="showGitSnapshotPanel"></agent-console-git-snapshot-panel>
        <agent-console-activity-panel v-show="showActivityPanel"></agent-console-activity-panel>
        <agent-console-tools-panel v-show="showToolsPanel"></agent-console-tools-panel>
        <agent-console-working-panel v-show="showWorkingPanel"></agent-console-working-panel>
        <agent-console-tool-runs-panel v-show="showToolRunsPanel"></agent-console-tool-runs-panel>
        <agent-console-input-panel></agent-console-input-panel>
        <agent-console-select-panel v-show="showSelectPanel"></agent-console-select-panel>
        <agent-console-which-key-panel v-show="showWhichKeyPanel"></agent-console-which-key-panel>
        <agent-console-health-popover v-show="showHealthPopover"></agent-console-health-popover>
    </div>
    `
})
export class AgentConsoleComponent implements OnDestroy, ConsoleTerminalInputHandler, ConsoleTerminalSurfaceLifecycle {
    protected static readonly STREAM_MESSAGE_FLUSH_MS = 160;
    protected static readonly STREAM_PENDING_NOTICE_MS = 8000;
    protected static readonly IMAGE_MIME_TYPES: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml'
    };
    protected static readonly DOCUMENT_MIME_TYPES: Record<string, string> = {
        '.pdf': 'application/pdf'
    };
    protected static readonly REVIEW_ANNOTATIONS_VOLATILE_CACHE = new WeakMap<object, Map<string, Record<string, any>>>();
    protected static readonly SEARCH_SESSION_LIMIT = 100;
    protected static readonly SEARCH_CONCURRENCY = 6;
    protected static readonly EDIT_ESCAPE_WINDOW_MS = 400;
    protected multilineMode = false;
    protected draftLines: string[] = [];
    protected shellMultilineMode = false;
    protected shellDraftLines: string[] = [];
    protected destroyed = false;
    protected closing = false;
    protected sshShell: SshShellSession | null = null;
    protected voiceCaptureSessionId = '';
    protected voiceCaptureFeed: Promise<void> = Promise.resolve();
    protected openSessionRequestId = 0;
    protected openReviewRequestId = 0;
    protected activateModelRequestId = 0;
    protected taskViewContextVersion = 0;
    protected streamMessageTimer?: ReturnType<typeof setTimeout>;
    protected streamMessageText = '';
    protected streamPendingTimer?: ReturnType<typeof setTimeout>;
    protected inputHistoryRestoreTimers: Array<ReturnType<typeof setTimeout>> = [];
    protected mentionCatalog: AgentConsoleMentionCatalogItem[] = [];
    protected globalKeyPending = '';
    protected keymapRecording?: { context: AgentConsoleKeymapContext; action: AgentConsoleGlobalAction };
    protected commandPaletteQuery = '';
    protected queuedPrompts = new Map<string, AgentConsoleQueuedPrompt[]>();
    protected drainingQueuedSessions = new Set<string>();
    protected activeTurnRun?: Promise<void> | null = null;
    protected activeThemeName: AgentConsoleThemeName = 'dark';
    protected lastTerminalTitle = '';
    protected editTargetMessageId = '';
    protected editDraftBefore = '';
    protected editAttachmentsBefore: AgentConsolePendingAttachment[] = [];
    protected lastEditSessionMessageId = '';
    protected editDismissedAt = 0;
    protected lastEscapeAt = 0;
    protected modelFavorites: string[] = [];
    protected modelRecents: string[] = [];
    protected modelReasoningEffort: 'low' | 'medium' | 'high' = 'medium';

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
        @Optional() @Inject(ApplicationContext) private app?: ApplicationContext | null,
        @Optional() private sshManager?: SshConnectionManager | null,
        @Optional() private audioCapture?: AudioCaptureAdapter | null,
        @Optional() private audioPlayback?: AudioPlaybackAdapter | null,
        @Optional() private translator?: TranslatorService,
        @Optional() private globalKeymap?: AgentConsoleKeymap | null,
        @Optional() private keymapStore?: AgentConsoleKeymapStore | null,
        @Optional() private themeStore?: AgentConsoleThemeStore | null,
        @Optional() private statuslineStore?: AgentConsoleStatuslineStore | null,
        @Optional() private titleStore?: AgentConsoleTitleStore | null,
        @Optional() private backgroundTasks?: BackgroundTaskManager | null,
        @Optional() @Inject(AGENT_IDE_BRIDGE) private ideBridge?: AgentIdeBridge | null,
        @Optional() @Inject(AGENT_EDITOR_BRIDGE) private editorBridge?: AgentEditorBridge | null,
        @Optional() private rawModeStore?: AgentConsoleRawModeStore | null,
        @Optional() private stashStore?: AgentConsoleStashStore | null,
        @Optional() private modelStore?: AgentConsoleModelStore | null,
        @Optional() private settingsStore?: AgentConsoleSettingsStore | null,
        @Optional() private projectMemory?: ProjectMemoryService | null
    ) {
        this.globalKeymap = this.globalKeymap || new AgentConsoleKeymap();
        this.globalKeymap.configure(this.options.ui?.keymap);
        this.state.setTitle(this.options.ui?.title ?? defaultAgentOptions.ui!.title!);
        this.state.setProvider(this.options.model?.provider ?? '');
        this.state.setModel(this.options.model?.model ?? '');
        this.state.setModelProfile(this.resolveInitialModelProfile());
        this.state.setTheme(mergeAgentConsoleTheme(this.options.ui?.theme));
        this.state.setConsoleOptions(this.options.ui?.console);
        this.state.setStatusline(this.resolveInitialStatusline());
        this.state.setTitleFields(this.resolveInitialTitleFields());
        this.state.setRawMode(this.options.ui?.rawMode === true);
        this.state.setPlanNudgesEnabled(this.options.ui?.planNudges !== false);
        this.state.setWorkspaceMentionResolver(this.workspaceMentionsProvider || undefined);
    }

    protected resolveInitialStatusline(): AgentConsoleStatuslineField[] {
        if (Array.isArray(this.options.ui?.statusline)) {
            return normalizeAgentConsoleStatusline(this.options.ui.statusline);
        }
        return [...defaultAgentConsoleStatusline];
    }

    protected resolveInitialTitleFields(): AgentConsoleTitleField[] {
        return [...defaultAgentConsoleTitle];
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

    protected isQueueModeEnabled(): boolean {
        const mode = this.options.ui?.queueMode;
        return mode !== false && mode !== 'off';
    }

    protected isSteerModeEnabled(): boolean {
        const mode = this.options.ui?.steerMode;
        return mode !== false && mode !== 'off';
    }

    protected enqueuePrompt(input: string): void {
        const sessionId = this.state.sessionId;
        const queue = this.queuedPrompts.get(sessionId) || [];
        const command = input.trim().startsWith('/');
        queue.push({ input, attachments: command ? [] : this.state.pendingAttachments.slice(), command });
        this.queuedPrompts.set(sessionId, queue);
        this.state.setInput('');
        this.state.clearPendingAttachments();
        this.state.setQueuedPromptCount(queue.length);
        this.notify(command ? `Queued command (${queue.length}).` : `Queued prompt (${queue.length}).`);
    }

    protected queueDraft(): boolean {
        if (!this.isTurnInProgress() || !this.state.input.trim()) {
            return false;
        }
        this.enqueuePrompt(this.state.input);
        return true;
    }

    protected async drainQueuedPrompts(sessionId: string): Promise<void> {
        if (this.destroyed || this.drainingQueuedSessions.has(sessionId) || this.state.sessionId !== sessionId) return;
        this.drainingQueuedSessions.add(sessionId);
        try {
            const queue = this.queuedPrompts.get(sessionId) || [];
            while (queue.length && this.state.sessionId === sessionId && !this.isTurnInProgress()) {
                const next = queue.shift()!;
                this.state.setQueuedPromptCount(queue.length);
                this.state.setInput(next.input, next.input.length);
                this.state.setPendingAttachments(next.attachments);
                await this.submit();
            }
            if (!queue.length) this.queuedPrompts.delete(sessionId);
        } finally {
            this.drainingQueuedSessions.delete(sessionId);
        }
    }

    protected async interruptTurn(): Promise<void> {
        if (!this.isTurnInProgress()) return;
        const cancelled = await this.sessionService?.cancelTurn(this.state.sessionId) ?? false;
        this.notify(cancelled ? 'Cancelling current turn...' : 'No running turn to cancel.');
    }

    protected notify(message: string, duration?: number): void {
        void duration;
        this.state.setNotice(message);
    }

    protected notifyBusyState(message = 'Wait for the current turn to finish.'): void {
        this.notify(message);
    }

    protected formatSummaryQualityAggregate(aggregate: Record<string, any>): string {
        const provider = String(aggregate.provider ?? 'unknown');
        const count = Number(aggregate.recordCount ?? 0);
        const avgTotal = Number(aggregate.avgTotal ?? 0).toFixed(1);
        const fallbackRate = Number(aggregate.fallbackRate ?? 0).toFixed(1);
        const evidenceCoverage = Number(aggregate.avgEvidenceCoverage ?? 0).toFixed(1);
        const from = Number(aggregate.timeRange?.from ?? 0);
        const to = Number(aggregate.timeRange?.to ?? 0);
        const range = from || to
            ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
            : '';
        return `${provider} · ${count} summary ${count === 1 ? '' : 'records'} · avg ${avgTotal} · fallback ${fallbackRate}% · evidence ${evidenceCoverage}%${range}`;
    }

    protected formatUsageWindow(label: string, usage: Record<string, any>): string {
        return `${label} ${Number(usage?.turns ?? 0)} turns · ${formatCompactNumber(Number(usage?.promptTokens ?? 0))} in · ${formatCompactNumber(Number(usage?.completionTokens ?? 0))} out · ${formatCompactNumber(Number(usage?.totalTokens ?? 0))} total`;
    }

    protected formatUsageSummary(usage: Record<string, any>): string {
        if (usage?.selectedRange && usage?.selected) {
            const labels: Record<string, string> = { daily: 'day', weekly: 'week', cumulative: 'all' };
            return this.formatUsageWindow(labels[usage.selectedRange] ?? usage.selectedRange, usage.selected);
        }
        return [
            this.formatUsageWindow('day', usage?.daily ?? {}),
            this.formatUsageWindow('week', usage?.weekly ?? {}),
            this.formatUsageWindow('all', usage?.cumulative ?? {})
        ].join(' | ');
    }

    protected formatCompactionHistoryAggregate(aggregate: Record<string, any>): string {
        const sessionId = String(aggregate.sessionId ?? 'unknown');
        const count = Number(aggregate.recordCount ?? 0);
        const compacted = Number(aggregate.compactedCount ?? 0);
        const tokensSaved = Number(aggregate.totalTokensSaved ?? 0);
        const avgRatio = Number(aggregate.avgCompressionRatio ?? 0).toFixed(1);
        const from = Number(aggregate.timeRange?.from ?? 0);
        const to = Number(aggregate.timeRange?.to ?? 0);
        const range = from || to
            ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
            : '';
        const id = sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
        return `${id} · ${count} ${count === 1 ? 'compaction' : 'compactions'} · ${compacted} triggered · saved ${formatCompactNumber(tokensSaved)} tokens · avg ${avgRatio}%${range}`;
    }

    protected async openSummaryQualityRecords(provider?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Summary quality is unavailable without app RPC.');
            return true;
        }
        const records = await this.sessionService.listSummaryQuality({ provider, limit: 200 });
        if (!records.length) {
            this.notify(
                provider
                    ? `No summary quality records for provider '${provider}'.`
                    : 'No summary quality records yet.'
            );
            return true;
        }
        const options = records.map(record => this.buildSummaryQualityRecordOption(record));
        await this.select(
            provider
                ? `Summary quality records (${provider})`
                : 'Summary quality records',
            options,
            0,
            `${records.length} record${records.length === 1 ? '' : 's'}`
        );
        return true;
    }

    protected buildSummaryQualityRecordOption(record: Record<string, any>): AgentConsoleSelectOption {
        const id = String(record.id ?? '');
        const model = record.model ? String(record.model) : 'unknown';
        const total = Number(record.total ?? 0);
        const createdAt = Number(record.createdAt ?? 0);
        return {
            label: `${record.provider ?? 'unknown'} · ${model} · ${total}`,
            value: id || `${record.provider ?? 'unknown'}:${total}`,
            description: [
                createdAt ? new Date(createdAt).toLocaleDateString() : '',
                `fields ${Number(record.fieldCompleteness ?? 0)}`,
                `annotation ${Number(record.annotationQuality ?? 0)}`,
                `length ${Number(record.lengthBalance ?? 0)}`,
                `truncation ${Number(record.truncationScore ?? 0)}`,
                record.evidenceCoverage != null ? `evidence ${Number(record.evidenceCoverage).toFixed(1)}%` : '',
                record.fallbackUsed ? 'fallback' : ''
            ].filter(Boolean).join(' · ') || 'summary quality record',
            detail: [
                `Record: ${id || '-'}`,
                `Provider: ${record.provider ?? 'unknown'}`,
                `Model: ${model}`,
                `Total: ${total}`,
                `Fields: ${Number(record.fieldCompleteness ?? 0)}`,
                `Annotation: ${Number(record.annotationQuality ?? 0)}`,
                `Length: ${Number(record.lengthBalance ?? 0)}`,
                `Truncation: ${Number(record.truncationScore ?? 0)}`,
                record.evidenceCoverage != null ? `Evidence coverage: ${Number(record.evidenceCoverage).toFixed(1)}%` : '',
                `Fallback: ${record.fallbackUsed ? 'yes' : 'no'}`,
                `Summary length: ${Number(record.summaryLength ?? 0)}`,
                createdAt ? `Created: ${new Date(createdAt).toLocaleString()}` : ''
            ].filter(Boolean).join('\n')
        };
    }

    protected async openSummaryQualityTrend(
        provider?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Summary quality is unavailable without app RPC.');
            return true;
        }
        const trend = await this.sessionService.getSummaryQualityTrend({ provider, bucketSize, maxBuckets });
        if (!trend.length) {
            this.notify(
                provider
                    ? `No summary quality trend recorded for provider '${provider}'.`
                    : 'No summary quality trend recorded yet.'
            );
            return true;
        }
        this.notify(this.formatSummaryQualityTrend(trend).join(' | '));
        return true;
    }

    protected async runExportCommand(args: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Session export is unavailable without session service.');
            return true;
        }
        const parsed = this.parseExportArgs(args);
        const sessionId = parsed.sessionId || this.state.sessionId;
        if (!sessionId) {
            this.notify('No session selected. Run /export [json|jsonl] [sessionId] [path].');
            return true;
        }
        const result = await this.sessionService.exportSession(sessionId, { format: parsed.format });
        const targetPath = await this.tryWriteSessionExport(result, parsed.path);
        if (targetPath) {
            this.notify(`Exported session '${sessionId}' to ${targetPath}.`);
            return true;
        }
        this.previewSessionExport(result);
        this.notify(`Export preview ready for session '${sessionId}' (${result.format.toUpperCase()}).`);
        return true;
    }

    protected parseExportArgs(args: string): { format: AgentSessionExportFormat; sessionId?: string; path?: string } {
        const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        let format: AgentSessionExportFormat = 'json';
        if (tokens[0] && /^(json|jsonl)$/i.test(tokens[0])) {
            format = tokens.shift()!.toLowerCase() as AgentSessionExportFormat;
        }
        if (!tokens.length) {
            return { format };
        }
        if (tokens.length === 1) {
            const token = tokens[0];
            return this.looksLikeExportPath(token)
                ? { format, path: token }
                : { format, sessionId: token };
        }
        return {
            format,
            sessionId: tokens.shift(),
            path: tokens.join(' ')
        };
    }

    protected looksLikeExportPath(value: string): boolean {
        const token = String(value || '').trim();
        return !!token && (
            /[\\/]/.test(token)
            || token.startsWith('.')
            || token.endsWith('.json')
            || token.endsWith('.jsonl')
        );
    }

    protected async tryWriteSessionExport(
        result: AgentSessionExportResult,
        requestedPath?: string
    ): Promise<string | undefined> {
        const fileAdapter = this.resolveFileAdapter();
        if (!fileAdapter) {
            return undefined;
        }
        const targetPath = this.resolveExportTargetPath(fileAdapter, result, requestedPath);
        try {
            const dirname = this.resolvePathDirectory(targetPath, fileAdapter);
            if (dirname) {
                await fileAdapter.mkdir(dirname, { recursive: true });
            }
            await fileAdapter.writeText(targetPath, result.content, 'utf-8');
            return targetPath;
        } catch {
            return undefined;
        }
    }

    protected previewSessionExport(result: AgentSessionExportResult): void {
        const messageCount = Number(result.session?.messageCount ?? result.messages.length);
        const toolCallCount = Number(result.session?.toolCallCount ?? result.toolCalls.length);
        this.state.openSelectMenu(
            `Session export (${result.format})`,
            [{
                label: result.fileName,
                value: result.fileName,
                description: `${messageCount} message${messageCount === 1 ? '' : 's'} · ${toolCallCount} tool call${toolCallCount === 1 ? '' : 's'}`,
                detail: result.content
            }],
            0,
            'Read-only export preview. Press Esc to close.'
        );
    }

    protected resolveFileAdapter(): FileAdapter | null {
        return this.app?.get(FileAdapter, null) as FileAdapter | null;
    }

    protected resolveExportTargetPath(
        fileAdapter: FileAdapter,
        result: AgentSessionExportResult,
        requestedPath?: string
    ): string {
        const trimmed = String(requestedPath || '').trim();
        if (trimmed) {
            if (fileAdapter.isAbsolute(trimmed)) {
                return fileAdapter.normalize(trimmed);
            }
            const workspace = String(this.workspace || '').trim();
            return workspace
                ? fileAdapter.resolve(workspace, trimmed)
                : fileAdapter.normalize(trimmed);
        }
        const workspace = String(this.workspace || '').trim();
        return workspace
            ? fileAdapter.join(workspace, '.tsdi-agent', 'exports', result.fileName)
            : fileAdapter.join('.tsdi-agent', 'exports', result.fileName);
    }

    protected resolvePathDirectory(targetPath: string, fileAdapter: FileAdapter): string {
        const normalized = fileAdapter.normalize(targetPath).replace(/[\\/]+$/, '');
        const slashIndex = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
        if (slashIndex < 0) {
            return '.';
        }
        if (/^[a-zA-Z]:[\\/]/.test(normalized) && slashIndex === 2) {
            return normalized.slice(0, 3);
        }
        if (slashIndex === 0) {
            return normalized.slice(0, 1);
        }
        return normalized.slice(0, slashIndex);
    }

    protected resolveAttachmentTargetPath(targetPath: string, fileAdapter: FileAdapter): string {
        const trimmed = String(targetPath || '').trim();
        if (!trimmed) {
            throw new Error('Usage: /attach <path>');
        }
        if (fileAdapter.isAbsolute(trimmed)) {
            return fileAdapter.normalize(trimmed);
        }
        const workspace = String(this.workspace || '').trim();
        return workspace
            ? fileAdapter.resolve(workspace, trimmed)
            : fileAdapter.normalize(trimmed);
    }

    protected describePendingAttachments(attachments: AgentConsolePendingAttachment[] = this.state.pendingAttachments): string {
        if (!attachments.length) {
            return 'No pending attachments.';
        }
        return `Pending attachments: ${attachments.map(item => item.name).join(', ')}`;
    }

    protected buildTurnMessageInput(prompt: string, attachments: AgentConsolePendingAttachment[]): AgentTurnMessageInput | undefined {
        if (!attachments.length) {
            return undefined;
        }
        return {
            content: prompt,
            parts: [
                ...(prompt ? [{ type: 'text', text: prompt } as const] : []),
                ...attachments.map(attachment => attachment.kind === 'file'
                    ? ({
                        type: 'file' as const,
                        dataUrl: attachment.dataUrl || '',
                        mediaType: attachment.mediaType || 'application/octet-stream',
                        name: attachment.name
                    })
                    : ({
                        type: 'image' as const,
                        imageUrl: attachment.imageUrl || '',
                        mediaType: attachment.mediaType,
                        name: attachment.name
                    })
                )
            ]
        };
    }

    protected async runAttachCommand(args: string): Promise<boolean> {
        const trimmed = String(args || '').trim();
        if (!trimmed) {
            this.notify(this.describePendingAttachments());
            return true;
        }
        if (/^(clear|reset)$/i.test(trimmed)) {
            this.state.clearPendingAttachments();
            this.notify('Cleared pending attachments.');
            return true;
        }
        const fileAdapter = this.resolveFileAdapter();
        if (!fileAdapter) {
            this.notify('Attach is unavailable without a file adapter.');
            return true;
        }
        try {
            const attachment = await this.loadPendingAttachment(trimmed, fileAdapter);
            this.state.setPendingAttachments([
                ...this.state.pendingAttachments.filter(item => item.path !== attachment.path),
                attachment
            ]);
            this.notify(`Attached ${attachment.name}. ${this.describePendingAttachments()}`);
        } catch (error: any) {
            this.notify(error?.message || String(error || 'Failed to attach file.'));
        }
        return true;
    }

    protected async loadPendingAttachment(targetPath: string, fileAdapter: FileAdapter): Promise<AgentConsolePendingAttachment> {
        const absolutePath = this.resolveAttachmentTargetPath(targetPath, fileAdapter);
        const imageMediaType = this.resolveImageMediaType(absolutePath);
        if (imageMediaType) {
            const bytes = await this.readFileBytes(absolutePath, fileAdapter);
            return {
                id: `attachment-${Date.now()}-${Math.random()}`,
                kind: 'image',
                path: absolutePath,
                name: absolutePath.split(/[\\/]/).pop() || absolutePath,
                mediaType: imageMediaType,
                imageUrl: `data:${imageMediaType};base64,${this.encodeBase64(bytes)}`
            };
        }
        const docMediaType = this.resolveDocumentMediaType(absolutePath);
        if (docMediaType) {
            const bytes = await this.readFileBytes(absolutePath, fileAdapter);
            return {
                id: `attachment-${Date.now()}-${Math.random()}`,
                kind: 'file',
                path: absolutePath,
                name: absolutePath.split(/[\\/]/).pop() || absolutePath,
                mediaType: docMediaType,
                dataUrl: `data:${docMediaType};base64,${this.encodeBase64(bytes)}`
            };
        }
        throw new Error(`Unsupported attachment format for '${targetPath}'.`);
    }

    /** @deprecated Use {@link loadPendingAttachment} instead. */
    protected async loadPendingImageAttachment(targetPath: string, fileAdapter: FileAdapter): Promise<AgentConsolePendingAttachment> {
        return this.loadPendingAttachment(targetPath, fileAdapter);
    }

    protected resolveImageMediaType(filePath: string): string | undefined {
        const normalized = String(filePath || '').trim().toLowerCase();
        for (const ext of Object.keys(AgentConsoleComponent.IMAGE_MIME_TYPES)) {
            if (normalized.endsWith(ext)) {
                return AgentConsoleComponent.IMAGE_MIME_TYPES[ext];
            }
        }
        return undefined;
    }

    protected resolveDocumentMediaType(filePath: string): string | undefined {
        const normalized = String(filePath || '').trim().toLowerCase();
        for (const ext of Object.keys(AgentConsoleComponent.DOCUMENT_MIME_TYPES)) {
            if (normalized.endsWith(ext)) {
                return AgentConsoleComponent.DOCUMENT_MIME_TYPES[ext];
            }
        }
        return undefined;
    }

    protected resolveAnyMediaType(filePath: string): string | undefined {
        return this.resolveImageMediaType(filePath) || this.resolveDocumentMediaType(filePath);
    }

    protected async readFileBytes(targetPath: string, fileAdapter: FileAdapter): Promise<Uint8Array> {
        const readable = fileAdapter.read(targetPath) as any;
        if (readable && typeof readable[Symbol.asyncIterator] === 'function') {
            const chunks: Uint8Array[] = [];
            let total = 0;
            for await (const chunk of readable) {
                const bytes = await this.normalizeBinaryChunk(chunk);
                if (!bytes.length) {
                    continue;
                }
                chunks.push(bytes);
                total += bytes.length;
            }
            return this.concatUint8Arrays(chunks, total);
        }
        return await new Promise<Uint8Array>((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            let total = 0;
            let finished = false;
            const pending: Array<Promise<void>> = [];
            const finish = () => {
                if (finished) {
                    return;
                }
                finished = true;
                void Promise.all(pending)
                    .then(() => resolve(this.concatUint8Arrays(chunks, total)))
                    .catch(reject);
            };
            const fail = (error: Error) => {
                if (finished) {
                    return;
                }
                finished = true;
                reject(error);
            };
            readable?.on?.('data', (chunk: any) => {
                pending.push(this.normalizeBinaryChunk(chunk)
                    .then(bytes => {
                        if (!bytes.length) {
                            return;
                        }
                        chunks.push(bytes);
                        total += bytes.length;
                    })
                    .catch(fail));
            });
            readable?.once?.('end', finish);
            readable?.once?.('close', finish);
            readable?.once?.('error', fail);
        });
    }

    protected async normalizeBinaryChunk(chunk: any): Promise<Uint8Array> {
        if (!chunk) {
            return new Uint8Array(0);
        }
        if (chunk instanceof Uint8Array) {
            return chunk;
        }
        if (typeof ArrayBuffer !== 'undefined' && chunk instanceof ArrayBuffer) {
            return new Uint8Array(chunk);
        }
        if (typeof chunk?.arrayBuffer === 'function') {
            return new Uint8Array(await chunk.arrayBuffer());
        }
        if (typeof chunk === 'string') {
            return new TextEncoder().encode(chunk);
        }
        if (Array.isArray(chunk)) {
            return Uint8Array.from(chunk);
        }
        return new Uint8Array(0);
    }

    protected concatUint8Arrays(chunks: Uint8Array[], total: number): Uint8Array {
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
        return bytes;
    }

    protected encodeBase64(bytes: Uint8Array): string {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes).toString('base64');
        }
        if (typeof globalThis.btoa === 'function') {
            let binary = '';
            const chunkSize = 0x8000;
            for (let index = 0; index < bytes.length; index += chunkSize) {
                const slice = bytes.subarray(index, index + chunkSize);
                binary += String.fromCharCode(...Array.from(slice));
            }
            return globalThis.btoa(binary);
        }
        throw new Error('Base64 encoding is unavailable in this environment.');
    }

    /**
     * Opens `/compactions [sessionId]`: lists compaction history records for the
     * current (or given) session as one digest line per record with strategy,
     * level, message/token counts, and compression ratio.
     */
    protected async openCompactionHistory(args: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Compaction history is unavailable without app RPC.');
            return true;
        }
        const sessionId = args.trim() || this.state.sessionId;
        if (!sessionId) {
            this.notify('No session selected. Run /compactions <sessionId>.');
            return true;
        }
        const records = await this.sessionService.listCompactionHistory(sessionId);
        if (!records.length) {
            this.notify(`No compaction history recorded for session '${sessionId}'.`);
            return true;
        }
        this.notify(
            records
                .map(record => this.formatCompactionHistoryRecord(record))
                .join(' | ')
        );
        return true;
    }

    /**
     * Opens `/compactions trend [sessionId] [bucketSize] [maxBuckets]`:
     * renders one sparkline line per session showing how compaction token
     * savings and compression evolve over time buckets.
     */
    protected async openCompactionHistoryTrend(
        sessionId?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Compaction history is unavailable without app RPC.');
            return true;
        }
        const trend = await this.sessionService.getCompactionHistoryTrend(sessionId, { bucketSize, maxBuckets });
        if (!trend.length) {
            this.notify(
                sessionId
                    ? `No compaction history trend recorded for session '${sessionId}'.`
                    : 'No compaction history trend recorded yet.'
            );
            return true;
        }
        this.notify(this.formatCompactionHistoryTrend(trend).join(' | '));
        return true;
    }

    /**
     * Opens `/diagnostics [sessionId]`: shows aggregated turn diagnostics
     * (empty-response rate, repeated-question rate, compaction totals, token
     * savings) for the given session, or for every session owned by the
     * principal when no session id is provided.
     */
    protected async openTurnDiagnostics(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Turn diagnostics are unavailable without app RPC.');
            return true;
        }
        const aggregate = await this.sessionService.getTurnDiagnosticsStats(sessionId);
        if (!aggregate || !Number(aggregate.totalTurns)) {
            this.notify(
                sessionId
                    ? `No turn diagnostics recorded for session '${sessionId}'.`
                    : 'No turn diagnostics recorded yet.'
            );
            return true;
        }
        this.notify(this.formatTurnDiagnosticsAggregate(aggregate, sessionId));
        return true;
    }

    protected async openUsage(input?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Usage is unavailable without session access.');
            return true;
        }
        const args = String(input || '').trim().split(/\s+/).filter(Boolean);
        const first = args[0];
        const range = first === 'daily' || first === 'weekly' || first === 'cumulative' ? first : undefined;
        const sessionId = range ? args[1] : first;
        const since = range ? args[2] : args[1];
        const usage = await this.sessionService.getUsageStats(sessionId, { ...(range ? { range } : {}), ...(since ? { since } : {}) });
        const totalTurns = Number(usage?.cumulative?.turns ?? 0);
        const totalTokens = Number(usage?.cumulative?.totalTokens ?? 0);
        if (!totalTurns && !totalTokens) {
            this.notify(
                sessionId
                    ? `No usage recorded for session '${sessionId}'.`
                    : 'No usage recorded yet.'
            );
            return true;
        }
        this.notify(this.formatUsageSummary(usage));
        return true;
    }

    /**
     * Opens `/harness audit [sessionId]`: mines the durable execution trace
     * (evidence ledgers + audit sink) for failure patterns and renders the
     * top failing tools, error-signature clusters, falsified distribution, and
     * candidate harness policy suggestions.
     */
    protected async openHarnessAudit(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Harness audit is unavailable without app RPC.');
            return true;
        }
        const report = await this.sessionService.runHarnessAudit(sessionId);
        if (!report || report.empty === true) {
            this.notify(
                sessionId
                    ? `No harness failure data recorded for session '${sessionId}'.`
                    : 'No harness failure data recorded yet.'
            );
            return true;
        }
        const lines: string[] = [];
        const scope = report.scopedSessionIds
            ? report.scopedSessionIds.map((id: string) => (id.length > 16 ? `${id.slice(0, 14)}…` : id)).join(',')
            : 'all sessions';
        lines.push(`harness audit · ${scope} · ${Number(report.totalTurns ?? 0)} turns · ${Number(report.totalToolAttempts ?? 0)} tool attempts · fail-turn ${Number(report.failureTurnRate ?? 0)}%`);
        for (const stat of report.topFailingTools ?? []) {
            lines.push(`tool ${stat.toolName} · ${stat.failures}/${stat.attempts} (${Number(stat.failureRate ?? 0)}%) · falsified ${Number(stat.falsifiedCount ?? 0)}`);
        }
        for (const cluster of report.errorClusters ?? []) {
            lines.push(`cluster ${cluster.signature} · x${cluster.count} · tools ${(cluster.toolNames ?? []).join(',')}${cluster.suggestedPolicy ? ` · ${cluster.suggestedPolicy}` : ''}`);
        }
        for (const falsified of report.falsifiedDistribution ?? []) {
            lines.push(`falsified ${falsified.toolName} · ${falsified.falsifiedCount} (${Number(falsified.falsifiedRate ?? 0)}%)`);
        }
        for (const suggestion of report.suggestions ?? []) {
            lines.push(`suggest[${suggestion.kind}]${suggestion.toolName ? ` ${suggestion.toolName}` : ''} · ${suggestion.message}`);
        }
        this.notify(lines.join('\n'));
        return true;
    }

    /**
     * Opens `/harness profile [list|current|diff <from> <to>]`: renders the
     * builtin versioned governance profiles, the active reference, and readable
     * field diffs between profiles (or `current`).
     */
    protected async openHarnessProfile(sub?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Harness profile is unavailable without app RPC.');
            return true;
        }
        const arg = (sub ?? '').trim();
        if (arg === 'list' || arg === '' || arg === 'default') {
            const result = await this.sessionService.listHarnessProfiles();
            const lines: string[] = [];
            const active = result.current;
            lines.push(`harness profiles${active ? ` · active '${active}'` : ' · default'}`);
            for (const profile of result.profiles ?? []) {
                const granular = (profile.granularCategories ?? []).length
                    ? ` · granular ${(profile.granularCategories ?? []).join(',')}`
                    : '';
                lines.push(`profile ${profile.name} · v${profile.version}${profile.maxRepairRounds !== undefined ? ` · repair ${profile.maxRepairRounds}` : ''}${profile.maxLoopRecoveries !== undefined ? ` · loop-recover ${profile.maxLoopRecoveries}` : ''}${profile.sandbox?.mode ? ` · sandbox ${profile.sandbox.mode}` : ''}${granular}`);
            }
            this.notify(lines.join('\n'));
            return true;
        }
        if (arg === 'current') {
            const profile = await this.sessionService.currentHarnessProfile();
            if (!profile) {
                this.notify('No harness profile resolved.');
                return true;
            }
            const lines: string[] = [];
            lines.push(`harness profile ${profile.name} · v${profile.version}`);
            for (const rule of profile.requireApproval ?? []) {
                const category = typeof rule === 'string' ? rule : `${rule.category}${rule.names?.length ? `:${rule.names.join(',')}` : ''}${rule.mode ? `[${rule.mode}]` : ''}`;
                lines.push(`approval ${category}`);
            }
            if (profile.sandbox) {
                lines.push(`sandbox ${profile.sandbox.mode}${profile.sandbox.networkAllowlist?.length ? ` · allow ${profile.sandbox.networkAllowlist.join(',')}` : ''}`);
            }
            if (profile.maxRepairRounds !== undefined) {
                lines.push(`maxRepairRounds ${profile.maxRepairRounds}`);
            }
            if (profile.maxLoopRecoveries !== undefined) {
                lines.push(`maxLoopRecoveries ${profile.maxLoopRecoveries}`);
            }
            this.notify(lines.join('\n'));
            return true;
        }
        if (arg.startsWith('diff')) {
            const parts = arg.slice(4).trim().split(/\s+/).filter(Boolean);
            const from = parts[0] || 'default';
            const to = parts[1] || 'current';
            const result = await this.sessionService.diffHarnessProfiles(from, to);
            if (!result) {
                this.notify('Harness profile diff is unavailable.');
                return true;
            }
            if (result.error) {
                this.notify(result.error);
                return true;
            }
            const diffLines = (result.diff ?? []).length
                ? (result.diff ?? []).map(line => `  ${line}`)
                : ['  (no differences)'];
            this.notify(`harness profile diff ${result.from} → ${result.to}\n${diffLines.join('\n')}`);
            return true;
        }
        this.notify('Usage: /harness profile [list|current|diff <from> <to>]');
        return true;
    }

    protected async handleVoiceCommand(arg: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Voice control is unavailable without app RPC.');
            return true;
        }
        const sessionId = this.state.sessionId;
        if (!sessionId) {
            this.notify('No session selected. Start a session before using /voice.');
            return true;
        }
        const sub = (arg || '').trim().split(/\s+/)[0];
        switch (sub) {
            case 'start': {
                const result = await this.sessionService.startVoiceSession(
                    sessionId,
                    this.audioCapture ? { format: this.audioCapture.format } : undefined
                );
                if (result?.ok) {
                    const captureError = await this.startVoiceCapture(sessionId);
                    if (captureError) {
                        await this.sessionService.cancelVoiceSession(sessionId).catch(() => undefined);
                        this.notify(`Voice capture could not be started: ${captureError}`);
                        return true;
                    }
                    this.notify(`Voice session started (${sessionId}). Speak into the capture device; run /voice stop to transcribe.`);
                } else {
                    this.notify(result?.error || 'Voice session could not be started.');
                }
                return true;
            }
            case 'stop': {
                await this.stopVoiceCapture(false);
                const result = await this.sessionService.endVoiceSession(sessionId);
                if (result?.ok && result.transcribed) {
                    const playbackError = await this.playVoiceReply(result);
                    this.notify(`Transcribed: ${result.transcribed}\nReply: ${result.reply ?? ''}${playbackError ? `\nAudio playback unavailable: ${playbackError}` : ''}`);
                } else {
                    this.notify(result?.error || (result?.transcribed ? `Transcribed: ${result.transcribed}` : 'Voice session produced no transcription.'));
                }
                return true;
            }
            case 'cancel': {
                await this.stopVoiceCapture(true);
                const result = await this.sessionService.cancelVoiceSession(sessionId);
                if (result?.ok) {
                    this.notify(result.cancelled ? 'Voice session cancelled.' : 'No voice session was active.');
                } else {
                    this.notify(result?.error || 'Voice session could not be cancelled.');
                }
                return true;
            }
            default: {
                const status = await this.sessionService.getVoiceStatus(sessionId);
                const available = status?.available ? 'available' : 'unavailable';
                const missing = Array.isArray(status?.missing) && status.missing.length
                    ? ` (missing ${status.missing.join(', ')})`
                    : '';
                const active = status?.active ? 'active' : 'inactive';
                this.notify(`voice ${available}${missing} · session ${active}${Number(status?.bufferedBytes ?? 0) > 0 ? ` · buffered ${status.bufferedBytes} bytes` : ''}\nUsage: /voice start|stop|cancel|status`);
                return true;
            }
        }
    }

    protected async startVoiceCapture(sessionId: string): Promise<string | undefined> {
        if (!this.audioCapture) {
            return undefined;
        }
        if (!this.audioCapture.isAvailable) {
            return this.audioCapture.missingComponents.join(', ') || 'capture adapter unavailable';
        }
        if (this.voiceCaptureSessionId) {
            return `capture already active for ${this.voiceCaptureSessionId}`;
        }
        this.voiceCaptureSessionId = sessionId;
        this.voiceCaptureFeed = Promise.resolve();
        try {
            await this.audioCapture.start({
                onChunk: chunk => {
                    this.voiceCaptureFeed = this.voiceCaptureFeed.then(async () => {
                        if (this.voiceCaptureSessionId !== sessionId || !this.sessionService) {
                            return;
                        }
                        const result = await this.sessionService.feedVoiceAudio(sessionId, chunk);
                        if (result?.ok === false) {
                            throw new Error(result.error || 'audio upload failed');
                        }
                    }).catch(error => {
                        if (this.voiceCaptureSessionId === sessionId) {
                            this.voiceCaptureSessionId = '';
                            this.notify(`Voice capture error: ${error?.message ?? String(error)}`);
                            void Promise.resolve(this.audioCapture?.cancel()).catch(() => undefined);
                            void this.sessionService?.cancelVoiceSession(sessionId).catch(() => undefined);
                        }
                    });
                },
                // Keep the session id until stopVoiceCapture drains queued chunks.
                onEnd: () => undefined,
                onError: error => {
                    if (this.voiceCaptureSessionId === sessionId) {
                        this.voiceCaptureSessionId = '';
                        this.notify(`Voice capture error: ${error.message}`);
                        void this.sessionService?.cancelVoiceSession(sessionId).catch(() => undefined);
                    }
                }
            }, { format: this.audioCapture.format, sampleRate: 16000, channels: 1 });
            return undefined;
        } catch (error: any) {
            this.voiceCaptureSessionId = '';
            return error?.message ?? String(error);
        }
    }

    protected async stopVoiceCapture(cancel: boolean): Promise<void> {
        if (!this.audioCapture || !this.voiceCaptureSessionId) {
            return;
        }
        if (cancel) {
            this.voiceCaptureSessionId = '';
            await this.audioCapture.cancel();
            return;
        }
        await this.audioCapture.stop();
        await this.voiceCaptureFeed;
        this.voiceCaptureSessionId = '';
    }

    protected async playVoiceReply(result: Record<string, any>): Promise<string | undefined> {
        const audio = result?.audio;
        if (!this.audioPlayback || !Array.isArray(audio?.chunks) || audio.chunks.length === 0) {
            return undefined;
        }
        if (!this.audioPlayback.isAvailable) {
            return this.audioPlayback.missingComponents.join(', ') || 'playback adapter unavailable';
        }
        try {
            const chunks = audio.chunks.map((chunk: string) => this.decodeVoiceAudioChunk(chunk));
            await this.audioPlayback.play(chunks, {
                format: audio.format as AudioPlaybackFormat,
                sampleRate: 16000,
                channels: 1
            });
            return undefined;
        } catch (error: any) {
            return error?.message ?? String(error);
        }
    }

    protected decodeVoiceAudioChunk(value: string): Uint8Array {
        if (typeof Buffer !== 'undefined') {
            return new Uint8Array(Buffer.from(value, 'base64'));
        }
        if (typeof globalThis.atob === 'function') {
            const binary = globalThis.atob(value);
            return Uint8Array.from(binary, char => char.charCodeAt(0));
        }
        throw new Error('Base64 decoding is unavailable in this environment.');
    }

    /**
     * Opens `/diagnostics list [sessionId]`: browses recorded turn diagnostics
     * records for the given session (or all owned sessions when omitted) as a
     * selectable list.
     */
    protected async openTurnDiagnosticsList(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Turn diagnostics are unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId;
        if (!resolvedSessionId) {
            this.notify('No session selected. Run /diagnostics list <sessionId>.');
            return true;
        }
        const records = await this.sessionService.listTurnDiagnostics(resolvedSessionId);
        if (!records.length) {
            this.notify(`No turn diagnostics recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        const options = records.map(record => this.buildTurnDiagnosticsRecordOption(record));
        await this.select(
            `Turn diagnostics records (${resolvedSessionId})`,
            options,
            0,
            `${records.length} record${records.length === 1 ? '' : 's'}`
        );
        return true;
    }

    protected buildTurnDiagnosticsRecordOption(record: Record<string, any>): AgentConsoleSelectOption {
        const id = String(record.id ?? '');
        const sessionId = String(record.sessionId ?? 'unknown');
        const createdAt = Number(record.createdAt ?? 0);
        const compacted = Number(record.compactionCount ?? 0);
        const saved = Number(record.totalTokenSavings ?? 0);
        const description = [
            createdAt ? new Date(createdAt).toLocaleDateString() : '',
            `${compacted} compact${compacted === 1 ? '' : 's'}`,
            saved > 0 ? `saved ${formatCompactNumber(saved)} tokens` : '',
            record.repeatedClarificationDetected ? 'repeated' : '',
            record.finalAssistantWasClarification ? 'clarif' : ''
        ].filter(Boolean).join(' · ') || 'turn diagnostics record';
        return {
            label: `${sessionId} · ${createdAt ? new Date(createdAt).toLocaleString() : 'unknown time'}`,
            value: id || `${sessionId}:${createdAt}`,
            description,
            detail: [
                `Record: ${id || '-'}`,
                `Session: ${sessionId}`,
                `Created: ${createdAt ? new Date(createdAt).toLocaleString() : '-'}`,
                `Empty response retries: ${Number(record.emptyResponseRetryCount ?? 0)}`,
                `Repeated clarification: ${record.repeatedClarificationDetected ? 'yes' : 'no'}`,
                `Final clarification: ${record.finalAssistantWasClarification ? 'yes' : 'no'}`,
                `Context rewritten: ${record.followUpContextRewritten ? 'yes' : 'no'}`,
                `Follow-up recoveries: ${Number(record.followUpRecoveryCount ?? 0)}`,
                `Compactions: ${compacted}`,
                `Token savings: ${formatCompactNumber(saved)}`,
                record.compressionRatio != null ? `Compression ratio: ${record.compressionRatio}%` : '',
                record.compactionLevel ? `Compaction level: ${record.compactionLevel}` : '',
                record.promptCache ? `Prompt cache: ${String(record.promptCache.provider ?? '')} ${String(record.promptCache.appliedStrategy ?? '')}` : ''
            ].filter(Boolean).join('\n')
        };
    }

    /**
     * Opens `/diagnostics trend [sessionId] [bucketSize] [maxBuckets]`:
     * renders one sparkline line per session showing how token savings and
     * compaction activity evolve over time buckets.
     */
    protected async openTurnDiagnosticsTrend(
        sessionId?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Turn diagnostics are unavailable without app RPC.');
            return true;
        }
        const trend = await this.sessionService.getTurnDiagnosticsTrend(sessionId, { bucketSize, maxBuckets });
        if (!trend.length) {
            this.notify(
                sessionId
                    ? `No turn diagnostics trend recorded for session '${sessionId}'.`
                    : 'No turn diagnostics trend recorded yet.'
            );
            return true;
        }
        this.notify(this.formatTurnDiagnosticsTrend(trend).join(' | '));
        return true;
    }

    /**
     * Opens `/delegation tree [sessionId] [status] [depth]`: renders the
     * persisted parent → child session tree rooted at the current (or given)
     * session as an indented tree with edge kind/status/timestamps inline.
     */
    protected async openDelegationTree(sessionId?: string, status?: string, depth?: number): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Delegation graph is unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId;
        if (!resolvedSessionId) {
            this.notify('No session selected. Run /delegation tree <sessionId>.');
            return true;
        }
        const tree = await this.sessionService.getDelegationTree(resolvedSessionId, { status, depth });
        if (!tree) {
            this.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        const lines = this.formatDelegationTree(tree);
        if (!lines.length) {
            this.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        this.notify(lines.join(' | '));
        return true;
    }

    /**
     * Opens `/delegation lineage [sessionId]`: renders the persisted chain of
     * parent sessions above the current (or given) session, closest first.
     */
    protected async openDelegationLineage(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Delegation graph is unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId;
        if (!resolvedSessionId) {
            this.notify('No session selected. Run /delegation lineage <sessionId>.');
            return true;
        }
        const lineage = await this.sessionService.getDelegationLineage(resolvedSessionId);
        if (!lineage.length) {
            this.notify(`No parent delegation edges recorded for session '${resolvedSessionId}'.`);
            return true;
        }
        this.notify(lineage.map(edge => this.formatDelegationEdge(edge)).join(' → '));
        return true;
    }

    /**
     * Renders one delegation edge as a compact digest line, for example:
     * `parent-1 ⇢ child-1 · nested · completed · 12/1 10:00 → 12/1 10:05`.
     */
    protected formatDelegationEdge(edge: Record<string, any>): string {
        const parent = this.shortenSessionId(String(edge.parentSessionId ?? '?'));
        const child = this.shortenSessionId(String(edge.childSessionId ?? '?'));
        const kind = String(edge.kind ?? '').trim();
        const status = String(edge.status ?? '');
        const createdAt = Number(edge.createdAt ?? 0);
        const completedAt = Number(edge.completedAt ?? 0);
        const parts = [
            `${parent} ⇢ ${child}`,
            kind ? `${kind} · ${status}` : status
        ];
        if (createdAt) {
            const range = completedAt
                ? `${new Date(createdAt).toLocaleString()} → ${new Date(completedAt).toLocaleString()}`
                : new Date(createdAt).toLocaleString();
            parts.push(range);
        }
        const goal = this.pickDelegationGoal(edge);
        if (goal) {
            parts.push(goal);
        }
        return parts.join(' · ');
    }

    /**
     * Renders a delegation tree node recursively as one line per edge with
     * tree branch prefixes (`└─`, `├─`) so the console digest stays readable.
     */
    protected formatDelegationTree(node: Record<string, any>): string[] {
        const lines: string[] = [];
        const visit = (current: Record<string, any>, prefix: string, isLast: boolean, isRoot: boolean): void => {
            if (!isRoot) {
                const edgeLine = this.formatDelegationEdge({
                    parentSessionId: String(current.sessionId ?? ''),
                    childSessionId: String(current.sessionId ?? ''),
                    kind: current.kind,
                    status: current.status,
                    createdAt: current.createdAt,
                    completedAt: current.completedAt,
                    metadata: current.metadata
                });
                lines.push(`${prefix}${isLast ? '└─ ' : '├─ '}${edgeLine}`);
            } else {
                lines.push(`${prefix}${this.shortenSessionId(String(current.sessionId ?? '?'))}`);
            }
            const children = Array.isArray(current.children) ? current.children : [];
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const childPrefix = `${prefix}${isRoot || isLast ? '   ' : '│  '}`;
                visit(child, childPrefix, i === children.length - 1, false);
            }
        };
        visit(node, '', true, true);
        return lines;
    }

    protected pickDelegationGoal(edge: Record<string, any>): string {
        const metadata = edge?.metadata;
        if (!metadata || typeof metadata !== 'object') {
            return '';
        }
        const goal = String(metadata.goal ?? '').trim();
        if (!goal) {
            return '';
        }
        return goal.length > 40 ? `${goal.slice(0, 38)}…` : goal;
    }

    protected shortenSessionId(sessionId: string): string {
        return sessionId.length > 20 ? `${sessionId.slice(0, 18)}…` : sessionId;
    }

    /**
     * Opens `/delegation [list] [sessionId]`: lists flat delegation edges
     * touching the current (or given) session, newest edges first, as one
     * digest line per edge.
     */
    protected async openDelegationList(sessionId?: string): Promise<boolean> {
        if (!this.sessionService) {
            this.notify('Delegation graph is unavailable without app RPC.');
            return true;
        }
        const resolvedSessionId = (sessionId || '').trim() || this.state.sessionId || undefined;
        const edges = await this.sessionService.listDelegationEdges(
            resolvedSessionId ? { sessionId: resolvedSessionId } : { limit: 200 }
        );
        if (!edges.length) {
            this.notify(
                resolvedSessionId
                    ? `No delegation edges recorded for session '${resolvedSessionId}'.`
                    : 'No delegation edges recorded yet.'
            );
            return true;
        }
        this.notify(edges.map(edge => this.formatDelegationEdge(edge)).join(' | '));
        return true;
    }

    /**
     * Renders one compact aggregate line for turn diagnostics, for example:
     * `session-1 · 12 turns · empty 8.3% · repeated 16.7% · clarif 0% · 3 compact(s) · saved 25K tokens · 12/1–12/2`
     */
    protected formatTurnDiagnosticsAggregate(aggregate: Record<string, any>, sessionId?: string): string {
        const id = sessionId
            ? (sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId)
            : 'all sessions';
        const parts = [
            `${id} · ${Number(aggregate.totalTurns ?? 0)} turns`,
            `empty ${Number(aggregate.emptyResponseRate ?? 0)}%`,
            `repeated ${Number(aggregate.repeatedQuestionRate ?? 0)}%`,
            `clarif ${Number(aggregate.clarificationRate ?? 0)}%`,
            `${Number(aggregate.compactionCount ?? 0)} compact(s)`,
            `saved ${formatCompactNumber(Number(aggregate.totalTokenSavings ?? 0))} tokens`
        ];
        const range = aggregate.timeRange
            ? ` · ${new Date(aggregate.timeRange.from).toLocaleDateString()}–${new Date(aggregate.timeRange.to).toLocaleDateString()}`
            : '';
        return parts.join(' · ') + range;
    }

    /**
     * Renders one compact line per session with an 8-level sparkline over time
     * buckets (`totalTokenSavings` normalized to the session maximum mapped to
     * ▁▂▃▄▅▆▇█), the bucket date range, the total turns, and the total tokens
     * saved, for example:
     * `session-1 ▃▅▇ (3d · 12/1–12/3 · 42 turns · saved 25k tokens)`
     */
    protected formatTurnDiagnosticsTrend(trend: Array<Record<string, any>>): string[] {
        const bySession = new Map<string, Array<Record<string, any>>>();
        for (const point of trend) {
            const sessionId = String(point.sessionId ?? 'unknown');
            const group = bySession.get(sessionId) ?? [];
            group.push(point);
            bySession.set(sessionId, group);
        }
        const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const spark = (value: number, max: number): string => {
            const ratio = max > 0 ? Math.min(1, Math.max(0, Number(value) || 0) / max) : 0;
            const index = Math.min(7, Math.max(0, Math.floor(ratio * 8)));
            return sparkChars[index];
        };
        const lines: string[] = [];
        for (const [sessionId, points] of bySession) {
            const sorted = points.slice().sort((a, b) => Number(a.bucketStart ?? 0) - Number(b.bucketStart ?? 0));
            const savings = sorted.map(point => Number(point.totalTokenSavings ?? 0));
            const maxSaving = Math.max(...savings, 1);
            const turns = sorted.reduce((sum, point) => sum + Number(point.recordCount ?? 0), 0);
            const tokensSaved = savings.reduce((sum, value) => sum + value, 0);
            const from = Number(sorted[0]?.bucketStart ?? 0);
            const to = Number(sorted[sorted.length - 1]?.bucketStart ?? 0);
            const range = from || to
                ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
                : '';
            const id = sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
            lines.push(`${id} ${sorted.map(point => spark(Number(point.totalTokenSavings ?? 0), maxSaving)).join('')} (${sorted.length}d${range} · ${turns} turns · saved ${formatCompactNumber(tokensSaved)} tokens)`);
        }
        return lines.sort((a, b) => a.localeCompare(b));
    }

    /**
     * Parses `/diagnostics trend` trailing tokens: optional session id,
     * optional bucket size (`Nd` for days or a millisecond number), optional
     * max bucket count. Reuses the same token grammar as the compaction trend.
     */
    protected parseTurnDiagnosticsTrendArgs(
        args: string
    ): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
        return this.parseCompactionHistoryTrendArgs(args);
    }

    /**
     * Renders one compact line per session with an 8-level sparkline over time
     * buckets (`avgCompressionRatio` mapped to ▁▂▃▄▅▆▇█), the bucket date
     * range, the total tokens saved, and the averaged compression ratio, for
     * example:
     * `session-1 ▃▅▇ (2d · 12/1–12/2 · saved 25k tokens · avg 62.5%)`
     */
    protected formatCompactionHistoryTrend(trend: Array<Record<string, any>>): string[] {
        const bySession = new Map<string, Array<Record<string, any>>>();
        for (const point of trend) {
            const sessionId = String(point.sessionId ?? 'unknown');
            const group = bySession.get(sessionId) ?? [];
            group.push(point);
            bySession.set(sessionId, group);
        }
        const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const spark = (value: number): string => {
            const index = Math.min(7, Math.max(0, Math.floor((Number(value) || 0) / 100 * 8)));
            return sparkChars[index];
        };
        const lines: string[] = [];
        for (const [sessionId, points] of bySession) {
            const sorted = points.slice().sort((a, b) => Number(a.bucketStart ?? 0) - Number(b.bucketStart ?? 0));
            const ratios = sorted.map(point => Number(point.avgCompressionRatio ?? 0));
            const avgRatio = ratios.length
                ? (ratios.reduce((sum, value) => sum + value, 0) / ratios.length).toFixed(1)
                : '0.0';
            const tokensSaved = sorted.reduce((sum, point) => sum + Number(point.totalTokensSaved ?? 0), 0);
            const from = Number(sorted[0]?.bucketStart ?? 0);
            const to = Number(sorted[sorted.length - 1]?.bucketStart ?? 0);
            const range = from || to
                ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
                : '';
            const id = sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
            lines.push(`${id} ${sorted.map(point => spark(Number(point.avgCompressionRatio ?? 0))).join('')} (${sorted.length}d${range} · saved ${formatCompactNumber(tokensSaved)} tokens · avg ${avgRatio}%)`);
        }
        return lines.sort((a, b) => a.localeCompare(b));
    }

    /**
     * Renders one compact line per compaction record, for example:
     * `compacted L3 312→224 msgs (88) · 84k→41k tokens (-51%) · saved 43k total`
     */
    protected formatCompactionHistoryRecord(record: Record<string, any>): string {
        const parts = [
            record.compactionTriggered ? 'compacted' : record.strategy,
            record.level ? `L${record.level}` : ''
        ].filter(Boolean);
        if (typeof record.beforeMessageCount === 'number' && typeof record.afterMessageCount === 'number') {
            parts.push(`${record.beforeMessageCount}→${record.afterMessageCount} msgs (${record.compactedMessageCount ?? 0})`);
        }
        if (typeof record.beforeTokens === 'number' && typeof record.afterTokens === 'number') {
            parts.push(`${formatCompactNumber(record.beforeTokens)}→${formatCompactNumber(record.afterTokens)} tokens (${record.compressionRatio ?? 0}%)`);
        }
        if (typeof record.cumulativeTokenSavings === 'number' && record.cumulativeTokenSavings > 0) {
            parts.push(`saved ${formatCompactNumber(record.cumulativeTokenSavings)} total`);
        }
        return parts.join(' · ');
    }

    /**
     * Renders one compact line per provider with an 8-level sparkline over time
     * buckets (`avgTotal` mapped to ▁▂▃▄▅▆▇█), the bucket date range, the
     * averaged total, and the fallback rate, for example:
     * `deepseek ▃▅▇ (2d · 12/1–12/2 · avg 75.0 · fb 33.3%)`
     */
    protected formatSummaryQualityTrend(trend: Array<Record<string, any>>): string[] {
        const byProvider = new Map<string, Array<Record<string, any>>>();
        for (const point of trend) {
            const provider = String(point.provider ?? 'unknown');
            const group = byProvider.get(provider) ?? [];
            group.push(point);
            byProvider.set(provider, group);
        }
        const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const spark = (value: number): string => {
            const index = Math.min(7, Math.max(0, Math.floor((Number(value) || 0) / 100 * 8)));
            return sparkChars[index];
        };
        const lines: string[] = [];
        for (const [provider, points] of byProvider) {
            const sorted = points.slice().sort((a, b) => Number(a.bucketStart ?? 0) - Number(b.bucketStart ?? 0));
            const totals = sorted.map(point => Number(point.avgTotal ?? 0));
            const avgTotal = totals.length
                ? (totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(1)
                : '0.0';
            const fallbackRate = totals.length
                ? (sorted.reduce((sum, point) => sum + Number(point.fallbackRate ?? 0), 0) / sorted.length).toFixed(1)
                : '0.0';
            const evidenceCoverage = totals.length
                ? (sorted.reduce((sum, point) => sum + Number(point.avgEvidenceCoverage ?? 0), 0) / sorted.length).toFixed(1)
                : '0.0';
            const from = Number(sorted[0]?.bucketStart ?? 0);
            const to = Number(sorted[sorted.length - 1]?.bucketStart ?? 0);
            const range = from || to
                ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
                : '';
            lines.push(`${provider} ${sorted.map(point => spark(Number(point.avgTotal ?? 0))).join('')} (${sorted.length}d${range} · avg ${avgTotal} · fb ${fallbackRate}% · evidence ${evidenceCoverage}%)`);
        }
        return lines.sort((a, b) => a.localeCompare(b));
    }

    protected resolveReviewAnnotationsSessionId(): string {
        return String(
            this.state.reviewTask?.sourceSessionId
            || this.state.reviewTask?.sessionId
            || this.state.sessionId
            || ''
        ).trim();
    }

    protected getReviewAnnotationsCacheKey(): string | undefined {
        const stateCacheKey = String(this.state.selectedReviewTaskCacheKey || '').trim();
        if (stateCacheKey) {
            return stateCacheKey;
        }
        const sessionId = this.resolveReviewAnnotationsSessionId();
        const reviewTaskId = String(this.state.selectedReviewTaskId || this.state.reviewTask?.id || '').trim();
        if (!sessionId || !reviewTaskId) {
            return undefined;
        }
        return `${sessionId}:${reviewTaskId}`;
    }

    protected async refreshSessions(currentSessionId = this.state.sessionId): Promise<void> {
        if (!this.sessionService) {
            return;
        }
        const groups = await this.sessionService.listProjectSessions(currentSessionId);
        if (currentSessionId !== this.state.sessionId) {
            return;
        }
        const groupedSessions = this.flattenProjectSessions(groups);
        if (groupedSessions.length) {
            this.state.setSessions(groupedSessions);
            this.refreshProjectContext();
            this.refreshProjects();
            this.refreshThreads();
            return;
        }
        const sessions = await this.sessionService.listSessions(currentSessionId);
        if (currentSessionId !== this.state.sessionId) {
            return;
        }
        if (!sessions.length) {
            this.state.setSessions([]);
            this.state.setProjects([]);
            this.state.setThreads([]);
            this.state.setProjectContext();
            this.updateTerminalTitle();
            return;
        }
        this.state.setSessions(sessions.map(item => ({
            id: item.id,
            current: !!item.current,
            workspace: item.workspace,
            updatedAt: item.lastActiveAt,
            messageCount: item.messageCount,
            summary: item.summary,
            title: item.title,
            pinned: !!item.pinned,
            archived: !!item.archived,
            projectKey: item.projectKey,
            projectId: item.projectId,
            primaryThreadId: item.primaryThreadId,
            originThreadId: item.originThreadId,
            sessionRole: item.sessionRole,
            rootRequest: item.rootRequest,
            focusSummary: item.focusSummary,
            projectLabel: item.projectId || item.focusSummary || item.workspace || item.primaryThreadId || item.rootRequest || item.id,
            sections: Array.isArray(item.sections) ? item.sections : undefined
        })));
        this.refreshProjectContext();
        this.refreshProjects();
        this.refreshThreads();
    }

    protected refreshThreads(): void {
        const seen = new Map<string, {
            key: string;
            label: string;
            lastActive: number;
            count: number;
            representativeLastActive: number;
            representativeId: string;
            sections?: AgentSessionSectionInfo[];
        }>();
        for (const s of this.state.sessions) {
            const key = this.resolveSessionThreadKey(s);
            if (!key) continue;
            const sessionLastActive = s.updatedAt || 0;
            const sessionId = String(s.id || '');
            const sessionLabel = s.projectLabel || s.focusSummary || s.rootRequest || s.workspace || s.primaryThreadId || key;
            const sections = Array.isArray(s.sections) && s.sections.length > 0 ? s.sections : undefined;
            const existing = seen.get(key);
            if (existing) {
                existing.count += 1;
                if (sessionLastActive > existing.lastActive) {
                    existing.lastActive = sessionLastActive;
                }
                if (sessionLastActive > existing.representativeLastActive
                    || (sessionLastActive === existing.representativeLastActive
                        && (!existing.representativeId || sessionId.localeCompare(existing.representativeId) < 0))) {
                    existing.label = sessionLabel;
                    existing.representativeLastActive = sessionLastActive;
                    existing.representativeId = sessionId;
                    existing.sections = sections;
                }
            } else {
                seen.set(key, {
                    key,
                    label: sessionLabel,
                    lastActive: sessionLastActive,
                    count: 1,
                    representativeLastActive: sessionLastActive,
                    representativeId: sessionId,
                    sections
                });
            }
        }
        this.state.setThreads(Array.from(seen.values()).map(p => ({
            key: p.key,
            label: p.label,
            sessionCount: p.count,
            lastActive: p.lastActive || undefined,
            sections: p.sections
        })));
    }

    protected async refreshCurrentSections(): Promise<void> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            this.state.setSections([]);
            return;
        }
        const sections = await this.sessionService.listSections(sessionId);
        this.state.setSections(sections);
    }

    protected refreshProjects(): void {
        const seen = new Map<string, {
            key: string;
            label: string;
            lastActive: number;
            count: number;
            representativeLastActive: number;
            representativeId: string;
        }>();
        for (const s of this.state.sessions) {
            const key = this.resolveSessionProjectKey(s);
            if (!key) continue;
            const sessionLastActive = s.updatedAt || 0;
            const sessionId = String(s.id || '');
            const sessionLabel = s.projectLabel || s.projectId || s.focusSummary || s.workspace || s.primaryThreadId || s.rootRequest || key;
            const existing = seen.get(key);
            if (existing) {
                existing.count += 1;
                if (sessionLastActive > existing.lastActive) {
                    existing.lastActive = sessionLastActive;
                }
                if (sessionLastActive > existing.representativeLastActive
                    || (sessionLastActive === existing.representativeLastActive
                        && (!existing.representativeId || sessionId.localeCompare(existing.representativeId) < 0))) {
                    existing.label = sessionLabel;
                    existing.representativeLastActive = sessionLastActive;
                    existing.representativeId = sessionId;
                }
            } else {
                seen.set(key, {
                    key,
                    label: sessionLabel,
                    lastActive: sessionLastActive,
                    count: 1,
                    representativeLastActive: sessionLastActive,
                    representativeId: sessionId
                });
            }
        }
        this.state.setProjects(Array.from(seen.values()).map(p => ({
            key: p.key,
            label: p.label,
            sessionCount: p.count,
            lastActive: p.lastActive || undefined
        })));
    }

    protected flattenProjectSessions(groups: AgentConsoleSessionProjectGroup[]): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        title?: string;
        pinned?: boolean;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        originThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        return groups.flatMap(group => {
            const projectKey = String(group.projectKey || '').trim() || undefined;
            const projectId = String(group.projectId || '').trim() || undefined;
            const projectLabel = String(group.label || group.projectId || group.focusSummary || group.workspace || group.primaryThreadId || group.rootRequest || '').trim()
                || undefined;
            const primaryThreadId = String(group.primaryThreadId || '').trim() || undefined;
            const rootRequest = String(group.rootRequest || '').trim() || undefined;
            const focusSummary = String(group.focusSummary || '').trim() || undefined;
            return group.sessions.map(item => ({
                id: item.id,
                current: !!item.current,
                workspace: item.workspace || group.workspace,
                updatedAt: item.lastActiveAt,
                messageCount: item.messageCount,
                summary: item.summary,
                title: item.title,
                pinned: !!item.pinned,
                projectKey,
                projectId,
                primaryThreadId: item.primaryThreadId || primaryThreadId,
                originThreadId: String(item.originThreadId || '').trim() || undefined,
                rootRequest: item.rootRequest || rootRequest,
                focusSummary: item.focusSummary || focusSummary,
                projectLabel,
                projectSessionCount: group.sessionCount
            }));
        });
    }

    protected refreshProjectContext(): void {
        const projectSessions = this.resolveCurrentProjectSessions();
        if (!projectSessions.length) {
            this.state.setProjectContext();
            this.updateTerminalTitle();
            return;
        }
        const representative = this.selectProjectRepresentative(projectSessions);
        const summary = projectSessions
            .slice()
            .sort((left, right) => {
                const activityDelta = (right.updatedAt || 0) - (left.updatedAt || 0);
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return String(left.id || '').localeCompare(String(right.id || ''));
            })
            .map(item => String(item.summary || '').trim())
            .find(Boolean) || '';
        this.state.setProjectContext({
            projectKey: representative ? this.resolveSessionProjectKey(representative) : undefined,
            projectLabel: representative?.projectLabel || representative?.projectId || representative?.focusSummary || representative?.workspace || representative?.primaryThreadId || representative?.rootRequest || representative?.id,
            projectSummary: summary,
            projectSessionCount: representative?.projectSessionCount || projectSessions.length
        });
        this.updateTerminalTitle();
    }

    protected resolveProjectSessionsFor(sessionId = this.state.sessionId): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        const anchor = this.state.sessions.find(item => item.id === sessionId)
            || this.state.sessions.find(item => item.current)
            || this.state.sessions[0];
        if (!anchor) {
            return [];
        }
        const projectKey = this.resolveSessionProjectKey(anchor);
        if (projectKey) {
            return this.state.sessions.filter(item => this.resolveSessionProjectKey(item) === projectKey);
        }
        const workspace = String(anchor.workspace || '').trim();
        if (workspace) {
            const workspaceKey = normalizeAgentWorkspaceIdentity(workspace);
            return this.state.sessions.filter(item => normalizeAgentWorkspaceIdentity(item.workspace) === workspaceKey);
        }
        const primaryThreadId = String(anchor.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return this.state.sessions.filter(item => String(item.primaryThreadId || '').trim() === primaryThreadId);
        }
        return [anchor];
    }

    protected resolveCurrentProjectSessions(): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        return this.resolveProjectSessionsFor(this.state.sessionId);
    }

    protected selectProjectRepresentative<T extends {
        id: string;
        updatedAt?: number;
    }>(sessions: T[]): T | undefined {
        return sessions
            .slice()
            .sort((left, right) => {
                const activityDelta = (right.updatedAt || 0) - (left.updatedAt || 0);
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return String(left.id || '').localeCompare(String(right.id || ''));
            })[0];
    }

    protected resolveSessionProjectKey(session?: {
        projectKey?: string;
        projectId?: string;
        workspace?: string;
        primaryThreadId?: string;
    } | null): string {
        const projectKey = String(session?.projectKey || '').trim();
        if (projectKey) {
            return projectKey;
        }
        const projectId = String(session?.projectId || '').trim();
        if (projectId) {
            return `project:${projectId}`;
        }
        const primaryThreadId = String(session?.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        const workspace = String(session?.workspace || '').trim();
        const workspaceKey = normalizeAgentWorkspaceIdentity(workspace);
        if (workspaceKey) {
            return `workspace:${workspaceKey}`;
        }
        return '';
    }

    protected resolveSessionThreadKey(session?: {
        primaryThreadId?: string;
        id?: string;
    } | null): string {
        const primaryThreadId = String(session?.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return primaryThreadId;
        }
        const sessionId = String(session?.id || '').trim();
        return sessionId ? `session:${sessionId}` : '';
    }

    protected resolveThreadKeyForSession(
        session?: {
            primaryThreadId?: string;
            originThreadId?: string;
            id?: string;
        } | null,
        sessions: Array<{
            id: string;
            primaryThreadId?: string;
            originThreadId?: string;
        }> = this.state.sessions,
        visited = new Set<string>()
    ): string {
        const primaryThreadId = String(session?.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        const sessionId = String(session?.id || '').trim();
        if (visited.has(sessionId)) {
            return sessionId ? `session:${sessionId}` : '';
        }
        visited.add(sessionId);
        const originThreadId = String(session?.originThreadId || '').trim();
        if (originThreadId) {
            const originSession = sessions.find(item => String(item.id || '').trim() === originThreadId);
            if (originSession) {
                const originKey = this.resolveThreadKeyForSession(originSession, sessions, visited);
                if (originKey) {
                    return originKey;
                }
            }
            return `thread:${originThreadId}`;
        }
        return sessionId ? `session:${sessionId}` : '';
    }

    protected resolveProjectSessionIdsFor(sessionId = this.state.sessionId): string[] {
        const sessions = this.resolveProjectSessionsFor(sessionId);
        const ids = sessions.map(item => String(item.id || '').trim()).filter(Boolean);
        return ids.length ? ids : [sessionId];
    }

    protected resolveThreadSessionsFor(sessionId = this.state.sessionId): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        originThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }> {
        const anchor = this.state.sessions.find(item => item.id === sessionId)
            || this.state.sessions.find(item => item.current)
            || this.state.sessions[0];
        if (!anchor) {
            return [];
        }
        const threadKey = this.resolveThreadKeyForSession(anchor);
        if (threadKey) {
            return this.state.sessions.filter(item => this.resolveThreadKeyForSession(item) === threadKey);
        }
        return [anchor];
    }

    protected resolveThreadSessionIdsFor(sessionId = this.state.sessionId): string[] {
        const sessions = this.resolveThreadSessionsFor(sessionId);
        const ids = sessions.map(item => String(item.id || '').trim()).filter(Boolean);
        return ids.length ? ids : [sessionId];
    }

    protected resolveCurrentProjectSessionIds(): string[] {
        return this.resolveProjectSessionIdsFor(this.state.sessionId);
    }

    protected resolveCodingTaskSessionId(task?: Record<string, any> | null): string {
        const sessionId = String(task?.sourceSessionId || task?.sessionId || '').trim();
        return sessionId || this.state.sessionId;
    }

    protected captureTaskViewContext(): { sessionId: string; version: number } {
        return {
            sessionId: this.state.sessionId,
            version: this.taskViewContextVersion
        };
    }

    protected isTaskViewContextCurrent(context: { sessionId: string; version: number }): boolean {
        return context.sessionId === this.state.sessionId && context.version === this.taskViewContextVersion;
    }

    protected resolveFocusedCodingTask(): Record<string, any> | null {
        if (this.state.reviewOpen && this.state.reviewTask) {
            return this.state.reviewTask;
        }
        if (this.state.tasksFocused && this.state.selectedTask) {
            return this.state.selectedTask;
        }
        return null;
    }

    protected async refreshPendingApprovals(sessionId = this.state.sessionId): Promise<void> {
        if (this.approvalManager) {
            const pending = this.approvalManager.getPending().filter((request: any) => request.sessionId === sessionId);
            if (sessionId === this.state.sessionId) {
                this.state.setPendingApprovals(pending as AgentConsoleApprovalRequest[]);
                this.updateTerminalTitle();
            }
            return;
        }
        if (this.appRpc && this.sessionService) {
            const requests = await this.sessionService.listApprovals(sessionId);
            if (sessionId === this.state.sessionId) {
                this.state.setPendingApprovals(requests as AgentConsoleApprovalRequest[]);
                this.updateTerminalTitle();
            }
            return;
        }
        if (sessionId === this.state.sessionId) {
            this.state.setPendingApprovals([]);
            this.updateTerminalTitle();
        }
    }

    protected async applyApprovalDecision(decision: 'approve' | 'deny', requestId: string): Promise<boolean> {
        if (this.approvalManager) {
            return decision === 'approve'
                ? this.approvalManager.approve(requestId)
                : this.approvalManager.reject(requestId);
        }
        if (this.appRpc && this.sessionService) {
            const result = await this.sessionService.decideApproval(decision, requestId);
            return result?.applied === true;
        }
        return false;
    }

    protected async getPendingApprovals(sessionId: string): Promise<AgentConsoleApprovalRequest[]> {
        if (this.approvalManager) {
            return this.approvalManager.getPending().filter((request: any) => request.sessionId === sessionId) as AgentConsoleApprovalRequest[];
        }
        if (this.appRpc && this.sessionService) {
            const requests = await this.sessionService.listApprovals(sessionId);
            return requests as AgentConsoleApprovalRequest[];
        }
        return [];
    }

    protected async openSession(sessionId?: string, options?: { persistCurrentHistory?: boolean }): Promise<void> {
        if (this.isTurnInProgress()) {
            this.notifyBusyState('Wait for the current turn to finish before switching sessions.');
            return;
        }
        if (!this.sessionService) {
            return;
        }
        const requestId = ++this.openSessionRequestId;
        if (options?.persistCurrentHistory !== false) {
            await this.persistInputHistory();
            if (requestId !== this.openSessionRequestId) {
                return;
            }
        }
        const target = await this.sessionService.ensureSession(sessionId);
        if (requestId !== this.openSessionRequestId) {
            return;
        }
        if (target.archived) {
            await this.sessionService.setSessionArchived(target.id, false);
            target.archived = false;
        }
        this.openReviewRequestId++;
        this.taskViewContextVersion++;
            this.state.configure({ sessionId: target.id });
            this.state.setQueuedPromptCount((this.queuedPrompts.get(target.id) || []).length);
            this.state.setMessagesFocused(false);
            this.state.setSessionsFocused(false);
            this.state.setProjectsFocused(false);
            this.state.setToolsFocused(false);
            this.state.setToolRunsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.setTasksFocused(false);
            this.state.setJobsFocused(false);
            this.state.setPendingApprovals([]);
            this.state.clearReview();
            this.state.clearPlanTodos();
            this.state.clearToolActivity();
            this.state.setContextPreparation(null);
            this.state.closeMessageDetail();
            this.state.clearActivities();
            this.state.setLastError('');
            this.updateTerminalTitle();
            this.state.setNotice('');
            this.state.setInput('', 0);
            this.editTargetMessageId = '';
            this.editDraftBefore = '';
            this.editAttachmentsBefore = [];
            this.lastEditSessionMessageId = '';
            this.editDismissedAt = 0;
            this.lastEscapeAt = 0;
        await this.refreshSessions(target.id);
        if (requestId !== this.openSessionRequestId || this.state.sessionId !== target.id) {
            return;
        }
        const projectSessions = this.resolveProjectSessionsFor(target.id);
        const projectSessionIds = this.resolveProjectSessionIdsFor(target.id);
        const [page] = await Promise.all([
            this.loadSessionPage(target.id),
            this.refreshTools(target.id),
            this.refreshPendingApprovals(target.id),
            this.refreshTodoPlan(target.id, projectSessions),
            this.loadCodingTasks(target.id, projectSessionIds),
            this.restoreInputHistory()
        ]);
        if (requestId !== this.openSessionRequestId || this.state.sessionId !== target.id) {
            return;
        }
        this.state.setMessages(page.messages);
        this.state.setSections(page.sections);
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
                `Timeout: ${request.timeoutMs}ms`,
                request.expiresAt ? `Expires: ${new Date(request.expiresAt).toLocaleTimeString()}` : ''
            ].join('\n')
        })), Math.max(0, Math.min(requests.length - 1, selectedIndex)), this.state.consoleOptions.selectHint);
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
                `Timeout: ${request.timeoutMs}ms`,
                request.expiresAt ? `Expires: ${new Date(request.expiresAt).toLocaleTimeString()}` : ''
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
            ], 0, this.state.consoleOptions.selectHint);
            if (!action) {
                if (requests.length === 1) {
                    return;
                }
                continue;
            }
            if (action === 'approve') {
                const approved = await this.applyApprovalDecision('approve', request.id);
                this.notify(approved
                    ? `Approved ${request.toolName} (${request.id.slice(0, 8)}).`
                    : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
                await this.refreshPendingApprovals();
                return;
            }
            if (action === 'deny') {
                const denied = await this.applyApprovalDecision('deny', request.id);
                this.notify(denied
                    ? `Denied ${request.toolName} (${request.id.slice(0, 8)}).`
                    : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
                await this.refreshPendingApprovals();
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
        return !!this.state.statusline.length || !!this.state.notice || !!this.state.pendingApprovals.length;
    }

    get showSessionsPanel(): boolean {
        return this.state.sessionsFocused;
    }

    get showApprovalsPanel(): boolean {
        return this.state.approvalsFocused;
    }

    get showTasksPanel(): boolean {
        return this.state.tasksFocused || this.state.hasActivePlanTodos();
    }

    get showJobsPanel(): boolean {
        return this.state.jobsFocused;
    }

    get showMessageDetailPanel(): boolean {
        return false;
    }

    get showReviewPanel(): boolean {
        return !!this.state.reviewOpen;
    }

    get showGitSnapshotPanel(): boolean {
        return !!this.state.gitSnapshotOpen;
    }

    get showActivityPanel(): boolean {
        return false;
    }

    get showToolsPanel(): boolean {
        return this.state.toolsFocused;
    }

    get showWorkingPanel(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    get showToolRunsPanel(): boolean {
        return this.state.toolRunsFocused;
    }

    get showSelectPanel(): boolean {
        return !!this.state.selectMenu;
    }

    get showWhichKeyPanel(): boolean {
        return this.state.whichKeyVisible;
    }

    get showHealthPopover(): boolean {
        return this.state.healthPopoverVisible;
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
            if (this.surfaceAccessor?.writeTerminalClipboardText?.(text)) {
                this.notify(`Copied ${label}.`);
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

    get openSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            const taskRecord = this.state.taskRecords.find(task => task?.id === taskId) || null;
            await this.openCodingTaskReview(taskId, taskRecord);
        };
    }

    get cancelSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.cancelCodingTask(taskId);
        };
    }

    get retrySelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.retryFailedCodingTask(taskId);
        };
    }

    get rollbackSelectedTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.rollbackCodingTask(taskId);
        };
    }

    get toggleSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.toggleScheduledTask(taskId);
        };
    }

    get cancelSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.cancelScheduledTask(taskId);
        };
    }

    get recoverSelectedScheduledTaskActionHandler(): (taskId: string) => Promise<void> {
        return async (taskId: string) => {
            if (!taskId) {
                return;
            }
            await this.recoverScheduledTask(taskId);
        };
    }

    get activateSelectedToolActionHandler(): (toolName: string) => Promise<void> {
        return async (toolName: string) => {
            const name = String(toolName || '').trim();
            if (!name) {
                return;
            }
            const sessionId = this.state.sessionId;
            const selected = this.state.tools.find(item => item.name === name);
            if (selected?.active) {
                this.notify(`Tool ${name} is already active.`);
                return;
            }
            try {
                const activated = await this.activateToolForSession(name, sessionId);
                await this.refreshTools(sessionId);
                if (sessionId !== this.state.sessionId) {
                    return;
                }
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
            if (!requestId) {
                return;
            }
            const requests = await this.getPendingApprovals(this.state.sessionId);
            const request = requests.find((item: any) => item.id === requestId)
                || this.state.selectedApproval
                || { id: requestId, toolName: 'request' };
            const applied = await this.applyApprovalDecision(decision, requestId);
            await this.refreshPendingApprovals();
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
        this.state.setQueuedPromptCount((this.queuedPrompts.get(this.state.sessionId) || []).length);
        return this;
    }

    async onInit(): Promise<void> {
        this.state.submitAction = this.submitActionHandler;
        this.state.queueDraftAction = () => this.queueDraft();
        this.state.toggleHealthPopoverAction = () => this.toggleHealthPopover();
        this.state.copyFocusedTextAction = this.copyFocusedTextActionHandler;
        this.state.activateSelectedSessionAction = this.activateSelectedSessionActionHandler;
        this.state.openSelectedTaskAction = this.openSelectedTaskActionHandler;
        this.state.cancelSelectedTaskAction = this.cancelSelectedTaskActionHandler;
        this.state.retrySelectedTaskAction = this.retrySelectedTaskActionHandler;
        this.state.rollbackSelectedTaskAction = this.rollbackSelectedTaskActionHandler;
        this.state.toggleSelectedScheduledTaskAction = this.toggleSelectedScheduledTaskActionHandler;
        this.state.cancelSelectedScheduledTaskAction = this.cancelSelectedScheduledTaskActionHandler;
        this.state.recoverSelectedScheduledTaskAction = this.recoverSelectedScheduledTaskActionHandler;
        this.state.activateSelectedToolAction = this.activateSelectedToolActionHandler;
        this.state.revertGitSnapshotFromDetailAction = () => this.revertGitSnapshotFromDetail();
        this.state.resolveApprovalAction = this.resolveApprovalActionHandler;
        this.state.globalKeyInputAction = (key, modifiers) => this.handleBrowserGlobalKeyInput(key, modifiers);
        this.state.onReviewAnnotationsPersist = (cache) => this.saveReviewAnnotationsCacheToDisk(cache);
        this.restoreReviewAnnotationsCacheFromDisk();
        this.bridge.bindState(this.sessionState);
        this.bridge.subscribe();
        this.ensureWorkspaceMentionResolver();
        this.keymapStore = this.keymapStore || new AgentConsoleKeymapStore(this.resolveFileAdapter());
        await this.restoreGlobalKeymap();
        this.themeStore = this.themeStore || new AgentConsoleThemeStore(this.resolveFileAdapter());
        await this.restoreTheme();
        this.statuslineStore = this.statuslineStore || new AgentConsoleStatuslineStore(this.resolveFileAdapter());
        await this.restoreStatusline();
        this.titleStore = this.titleStore || new AgentConsoleTitleStore(this.resolveFileAdapter());
        await this.restoreTitle();
        this.rawModeStore = this.rawModeStore || new AgentConsoleRawModeStore(this.resolveFileAdapter());
        await this.restoreRawMode();
        this.stashStore = this.stashStore || new AgentConsoleStashStore(this.resolveFileAdapter());
        this.modelStore = this.modelStore || new AgentConsoleModelStore(this.resolveFileAdapter());
        await this.restoreModelStore();
        this.settingsStore = this.settingsStore || new AgentConsoleSettingsStore(this.resolveFileAdapter());
        await this.restoreSettings();
        this.updateTerminalTitle();
        await this.resolveGitBranch();
        if (!this.inputHistoryStore) {
            this.inputHistoryStore = new AgentConsoleInputHistoryStore(this.appRpc || null, null);
        }
        await this.bootstrapStateFromAppRpc();
        await this.initializeInputHistory();
        await this.openSession(this.state.sessionId, { persistCurrentHistory: false });
        this.scheduleInputHistoryRestore();
        await this.refreshTools();
        await this.refreshMentionCatalog();
        await this.refreshScheduledTasks();
        await this.refreshUsageDigest();
        await this.refreshSummaryQualityDigest();
        await this.refreshCompactionDigest();
        await this.refreshTurnDiagnosticsDigest();
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    onDestroy(): void {
        this.destroyed = true;
        void this.stopVoiceCapture(true).catch(() => undefined);
        void Promise.resolve(this.audioPlayback?.stop()).catch(() => undefined);
        this.clearStreamingMessageState();
        this.clearInputHistoryRestoreTimers();
        this.state.copyFocusedTextAction = undefined;
        this.state.activateSelectedSessionAction = undefined;
        this.state.openSelectedTaskAction = undefined;
        this.state.cancelSelectedTaskAction = undefined;
        this.state.retrySelectedTaskAction = undefined;
        this.state.rollbackSelectedTaskAction = undefined;
        this.state.toggleSelectedScheduledTaskAction = undefined;
        this.state.cancelSelectedScheduledTaskAction = undefined;
        this.state.recoverSelectedScheduledTaskAction = undefined;
        this.state.activateSelectedToolAction = undefined;
        this.state.resolveApprovalAction = undefined;
        this.state.globalKeyInputAction = undefined;
        void this.persistInputHistory();
        const shell = this.sshShell;
        this.sshShell = null;
        this.state.sshShell = null;
        if (shell) {
            void shell.close().catch(() => void 0);
        }
        this.dispose();
    }

    protected async saveReviewAnnotationsCacheToDisk(cache: Record<string, Record<string, any>>): Promise<void> {
        const cacheKey = this.getReviewAnnotationsCacheKey();
        const selectedTaskId = String(this.state.selectedReviewTaskId || this.state.reviewTask?.id || '').trim();
        if (!cacheKey) {
            return;
        }
        const annotations = selectedTaskId || cacheKey
            ? this.extractReviewAnnotations(cache, { cacheKey, selectedTaskId }) || {}
            : {};
        const snapshot = this.rememberVolatileReviewAnnotations(cacheKey, annotations);
        if (!this.appRpc) {
            return;
        }
        try {
            await this.appRpc.request('review_annotations.save', {
                sessionId: this.resolveReviewAnnotationsSessionId(),
                cacheKey,
                cache: snapshot
            });
        } catch {
            // annotation persistence is best-effort
        }
    }

    protected async restoreReviewAnnotationsCacheFromDisk(): Promise<void> {
        return this.restoreReviewAnnotationsCacheFromDiskForScope();
    }

    protected async restoreReviewAnnotationsCacheFromDiskForScope(scope?: {
        cacheKey?: string;
        selectedTaskId?: string;
        sessionId?: string;
        requestId?: number;
    }): Promise<void> {
        const cacheKey = String(scope?.cacheKey || this.getReviewAnnotationsCacheKey() || '').trim();
        if (!cacheKey) {
            return;
        }
        const sessionId = String(scope?.sessionId || this.resolveReviewAnnotationsSessionId() || '').trim();
        const selectedTaskId = String(scope?.selectedTaskId || this.state.selectedReviewTaskId || '').trim();
        if (scope?.requestId != null && scope.requestId !== this.openReviewRequestId) {
            return;
        }
        const volatileAnnotations = this.getVolatileReviewAnnotations(cacheKey);
        if (volatileAnnotations !== undefined) {
            this.applyReviewAnnotationsForScope(cacheKey, selectedTaskId, volatileAnnotations);
            return;
        }
        if (!this.appRpc) {
            return;
        }
        try {
            const cache = await this.appRpc.request('review_annotations.load', {
                sessionId,
                cacheKey
            });
            if (scope?.requestId != null && scope.requestId !== this.openReviewRequestId) {
                return;
            }
            if (cache && (selectedTaskId || cacheKey)) {
                const annotations = this.extractReviewAnnotations(cache, { cacheKey, selectedTaskId }) || {};
                const snapshot = this.rememberVolatileReviewAnnotations(cacheKey, annotations);
                this.applyReviewAnnotationsForScope(cacheKey, selectedTaskId, snapshot);
            }
        } catch {
            // annotation restore is best-effort
        }
    }

    protected rememberVolatileReviewAnnotations(cacheKey: string, annotations?: Record<string, any> | null): Record<string, any> {
        const snapshot = { ...(annotations || {}) };
        this.getReviewAnnotationsVolatileCache(true)?.set(cacheKey, snapshot);
        return { ...snapshot };
    }

    protected getVolatileReviewAnnotations(cacheKey: string): Record<string, any> | undefined {
        const cache = this.getReviewAnnotationsVolatileCache();
        if (!cache?.has(cacheKey)) {
            return undefined;
        }
        const cached = cache.get(cacheKey);
        return { ...(cached || {}) };
    }

    protected getReviewAnnotationsVolatileCache(create = false): Map<string, Record<string, any>> | undefined {
        const owner = this.appRpc as object | null | undefined;
        if (!owner) {
            return undefined;
        }
        const existing = AgentConsoleComponent.REVIEW_ANNOTATIONS_VOLATILE_CACHE.get(owner);
        if (existing || !create) {
            return existing;
        }
        const cache = new Map<string, Record<string, any>>();
        AgentConsoleComponent.REVIEW_ANNOTATIONS_VOLATILE_CACHE.set(owner, cache);
        return cache;
    }

    protected applyReviewAnnotationsForScope(
        cacheKey: string,
        selectedTaskId: string,
        annotations: Record<string, any>
    ): void {
        const cacheEntryKey = cacheKey || selectedTaskId;
        this.state.setAnnotationCache({
            ...this.state.getAnnotationCache(),
            ...(cacheEntryKey ? { [cacheEntryKey]: { ...annotations } } : {})
        });
        this.state.reviewFileAnnotations = { ...annotations };
    }

    protected extractReviewAnnotations(
        cache: Record<string, Record<string, any>> | Record<string, any> | null | undefined,
        scope: { cacheKey?: string; selectedTaskId?: string }
    ): Record<string, any> | undefined {
        const cacheKey = String(scope.cacheKey || '').trim();
        const selectedTaskId = String(scope.selectedTaskId || '').trim();
        const direct = cache && typeof cache === 'object' && cacheKey
            ? (cache as Record<string, any>)[cacheKey]
            : undefined;
        if (this.looksLikeReviewAnnotationMap(direct)) {
            return direct;
        }
        const legacy = cache && typeof cache === 'object' && selectedTaskId
            ? (cache as Record<string, any>)[selectedTaskId]
            : undefined;
        if (this.looksLikeReviewAnnotationMap(legacy)) {
            return legacy;
        }
        if (this.looksLikeReviewAnnotationMap(cache)) {
            return cache as Record<string, any>;
        }
        return undefined;
    }

    protected looksLikeReviewAnnotationMap(value: unknown): value is Record<string, any> {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return false;
        }
        const entries = Object.values(value as Record<string, any>);
        return entries.every(entry => !!entry && typeof entry === 'object' && typeof entry.status === 'string');
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

    /**
     * Parses `/quality trend` trailing tokens: optional provider, optional
     * bucket size (`Nd` for days or a millisecond number), optional max bucket
     * count. Returns undefined for absent or invalid numeric tokens.
     */
    protected parseSummaryQualityTrendArgs(
        args: string
    ): { provider?: string; bucketSize?: number; maxBuckets?: number } {
        const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        const provider = tokens[0] || undefined;
        let bucketSize: number | undefined;
        let maxBuckets: number | undefined;
        const dayToken = tokens[1]?.match(/^(\d+)d$/i);
        if (dayToken) {
            const days = Number(dayToken[1]);
            if (Number.isFinite(days) && days > 0) {
                bucketSize = days * 24 * 60 * 60 * 1000;
            }
        } else if (tokens[1] && /^\d+$/.test(tokens[1])) {
            const value = Number(tokens[1]);
            if (Number.isFinite(value) && value > 0) {
                bucketSize = value;
            }
        }
        if (tokens[2] && /^\d+$/.test(tokens[2])) {
            const value = Number(tokens[2]);
            if (Number.isFinite(value) && value > 0) {
                maxBuckets = value;
            }
        }
        return { provider, bucketSize, maxBuckets };
    }

    /**
     * Parses `/compactions trend` trailing tokens: optional session id,
     * optional bucket size (`Nd` for days or a millisecond number), optional
     * max bucket count. Returns undefined for absent or invalid numeric tokens.
     */
    protected parseCompactionHistoryTrendArgs(
        args: string
    ): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
        const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        const sessionId = tokens[0] || undefined;
        let bucketSize: number | undefined;
        let maxBuckets: number | undefined;
        const dayToken = tokens[1]?.match(/^(\d+)d$/i);
        if (dayToken) {
            const days = Number(dayToken[1]);
            if (Number.isFinite(days) && days > 0) {
                bucketSize = days * 24 * 60 * 60 * 1000;
            }
        } else if (tokens[1] && /^\d+$/.test(tokens[1])) {
            const value = Number(tokens[1]);
            if (Number.isFinite(value) && value > 0) {
                bucketSize = value;
            }
        }
        if (tokens[2] && /^\d+$/.test(tokens[2])) {
            const value = Number(tokens[2]);
            if (Number.isFinite(value) && value > 0) {
                maxBuckets = value;
            }
        }
        return { sessionId, bucketSize, maxBuckets };
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
        const appMentions = extractAgentConsoleAppMentions(text);
        const matches = text.match(/(^|\s)@([^\s@]+)/g) || [];
        const mentions = Array.from(new Set(matches.map(item => item.trim())));
        if (!mentions.length && !appMentions.length) {
            return text;
        }
        const toolMap = new Map((this.state.tools || []).map(tool => [tool.name, tool]));
        const contextLines = (await Promise.all(mentions.map(async mention => {
            const name = mention.slice(1);
            switch (name) {
                case 'workspace':
                    return [`Workspace: ${this.state.workspace}`];
                case 'session':
                    return [`Session: ${this.state.sessionId}`];
                case 'model':
                    return [`Model: ${this.state.provider} / ${this.state.model}`];
                case 'tools':
                    return [`Tools: ${(this.state.tools || []).map(tool => tool.name).join(', ') || '(none)'}`];
                default: {
                    const tool = toolMap.get(name);
                    if (tool) {
                        return [`Tool ${tool.name}: toolset=${tool.toolset || 'default'}, active=${tool.active === false ? 'no' : 'yes'}`];
                    }
                    return await this.workspaceMentionsProvider?.resolveContext(this.state.workspace, name, this.mentionCatalog) || [];
                }
            }
        }))).flat();
        const apps = this.resolveApps();
        const appContextLines = appMentions.map(id => {
            const app = apps.find(item => item.id === id)!;
            return `Connector ${app.name}: id=${app.id}, status=${app.statusLabel}, capabilities=${app.description}`;
        });
        if (!contextLines.length && !appContextLines.length) {
            return text;
        }
        return [
            '[Mention Context]',
            ...contextLines,
            ...appContextLines,
            '',
            text
        ].join('\n');
    }

    protected async refreshMentionCatalog(): Promise<void> {
        const invoke = async (name: string, input: any): Promise<any> => {
            if (this.appRpc) {
                const result = await this.appRpc.request('tools.invoke', { sessionId: this.state.sessionId, name, input });
                return result?.output;
            }
            if (!this.toolRegistry || typeof this.toolRegistry.invoke !== 'function') return undefined;
            return this.toolRegistry.invoke(name, input, this.state.sessionId, undefined, this.state.workspace);
        };
        const [skillResult, pluginResult] = await Promise.all([
            invoke('skill_list', {}).catch(() => undefined),
            invoke('plugins', { action: 'list' }).catch(() => undefined)
        ]);
        this.mentionCatalog = [
            ...(Array.isArray(skillResult?.skills) ? skillResult.skills : []).map((skill: any) => ({
                kind: 'skill' as const,
                id: String(skill.id || ''),
                title: String(skill.title || skill.id || ''),
                description: String(skill.summary || '')
            })),
            ...(Array.isArray(pluginResult?.plugins) ? pluginResult.plugins : []).map((plugin: any) => ({
                kind: 'plugin' as const,
                id: String(plugin.id || ''),
                title: String(plugin.manifest?.name || plugin.id || ''),
                description: String(plugin.manifest?.description || ''),
                scope: String(plugin.scope || '')
            }))
        ].filter(item => item.id);
        this.state.setMentionCatalog(this.mentionCatalog);
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
        this.state.setQueuedPromptCount((this.queuedPrompts.get(this.state.sessionId) || []).length);
        this.updateTerminalTitle();
    }

    protected async restoreInputHistory(): Promise<void> {
        if (!this.inputHistoryStore) {
            return;
        }
        try {
            const workspace = this.resolveHistoryWorkspace();
            const entries = (await this.inputHistoryStore.load(workspace))
                .filter(entry => !shouldSkipConsoleHistoryEntry(entry));
            if (workspace === this.resolveHistoryWorkspace()) {
                this.state.setInputHistoryEntries(entries);
            }
        } catch {
        }
    }

    protected async initializeInputHistory(): Promise<void> {
        if (!this.inputHistoryStore) {
            return;
        }
        try {
            const workspace = this.resolveHistoryWorkspace();
            const entries = (await this.inputHistoryStore.load(workspace))
                .filter(entry => !shouldSkipConsoleHistoryEntry(entry));
            if (workspace === this.resolveHistoryWorkspace()) {
                this.state.setInputHistoryEntries(entries);
            }
        } catch {
        }
    }

    protected scheduleInputHistoryRestore(delays: number[] = [0, 150, 750]): void {
        this.clearInputHistoryRestoreTimers();
        for (const delay of delays) {
            this.inputHistoryRestoreTimers.push(setTimeout(() => {
                if (this.destroyed) {
                    return;
                }
                void this.restoreInputHistory();
            }, Math.max(0, delay)));
        }
    }

    protected clearInputHistoryRestoreTimers(): void {
        for (const timer of this.inputHistoryRestoreTimers) {
            clearTimeout(timer);
        }
        this.inputHistoryRestoreTimers = [];
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
        const configured = String(this.state.workspace || (this.options.ui?.console as any)?.workspace || '').trim();
        if (configured) {
            return configured;
        }
        return String((globalThis as any)?.process?.cwd?.() || '').trim();
    }

    protected async openCodingTaskReview(
        taskId: string,
        taskRecord?: Record<string, any> | null,
        options?: { returnFalseOnStale?: boolean }
    ): Promise<boolean> {
        const resolvedTaskId = String(taskId || '').trim();
        if (!resolvedTaskId) {
            this.notify('Review task id is required.');
            return false;
        }
        if (!this.appRpc) {
            this.notify('Review is unavailable without app RPC.');
            return false;
        }
        const taskViewContextVersion = ++this.taskViewContextVersion;
        const requestId = ++this.openReviewRequestId;

        const resolvedTask = taskRecord ?? this.state.taskRecords.find(task => task?.id === resolvedTaskId) ?? null;
        const sessionId = this.resolveCodingTaskSessionId(resolvedTask);
        const [loadedTask, diffResult] = await Promise.all([
            resolvedTask ? Promise.resolve(resolvedTask) : this.appRpc.request('coding_task.get', { sessionId, taskId: resolvedTaskId }).then(result => result?.task ?? null),
            this.appRpc.request('coding_task.diff', { sessionId, taskId: resolvedTaskId })
        ]);
        if (requestId !== this.openReviewRequestId || taskViewContextVersion !== this.taskViewContextVersion) {
            return options?.returnFalseOnStale ? false : true;
        }

        if (!loadedTask && !diffResult?.diff && !Array.isArray(diffResult?.workers)) {
            this.notify(`Coding task "${resolvedTaskId}" was not found.`);
            return false;
        }

        const reviewTask = loadedTask || {
            id: resolvedTaskId,
            title: resolvedTaskId,
            sourceSessionId: sessionId,
            status: 'unknown',
            metadata: {
                executionMode: diffResult?.executionMode ?? null
            }
        };

            this.state.setSessionsFocused(false);
            this.state.setTasksFocused(false);
            this.state.setJobsFocused(false);
            this.state.setToolsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.setMessagesFocused(false);
            this.state.closeMessageDetail();
            this.state.openReview(reviewTask, {
                diff: diffResult?.diff ?? null,
                workers: Array.isArray(diffResult?.workers) ? diffResult.workers : [],
                executionMode: diffResult?.executionMode ?? null
            });
            this.state.setNotice('');
            this.state.setLastError('');
        await this.restoreReviewAnnotationsCacheFromDiskForScope({
            cacheKey: `${String(reviewTask?.sourceSessionId || reviewTask?.sessionId || sessionId || '').trim()}:${resolvedTaskId}`.replace(/^:/, ''),
            selectedTaskId: resolvedTaskId,
            sessionId: String(reviewTask?.sourceSessionId || reviewTask?.sessionId || sessionId || '').trim(),
            requestId
        });
        return true;
    }

    protected async openGitDiffReview(base?: string): Promise<boolean> {
        if (!this.appRpc) {
            this.notify('Review is unavailable without app RPC.');
            return true;
        }
        const sessionId = this.state.sessionId;
        const resolvedBase = String(base || '').trim() || 'HEAD';
        const review = await this.fetchGitDiffReview(sessionId, resolvedBase);
        if (!review) {
            return true;
        }
        const files = Array.isArray(review.files) ? review.files : [];
        if (!files.length) {
            this.notify(`No changes to review against ${resolvedBase}.`);
            return true;
        }
        this.openGitDiffReviewPanel(review, resolvedBase);
        this.notify(`git diff ${resolvedBase}: ${files.length} file${files.length === 1 ? '' : 's'} changed.`);
        return true;
    }

    protected async openWorktreeDiff(args?: string): Promise<boolean> {
        if (!this.appRpc) {
            this.notify('Worktree diff is unavailable without app RPC.');
            return true;
        }
        const parsed = this.parseWorktreeDiffArgs(args);
        if (parsed.error) {
            this.notify(parsed.error);
            return true;
        }
        const sessionId = this.state.sessionId;
        let review: Record<string, any> | null = null;
        try {
            await this.activateToolForSession('review_diff', sessionId);
            const result = await this.appRpc.request('review.diff', {
                sessionId,
                scope: parsed.scope,
                ...(parsed.paths.length ? { paths: parsed.paths } : {})
            });
            review = result?.review && typeof result.review === 'object' ? result.review : null;
        } catch (error: any) {
            this.notify(error?.message || 'Failed to gather the worktree diff.');
            return true;
        }
        const files = Array.isArray(review?.files) ? review.files : [];
        if (!files.length) {
            this.notify(`No ${this.describeWorktreeDiffScope(parsed.scope)} changes.`);
            return true;
        }
        const label = this.describeWorktreeDiffScope(parsed.scope);
        const reviewTask = {
            id: `worktree-diff:${parsed.scope}`,
            title: `${label} diff`,
            sourceSessionId: sessionId,
            status: 'done',
            metadata: { reviewMode: 'worktree-diff', scope: parsed.scope, paths: parsed.paths }
        };
        this.state.setSessionsFocused(false);
        this.state.setTasksFocused(false);
        this.state.setJobsFocused(false);
        this.state.setToolsFocused(false);
        this.state.setApprovalsFocused(false);
        this.state.setMessagesFocused(false);
        this.state.closeMessageDetail();
        this.state.openReview(reviewTask, { diff: String(review?.diff || '') || null });
        this.state.setNotice('');
        this.state.setLastError('');
        this.notify(`${label} diff: ${files.length} file${files.length === 1 ? '' : 's'} changed.`);
        return true;
    }

    protected parseWorktreeDiffArgs(args?: string): {
        scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked';
        paths: string[];
        error?: string;
    } {
        const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        const flags = tokens.filter(token => token === '--staged' || token === '--unstaged' || token === '--untracked');
        if (flags.length > 1) {
            return { scope: 'working-tree', paths: [], error: 'Use only one of --staged, --unstaged, or --untracked.' };
        }
        const unknownFlag = tokens.find(token => token.startsWith('--') && !flags.some(flag => flag === token));
        if (unknownFlag) {
            return { scope: 'working-tree', paths: [], error: `Unknown /diff option: ${unknownFlag}` };
        }
        const scope = flags[0] ? flags[0].slice(2) as 'staged' | 'unstaged' | 'untracked' : 'working-tree';
        return { scope, paths: tokens.filter(token => !token.startsWith('--')) };
    }

    protected describeWorktreeDiffScope(scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked'): string {
        return scope === 'working-tree' ? 'Working tree' : scope[0].toUpperCase() + scope.slice(1);
    }

    protected async runGitDiffReviewAnalysis(base?: string): Promise<boolean> {
        if (!this.appRpc) {
            this.notify('Review is unavailable without app RPC.');
            return true;
        }
        const sessionId = this.state.sessionId;
        const resolvedBase = String(base || '').trim() || 'HEAD';
        const review = await this.fetchGitDiffReview(sessionId, resolvedBase);
        if (!review) {
            return true;
        }
        const files = Array.isArray(review.files) ? review.files : [];
        const diff = String(review.diff || '');
        if (!files.length || !diff.trim()) {
            this.notify(`No changes to review against ${resolvedBase}.`);
            return true;
        }
        this.notify(`Running review analysis against ${resolvedBase}...`);
        let content = '';
        try {
            const turn = await this.appRpc.request('run.turn', {
                sessionId,
                input: this.buildGitDiffReviewPrompt(resolvedBase, files, diff)
            });
            content = String(turn?.message?.content || '');
        } catch (error: any) {
            this.notify(error?.message || 'The review analysis turn failed.');
            return true;
        }
        const findings = this.parseReviewFindingsFromText(content);
        if (!findings.length) {
            this.notify('Review produced no parseable findings.');
            this.openGitDiffReviewPanel(review, resolvedBase);
            return true;
        }
        const saved = await this.saveReviewFindings(sessionId, {
            base: resolvedBase,
            commitSha: typeof review.commitSha === 'string' && review.commitSha.trim() ? review.commitSha.trim() : undefined,
            files,
            diffSummary: String(review.stats || '').trim() || undefined,
            findings
        });
        if (saved) {
            this.notify(`${findings.length} finding${findings.length === 1 ? '' : 's'} saved${saved.id ? ` (${saved.id})` : ''}.`);
        }
        this.openGitDiffReviewPanel(review, resolvedBase);
        return true;
    }

    protected async listReviewFindings(commit?: string): Promise<boolean> {
        if (!this.appRpc) {
            this.notify('Review is unavailable without app RPC.');
            return true;
        }
        const sessionId = this.state.sessionId;
        try {
            const result = await this.appRpc.request('review.list', {
                sessionId,
                ...(commit ? { commit } : {})
            });
            const runs = Array.isArray(result?.runs) ? result.runs : [];
            if (!runs.length) {
                this.notify(commit ? `No review runs found for commit ${commit}.` : 'No review runs saved.');
                return true;
            }
            for (const run of runs) {
                const fileCount = Array.isArray(run.files) ? run.files.length : 0;
                const findingCount = Array.isArray(run.findings) ? run.findings.length : 0;
                const sha = String(run.commitSha || '').slice(0, 12);
                this.notify(`[${run.id}] ${run.base} · ${fileCount} file${fileCount === 1 ? '' : 's'} · ${findingCount} finding${findingCount === 1 ? '' : 's'}${sha ? ` · ${sha}` : ''}`);
            }
            return true;
        } catch (error: any) {
            this.notify(error?.message || 'Failed to list review runs.');
            return true;
        }
    }

    protected async showReviewRun(id: string | undefined): Promise<boolean> {
        const resolvedId = String(id || '').trim();
        if (!resolvedId) {
            this.notify('Review run id is required. Usage: /review show <id>');
            return true;
        }
        if (!this.appRpc) {
            this.notify('Review is unavailable without app RPC.');
            return true;
        }
        const sessionId = this.state.sessionId;
        try {
            const result = await this.appRpc.request('review.get', { sessionId, id: resolvedId });
            const run = result?.run;
            if (!run) {
                this.notify(`Review run "${resolvedId}" was not found.`);
                return true;
            }
            const findings = Array.isArray(run.findings) ? run.findings : [];
            if (!findings.length) {
                this.notify(`Review run "${resolvedId}" (${run.base}) has no findings.`);
                return true;
            }
            this.notify(`Review run "${resolvedId}" (${run.base}) · ${findings.length} finding${findings.length === 1 ? '' : 's'}:`);
            for (const finding of findings) {
                const category = String(finding?.category || 'suggestion');
                const severity = String(finding?.severity || 'info');
                const file = String(finding?.anchor?.file || '?');
                const line = typeof finding?.anchor?.line === 'number' ? `:${finding.anchor.line}` : '';
                this.notify(`[${category}/${severity}] ${file}${line} ${String(finding?.summary || '')}`);
                if (String(finding?.suggestion || '').trim()) {
                    this.notify(`  fix: ${String(finding.suggestion).trim()}`);
                }
            }
            return true;
        } catch (error: any) {
            this.notify(error?.message || `Failed to load review run "${resolvedId}".`);
            return true;
        }
    }

    protected buildGitDiffReviewPrompt(base: string, files: string[], diff: string): string {
        return [
            `Review the following git diff against ${base}.`,
            `Changed files (${files.length}): ${files.join(', ')}`,
            'Analyze the diff and produce a JSON array of findings. Each finding must be an object with:',
            '- category: "correctness" | "risk" | "suggestion"',
            '- severity: "error" | "warning" | "info"',
            '- summary: short one-line description',
            '- detail: optional longer explanation',
            '- anchor: optional { "file": string, "line"?: number, "endLine"?: number } pointing into the diff',
            '- suggestion: optional concrete fix recommendation',
            'Return only the JSON array, no markdown fences, no prose.',
            '',
            '```diff',
            diff,
            '```'
        ].join('\n');
    }

    protected parseReviewFindingsFromText(text: string): Record<string, any>[] {
        const trimmed = String(text || '').trim();
        if (!trimmed) {
            return [];
        }
        const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const candidate = fenced ? fenced[1].trim() : trimmed;
        const start = candidate.indexOf('[');
        const end = candidate.lastIndexOf(']');
        if (start < 0 || end <= start) {
            return [];
        }
        try {
            const parsed = JSON.parse(candidate.slice(start, end + 1));
            return Array.isArray(parsed)
                ? parsed.filter((entry): entry is Record<string, any> => !!entry && typeof entry === 'object')
                : [];
        } catch {
            return [];
        }
    }

    protected async saveReviewFindings(sessionId: string, run: Record<string, any>): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            this.notify('Review is unavailable without app RPC.');
            return null;
        }
        try {
            const result = await this.appRpc.request('review.save', { sessionId, run });
            return result?.run ?? result ?? null;
        } catch (error: any) {
            this.notify(error?.message || 'Failed to save the review run.');
            return null;
        }
    }

    protected openGitDiffReviewPanel(review: Record<string, any>, base: string): void {
        const sessionId = this.state.sessionId;
        const reviewTask = {
            id: `git-diff:${base}`,
            title: `git diff ${base}`,
            sourceSessionId: sessionId,
            status: 'done',
            metadata: { reviewMode: 'git-diff', base }
        };
        this.state.setSessionsFocused(false);
        this.state.setTasksFocused(false);
        this.state.setJobsFocused(false);
        this.state.setToolsFocused(false);
        this.state.setApprovalsFocused(false);
        this.state.setMessagesFocused(false);
        this.state.closeMessageDetail();
        this.state.openReview(reviewTask, { diff: String(review.diff || '') || null });
        this.state.setNotice('');
        this.state.setLastError('');
    }

    protected async fetchGitDiffReview(sessionId: string, base: string): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            this.notify('Review is unavailable without app RPC.');
            return null;
        }
        try {
            await this.activateToolForSession('review_diff', sessionId);
        } catch {
            // Activation may fail when the tool is not registered; the diff
            // RPC below then surfaces the precise error.
        }
        try {
            const result = await this.appRpc.request('review.diff', { sessionId, base });
            if (!result || typeof result !== 'object' || !result.review) {
                this.notify(`Failed to gather the git diff against ${base}.`);
                return null;
            }
            return result.review as Record<string, any>;
        } catch (error: any) {
            this.notify(error?.message || `Failed to gather the git diff against ${base}.`);
            return null;
        }
    }

    protected describeCodingTaskRollback(task: any): string {
        const rollback = task?.result?.rollback;
        if (rollback?.available === true) {
            return rollback.mode ? `rollback ready (${rollback.mode})` : 'rollback ready';
        }
        if (rollback?.rolledBackAt) {
            return rollback.mode ? `rolled back (${rollback.mode})` : 'rolled back';
        }
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        const availableCheckpoint = checkpoints.find((entry: any) => entry?.status === 'available');
        if (availableCheckpoint) {
            return availableCheckpoint.mode ? `rollback ready (${availableCheckpoint.mode})` : 'rollback ready';
        }
        return 'rollback unavailable';
    }

    protected describeCodingTaskCheckpointSummary(task: any): string | undefined {
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        if (!checkpoints.length) {
            return undefined;
        }
        const available = checkpoints.filter((entry: any) => entry?.status === 'available').length;
        const applied = checkpoints.filter((entry: any) => entry?.status === 'applied').length;
        const invalidated = checkpoints.filter((entry: any) => entry?.status === 'invalidated').length;
        return `${checkpoints.length} total · ${available} available · ${applied} applied · ${invalidated} invalidated`;
    }

    protected canCancelCodingTask(task: any): boolean {
        const status = String(task?.status || '').trim();
        return status === 'planned' || status === 'running';
    }

    protected canRollbackCodingTask(task: any): boolean {
        if (!task) {
            return false;
        }
        if (task?.result?.rollback?.available === true) {
            return true;
        }
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        return checkpoints.some((entry: any) => entry?.status === 'available');
    }

    protected canRetryCodingTask(task: any): boolean {
        if (!task) {
            return false;
        }
        const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
        if (workers.some((worker: any) => worker?.status === 'failed')) {
            return true;
        }
        return Number(task?.result?.aggregate?.failedWorkers || 0) > 0;
    }

    protected resolveCodingTaskRetrySourceTaskId(task: any): string | undefined {
        const value = task?.retryOfTaskId || task?.metadata?.retrySourceTaskId || task?.metadata?.retryOfTaskId;
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    protected buildCodingTaskLineageMetadata(task: any, tasks: any[]): {
        retryOfTaskId?: string;
        lineageRootTaskId: string;
        retryDepth?: number;
        lineageTaskCount: number;
    } {
        const taskId = String(task?.id || '').trim();
        const retryOfTaskId = this.resolveCodingTaskRetrySourceTaskId(task);
        const taskById = new Map<string, any>(tasks
            .filter(item => typeof item?.id === 'string' && item.id.trim())
            .map(item => [String(item.id).trim(), item]));
        const seen = new Set<string>();
        let lineageRootTaskId = taskId;
        let retryDepth = 0;
        let currentRetrySource = retryOfTaskId;
        while (currentRetrySource && !seen.has(currentRetrySource)) {
            seen.add(currentRetrySource);
            lineageRootTaskId = currentRetrySource;
            retryDepth += 1;
            const nextTask = taskById.get(currentRetrySource);
            currentRetrySource = nextTask ? this.resolveCodingTaskRetrySourceTaskId(nextTask) : undefined;
        }
        const lineageTaskCount = tasks.filter(item => {
            const itemId = String(item?.id || '').trim();
            if (!itemId) {
                return false;
            }
            if (itemId === lineageRootTaskId) {
                return true;
            }
            const source = this.resolveCodingTaskRetrySourceTaskId(item);
            if (!source) {
                return false;
            }
            const itemSeen = new Set<string>();
            let current: string | undefined = source;
            while (current && !itemSeen.has(current)) {
                if (current === lineageRootTaskId) {
                    return true;
                }
                itemSeen.add(current);
                const nextTask = taskById.get(current);
                current = nextTask ? this.resolveCodingTaskRetrySourceTaskId(nextTask) : undefined;
            }
            return false;
        }).length || 1;
        return {
            ...(retryOfTaskId ? { retryOfTaskId } : {}),
            lineageRootTaskId: lineageRootTaskId || taskId,
            ...(retryDepth > 0 ? { retryDepth } : {}),
            lineageTaskCount
        };
    }

    protected buildCodingTaskChoice(task: any, tasks: any[] = []) {
        const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
        const rollback = task?.result?.rollback;
        const lineage = this.buildCodingTaskLineageMetadata(task, tasks.length ? tasks : [task]);
        return {
            id: task.id,
            title: String(task.title || task.id),
            sourceSessionId: String(task?.sourceSessionId || task?.sessionId || '').trim() || undefined,
            status: task.status,
            executionMode: task?.result?.executionMode ?? task?.metadata?.executionMode ?? null,
            workerCount: workers.length,
            rollbackAvailable: this.canRollbackCodingTask(task),
            rollbackMode: rollback?.mode,
            checkpointSummary: this.describeCodingTaskCheckpointSummary(task),
            retryOfTaskId: lineage.retryOfTaskId,
            lineageRootTaskId: lineage.lineageRootTaskId,
            retryDepth: lineage.retryDepth,
            lineageTaskCount: lineage.lineageTaskCount,
            updatedAt: task.updatedAt,
            detail: task?.result?.diff?.summary || task?.planning?.summary || task?.goal
        };
    }

    protected orderCodingTasksByLineage(tasks: any[]): any[] {
        const tasksById = new Map<string, any>(tasks
            .filter(task => typeof task?.id === 'string' && task.id.trim())
            .map(task => [String(task.id).trim(), task]));
        const childrenByParent = new Map<string, any[]>();
        const roots: any[] = [];

        for (const task of tasks) {
            const parentId = this.resolveCodingTaskRetrySourceTaskId(task);
            if (!parentId || !tasksById.has(parentId)) {
                roots.push(task);
                continue;
            }
            const siblings = childrenByParent.get(parentId) || [];
            siblings.push(task);
            childrenByParent.set(parentId, siblings);
        }

        const compareByUpdatedAt = (left: any, right: any) => {
            const activityDelta = Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return String(left?.id || '').localeCompare(String(right?.id || ''));
        };
        const computeFamilyUpdatedAt = (task: any, seen = new Set<string>()): number => {
            const taskId = String(task?.id || '').trim();
            if (!taskId || seen.has(taskId)) {
                return Number(task?.updatedAt || 0);
            }
            seen.add(taskId);
            const childMax = (childrenByParent.get(taskId) || [])
                .reduce((max, child) => Math.max(max, computeFamilyUpdatedAt(child, new Set(seen))), 0);
            return Math.max(Number(task?.updatedAt || 0), childMax);
        };

        roots.sort((left, right) => {
            const activityDelta = computeFamilyUpdatedAt(right) - computeFamilyUpdatedAt(left);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return compareByUpdatedAt(left, right);
        });
        for (const siblings of childrenByParent.values()) {
            siblings.sort(compareByUpdatedAt);
        }

        const ordered: any[] = [];
        const visited = new Set<string>();
        const visit = (task: any) => {
            const taskId = String(task?.id || '').trim();
            if (!taskId || visited.has(taskId)) {
                return;
            }
            visited.add(taskId);
            ordered.push(task);
            for (const child of childrenByParent.get(taskId) || []) {
                visit(child);
            }
        };

        for (const root of roots) {
            visit(root);
        }
        const remaining = tasks.filter(task => !visited.has(String(task?.id || '').trim())).sort(compareByUpdatedAt);
        for (const task of remaining) {
            visit(task);
        }
        return ordered;
    }

    protected buildCodingTaskSelectOption(task: any, tasks: any[] = []): AgentConsoleSelectOption {
        const choice = this.buildCodingTaskChoice(task, tasks);
        const lineageSegments = choice.retryOfTaskId
            ? [
                `retry ${typeof choice.retryDepth === 'number' ? choice.retryDepth : 1}`,
                `from ${choice.retryOfTaskId}`
            ]
            : ['root'];
        if (typeof choice.lineageTaskCount === 'number') {
            lineageSegments.push(`lineage ${choice.lineageTaskCount}`);
        }
        return {
            label: `${choice.id} · ${choice.title}`,
            value: choice.id,
            description: [
                ...lineageSegments,
                choice.sourceSessionId ? `session ${choice.sourceSessionId}` : '',
                choice.status,
                choice.executionMode,
                `${choice.workerCount || 0} worker${choice.workerCount === 1 ? '' : 's'}`,
                this.describeCodingTaskRollback(task)
            ].filter(Boolean).join(' · ') || 'review',
            detail: [
                `Task: ${choice.id}`,
                `Title: ${choice.title}`,
                choice.sourceSessionId ? `Session: ${choice.sourceSessionId}` : '',
                choice.status ? `Status: ${choice.status}` : '',
                choice.executionMode ? `Mode: ${choice.executionMode}` : '',
                choice.retryOfTaskId ? `Retry Of: ${choice.retryOfTaskId}` : '',
                choice.lineageRootTaskId ? `Lineage Root: ${choice.lineageRootTaskId}` : '',
                typeof choice.retryDepth === 'number' ? `Retry Depth: ${choice.retryDepth}` : '',
                typeof choice.lineageTaskCount === 'number' && choice.lineageTaskCount > 1 ? `Lineage Tasks: ${choice.lineageTaskCount}` : '',
                `Workers: ${choice.workerCount || 0}`,
                `Rollback: ${this.describeCodingTaskRollback(task)}`,
                choice.checkpointSummary ? `Checkpoints: ${choice.checkpointSummary}` : '',
                task?.result?.diff?.summary ? `Diff: ${task.result.diff.summary}` : '',
                task?.planning?.summary ? `Plan: ${task.planning.summary}` : '',
                task?.goal ? `Goal: ${task.goal}` : ''
            ].filter(Boolean).join('\n')
        };
    }

    protected async loadCodingTasks(sessionId = this.state.sessionId, sessionIds = this.resolveProjectSessionIdsFor(sessionId)): Promise<any[]> {
        if (!this.appRpc) {
            if (sessionId === this.state.sessionId) {
                    this.state.setTaskRecords([]);
                    this.state.setReviewTasks([]);
            }
            return [];
        }
        const responses = await Promise.allSettled(sessionIds.map(async sessionId => {
            const result = await this.appRpc!.request('coding_task.list', { sessionId });
            const tasks = Array.isArray(result?.tasks) ? result.tasks : [];
            return tasks.map((task: any) => ({
                ...task,
                sourceSessionId: sessionId
            }));
        }));
        const tasks = this.orderCodingTasksByLineage(
            responses
                .flatMap(result => result.status === 'fulfilled' ? result.value : [])
                .sort((left, right) => {
                    const activityDelta = Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0);
                    if (activityDelta !== 0) {
                        return activityDelta;
                    }
                    return String(left?.id || '').localeCompare(String(right?.id || ''));
                })
        );
        if (sessionId !== this.state.sessionId) {
            return tasks;
        }
            this.state.setTaskRecords(tasks);
            this.state.setReviewTasks(tasks.map((task: any) => this.buildCodingTaskChoice(task, tasks)));
        return tasks;
    }

    protected async openCodingTaskReviewSelector(): Promise<boolean> {
        const selectedTask = await this.selectCodingTask({
            title: 'Coding tasks',
            unavailableNotice: 'Review is unavailable without app RPC.',
            emptyNotice: 'No coding tasks available.',
            selectedTaskId: String(this.state.reviewTask?.id || this.state.selectedTask?.id || '').trim() || undefined
        });
        if (!selectedTask) {
            return true;
        }
        await this.openCodingTaskReview(selectedTask.id, selectedTask);
        return true;
    }

    protected async openThreadCodingTaskReviewSelector(): Promise<boolean> {
        const selectedTask = await this.selectCodingTask({
            title: 'Coding tasks (thread)',
            unavailableNotice: 'Review is unavailable without app RPC.',
            emptyNotice: 'No coding tasks available in this thread.',
            selectedTaskId: String(this.state.reviewTask?.id || this.state.selectedTask?.id || '').trim() || undefined,
            sessionIds: this.resolveThreadSessionIdsFor()
        });
        if (!selectedTask) {
            return true;
        }
        await this.openCodingTaskReview(selectedTask.id, selectedTask);
        return true;
    }

    protected async selectCodingTask(options: {
        title: string;
        unavailableNotice: string;
        emptyNotice: string;
        filter?: (task: any) => boolean;
        selectedTaskId?: string;
        sessionIds?: string[];
    }): Promise<any | null> {
        if (!this.appRpc) {
            this.notify(options.unavailableNotice);
            return null;
        }
        const tasks = await this.loadCodingTasks(undefined, options.sessionIds);
        const filteredTasks = typeof options.filter === 'function'
            ? tasks.filter(task => options.filter!(task))
            : tasks;
        if (!filteredTasks.length) {
            this.notify(options.emptyNotice);
            return null;
        }
        const selectedIndex = Math.max(0, filteredTasks.findIndex(task => task?.id === options.selectedTaskId));
        const selectedTaskId = await this.select(
            options.title,
            filteredTasks.map((task: any) => this.buildCodingTaskSelectOption(task, filteredTasks)),
            selectedIndex,
            this.state.consoleOptions.selectHint
        );
        if (!selectedTaskId) {
            return null;
        }
        return filteredTasks.find((task: any) => task.id === selectedTaskId) || null;
    }

    protected async openCodingTaskInspector(taskId?: string, options?: { returnFalseOnStale?: boolean }): Promise<boolean> {
        if (!this.appRpc) {
            this.notify('Task inspector is unavailable without app RPC.');
            return true;
        }
        const taskViewContextVersion = ++this.taskViewContextVersion;
        const tasks = await this.loadCodingTasks();
        if (taskViewContextVersion !== this.taskViewContextVersion) {
            return options?.returnFalseOnStale ? false : true;
        }
        if (!tasks.length) {
            this.notify('No coding tasks available.');
            return true;
        }
        const resolvedTaskId = String(taskId || '').trim();
        const preferredTaskId = String(this.state.reviewTask?.id || this.state.selectedTask?.id || '').trim();
        const selectedTaskId = resolvedTaskId && tasks.some((task: any) => task.id === resolvedTaskId)
            ? resolvedTaskId
            : preferredTaskId && tasks.some((task: any) => task.id === preferredTaskId)
                ? preferredTaskId
                : tasks[0].id;
            this.state.setSessionsFocused(false);
            this.state.setToolsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.setJobsFocused(false);
            this.state.setMessagesFocused(false);
            this.state.closeMessageDetail();
            this.state.closeReview();
            this.state.closeGitSnapshotDetail();
            this.state.setSelectedReviewTaskId(selectedTaskId);
            this.state.setTasksFocused(true);
            this.state.setNotice('');
            this.state.setLastError('');
        return true;
    }

    protected async rollbackCodingTask(taskId?: string): Promise<boolean> {
        const fallbackTask = this.resolveFocusedCodingTask();
        const explicitTaskId = String(taskId || '').trim();
        let selectedTask = fallbackTask || null;
        let resolvedTaskId = explicitTaskId || String(fallbackTask?.id || '').trim();
        if (!resolvedTaskId || (!explicitTaskId && selectedTask && !this.canRollbackCodingTask(selectedTask))) {
            selectedTask = await this.selectCodingTask({
                title: 'Rollback coding tasks',
                unavailableNotice: 'Rollback is unavailable without app RPC.',
                emptyNotice: 'No rollbackable coding tasks available.',
                filter: (task: any) => this.canRollbackCodingTask(task),
                selectedTaskId: String(fallbackTask?.id || '').trim() || undefined
            });
            if (!selectedTask) {
                return true;
            }
            resolvedTaskId = String(selectedTask.id || '').trim();
        }
        if (!resolvedTaskId) {
            this.notify('Rollback task id is required.');
            return true;
        }
        if (!this.appRpc) {
            this.notify('Rollback is unavailable without app RPC.');
            return true;
        }
        if (selectedTask && selectedTask.id === resolvedTaskId && !this.canRollbackCodingTask(selectedTask)) {
            this.notify(`Rollback is unavailable for ${resolvedTaskId}.`);
            return true;
        }

        const sessionId = this.resolveCodingTaskSessionId(selectedTask);
        const taskViewContext = this.captureTaskViewContext();
        const result = await this.appRpc.request('coding_task.rollback', { sessionId, taskId: resolvedTaskId });
        if (result?.rolledBack !== true) {
            this.notify(`Rollback failed for ${resolvedTaskId}.`);
            return true;
        }
        if (!this.isTaskViewContextCurrent(taskViewContext)) {
            return true;
        }

        const opened = await this.openCodingTaskReview(resolvedTaskId, result?.task ?? null, { returnFalseOnStale: true });
        if (!opened || sessionId !== this.state.sessionId) {
            return true;
        }
        this.notify(`Rolled back ${resolvedTaskId}.`);
        return true;
    }

    protected async retryFailedCodingTask(taskId?: string): Promise<boolean> {
        const fallbackTask = this.resolveFocusedCodingTask();
        const explicitTaskId = String(taskId || '').trim();
        let selectedTask = fallbackTask || null;
        let resolvedTaskId = explicitTaskId || String(fallbackTask?.id || '').trim();
        if (!resolvedTaskId || (!explicitTaskId && selectedTask && !this.canRetryCodingTask(selectedTask))) {
            selectedTask = await this.selectCodingTask({
                title: 'Retry coding tasks',
                unavailableNotice: 'Retry is unavailable without app RPC.',
                emptyNotice: 'No retryable coding tasks available.',
                filter: (task: any) => this.canRetryCodingTask(task),
                selectedTaskId: String(fallbackTask?.id || '').trim() || undefined
            });
            if (!selectedTask) {
                return true;
            }
            resolvedTaskId = String(selectedTask.id || '').trim();
        }
        if (!resolvedTaskId) {
            this.notify('Retry task id is required.');
            return true;
        }
        if (!this.appRpc) {
            this.notify('Retry is unavailable without app RPC.');
            return true;
        }
        if (selectedTask && selectedTask.id === resolvedTaskId && !this.canRetryCodingTask(selectedTask)) {
            this.notify(`Retry is unavailable for ${resolvedTaskId}.`);
            return true;
        }

        const sessionId = this.resolveCodingTaskSessionId(selectedTask);
        const taskViewContext = this.captureTaskViewContext();
        const result = await this.appRpc.request('coding_task.retry_failed', { sessionId, taskId: resolvedTaskId });
        if (result?.retried !== true || !result?.task?.id) {
            this.notify(`Retry failed for ${resolvedTaskId}.`);
            return true;
        }
        if (!this.isTaskViewContextCurrent(taskViewContext)) {
            return true;
        }

        const opened = await this.openCodingTaskReview(result.task.id, result.task, { returnFalseOnStale: true });
        if (!opened || sessionId !== this.state.sessionId) {
            return true;
        }
        this.notify(`Retried failed workers from ${resolvedTaskId} as ${result.task.id}.`);
        return true;
    }

    protected async refreshScheduledTasks(): Promise<void> {
        if (!this.scheduler) {
            return;
        }
        this.state.setScheduledTasks(this.scheduler.getTasks());
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    protected async openScheduledJobsDashboard(taskId?: string): Promise<boolean> {
        if (!this.scheduler) {
            this.notify('Scheduler is unavailable.');
            return true;
        }
        const tasks = this.scheduler.getTasks();
            this.state.setScheduledTasks(tasks);
            this.state.setSessionsFocused(false);
            this.state.setTasksFocused(false);
            this.state.setToolsFocused(false);
            this.state.setApprovalsFocused(false);
            this.state.setMessagesFocused(false);
            this.state.closeMessageDetail();
            this.state.closeReview();
            this.state.closeGitSnapshotDetail();
            this.state.setJobsFocused(true);
            if (taskId) {
                this.state.setSelectedScheduledTaskId(taskId);
            }
            this.state.setNotice('');
            this.state.setLastError('');
        return true;
    }

    protected async toggleScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        const selected = this.state.selectedScheduledTask;
        if (!selected || selected.id !== resolvedTaskId) {
            this.notify(`Scheduled task "${resolvedTaskId}" was not found.`);
            return true;
        }
        if (selected.paused) {
            return this.resumeScheduledTask(resolvedTaskId);
        }
        return this.pauseScheduledTask(resolvedTaskId);
    }

    protected async pauseScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        if (!this.scheduler.pause) {
            this.notify('Pause is unavailable on the configured scheduler.');
            return true;
        }
        const task = await this.scheduler.pause(resolvedTaskId);
        if (!task) {
            this.notify(`Pause failed for ${resolvedTaskId}.`);
            return true;
        }
        await this.refreshScheduledTasks();
        this.state.setSelectedScheduledTaskId(resolvedTaskId);
        this.notify(`Paused ${resolvedTaskId}.`);
        return true;
    }

    protected async resumeScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        if (!this.scheduler.resume) {
            this.notify('Resume is unavailable on the configured scheduler.');
            return true;
        }
        const task = await this.scheduler.resume(resolvedTaskId);
        if (!task) {
            this.notify(`Resume failed for ${resolvedTaskId}.`);
            return true;
        }
        await this.refreshScheduledTasks();
        this.state.setSelectedScheduledTaskId(resolvedTaskId);
        this.notify(`Resumed ${resolvedTaskId}.`);
        return true;
    }

    protected async cancelScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        await this.scheduler.cancel(resolvedTaskId);
        await this.refreshScheduledTasks();
        this.notify(`Cancelled ${resolvedTaskId}.`);
        return true;
    }

    protected async recoverScheduledTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedScheduledTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Scheduled task id is required.');
            return true;
        }
        if (!this.scheduler.recover) {
            this.notify('Recover is unavailable on the configured scheduler.');
            return true;
        }
        const task = await this.scheduler.recover(resolvedTaskId);
        if (!task) {
            this.notify(`Recover failed for ${resolvedTaskId}.`);
            return true;
        }
        await this.refreshScheduledTasks();
        this.state.setSelectedScheduledTaskId(resolvedTaskId);
        this.notify(`Recovered ${resolvedTaskId}.`);
        return true;
    }

    protected async cancelCodingTask(taskId?: string): Promise<boolean> {
        const resolvedTaskId = String(taskId || this.state.selectedTask?.id || '').trim();
        if (!resolvedTaskId) {
            this.notify('Cancel task id is required.');
            return true;
        }
        if (!this.appRpc) {
            this.notify('Cancel is unavailable without app RPC.');
            return true;
        }
        const targetTask = this.state.selectedTask;
        if (targetTask && targetTask.id === resolvedTaskId && !this.canCancelCodingTask(targetTask)) {
            this.notify(`Cancel is unavailable for ${resolvedTaskId}.`);
            return true;
        }

        const sessionId = this.resolveCodingTaskSessionId(targetTask);
        const taskViewContext = this.captureTaskViewContext();
        const result = await this.appRpc.request('coding_task.cancel', { sessionId, taskId: resolvedTaskId });
        if (result?.cancelled !== true) {
            this.notify(`Cancel failed for ${resolvedTaskId}.`);
            return true;
        }
        if (!this.isTaskViewContextCurrent(taskViewContext)) {
            return true;
        }

        const opened = await this.openCodingTaskInspector(resolvedTaskId, { returnFalseOnStale: true });
        if (!opened || sessionId !== this.state.sessionId) {
            return true;
        }
        this.notify(`Cancelled ${resolvedTaskId}.`);
        return true;
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
                    { label: '/model', value: '/model', description: 'switch model or queue next-turn profile' },
                    { label: '/plan', value: '/plan', description: 'toggle read-only plan mode (write tools denied)' },
                    { label: '/archetype', value: '/archetype', description: 'switch session archetype: /archetype [build|plan|review|name]' },
                    { label: '/vim', value: '/vim', description: 'toggle vim-style normal/insert input mode' },
                    { label: '/keymap', value: '/keymap', description: 'list/set/unset/reset key bindings per context (global/composer/list/approval/pager/vim); record <action> captures the next key' },
                    { label: '/permissions', value: '/permissions', description: 'show or change readonly/sandbox session permissions' },
                    { label: '/status', value: '/status', description: 'show session status' },
                    { label: '/goal', value: '/goal', description: 'create, show, link, complete, or reopen a persistent goal' },
                    { label: '/undo', value: '/undo', description: 'revert the last file change' },
                    { label: '/redo', value: '/redo', description: 're-apply the last undone file change' },
                    { label: '/export', value: '/export', description: 'export session transcript [json|jsonl] [sessionId] [path]' },
                    { label: '/attach', value: '/attach', description: 'attach an image for the next prompt' },
                    { label: '/ssh', value: '/ssh', description: 'SSH hosts: list / connect / disconnect / forward' },
                    { label: '/init', value: '/init', description: 'generate AGENTS.md project context' },
                    { label: '/sessions', value: '/sessions', description: 'sessions' },
                    { label: '/title', value: '/title', description: 'set current session title: /title <name> (blank clears)' },
                    { label: '/pin', value: '/pin', description: 'pin the current session to the top of the list' },
                    { label: '/unpin', value: '/unpin', description: 'unpin the current session' },
                    { label: '/snapshot', value: '/snapshot', description: 'snapshot current session: /snapshot [label]' },
                    { label: '/snapshots', value: '/snapshots', description: 'list / restore / delete session snapshots' },
                    { label: '/sections', value: '/sections', description: 'session sections: /sections [<label> to create]' },
                    { label: '/git-snapshots', value: '/git-snapshots', description: 'git step snapshots: list / diff <ref> / revert <messageId> / unrevert' },
                    { label: '/messages', value: '/messages', description: 'messages' },
                    { label: '/jobs', value: '/jobs', description: 'scheduled jobs' },
                    { label: '/tasks', value: '/tasks', description: 'task inspector' },
                    { label: '/threadplan', value: '/threadplan', description: 'thread plan todos' },
                    { label: '/threadreview', value: '/threadreview', description: 'thread coding task review' },
                    { label: '/review', value: '/review', description: 'coding task review' },
                    { label: '/diff', value: '/diff', description: 'worktree diff: /diff [--staged|--unstaged|--untracked|paths]' },
                    { label: '/theme', value: '/theme', description: 'preview or apply a saved UI theme' },
                    { label: '/thinking', value: '/thinking', description: 'toggle reasoning/thinking message visibility (Ctrl+X T)' },
                    { label: '/display', value: '/display', description: 'toggle message timestamp visibility: /display [on|off]' },
                    { label: '/timeline', value: '/timeline', description: 'toggle compact chronological timeline view (Ctrl+X G)' },
                    { label: '/raw', value: '/raw', description: 'toggle raw plain-text scrollback (no markdown reflow): /raw [on|off]' },
                    { label: '/stash', value: '/stash', description: 'named draft stash: /stash [list|push <name>|pop <name>|rm <name>]' },
                    { label: '/skills', value: '/skills', description: 'browse skills: /skills [query | <id>]' },
                    { label: '/mcp', value: '/mcp', description: 'list MCP servers and tools: /mcp [verbose]' },
                    { label: '/plugins', value: '/plugins', description: 'browse installed plugins: /plugins [<id>]' },
                    { label: '/apps', value: '/apps', description: 'browse connectors or insert one into the prompt: /apps [<id>]' },
                    { label: '/statusline', value: '/statusline', description: 'status bar fields: list / set field1,field2 / unset field' },
                    { label: '/hooks', value: '/hooks', description: 'show registered lifecycle hooks (stages + shell commands + functions)' },
                    { label: '/memories', value: '/memories', description: 'memory injection: status / on / off' },
                    { label: '/fast', value: '/fast', description: 'switch to fast/strong model profile: /fast [profile]' },
                    { label: '/personality', value: '/personality', description: 'personality presets: list / set <name> / unset' },
                    { label: '/debug-config', value: '/debug-config', description: 'show resolved config (model, profile, ui options, session)' },
                    { label: '/settings', value: '/settings', description: 'unified settings dialog: general, keybinds, providers' },
                    { label: '/experimental', value: '/experimental', description: 'experimental features: list / <name> on|off' },
                    { label: '/feedback', value: '/feedback', description: 'packaging diagnostics for feedback reports' },
                    { label: '/ide', value: '/ide', description: 'IDE bridge: show attached editor context' },
                    { label: '/editor', value: '/editor', description: 'edit the draft in an external editor (Ctrl+G)' },
                    { label: '/ps', value: '/ps', description: 'background tasks: list / stop <id>' },
                    { label: '/resume', value: '/resume', description: 'resume an existing or archived session' },
                    { label: '/archive', value: '/archive', description: 'archive the current session without deleting its transcript' },
                    { label: '/fork', value: '/fork', description: 'fork the current session [messageId]' },
                    { label: '/side', value: '/side', description: 'open a temporary side session fork' },
                    { label: '/retry', value: '/retry', description: 'retry failed workers' },
                    { label: '/rollback', value: '/rollback', description: 'rollback coding task' },
                    { label: '/multiline', value: '/multiline', description: 'multiline' },
                    { label: '/cancel', value: '/cancel', description: 'cancel running turn' },
                    { label: '/copy', value: '/copy', description: 'copy reply' },
                    { label: '/share', value: '/share', description: 'create a shareable link for this session (gateway)' },
                    { label: '/unshare', value: '/unshare', description: 'revoke a session share: /unshare [token]' },
                    { label: '/approvals', value: '/approvals', description: 'approvals' },
                    { label: '/approve retry', value: '/approve retry', description: 'retry the most recent auto-review-rejected action once' },
                    { label: '/usage', value: '/usage', description: 'usage [daily|weekly|cumulative] [sessionId] [since]' },
                    { label: '/quality', value: '/quality', description: 'quality stats / list / trend by provider' },
                    { label: '/quality trend', value: '/quality trend', description: 'quality trend [provider] [bucketSize] [maxBuckets]' },
                    { label: '/compact', value: '/compact', description: 'force compaction now [reason]' },
                    { label: '/compactions', value: '/compactions', description: 'compaction history [sessionId]' },
                    { label: '/compactions trend', value: '/compactions trend', description: 'compaction trend [sessionId] [bucketSize] [maxBuckets]' },
                    { label: '/diagnostics', value: '/diagnostics', description: 'turn diagnostics [sessionId]' },
                    { label: '/diagnostics list', value: '/diagnostics list', description: 'turn diagnostics records [sessionId]' },
                    { label: '/diagnostics trend', value: '/diagnostics trend', description: 'turn diagnostics trend [sessionId] [bucketSize] [maxBuckets]' },
                    { label: '/delegation', value: '/delegation', description: 'delegation edges [sessionId]' },
                    { label: '/delegation tree', value: '/delegation tree', description: 'delegation tree [sessionId] [status] [depth]' },
                    { label: '/delegation lineage', value: '/delegation lineage', description: 'delegation lineage [sessionId]' },
                    { label: '/delegation mode', value: '/delegation mode', description: 'delegation mode [disabled|explicit|proactive|default]' },
                    { label: '/harness audit', value: '/harness audit', description: 'failure-pattern audit [sessionId]' },
                    { label: '/harness profile', value: '/harness profile', description: 'governance profile list/current/diff' },
                    { label: '/voice', value: '/voice', description: 'voice session status/start/stop/cancel' },
                    { label: '@workspace', value: '@workspace', description: 'context' },
                    { label: '/exit', value: '/exit', description: 'exit' }
                ], 0, this.state.consoleOptions.selectHint);
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
                    const modelArgs = String(parsed.args || '').trim();
                    if (modelArgs.toLowerCase().startsWith('once')) {
                        const profileName = modelArgs.slice(4).trim();
                        if (!profileName) {
                            this.notify('Usage: /model once <profile>.');
                            return true;
                        }
                        await this.queueNextTurnModelProfile(profileName);
                        return true;
                    }
                    await this.activateModelProfile(parsed.args);
                    return true;
                }
                await this.openModelSwitcher();
                return true;
            case '/init':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.runInitCommand(parsed.args);
                return true;
            case '/plan':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.runPlanCommand(parsed.args);
                return true;
            case '/archetype':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.runArchetypeCommand(parsed.args);
                return true;
            case '/vim':
                await this.runVimCommand(parsed.args);
                return true;
            case '/keymap':
                await this.runKeymapCommand(parsed.args);
                return true;
            case '/permissions':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.runPermissionsCommand(parsed.args);
                return true;
            case '/status':
                await this.runStatusCommand();
                return true;
            case '/goal':
                await this.runGoalCommand(parsed.args);
                return true;
            case '/undo':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.runUndoCommand();
                return true;
            case '/redo':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.runRedoCommand();
                return true;
            case '/export':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.runExportCommand(parsed.args);
            case '/attach':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.runAttachCommand(parsed.args);
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
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                this.state.setToolsFocused(true);
                return true;
            case '/skills':
                return this.runSkillsCommand(parsed.args);
            case '/mcp':
                return this.runMcpCommand(parsed.args);
            case '/plugins':
                return this.runPluginsCommand(parsed.args);
            case '/apps':
                return this.runAppsCommand(parsed.args);
            case '/ssh':
                await this.runSshCommand(parsed.args);
                return true;
            case '/jobs':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.openScheduledJobsDashboard(parsed.args);
            case '/tasks':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.openCodingTaskInspector(parsed.args);
            case '/threadplan':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.refreshThreadTodoPlan();
                await this.loadThreadCodingTasks();
                if (!this.state.planTodos.length) {
                    this.notify('No plan todos in this thread.');
                }
                this.state.setSessionsFocused(false);
                this.state.setToolsFocused(false);
                this.state.setApprovalsFocused(false);
                this.state.setJobsFocused(false);
                this.state.setMessagesFocused(false);
                this.state.setTasksFocused(true);
                return true;
            case '/threadreview':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.openThreadCodingTaskReviewSelector();
            case '/review':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (parsed.args) {
                    const arg = parsed.args.trim();
                    if (arg === 'summary') {
                        const lines = this.state.getReviewAnnotationSummary();
                        for (const line of lines) {
                            this.notify(line);
                        }
                        return true;
                    }
                    if (arg === 'approve-all') {
                        this.state.approveAllReviewFiles();
                        this.notify('All files approved.');
                        return true;
                    }
                    if (arg === 'clear-all') {
                        this.state.clearAllReviewAnnotations();
                        this.notify('All annotations cleared.');
                        return true;
                    }
                    if (arg === 'clear') {
                        this.state.clearReviewFileAnnotation();
                        this.notify('Annotation cleared.');
                        return true;
                    }
                    if (arg === 'export') {
                        const report = this.state.getReviewExportReport();
                        if (!report.length) {
                            this.notify('No review data to export.');
                            return true;
                        }
                        for (const line of report) {
                            this.notify(line);
                        }
                        return true;
                    }
                    if (arg === 'risk') {
                        const sections = this.state.reviewFileSections;
                        if (!sections.length) {
                            this.notify('No review files to analyze.');
                            return true;
                        }
                        for (const section of sections) {
                            const risk = this.state.computeFileRiskScore(section);
                            const annot = this.state.reviewFileAnnotations[section.path];
                            const marker = annot ? (annot.status === 'approved' ? ' ✓' : ' ✗') : '';
                            this.notify(`${String(risk.score).padStart(2, ' ')} ${risk.level.padEnd(8, ' ')} ${section.path} (+${section.additions}/-${section.deletions})${marker}${annot?.comment ? ` - ${annot.comment}` : ''}`);
                        }
                        return true;
                    }
                    if (arg.startsWith('approve')) {
                        const comment = arg.slice(7).trim() || undefined;
                        this.state.setReviewFileAnnotation('approved', comment);
                        this.notify(comment ? `File approved: ${comment}` : 'File approved.');
                        return true;
                    }
                    if (arg.startsWith('reject')) {
                        const comment = arg.slice(6).trim() || undefined;
                        this.state.setReviewFileAnnotation('rejected', comment);
                        this.notify(comment ? `File rejected: ${comment}` : 'File rejected.');
                        return true;
                    }
                    if (arg === 'diff' || arg.startsWith('diff ')) {
                        const base = arg.length > 5 ? arg.slice(5).trim() : undefined;
                        return this.openGitDiffReview(base);
                    }
                    if (arg === 'run' || arg.startsWith('run ')) {
                        const base = arg.length > 4 ? arg.slice(4).trim() : undefined;
                        return this.runGitDiffReviewAnalysis(base);
                    }
                    if (arg === 'findings' || arg.startsWith('findings ')) {
                        const commit = arg.length > 9 ? arg.slice(9).trim() : undefined;
                        return this.listReviewFindings(commit);
                    }
                    if (arg === 'show' || arg.startsWith('show ')) {
                        const id = arg.length > 5 ? arg.slice(5).trim() : undefined;
                        return this.showReviewRun(id);
                    }
                    await this.openCodingTaskReview(arg);
                    return true;
                }
                return this.openCodingTaskReviewSelector();
            case '/diff':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.openWorktreeDiff(parsed.args);
            case '/theme':
                return this.runThemeCommand(parsed.args);
            case '/thinking':
                return this.runThinkingCommand(parsed.args);
            case '/display':
                return this.runDisplayCommand(parsed.args);
            case '/timeline':
                await this.toggleTimelineMode();
                return true;
            case '/raw':
                return this.runRawModeCommand(parsed.args);
            case '/stash':
                return this.runStashCommand(parsed.args);
            case '/statusline':
                return this.runStatuslineCommand(parsed.args);
            case '/hooks':
                return this.runHooksCommand();
            case '/memories':
                return this.runMemoriesCommand(parsed.args);
            case '/fast':
                return this.runFastCommand(parsed.args);
            case '/personality':
                return this.runPersonalityCommand(parsed.args);
            case '/debug-config':
                return this.runDebugConfigCommand();
            case '/settings':
                return this.runSettingsCommand();
            case '/experimental':
                return this.runExperimentalCommand(parsed.args);
            case '/feedback':
                return this.runFeedbackCommand();
            case '/ps':
                return this.runBackgroundTasksCommand(parsed.args);
            case '/ide':
                return this.runIdeCommand(parsed.args);
            case '/editor':
                return this.runEditorCommand(parsed.args);
            case '/retry':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.retryFailedCodingTask(parsed.args);
            case '/rollback':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.rollbackCodingTask(parsed.args);
            case '/clear':
                await this.openSession(undefined);
                this.notify('Started a new session.');
                return true;
            case '/approvals': {
                const pending = await this.getPendingApprovals(this.state.sessionId);
                if (!pending.length) {
                    this.notify('No pending approvals.');
                    return true;
                }
                this.state.setPendingApprovals(pending as AgentConsoleApprovalRequest[]);
                this.state.setSessionsFocused(false);
                this.state.setToolsFocused(false);
                this.state.setMessagesFocused(false);
                this.state.closeMessageDetail();
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                this.state.setApprovalsFocused(true);
                this.updateTerminalTitle();
                return true;
            }
            case '/usage':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                return this.openUsage(parsed.args?.trim() || undefined);
            case '/quality': {
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                const arg = parsed.args?.trim() || '';
                if (arg === 'list' || arg.startsWith('list ')) {
                    const provider = arg.slice(4).trim() || undefined;
                    return this.openSummaryQualityRecords(provider);
                }
                if (arg === 'trend' || arg.startsWith('trend ')) {
                    const { provider, bucketSize, maxBuckets } = this.parseSummaryQualityTrendArgs(arg.slice(5));
                    return this.openSummaryQualityTrend(provider, bucketSize, maxBuckets);
                }
                const provider = arg || undefined;
                const aggregates = this.sessionService
                    ? await this.sessionService.getSummaryQualityStats(provider)
                    : [];
                if (!aggregates.length) {
                    this.notify(
                        provider
                            ? `No summary quality stats recorded for provider '${provider}'.`
                            : 'No summary quality stats recorded yet.'
                    );
                    return true;
                }
                this.notify(
                    aggregates
                        .map(item => this.formatSummaryQualityAggregate(item))
                        .join(' | ')
                );
                return true;
            }
            case '/compactions':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                {
                    const arg = parsed.args?.trim() || '';
                    if (arg === 'trend' || arg.startsWith('trend ')) {
                        const { sessionId, bucketSize, maxBuckets } = this.parseCompactionHistoryTrendArgs(arg.slice(5));
                        return this.openCompactionHistoryTrend(sessionId, bucketSize, maxBuckets);
                    }
                }
                return this.openCompactionHistory(parsed.args);
            case '/compact': {
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                const reason = parsed.args?.trim() || undefined;
                const result = await this.sessionService?.compactSession(this.state.sessionId, reason) ?? { compacted: false };
                if (result.error) {
                    this.notify(`Compaction failed: ${result.error}`);
                    return true;
                }
                if (!result.compacted) {
                    this.notify('Nothing to compact: history already within budget.');
                    return true;
                }
                const summary = typeof result.summary === 'string' && result.summary.trim()
                    ? ` · ${result.summary.trim()}`
                    : '';
                const before = typeof result.beforeMessageCount === 'number' ? result.beforeMessageCount : 0;
                const after = typeof result.afterMessageCount === 'number' ? result.afterMessageCount : 0;
                const ratio = typeof result.compressionRatio === 'number' ? `${result.compressionRatio}%` : 'n/a';
                this.notify(`Compacted ${before} -> ${after} messages (${ratio} tokens saved).${summary}`);
                return true;
            }
            case '/diagnostics':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                {
                    const arg = parsed.args?.trim() || '';
                    if (arg === 'trend' || arg.startsWith('trend ')) {
                        const { sessionId, bucketSize, maxBuckets } = this.parseTurnDiagnosticsTrendArgs(arg.slice(5));
                        return this.openTurnDiagnosticsTrend(sessionId, bucketSize, maxBuckets);
                    }
                    if (arg === 'list' || arg.startsWith('list ')) {
                        const sessionId = arg.slice(4).trim() || undefined;
                        return this.openTurnDiagnosticsList(sessionId);
                    }
                    const sessionId = arg || undefined;
                    return this.openTurnDiagnostics(sessionId);
                }
            case '/delegation':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                {
                    const arg = parsed.args?.trim() || '';
                    if (arg === 'tree' || arg.startsWith('tree ')) {
                        const rest = arg.slice(4).trim();
                        const tokens = rest.split(/\s+/).filter(Boolean);
                        const sessionId = tokens[0];
                        const status = tokens[1];
                        const depthRaw = tokens[2] !== undefined && /^\d+$/.test(tokens[2]) ? parseInt(tokens[2], 10) : undefined;
                        return this.openDelegationTree(sessionId, status, depthRaw);
                    }
                    if (arg === 'lineage' || arg.startsWith('lineage ')) {
                        return this.openDelegationLineage(arg.slice(7).trim() || undefined);
                    }
                    if (arg === 'mode' || arg.startsWith('mode ')) {
                        await this.runDelegationModeCommand(arg.slice(4).trim());
                        return true;
                    }
                    return this.openDelegationList(arg || undefined);
                }
            case '/harness':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                {
                    const arg = parsed.args?.trim() || '';
                    if (arg === 'audit' || arg.startsWith('audit ')) {
                        const sessionId = arg.slice(5).trim() || undefined;
                        return this.openHarnessAudit(sessionId);
                    }
                    if (arg === 'profile' || arg.startsWith('profile ')) {
                        return this.openHarnessProfile(arg.slice(7).trim() || undefined);
                    }
                    this.notify('Usage: /harness audit [sessionId] | /harness profile [list|current|diff <from> <to>]');
                    return true;
                }
            case '/voice':
                return this.handleVoiceCommand(parsed.args?.trim() || '');
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
            case '/share':
                return this.runShareCommand(parsed.args);
            case '/unshare':
                return this.runUnshareCommand(parsed.args);
            case '/session': {
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                if (parsed.args) {
                    await this.refreshSessions();
                    await this.openSession(parsed.args);
                    return true;
                }
                if (!this.state.sessions.length) {
                    this.notify('No sessions available.');
                    return true;
                }
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                this.state.setMessagesFocused(false);
                this.state.setSessionsFocused(true);
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
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                this.state.setMessagesFocused(false);
                this.state.setSessionsFocused(true);
                return true;
            case '/resume': {
                if (this.isTurnInProgress()) { this.notifyBusyState(); return true; }
                const all = await this.sessionService?.listSessions(this.state.sessionId, undefined, { includeArchived: true }) || [];
                if (!all.length) { this.notify('No sessions available.'); return true; }
                const selected = await this.select('Resume session', all.map(item => ({
                    label: `${item.id}${item.archived ? ' (archived)' : ''}`,
                    value: item.id,
                    description: item.title || item.summary || `${item.messageCount || 0} messages`
                })));
                if (selected) await this.openSession(selected);
                return true;
            }
            case '/archive': {
                const archivedSessionId = this.state.sessionId;
                if (!archivedSessionId || !this.sessionService) { this.notify('No current session to archive.'); return true; }
                await this.sessionService.setSessionArchived(archivedSessionId, true);
                await this.refreshSessions();
                this.notify(`Archived session ${archivedSessionId}.`);
                return true;
            }
            case '/fork':
            case '/side': {
                if (this.isTurnInProgress()) { this.notifyBusyState(); return true; }
                const source = this.state.sessionId;
                if (!source || !this.sessionService) { this.notify('No current session to fork.'); return true; }
                const messageId = String(parsed.args || '').trim() || undefined;
                const forked = await this.sessionService.forkSession(source, messageId);
                if (!forked) { this.notify('Failed to fork the current session.'); return true; }
                await this.openSession(forked);
                this.notify(`${resolved.command === '/side' ? 'Opened side session' : 'Forked session'} ${forked}.`);
                return true;
            }
            case '/pin':
            case '/unpin': {
                const pinSessionId = this.state.sessionId;
                if (!pinSessionId || !this.sessionService) {
                    this.notify('No current session to pin.');
                    return true;
                }
                const pin = resolved.command === '/pin';
                await this.sessionService.setSessionPinned(pinSessionId, pin);
                await this.refreshSessions();
                this.notify(pin ? `Pinned session ${pinSessionId}.` : `Unpinned session ${pinSessionId}.`);
                return true;
            }
            case '/title': {
                const titleText = String(parsed.args || '').trim();
                const titleVerb = titleText.split(/\s+/)[0]?.toLowerCase();
                if (!titleText || titleVerb === 'list' || titleVerb === 'set' || titleVerb === 'unset') {
                    return this.runTitleCommand(titleText);
                }
                const titleSessionId = this.state.sessionId;
                if (!titleSessionId || !this.sessionService) {
                    this.notify('No current session to title.');
                    return true;
                }
                const title = titleText;
                await this.sessionService.setSessionTitle(titleSessionId, title || undefined);
                await this.refreshSessions();
                this.state.setTitle(title);
                this.updateTerminalTitle();
                this.notify(title ? `Session titled "${title}".` : 'Session title cleared.');
                return true;
            }
            case '/snapshot': {
                const snapshotSessionId = this.state.sessionId;
                if (!snapshotSessionId || !this.sessionService) {
                    this.notify('No current session to snapshot.');
                    return true;
                }
                const label = String(parsed.args || '').trim() || undefined;
                const snapshotId = await this.sessionService.createSessionSnapshot(snapshotSessionId, label);
                if (snapshotId) {
                    this.notify(`Snapshot created: ${snapshotId}`);
                } else {
                    this.notify('Snapshot creation failed.');
                }
                return true;
            }
            case '/snapshots': {
                const snapshotSessionId = this.state.sessionId;
                if (!snapshotSessionId || !this.sessionService) {
                    this.notify('No current session for snapshots.');
                    return true;
                }
                const snapshots = await this.sessionService.listSessionSnapshots(snapshotSessionId);
                if (!snapshots.length) {
                    this.notify('No snapshots for the current session. Use /snapshot [label] to create one.');
                    return true;
                }
                const choice = await this.select(
                    `Snapshots (${snapshots.length})`,
                    snapshots.map((snapshot, index) => ({
                        label: `${String(snapshot.label || 'snapshot').trim()} · ${snapshot.messageCount ?? 0} msgs${snapshot.summary ? ` · ${snapshot.summary}` : ''}`,
                        value: String(snapshot.snapshotId || index),
                        detail: snapshot.snapshotId
                    })),
                    0,
                    this.state.consoleOptions.selectHint
                );
                if (!choice) return true;
                const action = await this.select(
                    'Snapshot action',
                    [
                        { label: 'restore', value: 'restore', detail: 'replace current transcript with this snapshot' },
                        { label: 'delete', value: 'delete', detail: 'remove this snapshot' }
                    ],
                    0,
                    this.state.consoleOptions.selectHint
                );
                if (!action) return true;
                if (action === 'restore') {
                    await this.sessionService.restoreSessionSnapshot(snapshotSessionId, choice);
                    await this.refreshSessions();
                    await this.openSession(snapshotSessionId);
                    this.notify('Snapshot restored.');
                } else {
                    await this.sessionService.deleteSessionSnapshot(snapshotSessionId, choice);
                    this.notify('Snapshot deleted.');
                }
                return true;
            }
            case '/git-snapshots':
            case '/snapshots':
                if (this.isTurnInProgress()) {
                    this.notifyBusyState();
                    return true;
                }
                await this.runGitSnapshotsCommand(String(parsed.args || '').trim());
                return true;
            case '/toolruns':
                if (!this.state.toolRuns.length) {
                    this.notify('No tool runs available.');
                    return true;
                }
                this.state.setSessionsFocused(false);
                this.state.setMessagesFocused(false);
                this.state.setProjectsFocused(false);
                this.state.setToolsFocused(false);
                this.state.setApprovalsFocused(false);
                this.state.setTasksFocused(false);
                this.state.setJobsFocused(false);
                this.state.closeMessageDetail();
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                this.state.setToolRunsFocused(true);
                return true;
            case '/search':
                if (!parsed.args || !parsed.args.trim()) {
                    this.notify('Usage: /search <query>');
                    return true;
                }
                {
                    const rawQuery = parsed.args.trim();
                    let agentResults: SessionSearchMatch[] = [];
                    try {
                        agentResults = await (this.sessionService?.searchSessions(rawQuery) ?? Promise.resolve([]));
                    } catch {
                        agentResults = [];
                    }
                    if (agentResults.length) {
                        const currentId = this.state.sessionId;
                        const sessionId = await this.select(
                            `Search: "${rawQuery}" (${agentResults.length})`,
                            agentResults.map(result => ({
                                label: `${result.sessionId}${result.sessionId === currentId ? ' [current]' : ''} (${result.count} msg)`,
                                value: result.sessionId,
                                detail: result.snippet || result.summary || result.workspace || ''
                            })),
                            0,
                            this.state.consoleOptions.selectHint
                        );
                        if (sessionId) {
                            await this.openSession(sessionId);
                        }
                        return true;
                    }
                    const query = rawQuery.toLowerCase();
                    let sessions = this.state.sessions.slice();
                    if (!sessions.length && this.sessionService) {
                        const loaded = await this.sessionService.listSessions(this.state.sessionId);
                        sessions = loaded.map(item => ({
                            id: item.id,
                            current: !!item.current,
                            workspace: item.workspace,
                            updatedAt: item.lastActiveAt,
                            messageCount: item.messageCount,
                            summary: item.summary,
                            title: item.title,
                            pinned: !!item.pinned,
                            projectKey: item.projectKey,
                            projectId: item.projectId,
                            primaryThreadId: item.primaryThreadId,
                            sessionRole: item.sessionRole,
                            rootRequest: item.rootRequest,
                            focusSummary: item.focusSummary,
                            projectLabel: item.projectId || item.focusSummary || item.workspace || item.primaryThreadId || item.rootRequest || item.id
                        }));
                    }
                    if (!sessions.length) {
                        this.notify('No sessions to search.');
                        return true;
                    }
                    const metadataMatches = sessions.filter(s => {
                        const id = (s.id || '').toLowerCase();
                        const summary = (s.summary || '').toLowerCase();
                        const ws = (s.workspace || '').toLowerCase();
                        const proj = (s.projectLabel || s.projectKey || s.projectId || '').toLowerCase();
                        return id.includes(query) || summary.includes(query) || ws.includes(query) || proj.includes(query);
                    });
                    this.notify(`Searching ${sessions.length} session${sessions.length === 1 ? '' : 's'} for "${rawQuery}"…`);
                    const contentHits = await this.searchSessionContent(query, sessions);
                    const seen = new Set<string>();
                    const merged: AgentConsoleSessionItem[] = [];
                    for (const s of metadataMatches) {
                        if (!seen.has(s.id)) {
                            seen.add(s.id);
                            merged.push(s);
                        }
                    }
                    for (const s of sessions) {
                        if (!seen.has(s.id) && contentHits.has(s.id)) {
                            seen.add(s.id);
                            merged.push(s);
                        }
                    }
                    if (!merged.length) {
                        this.notify(`No sessions matching "${rawQuery}".`);
                        return true;
                    }
                    const sessionId = await this.select(
                        `Search: "${rawQuery}" (${merged.length})`,
                        merged.map(s => {
                            const hit = contentHits.get(s.id);
                            const name = String(s.title || '').trim() || s.id;
                            const pinned = s.pinned ? ' 📌' : '';
                            return {
                                label: `${name}${s.current ? ' [current]' : ''}${hit ? ` (${hit.count} msg)` : ''} (${s.messageCount ?? '?'})${pinned}`,
                                value: s.id,
                                detail: hit ? hit.snippet : (s.summary || s.workspace || '')
                            };
                        }),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (sessionId) {
                        await this.openSession(sessionId);
                    }
                }
                return true;
            case '/projects':
                if (!this.state.projects.length) {
                    await this.refreshSessions();
                }
                if (!this.state.projects.length) {
                    this.notify('No projects available.');
                    return true;
                }
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                {
                    const project = await this.select(
                        'Projects',
                        this.state.projects.map(p => ({
                            label: `${p.label} (${p.sessionCount})`,
                            value: p.key,
                            detail: p.lastActive ? `last active ${new Date(p.lastActive).toLocaleDateString()}` : undefined
                        })),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (!project) return true;
                    const projectSessions = this.state.sessions.filter(
                        s => this.resolveSessionProjectKey(s) === project
                    );
                    if (!projectSessions.length) {
                        this.notify('No sessions in this project.');
                        return true;
                    }
                    const sessionId = await this.select(
                        `Sessions in ${project}`,
                        projectSessions.map(s => ({
                            label: `${String(s.title || '').trim() || s.id}${s.current ? ' [current]' : ''} (${s.messageCount ?? '?'})${s.pinned ? ' 📌' : ''}`,
                            value: s.id,
                            detail: s.summary
                        })),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (!sessionId) return true;
                    await this.openSession(sessionId);
                }
                return true;
            case '/threads':
                if (!this.state.threads.length) {
                    await this.refreshSessions();
                }
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                {
                    if (!this.state.threads.length) {
                        this.notify('No threads available.');
                        return true;
                    }
                    const thread = await this.select(
                        'Threads',
                        this.state.threads.map(t => ({
                            label: `${t.label} (${t.sessionCount})${t.sections?.length ? ` [${t.sections.length} sections]` : ''}`,
                            value: t.key,
                            detail: t.lastActive ? `last active ${new Date(t.lastActive).toLocaleDateString()}` : undefined
                        })),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (!thread) return true;
                    const threadSessions = this.state.sessions.filter(
                        s => this.resolveSessionThreadKey(s) === thread
                    );
                    if (!threadSessions.length) {
                        this.notify('No sessions in this thread.');
                        return true;
                    }
                    const sessionId = await this.select(
                        `Sessions in ${thread}`,
                        threadSessions.map(s => ({
                            label: `${String(s.title || '').trim() || s.id}${s.current ? ' [current]' : ''} (${s.messageCount ?? '?'})${s.pinned ? ' 📌' : ''}`,
                            value: s.id,
                            detail: s.summary
                        })),
                        0,
                        this.state.consoleOptions.selectHint
                    );
                    if (!sessionId) return true;
                    await this.openSession(sessionId);
                }
                return true;
            case '/sections': {
                const sectionSessionId = this.state.sessionId;
                if (!this.sessionService || !sectionSessionId) {
                    this.notify('No session service or current session.');
                    return true;
                }
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                const labelArg = String(parsed.args || '').trim();
                if (labelArg) {
                    await this.sessionService.createSection(sectionSessionId, labelArg);
                    await this.refreshCurrentSections();
                    this.notify(`Section "${labelArg}" created.`);
                    return true;
                }
                await this.refreshCurrentSections();
                if (!this.state.sections.length) {
                    this.notify('No sections. Create one with /sections <label>.');
                    return true;
                }
                const section = await this.select(
                    'Sections',
                    this.state.sections.map(item => {
                        const count = this.state.messages.filter(message => message.sectionId === item.id).length;
                        return {
                            label: `${item.label}${count ? ` (${count} messages)` : ''}`,
                            value: item.id,
                            detail: `created ${new Date(item.createdAt).toLocaleString()}`
                        };
                    }),
                    0,
                    this.state.consoleOptions.selectHint
                );
                if (!section) {
                    return true;
                }
                const action = await this.select(
                    'Section actions',
                    [
                        { label: 'Rename', value: 'rename', description: 'rename this section (choose a new label below)' },
                        { label: 'Delete', value: 'delete', description: 'delete this section and detach its messages' },
                        { label: 'Move to start', value: 'start', description: 'move this section to the top' },
                        { label: 'Move to end', value: 'end', description: 'move this section to the bottom' },
                        { label: 'Create before', value: 'before', description: 'create a new section before this one' },
                        { label: 'Create after', value: 'after', description: 'create a new section after this one' }
                    ],
                    0,
                    this.state.consoleOptions.selectHint
                );
                if (!action) {
                    return true;
                }
                if (action === 'delete') {
                    await this.sessionService.deleteSection(sectionSessionId, section);
                    await this.refreshCurrentSections();
                    this.notify('Section deleted.');
                } else if (action === 'start' || action === 'end') {
                    const index = this.state.sections.findIndex(item => item.id === section);
                    if (action === 'start' && index <= 0) {
                        this.notify(index < 0 ? 'Section not found.' : 'Section already at start.');
                        return true;
                    }
                    if (action === 'end' && (index < 0 || index === this.state.sections.length - 1)) {
                        this.notify(index < 0 ? 'Section not found.' : 'Section already at end.');
                        return true;
                    }
                    await this.sessionService.moveSection(
                        sectionSessionId,
                        section,
                        undefined,
                        { beforeId: action === 'start' ? this.state.sections[0].id : undefined }
                    );
                    await this.refreshCurrentSections();
                    this.notify(action === 'start' ? 'Section moved to start.' : 'Section moved to end.');
                } else if (action === 'before' || action === 'after') {
                    const targetIndex = this.state.sections.findIndex(item => item.id === section);
                    const beforeId = action === 'before'
                        ? section
                        : this.state.sections[targetIndex + 1]?.id;
                    const label = await this.select('New section label', [
                        { label: 'Continue from previous section', value: '' },
                        { label: 'Next step', value: 'Next step' },
                        { label: 'Implementation', value: 'Implementation' },
                        { label: 'Analysis', value: 'Analysis' }
                    ], 0, this.state.consoleOptions.selectHint);
                    if (label === undefined) {
                        return true;
                    }
                    const created = await this.sessionService.createSection(sectionSessionId, label || 'Section', undefined, { beforeId });
                    await this.refreshCurrentSections();
                    this.notify(`Section "${created.label}" created.`);
                } else if (action === 'rename') {
                    const label = await this.select('Rename section to', [
                        { label: 'Next step', value: 'Next step' },
                        { label: 'Implementation', value: 'Implementation' },
                        { label: 'Analysis', value: 'Analysis' },
                        { label: 'Refactor', value: 'Refactor' },
                        { label: 'Review', value: 'Review' }
                    ], 0, this.state.consoleOptions.selectHint);
                    if (!label) {
                        return true;
                    }
                    await this.sessionService.renameSection(sectionSessionId, section, label);
                    await this.refreshCurrentSections();
                    this.notify(`Section renamed to "${label}".`);
                }
                return true;
            }
            case '/messages':
                this.state.closeReview();
                this.state.closeGitSnapshotDetail();
                this.state.setSessionsFocused(false);
                this.state.setMessagesFocused(true);
                return true;
            case '/approve':
            case '/deny': {
                const isApprove = resolved.command === '/approve';
                if (isApprove && String(parsed.args || '').trim().toLowerCase() === 'retry') {
                    return this.runApproveRetryCommand();
                }
                const pend = await this.getPendingApprovals(this.state.sessionId);
                if (!pend.length) { this.notify('No pending approvals.'); return true; }
                if (parsed.args) {
                    const exact = pend.find((item: any) => item.id === parsed.args);
                    const matches = exact ? [exact] : pend.filter((item: any) => item.id.startsWith(parsed.args));
                    if (matches.length === 1) {
                        const applied = await this.applyApprovalDecision(isApprove ? 'approve' : 'deny', matches[0].id);
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
                        const applied = await this.applyApprovalDecision(isApprove ? 'approve' : 'deny', found.id);
                        this.notify(applied
                            ? `${isApprove ? 'Approved' : 'Denied'} ${found.toolName} (${found.id.slice(0, 8)}).`
                            : `Approval request ${found.id.slice(0, 8)} is no longer pending.`);
                    }
                    return true;
                }
                if (req) {
                    const applied = await this.applyApprovalDecision(isApprove ? 'approve' : 'deny', req.id);
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
                if (this.isTurnInProgress()) {
                    const cancelled = await this.sessionService?.cancelTurn(this.state.sessionId) ?? false;
                    this.notify(cancelled
                        ? 'Cancelling current turn...'
                        : 'No running turn to cancel.');
                    return true;
                }
                this.draftLines = [];
                this.multilineMode = false;
                this.shellDraftLines = [];
                this.shellMultilineMode = false;
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
        const attachments = this.state.pendingAttachments.slice();
        const turnMessage = this.buildTurnMessageInput(prompt, attachments);
        const profile = this.consumePendingTurnModelProfile();
        this.draftLines = [];
        this.multilineMode = false;
        this.state.pushInputHistory(draft);
        await this.persistInputHistory();
        this.clearStreamingMessageState();
        const turnScope = this.state.beginTurnEventScope();
        const userMsg: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            parts: turnMessage?.parts,
            createdAt: Date.now()
        };
        const asstMsg: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
            const baseMessages = this.state.messages.slice();
            this.state.setInput('');
            this.state.setStatus('running');
            this.state.setLastError('');
            this.state.clearPendingAttachments();
            this.state.clearActivities();
            this.state.pushActivity('turn', this.state.summarize(draft));
            this.state.setMessages([...baseMessages, userMsg, asstMsg]);
            this.updateTerminalTitle();
        try {
            await this.runTurnStream(prompt, asstMsg, turnMessage, profile);
            this.clearStreamingMessageState();
            this.ensureMessageAtTail(asstMsg.id);
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                    this.updateTerminalTitle();
                }
        } catch (error: any) {
            this.clearStreamingMessageState();
                this.state.setStatus('error');
                this.state.setLastError(error.message || 'Unknown');
                this.state.pushActivity('error', error.message || 'Unknown');
                this.state.appendAssistantErrorMessage(error.message || 'Unknown');
                this.updateTerminalTitle();
        } finally {
            this.state.clearTurnEventScope(turnScope);
        }
    }
    async submit(): Promise<void> {
        const value = this.state.input.trim();
        if (!value) { return; }
        const editTargetId = this.editTargetMessageId;
        const editConsumed = !!editTargetId;
        if (editTargetId) {
            this.editTargetMessageId = '';
            this.lastEditSessionMessageId = '';
            this.editDismissedAt = 0;
        }
        if (this.shellMultilineMode && !editConsumed && !value.startsWith('!') && !value.startsWith('/')) {
            this.state.pushInputHistory(value);
            const persistHistory = this.persistInputHistory();
            this.state.setInput('');
            this.shellDraftLines.push(value);
            await persistHistory;
            this.notify(`Shell draft +${this.shellDraftLines.length} line(s). Submit with '!' alone, exit with '!!'.`);
            return;
        }
        if (value.startsWith('!')) {
            this.state.pushInputHistory(value);
            const persistHistory = this.persistInputHistory();
            this.state.setInput('');
            if (await this.handleShellBang(value)) {
                await persistHistory;
                return;
            }
            await persistHistory;
            this.state.setInput(value, value.length);
            return;
        }
        if (value.startsWith('/')) {
            this.state.pushInputHistory(value);
            const persistHistory = this.persistInputHistory();
            this.state.setInput('');
            if (await this.handleCommand(value)) {
                await persistHistory;
                return;
            }
            await persistHistory;
            this.state.setInput(value, value.length);
        }
        let steer = false;
        if (this.isTurnInProgress()) {
            if (this.isSteerModeEnabled() && !this.multilineMode) {
                // P128 steer: awaiting the in-flight stream settles microtask
                // order so the old submit's finally (status reset) runs first.
                steer = true;
                await this.interruptTurn();
                if (this.activeTurnRun) await this.activeTurnRun.catch(() => undefined);
        } else if (this.isQueueModeEnabled()) {
            this.enqueuePrompt(value);
            return;
        } else {
            this.notifyBusyState();
            return;
        }
    }
        if (editConsumed && !value.startsWith('/') && !value.startsWith('!') && this.state.sessionId) {
            const messages = this.state.messages.slice();
            const editedIndex = messages.findIndex(message => message.id === editTargetId);
            const hasLaterTurns = editedIndex >= 0 && editedIndex < messages.length - 1;
            if (hasLaterTurns) {
                const source = this.state.sessionId;
                let branchId = '';
                if (editedIndex > 0) {
                    branchId = await this.sessionService?.forkSession(source, messages[editedIndex - 1].id) || '';
                } else {
                    const fresh = await this.sessionService?.ensureSession();
                    branchId = fresh?.id || '';
                }
                if (branchId && branchId !== source) {
                    await this.openSession(branchId);
                    this.notify(`Branched into ${branchId} with your edited prompt (original preserved).`);
                }
            }
        }
        const turnSessionId = this.state.sessionId;
        if (!steer) {
            this.state.pushInputHistory(value);
            await this.persistInputHistory();
        }
        if (this.multilineMode) {
            this.draftLines.push(value);
            return;
        }
        const prompt = await this.enrichPromptWithMentions(value);
        const attachments = this.state.pendingAttachments.slice();
        const turnMessage = this.buildTurnMessageInput(prompt, attachments);
        const profile = this.consumePendingTurnModelProfile();
        this.clearStreamingMessageState();
        const turnScope = this.state.beginTurnEventScope();
        const userMessage: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            parts: turnMessage?.parts,
            createdAt: Date.now(),
            ...(steer ? { metadata: { kind: 'steer' } } : {})
        };
        const assistantMessage: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
            const baseMessages = this.state.messages.slice();
            this.state.setInput('');
            this.state.setStatus('running');
            this.state.setLastError('');
            this.state.clearPendingAttachments();
            this.state.clearActivities();
            this.state.pushActivity('turn', this.state.summarize(value));
            this.state.setMessages([...baseMessages, userMessage, assistantMessage]);
            this.updateTerminalTitle();

        try {
            const turnRun = this.runTurnStream(prompt, assistantMessage, turnMessage, profile);
            this.activeTurnRun = turnRun;
            await turnRun;
        } catch (error: any) {
            const message = error?.message || String(error || 'Unknown error');
                this.state.setStatus('error');
                this.state.setLastError(message);
                this.state.pushActivity('error', message);
                this.state.appendAssistantErrorMessage(message);
                this.updateTerminalTitle();
        } finally {
            this.activeTurnRun = null;
            this.ensureMessageAtTail(assistantMessage.id);
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                    this.updateTerminalTitle();
                }
                this.state.setTasksCount(this.scheduler.getTasks().length);
            void this.refreshTurnArtifacts();
            this.state.clearTurnEventScope(turnScope);
            void this.drainQueuedPrompts(turnSessionId);
        }
    }

    /**
     * `!cmd` runs a shell command; `!!` toggles multiline draft mode; a bare
     * `!` submits the draft in draft mode, otherwise shows the usage hint.
     * Returns true when the input was consumed as a shell command.
     */
    protected async handleShellBang(value: string): Promise<boolean> {
        if (value === '!!') {
            this.shellMultilineMode = !this.shellMultilineMode;
            if (this.shellMultilineMode) {
                this.shellDraftLines = [];
                this.notify('Shell multiline draft mode: type lines, then submit with `!` to run. `!!` exits.');
            } else {
                this.notify(this.shellDraftLines.length
                    ? 'Shell multiline draft discarded.'
                    : 'Shell multiline draft mode exited.');
                this.shellDraftLines = [];
            }
            return true;
        }
        const command = value.slice(1).trim();
        if (!this.shellMultilineMode) {
            if (!command) {
                this.notify('Usage: `!<command>` runs a local shell command. `!!` enters multiline draft mode.');
                return true;
            }
            await this.runShellCommand(command);
            return true;
        }
        if (!command) {
            const draft = this.shellDraftLines.join('\n');
            if (!draft) {
                this.notify('Shell draft is empty. Type lines first, then submit with `!` to run.');
                return true;
            }
            this.shellDraftLines = [];
            this.shellMultilineMode = false;
            await this.runShellCommand(draft);
            return true;
        }
        this.shellDraftLines.push(command);
        this.notify(`Shell draft +${this.shellDraftLines.length} line(s). Submit with '!' alone, exit with '!!'.`);
        return true;
    }

    /**
     * Runs a shell command via the terminal tool as a read-only `type: 'shell'`
     * message. The message stays in the UI state and never enters model context.
     */
    protected async runShellCommand(command: string): Promise<void> {
        if (this.isTurnInProgress()) {
            this.notifyBusyState();
            return;
        }
        const messageId = `shell-${Date.now()}`;
        const shellMessage: AgentMessage = {
            id: messageId,
            role: 'tool',
            name: 'terminal',
            content: `$ ${command}`,
            createdAt: Date.now(),
            metadata: { type: 'shell', status: 'running' }
        };
        this.state.appendMessage(shellMessage);
        try {
            const result = await this.invokeTerminalTool(command);
            const stdout = String(result?.stdout ?? '');
            const stderr = String(result?.stderr ?? '');
            const exitCode = result?.exitCode;
            const body = [stdout, stderr].filter(Boolean).join('\n');
            const exitSuffix = exitCode === 0 || exitCode === undefined
                ? ''
                : `\n[exit code: ${exitCode}]`;
            this.updateShellMessage(messageId, {
                content: [`$ ${command}`, body, exitSuffix].filter(Boolean).join('\n\n'),
                metadata: {
                    type: 'shell',
                    status: exitCode === 0 || exitCode === undefined ? 'success' : 'failed',
                    exitCode: exitCode ?? 0,
                    error: exitCode !== 0 && exitCode !== undefined
                }
            });
        } catch (error: any) {
            const message = error?.message || String(error || 'Unknown error');
            this.updateShellMessage(messageId, {
                content: `$ ${command}\n\n${message}`,
                metadata: { type: 'shell', status: 'failed', error: true }
            });
        }
    }

    protected updateShellMessage(id: string, patch: Partial<AgentMessage>): void {
        const messages = this.state.messages.map(item => item.id === id ? { ...item, ...patch } : item);
        this.state.setMessages(messages);
    }

    protected async invokeTerminalTool(command: string): Promise<any> {
        const sessionId = this.state.sessionId;
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.invoke', {
                sessionId,
                name: 'terminal',
                input: { command }
            });
            return result?.output;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.invoke !== 'function') {
            throw new Error('Terminal tool is not available in this environment.');
        }
        if (typeof this.toolRegistry.isToolActive === 'function') {
            const active = await this.toolRegistry.isToolActive(sessionId, 'terminal');
            if (!active) {
                const activated = await this.activateToolForSession('terminal', sessionId);
                if (!activated) {
                    throw new Error('Terminal tool is not activated for this session. Approve activation or use /tools.');
                }
            }
        }
        return this.toolRegistry.invoke('terminal', { command }, sessionId);
    }

    protected async runTurnStream(
        prompt: string,
        assistantMessage: AgentMessage,
        message?: AgentTurnMessageInput,
        profile?: string
    ): Promise<void> {
        this.scheduleStreamingPendingNotice();
        const stream = this.appRpc?.stream?.('run.turn_stream', {
            sessionId: this.state.sessionId,
            input: prompt,
            ...(profile ? { profile } : {}),
            ...(message ? { message } : {})
        });
        if (stream) {
            try {
                for await (const chunk of stream) {
                    this.consumeStreamChunk(chunk, assistantMessage);
                }
            } finally {
                this.clearStreamingMessageState();
            }
            assistantMessage.metadata = {
                ...(assistantMessage.metadata || {}),
                streaming: false
            };
            this.replaceStreamingAssistantMessage(assistantMessage);
            return;
        }

        const runtime: any = this.runtime;
        if (typeof runtime?.runStreamingTurn === 'function') {
            for await (const chunk of runtime.runStreamingTurn(this.state.sessionId, prompt, undefined, message, profile)) {
                this.consumeStreamChunk(chunk, assistantMessage);
            }
            assistantMessage.metadata = {
                ...(assistantMessage.metadata || {}),
                streaming: false
            };
            this.replaceStreamingAssistantMessage(assistantMessage);
            return;
        }

        const result = await this.executeTurn(prompt, message, profile);
        if (result && 'message' in result) {
            assistantMessage.content = result.message.content;
                if (this.state.status === 'running' || this.state.status === 'reasoning') {
                    this.state.setStatus('idle');
                    this.updateTerminalTitle();
                }
        }
    }

    protected consumeStreamChunk(chunk: any, assistantMessage: AgentMessage): void {
            if (chunk?.usage) {
                this.state.setTokenUsage(chunk.usage);
            }
            if (chunk?.type === 'event') {
                this.consumeStreamEventChunk(chunk);
                return;
            }
            if (chunk?.type === 'text' && chunk.content) {
                this.clearStreamingPendingNotice();
                assistantMessage.content += chunk.content;
                this.scheduleStreamingAssistantMessageFlush(assistantMessage);
                return;
            }
            if (chunk?.type === 'reasoning' && chunk.content) {
                this.clearStreamingPendingNotice();
                this.state.setStatus('reasoning');
                this.updateTerminalTitle();
                this.state.pushActivity('model', `Reasoning: ${this.state.summarize(chunk.content)}`);
                this.state.upsertUiEventMessage(this.state.qualifyUiEventKey('reasoning'), 'Reasoning about implementation', {
                    eventType: 'reasoning',
                    label: 'think',
                    status: 'running'
                });
                return;
            }
            if (chunk?.type === 'tool_call') {
                this.clearStreamingPendingNotice();
                const content = this.describePendingToolCall(chunk.content);
                const eventKey = this.qualifyTurnUiEventKey(this.resolveToolEventKey('tool_call', chunk));
                this.state.pushActivity('tool', `Tool call: ${this.state.summarize(String(content || chunk.content || ''))}`);
                if (eventKey) {
                    this.state.upsertUiEventMessage(eventKey, content, {
                        eventType: 'tool_call',
                        label: 'tool',
                        status: 'running'
                    });
                } else {
                    this.state.appendUiEventMessage(content, {
                        eventType: 'tool_call',
                        label: 'tool',
                        status: 'running'
                    });
                }
                if (String(chunk.content || '').includes('todo')) {
                    void this.refreshTodoPlan();
                }
                return;
            }
            if (chunk?.type === 'done' && chunk.message) {
                this.clearStreamingPendingNotice();
                assistantMessage.content = chunk.message.content || assistantMessage.content;
                assistantMessage.metadata = {
                    ...(chunk.message.metadata || {}),
                    streaming: false
                };
                this.replaceStreamingAssistantMessage(assistantMessage);
                this.state.setTokenUsage(chunk.message.metadata?.usage);
            }
    }

    protected consumeStreamEventChunk(chunk: any): void {
        const eventType = String(chunk?.eventType || 'state').trim() || 'state';
        if (eventType === 'approval_requested') {
            const toolName = String(chunk?.toolName || 'tool');
            this.state.upsertPendingApproval({
                id: String(chunk?.approvalId || `approval-${Date.now()}`),
                toolName,
                sessionId: this.state.sessionId,
                reason: String(chunk?.content || `Approval required for ${toolName}`),
                summary: String(chunk?.content || ''),
                hasInput: true,
                inputSummary: undefined,
                createdAt: Date.now(),
                timeoutMs: 0
            } as AgentConsoleApprovalRequest);
            this.state.pushActivity('tool', `Approval required for ${toolName}`);
            return;
        }
        if (eventType === 'approval_completed' || eventType === 'approval_failed') {
            void this.refreshPendingApprovals();
            return;
        }
        if (eventType === 'compensation') {
            const compensated = Number(chunk?.compensated || 0);
            if (compensated > 0) {
                this.state.pushActivity(
                    'rollback',
                    `Rolled back ${compensated} side-effecting tool call${compensated === 1 ? '' : 's'}`
                );
            }
            return;
        }
        if (eventType === 'context_prepared') {
            if (chunk?.report) {
                    this.state.setContextPreparation(chunk.report);
                    this.state.pushActivity(
                        'model',
                        `Context ${chunk.report.strategy}: ${chunk.report.beforeTokens}→${chunk.report.afterTokens}`
                    );
                return;
            }
            const contextContent = String(chunk?.content || '').trim();
            if (contextContent) {
                this.state.pushActivity('model', contextContent);
            }
            return;
        }
        if (eventType === 'turn_diagnostics') {
            const diagnostics = chunk?.diagnostics || {};
            const compactionCount = Number(diagnostics.compactionCount ?? 0);
            const totalSavings = Number(diagnostics.totalTokenSavings ?? 0);
            const promptCache = diagnostics.promptCache;
            const parts: string[] = [];
            if (compactionCount > 0 || totalSavings > 0) {
                parts.push(`${compactionCount} compaction${compactionCount === 1 ? '' : 's'}, ${totalSavings} tokens saved`);
            }
            if (promptCache) {
                const support = String(promptCache.supported || 'none');
                const applied = promptCache.applied ? 'applied' : 'not applied';
                const cachedTokens = Number(promptCache.observedCachedPromptTokens ?? 0);
                parts.push(`prompt cache ${support} (${applied}${cachedTokens ? `, ${cachedTokens} cached tokens` : ''})`);
            }
            if (parts.length) {
                this.state.pushActivity('model', `Turn diagnostics: ${parts.join('; ')}`);
                return;
            }
            const diagnosticsContent = String(chunk?.content || '').trim();
            if (diagnosticsContent) {
                this.state.pushActivity('model', diagnosticsContent);
            }
            return;
        }
        const content = this.describeStreamEventContent(eventType, chunk);
        if (!content) {
            return;
        }
        const label = String(chunk?.label || this.resolveStreamEventLabel(eventType)).trim() || 'state';
        const status = this.normalizeUiEventStatus(chunk?.status);
        const eventKey = this.qualifyTurnUiEventKey(this.resolveToolEventKey(eventType, chunk))
            || (eventType === 'turn_started'
                ? this.state.qualifyUiEventKey('turn-start')
                : eventType === 'reasoning'
                    ? this.state.qualifyUiEventKey('reasoning')
                    : undefined);
            if (eventKey) {
                this.state.upsertUiEventMessage(eventKey, content, {
                    eventType,
                    label,
                    status
                });
                return;
            }
            this.state.appendUiEventMessage(content, {
                eventType,
                label,
                status
            });
    }

    protected describeStreamEventContent(eventType: string, chunk: any): string {
        const content = String(chunk?.content || '').trim();
        const toolName = String(chunk?.toolName || '').trim();
        if (!toolName || !eventType.startsWith('tool_')) {
            return content;
        }
        const label = this.translator?.translate(`agent.tool.${toolName}`)
            || toolName.replace(/[._-]+/g, ' ');
        const detail = content.includes(' · ') ? content.slice(content.indexOf(' · ') + 3).trim() : '';
        if (eventType === 'tool_invoked') {
            return (this.translator?.translate('agent.tool.invoked', { label }) || `Running ${label}`)
                + (detail ? ` · ${detail}` : '');
        }
        if (eventType === 'tool_completed') {
            return (this.translator?.translate('agent.tool.completed', { label }) || `${label} completed`)
                + (detail ? ` · ${detail}` : '');
        }
        if (eventType === 'tool_failed' && toolName === 'git_operations' && /not a Git repository/i.test(content)) {
            return this.translator?.translate('agent.tool.gitMissing') || 'Git repository not detected; continuing with files';
        }
        return eventType === 'tool_failed'
            ? (this.translator?.translate('agent.tool.failed', { label }) || `${label} failed`)
            : content;
    }

    protected resolveToolEventKey(eventType: string, chunk: any): string | undefined {
        switch (eventType) {
            case 'tool_call':
            case 'tool_invoked':
            case 'tool_completed':
            case 'tool_failed':
            case 'tool_skipped': {
                const toolCallId = String(chunk?.toolCallId || '').trim();
                if (toolCallId) {
                    return `tool:${toolCallId}`;
                }
                const toolName = this.resolveToolEventName(chunk);
                return toolName ? `tool:${toolName}` : undefined;
            }
            default:
                return undefined;
        }
    }

    protected qualifyTurnUiEventKey(key: string | undefined): string | undefined {
        const resolvedKey = String(key || '').trim();
        return resolvedKey ? this.state.qualifyUiEventKey(resolvedKey) : undefined;
    }

    protected resolveToolEventName(chunk: any): string {
        const explicit = String(chunk?.toolName || '').trim();
        if (explicit) {
            return explicit;
        }
        const content = String(chunk?.content || '').trim();
        if (!content) {
            return '';
        }
        return content
            .split(/[·:(]/, 1)[0]
            .replace(/\s+(completed|failed|skipped)$/i, '')
            .trim();
    }

    protected describePendingToolCall(content: unknown): string {
        const text = String(content || '').trim();
        if (!text) {
            return 'tool';
        }
        const toolName = this.resolveToolEventName({ content: text });
        return toolName || text;
    }

    async schedulePrompt(prompt: string, delayMs: number): Promise<void> {
        await this.scheduler.schedule({
            id: `task-${Date.now()}`,
            sessionId: this.state.sessionId,
            prompt,
            runAt: Date.now() + delayMs,
            scheduleType: 'once'
        });
        await this.refreshScheduledTasks();
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
        const targetIndex = this.findStreamingAssistantMessageIndex(current, message);
        if (targetIndex >= 0) {
            const currentMessage = current[targetIndex];
            if (String(currentMessage.content || '') === this.streamMessageText
                && currentMessage.metadata?.streaming === true) {
                return;
            }
            current[targetIndex] = {
                ...(message || currentMessage),
                content: this.streamMessageText,
                metadata: {
                    ...(message?.metadata || currentMessage.metadata || {}),
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
        const targetIndex = this.findStreamingAssistantMessageIndex(current, message);
        if (targetIndex < 0) {
            return;
        }
        const currentMessage = current[targetIndex];
        const replacement = {
            ...currentMessage,
            ...message,
            metadata: {
                ...(currentMessage.metadata || {}),
                ...(message.metadata || {})
            }
        };
        if (String(currentMessage.content || '') === String(replacement.content || '')
            && currentMessage.metadata?.streaming === replacement.metadata?.streaming) {
            return;
        }
        current[targetIndex] = replacement;
        if (replacement.metadata?.streaming !== true && targetIndex !== current.length - 1) {
            current.splice(targetIndex, 1);
            current.push(replacement);
        }
        this.state.setMessages(current);
    }

    protected clearStreamingMessageState(): void {
        if (this.streamMessageTimer) {
            clearTimeout(this.streamMessageTimer);
            this.streamMessageTimer = undefined;
        }
        this.streamMessageText = '';
        this.clearStreamingPendingNotice();
    }

    protected scheduleStreamingPendingNotice(): void {
        this.clearStreamingPendingNotice();
        this.streamPendingTimer = setTimeout(() => {
            this.streamPendingTimer = undefined;
            if (this.destroyed || !this.isTurnInProgress()) {
                return;
            }
            const provider = this.state.provider || this.options.model?.provider || 'model';
            const model = this.state.model || this.options.model?.model || 'unknown';
            this.state.upsertUiEventMessage(
                'turn-pending',
                `Waiting for ${provider} / ${model} to return the first response chunk`,
                {
                    eventType: 'model_wait',
                    label: 'net',
                    status: 'running'
                }
            );
        }, AgentConsoleComponent.STREAM_PENDING_NOTICE_MS);
    }

    protected clearStreamingPendingNotice(): void {
        if (this.streamPendingTimer) {
            clearTimeout(this.streamPendingTimer);
            this.streamPendingTimer = undefined;
        }
    }

    protected ensureMessageAtTail(messageId: string): void {
        const resolvedId = String(messageId || '').trim();
        if (!resolvedId) {
            return;
        }
        const current = this.state.messages.slice();
        const index = current.findIndex(item => item.id === resolvedId);
        if (index < 0 || index === current.length - 1) {
            return;
        }
        const [message] = current.splice(index, 1);
        if (!message) {
            return;
        }
        current.push(message);
        this.state.setMessages(current);
    }

    protected async loadSessionMessages(sessionId = this.state.sessionId): Promise<AgentMessage[]> {
        const messages = await (this.sessionService?.loadMessages(sessionId) || this.runtime.getMessages(sessionId));
        return this.normalizeLoadedMessages(messages);
    }

    protected async loadSessionPage(sessionId = this.state.sessionId): Promise<{ messages: AgentMessage[]; sections: AgentSessionSection[] }> {
        if (this.sessionService) {
            const page = await this.sessionService.loadMessagesPage(sessionId);
            return {
                messages: this.normalizeLoadedMessages(page.messages),
                sections: Array.isArray(page.sections) ? page.sections : []
            };
        }
        const messages = await this.runtime.getMessages(sessionId);
        return { messages: this.normalizeLoadedMessages(messages), sections: [] };
    }

    protected async searchSessionContent(
        query: string,
        sessions: AgentConsoleSessionItem[]
    ): Promise<Map<string, { count: number; snippet: string }>> {
        const hits = new Map<string, { count: number; snippet: string }>();
        const candidates = sessions.slice(0, AgentConsoleComponent.SEARCH_SESSION_LIMIT);
        const results = await this.mapWithConcurrency(
            candidates,
            AgentConsoleComponent.SEARCH_CONCURRENCY,
            async (session) => {
                const messages = await this.loadSessionMessages(session.id);
                const matched = messages.filter(message => String(message.content || '').toLowerCase().includes(query));
                return { sessionId: session.id, matched };
            }
        );
        for (const entry of results) {
            if (!entry.result || !entry.result.matched.length) {
                continue;
            }
            const first = entry.result.matched[0];
            hits.set(entry.result.sessionId, {
                count: entry.result.matched.length,
                snippet: `[${first.role}] ${this.state.summarize(String(first.content || ''))}`
            });
        }
        return hits;
    }

    protected async mapWithConcurrency<T, R>(
        items: T[],
        limit: number,
        worker: (item: T, index: number) => Promise<R>
    ): Promise<Array<{ item: T; result?: R; error?: unknown }>> {
        const outputs: Array<{ item: T; result?: R; error?: unknown }> = [];
        let next = 0;
        const run = async () => {
            while (next < items.length) {
                const index = next++;
                const item = items[index];
                try {
                    const result = await worker(item, index);
                    outputs.push({ item, result });
                } catch (error) {
                    outputs.push({ item, error });
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
        return outputs;
    }

    protected normalizeLoadedMessages(messages: AgentMessage[] = []): AgentMessage[] {
        const normalized: AgentMessage[] = [];
        for (const message of messages) {
            if (!message) {
                continue;
            }
            if (message.role === 'assistant' && !String(message.content || '').trim()) {
                continue;
            }
            const previous = normalized[normalized.length - 1];
            if (message.role === 'assistant'
                && message.metadata?.error
                && previous?.role === 'assistant'
                && previous?.metadata?.error
                && String(previous.content || '').trim() === String(message.content || '').trim()) {
                continue;
            }
            normalized.push(message);
        }
        return normalized;
    }

    protected async refreshTurnArtifacts(): Promise<void> {
        await Promise.allSettled([
            this.refreshTools(),
            this.refreshScheduledTasks(),
            this.refreshTodoPlan(),
            this.loadCodingTasks(),
            this.refreshUsageDigest(),
            this.refreshSummaryQualityDigest(),
            this.refreshCompactionDigest(),
            this.refreshTurnDiagnosticsDigest()
        ]);
    }

    protected async refreshUsageDigest(): Promise<void> {
        if (!this.sessionService) {
            this.state.setUsageDigest('');
            return;
        }
        try {
            const usage = await this.sessionService.getUsageStats();
            const totalTurns = Number(usage?.cumulative?.turns ?? 0);
            const totalTokens = Number(usage?.cumulative?.totalTokens ?? 0);
            if (!totalTurns && !totalTokens) {
                this.state.setUsageDigest('');
                return;
            }
            this.state.setUsageDigest(this.formatUsageSummary(usage));
        } catch (error: any) {
            this.state.setUsageDigest('');
            void error;
        }
    }

    protected async refreshTurnDiagnosticsDigest(): Promise<void> {
        if (!this.sessionService) {
            this.state.setTurnDiagnosticsDigest('');
            return;
        }
        try {
            const aggregate = await this.sessionService.getTurnDiagnosticsStats();
            if (!aggregate || !Number(aggregate.totalTurns)) {
                this.state.setTurnDiagnosticsDigest('');
                return;
            }
            this.state.setTurnDiagnosticsDigest(this.formatTurnDiagnosticsAggregate(aggregate));
        } catch (error: any) {
            this.state.setTurnDiagnosticsDigest('');
            void error;
        }
    }

    protected async refreshCompactionDigest(): Promise<void> {
        if (!this.sessionService) {
            this.state.setCompactionDigest('');
            return;
        }
        try {
            const aggregates = await this.sessionService.getCompactionHistoryStats();
            if (!aggregates.length) {
                this.state.setCompactionDigest('');
                return;
            }
            this.state.setCompactionDigest(
                aggregates
                    .map(item => this.formatCompactionHistoryAggregate(item))
                    .join(' | ')
            );
        } catch (error: any) {
            this.state.setCompactionDigest('');
            void error;
        }
    }

    protected async refreshSummaryQualityDigest(): Promise<void> {
        if (!this.sessionService) {
            this.state.setSummaryQualityDigest('');
            return;
        }
        try {
            const aggregates = await this.sessionService.getSummaryQualityStats();
            if (!aggregates.length) {
                this.state.setSummaryQualityDigest('');
                return;
            }
            this.state.setSummaryQualityDigest(
                aggregates
                    .map(item => this.formatSummaryQualityAggregate(item))
                    .join(' | ')
            );
        } catch (error: any) {
            this.state.setSummaryQualityDigest('');
            void error;
        }
    }

    protected async mergeTodoPlanForSessions(
        sessionId: string,
        sessions: Array<{ id: string; updatedAt?: number }>
    ): Promise<{ todos: AgentConsolePlanTodoItem[]; sourceSessionId?: string } | null> {
        if (!this.appRpc) {
            if (sessionId === this.state.sessionId) {
                this.state.clearPlanTodos();
            }
            return null;
        }
        const relatedSessions = sessions
            .slice()
            .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
        const results = await Promise.allSettled(relatedSessions.map(async session => ({
            sessionId: session.id,
            updatedAt: session.updatedAt || 0,
            result: await this.appRpc!.request('todo.get', { sessionId: session.id })
        })));
        const merged = new Map<string, { id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }>();
        let latestAnyTodoSessionId: string | undefined;
        let latestActiveTodoSessionId: string | undefined;
        for (const entry of results) {
            if (entry.status !== 'fulfilled') {
                continue;
            }
            const value = entry.value;
            const todos = Array.isArray(value.result?.todos)
                ? value.result.todos.map((item: any) => ({
                    id: String(item?.id || '').trim(),
                    content: String(item?.content || '').trim(),
                    status: this.normalizeTodoStatus(item?.status)
                })).filter((item: any) => !!item.id && !!item.content)
                : [];
            if (!todos.length) {
                continue;
            }
            latestAnyTodoSessionId ||= value.sessionId;
            if (!latestActiveTodoSessionId && todos.some((todo: any) => todo.status === 'pending' || todo.status === 'in_progress')) {
                latestActiveTodoSessionId = value.sessionId;
            }
            for (const todo of todos) {
                if (!merged.has(todo.id)) {
                    merged.set(todo.id, todo);
                }
            }
        }
        const activeTodos = Array.from(merged.values()).filter(todo => todo.status === 'pending' || todo.status === 'in_progress');
        const nextTodos = activeTodos.length ? activeTodos : Array.from(merged.values());
        const sourceSessionId = activeTodos.length
            ? latestActiveTodoSessionId || latestAnyTodoSessionId
            : latestAnyTodoSessionId;
        if (sessionId !== this.state.sessionId) {
            return null;
        }
        if (!nextTodos.length) {
            this.state.clearPlanTodos();
            return null;
        }
        return { todos: nextTodos, sourceSessionId: sourceSessionId || sessionId };
    }

    protected async refreshTodoPlan(
        sessionId = this.state.sessionId,
        sessions = this.resolveProjectSessionsFor(sessionId)
    ): Promise<void> {
        const merged = await this.mergeTodoPlanForSessions(sessionId, sessions);
        if (!merged) {
            return;
        }
        this.state.setPlanTodos(merged.todos, merged.sourceSessionId, 'project');
    }

    protected async refreshThreadTodoPlan(
        sessionId = this.state.sessionId,
        sessions = this.resolveThreadSessionsFor(sessionId)
    ): Promise<void> {
        const merged = await this.mergeTodoPlanForSessions(sessionId, sessions);
        if (!merged) {
            return;
        }
        this.state.setPlanTodos(merged.todos, merged.sourceSessionId, 'thread');
    }

    protected async loadThreadCodingTasks(
        sessionId = this.state.sessionId,
        sessionIds = this.resolveThreadSessionIdsFor(sessionId)
    ): Promise<any[]> {
        return this.loadCodingTasks(sessionId, sessionIds);
    }

    protected normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
        switch (String(status || '').trim()) {
            case 'in_progress':
            case 'completed':
            case 'cancelled':
                return status as 'in_progress' | 'completed' | 'cancelled';
            default:
                return 'pending';
        }
    }

    protected normalizeUiEventStatus(status: unknown): 'running' | 'success' | 'failed' | 'error' {
        switch (String(status || '').trim()) {
            case 'success':
            case 'failed':
            case 'error':
                return status as 'success' | 'failed' | 'error';
            case 'cancelled':
                return 'failed';
            default:
                return 'running';
        }
    }

    protected resolveStreamEventLabel(eventType: string): string {
        switch (eventType) {
            case 'reasoning':
                return 'think';
            case 'tool_invoked':
            case 'tool_completed':
            case 'tool_failed':
            case 'tool_skipped':
                return 'tool';
            case 'approval_requested':
            case 'approval_completed':
            case 'approval_failed':
                return 'approval';
            case 'error':
                return 'error';
            default:
                return 'state';
        }
    }

    protected findStreamingAssistantMessageIndex(messages: AgentMessage[], message?: AgentMessage): number {
        const messageId = String(message?.id || '').trim();
        if (messageId) {
            const explicitIndex = messages.findIndex(item => item.id === messageId);
            if (explicitIndex >= 0) {
                return explicitIndex;
            }
        }
        for (let index = messages.length - 1; index >= 0; index--) {
            const current = messages[index];
            if (current?.role === 'assistant' && current?.metadata?.streaming) {
                return index;
            }
        }
        return -1;
    }

    protected dispatchTerminalMouseAt(mouse: SelectMenuMouseEvent): void {
        this.surfaceAccessor?.dispatchMouse?.(mouse);
    }

    protected async restoreGlobalKeymap(): Promise<void> {
        const persisted = await this.keymapStore?.load(this.state.workspace) || {};
        this.globalKeymap!.configure({ ...(this.options.ui?.keymap || {}), ...persisted });
        const contexts = await this.keymapStore?.loadContexts(this.state.workspace) || {};
        AGENT_CONSOLE_KEYMAP_CONTEXTS.forEach(context => {
            if (context !== 'global' && contexts[context]) {
                this.globalKeymap!.configureContext(context, contexts[context]);
            }
        });
    }

    protected async persistGlobalKeymap(): Promise<void> {
        const contexts: Partial<Record<AgentConsoleKeymapContext, Record<string, string | null>>> = {};
        AGENT_CONSOLE_KEYMAP_CONTEXTS.forEach(context => {
            if (context !== 'global') {
                const bindings = this.globalKeymap!.customBindingsFor(context);
                if (Object.keys(bindings).length) contexts[context] = bindings;
            }
        });
        await this.keymapStore?.save(this.state.workspace, this.globalKeymap!.customBindings, contexts);
    }

    protected async restoreTheme(): Promise<void> {
        const persisted = await this.themeStore?.load(this.resolveHistoryWorkspace());
        if (persisted) {
            this.activeThemeName = persisted;
            this.state.setTheme(agentConsoleThemes[persisted]);
        }
    }

    protected async runThemeCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().toLowerCase();
        if (!requested) {
            const selected = await this.select(
                'Theme',
                agentConsoleThemeNames.map(name => ({
                    label: `${name === this.activeThemeName ? '● ' : '  '}${name}`,
                    value: name,
                    description: name === this.activeThemeName ? 'active theme' : 'apply and save'
                })),
                Math.max(0, agentConsoleThemeNames.indexOf(this.activeThemeName)),
                'enter apply   esc cancel'
            );
            if (!selected) return true;
            return this.applyTheme(selected);
        }
        return this.applyTheme(requested);
    }

    protected async runThinkingCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().toLowerCase();
        if (requested === 'on' || requested === 'show') {
            this.state.setShowThinking(true);
        } else if (requested === 'off' || requested === 'hide') {
            this.state.setShowThinking(false);
        } else {
            this.state.setShowThinking(!this.state.showThinking);
        }
        this.notify(this.state.showThinking ? 'Showing reasoning messages.' : 'Hiding reasoning messages.');
        return true;
    }

    protected async runRawModeCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().toLowerCase();
        if (requested === 'on' || requested === 'show') {
            this.state.setRawMode(true);
        } else if (requested === 'off' || requested === 'hide') {
            this.state.setRawMode(false);
        } else {
            this.state.setRawMode(!this.state.rawMode);
        }
        try {
            await this.rawModeStore?.save(this.resolveHistoryWorkspace(), this.state.rawMode);
        } catch (error: any) {
            this.notify(error?.message || 'Failed to save raw mode.');
            return true;
        }
        this.notify(this.state.rawMode ? 'Raw mode enabled (plain text scrollback).' : 'Raw mode disabled (markdown rendering).');
        return true;
    }

    protected async runStashCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim();
        if (!parsed || parsed.toLowerCase() === 'list') {
            const stashes = await this.stashStore?.load(this.resolveHistoryWorkspace()) || {};
            const names = Object.keys(stashes);
            if (!names.length) {
                this.notify('No stashed drafts. Use /stash push <name> to save the current draft.');
                return true;
            }
            this.notify(`Stashed drafts: ${names.map(name => `${name} (${stashes[name].length} chars)`).join(', ')}.`);
            return true;
        }
        const [verb, ...rest] = parsed.split(/\s+/);
        const requested = rest.join(' ').trim();
        if (verb.toLowerCase() === 'push' || verb.toLowerCase() === 'save') {
            const draft = String(this.state.input || '').trim();
            if (!draft) {
                this.notify('Nothing to stash: the draft is empty.');
                return true;
            }
            const name = requested || 'default';
            const stashes = await this.stashStore?.load(this.resolveHistoryWorkspace()) || {};
            stashes[name] = draft;
            try {
                await this.stashStore?.save(this.resolveHistoryWorkspace(), stashes);
            } catch (error: any) {
                this.notify(error?.message || 'Failed to stash the draft.');
                return true;
            }
            this.notify(`Draft stashed as "${name}".`);
            return true;
        }
        if (verb.toLowerCase() === 'pop' || verb.toLowerCase() === 'restore') {
            const name = requested || 'default';
            const stashes = await this.stashStore?.load(this.resolveHistoryWorkspace()) || {};
            if (!(name in stashes)) {
                this.notify(`No stash named "${name}". Available: ${Object.keys(stashes).join(', ') || 'none'}.`);
                return true;
            }
            this.state.updateDraft(stashes[name]);
            delete stashes[name];
            try {
                await this.stashStore?.save(this.resolveHistoryWorkspace(), stashes);
            } catch (error: any) {
                this.notify(error?.message || 'Restored the draft, but failed to remove the stash.');
                return true;
            }
            this.notify(`Restored stash "${name}" into the draft.`);
            return true;
        }
        if (verb.toLowerCase() === 'rm' || verb.toLowerCase() === 'drop' || verb.toLowerCase() === 'delete') {
            const name = requested || 'default';
            const stashes = await this.stashStore?.load(this.resolveHistoryWorkspace()) || {};
            if (!(name in stashes)) {
                this.notify(`No stash named "${name}". Available: ${Object.keys(stashes).join(', ') || 'none'}.`);
                return true;
            }
            delete stashes[name];
            try {
                await this.stashStore?.save(this.resolveHistoryWorkspace(), stashes);
            } catch (error: any) {
                this.notify(error?.message || 'Failed to remove the stash.');
                return true;
            }
            this.notify(`Removed stash "${name}".`);
            return true;
        }
        this.notify('Usage: /stash [list|push <name>|pop <name>|rm <name>]');
        return true;
    }

    protected async applyTheme(value: string): Promise<boolean> {
        if (!isAgentConsoleThemeName(value)) {
            this.notify(`Unknown theme "${value}". Available: ${agentConsoleThemeNames.join(', ')}.`);
            return true;
        }
        this.activeThemeName = value;
        this.state.setTheme(agentConsoleThemes[value]);
        try {
            await this.themeStore?.save(this.resolveHistoryWorkspace(), value);
        } catch (error: any) {
            this.notify(error?.message || `Applied ${value}, but failed to save the theme.`);
            return true;
        }
        this.notify(`Theme set to ${value}.`);
        return true;
    }

    protected async restoreStatusline(): Promise<void> {
        const persisted = await this.statuslineStore?.load(this.resolveHistoryWorkspace());
        if (persisted) {
            this.state.setStatusline(persisted);
        }
    }

    protected async restoreTitle(): Promise<void> {
        const persisted = await this.titleStore?.load(this.resolveHistoryWorkspace());
        if (persisted) {
            this.state.setTitleFields(persisted);
        }
    }

    protected async restoreRawMode(): Promise<void> {
        const persisted = await this.rawModeStore?.load(this.resolveHistoryWorkspace());
        if (persisted) {
            this.state.setRawMode(persisted);
        }
    }

    protected async restoreSettings(): Promise<void> {
        const persisted = await this.settingsStore?.load(this.resolveHistoryWorkspace());
        if (!persisted) {
            return;
        }
        if (persisted.language && this.translator?.availableLocales.includes(persisted.language)) {
            this.translator.setLocale(persisted.language);
        }
        if (typeof persisted.vimMode === 'boolean') {
            this.state.setVimMode(persisted.vimMode);
        }
        if (typeof persisted.showThinking === 'boolean') {
            this.state.setShowThinking(persisted.showThinking);
        }
        if (typeof persisted.showTimestamps === 'boolean') {
            this.state.setShowTimestamps(persisted.showTimestamps);
        }
        if (typeof persisted.showToolOutput === 'boolean') {
            this.state.setShowToolOutput(persisted.showToolOutput);
        }
        if (typeof persisted.showUsername === 'boolean') {
            this.state.setShowUsername(persisted.showUsername);
        }
        if (typeof persisted.timelineMode === 'boolean') {
            this.state.setTimelineMode(persisted.timelineMode);
        }
        if (persisted.thinkingLevel) {
            this.modelReasoningEffort = persisted.thinkingLevel;
            this.options.model = this.options.model || {};
            this.options.model.reasoningEffort = persisted.thinkingLevel;
        }
    }

    protected async persistSettings(patch: Partial<AgentConsoleSettingsData>): Promise<void> {
        const workspace = this.resolveHistoryWorkspace();
        const current = await this.settingsStore?.load(workspace) || {};
        await this.settingsStore?.save(workspace, { ...current, ...patch });
    }

    protected async runTitleCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim();
        if (!parsed || parsed.toLowerCase() === 'list') {
            const current = this.state.titleFields;
            this.notify(`Window title: ${current.join(', ')}. Use /title set field1,field2 or unset field.`);
            return true;
        }
        const [verb, ...rest] = parsed.split(/\s+/);
        const requested = rest.join(' ').split(',').map(part => part.trim()).filter(Boolean);
        if (verb.toLowerCase() === 'set') {
            if (!requested.length) {
                this.notify('Usage: /title set project,status,thread,branch,model,context,task');
                return true;
            }
            const invalid = requested.filter(field => !isAgentConsoleTitleField(field));
            if (invalid.length) {
                this.notify(`Unknown window title field "${invalid[0]}". Available: ${defaultAgentConsoleTitle.join(', ')}.`);
                return true;
            }
            return this.applyTitleFields(normalizeAgentConsoleTitle(requested));
        }
        if (verb.toLowerCase() === 'unset') {
            const remaining = this.state.titleFields.filter(field => !requested.includes(field));
            if (remaining.length === this.state.titleFields.length) {
                this.notify(`Field "${requested[0]}" is not in the window title. Current: ${this.state.titleFields.join(', ')}.`);
                return true;
            }
            return this.applyTitleFields(normalizeAgentConsoleTitle(remaining));
        }
        this.notify('Usage: /title [list|set field1,field2|unset field]');
        return true;
    }

    protected async applyTitleFields(fields: AgentConsoleTitleField[]): Promise<boolean> {
        this.state.setTitleFields(fields);
        this.updateTerminalTitle();
        try {
            await this.titleStore?.save(this.resolveHistoryWorkspace(), fields);
        } catch (error: any) {
            this.notify(error?.message || 'Updated the window title fields, but failed to save them.');
            return true;
        }
        this.notify(fields.length ? `Window title set to ${fields.join(', ')}.` : 'Window title cleared.');
        return true;
    }

    protected updateTerminalTitle(): void {
        if (this.options.ui?.terminalTitle === false) {
            return;
        }
        const title = this.state.formatTerminalTitle();
        if (!title || title === this.lastTerminalTitle) {
            return;
        }
        this.lastTerminalTitle = title;
        this.surfaceAccessor?.writeRawTerminalData?.(`\x1b]0;${title}\x07`);
        const doc = (globalThis as { document?: { title: string } }).document;
        if (doc) {
            doc.title = title;
        }
    }

    protected async runStatuslineCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim();
        if (!parsed || parsed.toLowerCase() === 'list') {
            const current = this.state.statusline;
            this.notify(`Statusline: ${current.join(', ')}. Use /statusline set field1,field2 or unset field.`);
            return true;
        }
        const [verb, ...rest] = parsed.split(/\s+/);
        const requested = rest.join(' ').split(',').map(part => part.trim()).filter(Boolean);
        if (verb.toLowerCase() === 'set') {
            if (!requested.length) {
                this.notify('Usage: /statusline set model,context,git-branch,tokens,session,workspace,agent');
                return true;
            }
            const invalid = requested.filter(field => !isAgentConsoleStatuslineField(field));
            if (invalid.length) {
                this.notify(`Unknown statusline field "${invalid[0]}". Available: ${defaultAgentConsoleStatusline.join(', ')}.`);
                return true;
            }
            return this.applyStatusline(normalizeAgentConsoleStatusline(requested));
        }
        if (verb.toLowerCase() === 'unset') {
            const remaining = this.state.statusline.filter(field => !requested.includes(field));
            if (remaining.length === this.state.statusline.length) {
                this.notify(`Field "${requested[0]}" is not in the statusline. Current: ${this.state.statusline.join(', ')}.`);
                return true;
            }
            return this.applyStatusline(normalizeAgentConsoleStatusline(remaining));
        }
        this.notify('Usage: /statusline [list|set field1,field2|unset field]');
        return true;
    }

    protected async applyStatusline(fields: AgentConsoleStatuslineField[]): Promise<boolean> {
        this.state.setStatusline(fields);
        try {
            await this.statuslineStore?.save(this.resolveHistoryWorkspace(), fields);
        } catch (error: any) {
            this.notify(error?.message || 'Updated the statusline, but failed to save it.');
            return true;
        }
        this.notify(fields.length ? `Statusline set to ${fields.join(', ')}.` : 'Statusline cleared.');
        return true;
    }

    protected async resolveGitBranch(): Promise<void> {
        const workspace = this.workspace;
        if (!workspace) return;
        const fileAdapter = this.resolveFileAdapter();
        if (!fileAdapter) return;
        try {
            const headPath = fileAdapter.join(workspace, '.git', 'HEAD');
            if (!fileAdapter.existsSync(headPath)) {
                this.state.setGitBranch('');
                this.updateTerminalTitle();
                return;
            }
            const head = fileAdapter.readTextSync(headPath).trim();
            const match = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
            this.state.setGitBranch(match ? match[1] : head.slice(0, 7));
            this.updateTerminalTitle();
        } catch {
            this.state.setGitBranch('');
            this.updateTerminalTitle();
        }
    }

    protected async runHooksCommand(): Promise<boolean> {
        let summary: Array<{ stage: string; commands: string[]; functions: string[] }> = [];
        if (this.appRpc) {
            try {
                const result = await this.appRpc.request('hooks.list', {});
                if (Array.isArray(result)) {
                    summary = result;
                }
            } catch {
                summary = [];
            }
        }
        if (!summary.length) {
            summary = this.runtime.getHookSummary();
        }
        const stages = summary.filter(entry => entry.commands.length > 0 || entry.functions.length > 0);
        if (!stages.length) {
            this.notify('No hooks registered. Configure hooks in agent options (hooks.beforeTurn, hooks.afterTool, ...).');
            return true;
        }
        const lines = stages.map(entry => {
            const commands = entry.commands.length ? `cmd: ${entry.commands.join('; ')}` : '';
            const functions = entry.functions.length ? `fn: ${entry.functions.join(', ')}` : '';
            return `${entry.stage}${commands ? ` [${commands}]` : ''}${functions ? ` [${functions}]` : ''}`;
        });
        this.notify(`Registered hooks:\n${lines.join('\n')}`);
        return true;
    }

    protected async runMemoriesCommand(args?: string): Promise<boolean> {
        const raw = String(args || '').trim();
        const parsed = raw.toLowerCase();
        const current = this.options.ui?.memoryInjection !== false;
        if (!parsed) {
            this.notify(`Memory injection ${current ? 'ON' : 'OFF'}. Use /memories list|add|remove or on|off.`);
            return true;
        }
        if (parsed === 'list' || parsed === 'injected') {
            const projectId = this.resolveProjectMemoryId();
            const records: Array<{ key: string; value: string }> = this.appRpc
                ? await this.appRpc.request('project_memory.list', { sessionId: this.state.sessionId }).catch(() => [])
                : (projectId && this.projectMemory ? await this.projectMemory.list(projectId) : []);
            if (!records.length) {
                this.notify(projectId ? 'No project memories.' : 'Project memory requires a project or workspace.');
                return true;
            }
            this.notify(`Project memories (${records.length}):\n${records.map(record => `- ${record.key}: ${record.value}`).join('\n')}`);
            return true;
        }
        if (parsed.startsWith('add ')) {
            const projectId = this.resolveProjectMemoryId();
            const body = raw.slice(4).trim();
            const separator = body.indexOf('=') >= 0 ? body.indexOf('=') : body.indexOf(' ');
            if (!projectId || (!this.appRpc && !this.projectMemory) || separator <= 0 || !body.slice(separator + 1).trim()) {
                this.notify('Usage: /memories add <key>=<value>');
                return true;
            }
            const input = { sessionId: this.state.sessionId, projectId, key: body.slice(0, separator).trim(), value: body.slice(separator + 1).trim(), conflict: 'replace' as const };
            const record = this.appRpc
                ? await this.appRpc.request('project_memory.add', input)
                : await this.projectMemory!.add(input);
            this.notify(`Project memory saved: ${record.key}`);
            return true;
        }
        if (parsed.startsWith('remove ') || parsed.startsWith('rm ')) {
            const projectId = this.resolveProjectMemoryId();
            const target = raw.slice(raw.indexOf(' ') + 1).trim();
            const result = this.appRpc
                ? await this.appRpc.request('project_memory.remove', { sessionId: this.state.sessionId, target }).catch(() => ({ removed: 0 }))
                : { removed: projectId && this.projectMemory ? await this.projectMemory.remove(projectId, target) : 0 };
            const removed = Number(result?.removed || 0);
            this.notify(removed ? `Removed ${removed} project memory record${removed === 1 ? '' : 's'}.` : `Project memory not found: ${target || '-'}`);
            return true;
        }
        const enabled = parsed === 'on';
        if (parsed !== 'on' && parsed !== 'off') {
            this.notify('Usage: /memories [on|off|list|injected|add <key>=<value>|remove <id-or-key>]');
            return true;
        }
        this.options.ui = { ...(this.options.ui || {}), memoryInjection: enabled };
        this.notify(enabled ? 'Memory injection enabled.' : 'Memory injection disabled.');
        return true;
    }

    protected resolveProjectMemoryId(): string {
        const consoleOptions = this.options.ui?.console as Record<string, any> | undefined;
        return String(this.state.projectKey || consoleOptions?.workspace || '').trim();
    }

    protected async runFastCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().toLowerCase();
        const profiles = (this.options.model?.profiles || {}) as Record<string, unknown>;
        if (requested && !profiles[requested]) {
            this.notify(`Unknown model profile "${requested}". Available: ${Object.keys(profiles).join(', ') || 'none'}.`);
            return true;
        }
        const target = requested || (this.state.modelProfile === 'fast' ? 'strong' : 'fast');
        if (!profiles[target]) {
            this.notify(`No "${target}" model profile configured. Configure model.profiles.fast / model.profiles.strong.`);
            return true;
        }
        await this.activateModelProfile(target);
        return true;
    }

    protected async runPersonalityCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim();
        const parts = parsed.split(/\s+/).filter(Boolean);
        const verb = parts[0]?.toLowerCase() ?? '';
        const names = Object.keys(AGENT_PERSONALITY_PRESETS);
        if (!verb) {
            const active = this.options.ui?.personality;
            this.notify(`Personality: ${active || 'none'}. Available: ${names.join(', ')}. Use /personality set <name> or unset.`);
            return true;
        }
        if (verb === 'list') {
            const lines = names.map(name => `${name === this.options.ui?.personality ? '*' : ' '} ${name}`);
            this.notify(`Personality presets:\n${lines.join('\n')}`);
            return true;
        }
        if (verb === 'set') {
            const name = parts[1] ?? '';
            if (!name || !AGENT_PERSONALITY_PRESETS[name]) {
                this.notify(`Unknown personality preset "${name}". Available: ${names.join(', ')}.`);
                return true;
            }
            this.options.ui = { ...(this.options.ui || {}), personality: name };
            this.notify(`Personality set to ${name}.`);
            return true;
        }
        if (verb === 'unset') {
            this.options.ui = { ...(this.options.ui || {}), personality: undefined };
            this.notify('Personality cleared.');
            return true;
        }
        this.notify('Usage: /personality [list|set <name>|unset]');
        return true;
    }

    protected async runDebugConfigCommand(): Promise<boolean> {
        const model = this.options.model || {};
        const ui = this.options.ui || {};
        const profiles = (model.profiles || {}) as Record<string, unknown>;
        const activeProfile = String(model.defaultProfile || this.state.modelProfile || 'default');
        const experimental = (ui.experimental || {}) as Record<string, boolean>;
        const lines = [
            `model: ${String(model.provider || '-')} / ${String(model.model || '-')}`,
            `profile: ${activeProfile}${Object.keys(profiles).length ? ` (available: ${Object.keys(profiles).join(', ')})` : ''}`,
            `ui.title: ${ui.title || '(default)'}`,
            `ui.statusline: ${Array.isArray(ui.statusline) ? ui.statusline.join(', ') : '(default)'}`,
            `ui.memoryInjection: ${ui.memoryInjection !== false ? 'on' : 'off'}`,
            `ui.personality: ${ui.personality || '(none)'}`,
            `ui.queueMode: ${ui.queueMode || 'off'}`,
            `ui.planNudges: ${ui.planNudges !== false ? 'on' : 'off'}`,
            `experimental: ${Object.keys(experimental).length ? Object.entries(experimental).map(([name, enabled]) => `${name}=${enabled ? 'on' : 'off'}`).join(', ') : '(none)'}`,
            `session: ${this.state.sessionId} · workspace: ${this.workspace || '(none)'}`
        ];
        this.notify(`Debug config:\n${lines.join('\n')}`);
        return true;
    }

    protected async runSettingsCommand(): Promise<boolean> {
        const tab = await this.select('Settings', [
            { label: 'General', value: 'general', description: 'theme, language, input toggles' },
            { label: 'Keybinds', value: 'keybinds', description: 'record, conflict detection, reset' },
            { label: 'Providers', value: 'providers', description: 'model profiles and provider' }
        ], 0, 'enter select   esc close');
        if (!tab) return true;
        if (tab === 'general') return this.openSettingsGeneralTab();
        if (tab === 'keybinds') return this.openSettingsKeybindsTab();
        if (tab === 'providers') return this.openSettingsProvidersTab();
        return true;
    }

    protected async openSettingsGeneralTab(): Promise<boolean> {
        const option = await this.select('Settings · General', [
            { label: `Theme: ${this.activeThemeName}`, value: 'theme', description: 'apply and save a UI theme' },
            { label: `Language: ${this.translator?.currentLocale || 'en'}`, value: 'language', description: 'switch UI language' },
            { label: `Vim mode: ${this.state.vimMode ? 'on' : 'off'}`, value: 'vim', description: 'vim-style normal/insert input mode' },
            { label: `Raw mode: ${this.state.rawMode ? 'on' : 'off'}`, value: 'raw', description: 'plain-text scrollback rendering' },
            { label: `Thinking: ${this.state.showThinking ? 'shown' : 'hidden'}`, value: 'thinking', description: 'reasoning message visibility' },
            { label: `Timestamps: ${this.state.showTimestamps ? 'shown' : 'hidden'}`, value: 'timestamps', description: 'message timestamp visibility' },
            { label: `Tool output: ${this.state.showToolOutput ? 'shown' : 'hidden'}`, value: 'tooloutput', description: 'tool output visibility in messages' },
            { label: `Username: ${this.state.showUsername ? 'shown' : 'hidden'}`, value: 'username', description: 'username label visibility' },
            { label: `Window title: ${this.options.ui?.terminalTitle === false ? 'off' : 'on'}`, value: 'title', description: 'terminal/document title sync' }
        ], 0, 'enter apply   esc close');
        if (!option) return true;
        if (option === 'theme') {
            await this.runThemeCommand();
            return true;
        }
        if (option === 'language') {
            return this.openSettingsLanguage();
        }
        if (option === 'vim') {
            await this.runVimCommand('');
            try {
                await this.persistSettings({ vimMode: this.state.vimMode });
            } catch (error: any) {
                this.notify(error?.message || 'Failed to save vim mode.');
            }
            return true;
        }
        if (option === 'raw') {
            return this.runRawModeCommand();
        }
        if (option === 'thinking') {
            this.state.setShowThinking(!this.state.showThinking);
            this.notify(this.state.showThinking ? 'Showing reasoning messages.' : 'Hiding reasoning messages.');
            try {
                await this.persistSettings({ showThinking: this.state.showThinking });
            } catch (error: any) {
                this.notify(error?.message || 'Failed to save thinking visibility.');
            }
            return true;
        }
        if (option === 'title') {
            const enabled = this.options.ui?.terminalTitle !== false;
            this.options.ui = { ...(this.options.ui || {}), terminalTitle: !enabled };
            this.notify(!enabled ? 'Window title sync enabled.' : 'Window title sync disabled.');
            return true;
        }
        if (option === 'timestamps') {
            return this.runDisplayCommand('');
        }
        if (option === 'tooloutput') {
            this.state.setShowToolOutput(!this.state.showToolOutput);
            try {
                await this.persistSettings({ showToolOutput: this.state.showToolOutput });
            } catch (error: any) {
                this.notify(error?.message || 'Failed to save tool output visibility.');
                return true;
            }
            this.notify(this.state.showToolOutput ? 'Showing tool output in messages.' : 'Hiding tool output in messages.');
            return true;
        }
        if (option === 'username') {
            this.state.setShowUsername(!this.state.showUsername);
            try {
                await this.persistSettings({ showUsername: this.state.showUsername });
            } catch (error: any) {
                this.notify(error?.message || 'Failed to save username visibility.');
                return true;
            }
            this.notify(this.state.showUsername ? 'Showing the username label.' : 'Hiding the username label.');
            return true;
        }
        return true;
    }

    protected async openSettingsLanguage(): Promise<boolean> {
        const locales = this.translator?.availableLocales?.length
            ? this.translator.availableLocales
            : ['en', 'zh-CN'];
        const current = this.translator?.currentLocale || 'en';
        const selected = await this.select('Settings · Language', locales.map(locale => ({
            label: `${locale === current ? '● ' : '  '}${locale}`,
            value: locale,
            description: locale === current ? 'current language' : 'switch and save'
        })), Math.max(0, locales.indexOf(current)), 'enter apply   esc close');
        if (!selected) return true;
        this.translator?.setLocale(selected);
        try {
            await this.persistSettings({ language: selected });
        } catch (error: any) {
            this.notify(error?.message || `Switched to ${selected}, but failed to save the language.`);
            return true;
        }
        this.notify(`Language set to ${selected}.`);
        return true;
    }

    protected async openSettingsKeybindsTab(): Promise<boolean> {
        const action = await this.select('Settings · Keybinds', [
            { label: 'List bindings', value: 'list', description: 'show effective key bindings' },
            { label: 'Record a key', value: 'record', description: 'capture a key for an action' },
            { label: 'Reset to defaults', value: 'reset', description: 'restore default key bindings' }
        ], 0, 'enter select   esc close');
        if (!action) return true;
        if (action === 'list') {
            await this.runKeymapCommand('list');
            return true;
        }
        if (action === 'reset') {
            await this.runKeymapCommand('reset');
            return true;
        }
        if (action === 'record') {
            const target = await this.select('Settings · Record key', AGENT_CONSOLE_GLOBAL_ACTIONS.map(name => ({
                label: name,
                value: name,
                description: 'press a key to bind after selecting'
            })), 0, 'enter select   esc close');
            if (!target) return true;
            await this.runKeymapCommand(`record ${target}`);
            return true;
        }
        return true;
    }

    protected async openSettingsProvidersTab(): Promise<boolean> {
        const option = await this.select('Settings · Providers', [
            { label: 'Model profiles', value: 'model', description: 'switch the active model profile' },
            { label: `Thinking level: ${this.modelReasoningEffort}`, value: 'thinking-level', description: 'set model reasoning effort' },
            { label: 'Fast/strong profile', value: 'fast', description: 'switch between fast and strong profiles' },
            { label: 'Session status', value: 'status', description: 'show current model / archetype / modes' }
        ], 0, 'enter select   esc close');
        if (!option) return true;
        if (option === 'model') {
            await this.openModelSwitcher();
            return true;
        }
        if (option === 'thinking-level') {
            return this.openSettingsThinkingLevel();
        }
        if (option === 'fast') {
            return this.runFastCommand();
        }
        if (option === 'status') {
            await this.runStatusCommand();
            return true;
        }
        return true;
    }

    protected async openSettingsThinkingLevel(): Promise<boolean> {
        const tiers: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
        const selected = await this.select('Settings · Thinking Level', tiers.map(tier => ({
            label: `${tier === this.modelReasoningEffort ? '● ' : '  '}${tier}`,
            value: tier,
            description: tier === this.modelReasoningEffort ? 'current level' : 'set reasoning effort'
        })), Math.max(0, tiers.indexOf(this.modelReasoningEffort)), 'enter apply   esc close') as 'low' | 'medium' | 'high' | undefined;
        if (!selected) return true;
        await this.setModelReasoningEffort(selected);
        return true;
    }

    protected async runDisplayCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().toLowerCase();
        const current = this.state.showTimestamps;
        if (requested === 'on' || requested === 'show') {
            this.state.setShowTimestamps(true);
        } else if (requested === 'off' || requested === 'hide') {
            this.state.setShowTimestamps(false);
        } else {
            this.state.setShowTimestamps(!current);
        }
        try {
            await this.persistSettings({ showTimestamps: this.state.showTimestamps });
        } catch (error: any) {
            this.notify(error?.message || 'Failed to save timestamp visibility.');
            return true;
        }
        this.notify(this.state.showTimestamps ? 'Showing message timestamps.' : 'Hiding message timestamps.');
        return true;
    }

    protected async toggleTimelineMode(): Promise<void> {
        const visible = !this.state.timelineMode;
        this.state.setTimelineMode(visible);
        this.notify(visible ? 'Timeline view enabled (compact chronological list).' : 'Timeline view disabled.');
        try {
            await this.persistSettings({ timelineMode: visible });
        } catch (error: any) {
            this.notify(error?.message || 'Failed to save timeline mode.');
        }
    }

    protected async invokeTool(name: string, input: any): Promise<any> {
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.invoke', { sessionId: this.state.sessionId, name, input });
            return result?.output;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.invoke !== 'function') return undefined;
        return this.toolRegistry.invoke(name, input, this.state.sessionId, undefined, this.state.workspace);
    }

    protected async runSkillsCommand(args?: string): Promise<boolean> {
        const query = String(args || '').trim();
        const result = await this.invokeTool('skill_list', query ? { query } : {}).catch(() => undefined);
        const skills = Array.isArray(result?.skills) ? result.skills : [];
        if (!skills.length) {
            this.notify(query ? `No skills match "${query}".` : 'No skills available.');
            return true;
        }
        if (query) {
            this.notify(skills.map((skill: any) => this.formatSkillLine(skill)).join('\n'));
            return true;
        }
        const selected = await this.select('Skills', skills.map((skill: any) => ({
            label: `${skill.id}${String(skill.category || '').trim() ? ` [${skill.category}]` : ''}`,
            value: String(skill.id || ''),
            description: String(skill.summary || ''),
            detail: [
                `Title: ${String(skill.title || skill.id || '-')}`,
                String(skill.summary || '') ? `Summary: ${skill.summary}` : '',
                Array.isArray(skill.aliases) && skill.aliases.length ? `Aliases: ${skill.aliases.join(', ')}` : '',
                String(skill.source || '') ? `Source: ${skill.source}` : ''
            ].filter(Boolean).join('\n')
        })), 0, 'enter detail   esc close');
        if (!selected) return true;
        const detail = await this.invokeTool('read_skill', { id: selected }).catch(() => undefined);
        this.notify(detail?.skill
            ? this.formatSkillDetail(detail.skill)
            : skills.map((skill: any) => this.formatSkillLine(skill)).join('\n'));
        return true;
    }

    protected formatSkillLine(skill: any): string {
        const parts = [String(skill.id || '')];
        if (String(skill.category || '').trim()) parts.push(`[${skill.category}]`);
        if (String(skill.summary || '').trim()) parts.push(String(skill.summary));
        return parts.join(' ');
    }

    protected formatSkillDetail(skill: any): string {
        const lines = [
            `Skill: ${String(skill.id || '')}`,
            String(skill.title || '') ? `Title: ${skill.title}` : '',
            String(skill.summary || '') ? `Summary: ${skill.summary}` : '',
            Array.isArray(skill.aliases) && skill.aliases.length ? `Aliases: ${skill.aliases.join(', ')}` : '',
            String(skill.content || '') ? `Content: ${skill.content}` : '',
            String(skill.source || '') ? `Source: ${skill.source}` : ''
        ];
        return lines.filter(Boolean).join('\n');
    }

    protected async runMcpCommand(args?: string): Promise<boolean> {
        const verbose = String(args || '').trim().toLowerCase() === 'verbose'
            || String(args || '').trim().toLowerCase() === '-v';
        const servers = new Map<string, { tools: string[]; active: number }>();
        for (const tool of this.state.tools) {
            if (!tool.name.startsWith('mcp.')) continue;
            const parts = tool.name.split('.');
            const serverId = parts[1] || 'unknown';
            const entry = servers.get(serverId) || { tools: [], active: 0 };
            entry.tools.push(tool.name);
            if (tool.active) entry.active += 1;
            servers.set(serverId, entry);
        }
        if (!servers.size) {
            this.notify('No MCP servers configured. Add them via the agent settings (tsdi-agent mcp add).');
            return true;
        }
        const lines = Array.from(servers.entries()).map(([serverId, entry]) => {
            const summary = `${serverId} · ${entry.active}/${entry.tools.length} tools active`;
            return verbose
                ? `${summary}\n${entry.tools.map(name => `  ${name}`).join('\n')}`
                : summary;
        });
        this.notify(lines.join('\n'));
        return true;
    }

    protected async runPluginsCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim();
        const result = await this.invokeTool('plugins', requested
            ? { action: 'inspect', id: requested }
            : { action: 'list' }).catch(() => undefined);
        const plugins = Array.isArray(result?.plugins) ? result.plugins : [];
        if (!plugins.length) {
            this.notify(requested ? `No plugin "${requested}" installed.` : 'No plugins installed.');
            return true;
        }
        if (requested) {
            this.notify(plugins.map((plugin: any) => this.formatPluginDetail(plugin, result?.contributions)).join('\n'));
            return true;
        }
        this.notify(plugins.map((plugin: any) => this.formatPluginLine(plugin)).join('\n'));
        return true;
    }

    protected resolveApps(): AgentConsoleAppStatus[] {
        const config = (this.options.ui?.console as any)?.connectors;
        return resolveAgentConsoleApps(config && typeof config === 'object' ? config : undefined);
    }

    protected resolveAppAuthorizer(): AgentConsoleAppAuthorizer | undefined {
        const authorizer = (this.options.ui?.console as any)?.authorizeConnector
            || (this.options.ui as any)?.authorizeConnector;
        return typeof authorizer === 'function' ? authorizer : undefined;
    }

    protected async runAppsCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().replace(/^\$/, '').toLowerCase();
        const apps = this.resolveApps();
        if (requested) {
            let app = apps.find(item => item.id === requested);
            if (!app) {
                this.notify(`Unknown connector "${requested}". Use /apps to browse available connectors.`);
                return true;
            }
            if (!app.authorized) {
                const authorize = this.resolveAppAuthorizer();
                if (!authorize) {
                    this.insertAppMention(app);
                    return true;
                }
                let authorized = false;
                try {
                    authorized = await authorize(app);
                } catch (error) {
                    this.notify(`${app.name} authorization failed: ${error instanceof Error ? error.message : String(error)}`);
                    return true;
                }
                if (!authorized) {
                    this.notify(`${app.name} authorization was cancelled.`);
                    return true;
                }
                app = { ...app, authorized: true, statusLabel: 'connected' };
            }
            this.insertAppMention(app);
            return true;
        }
        const selected = await this.select('Apps', apps.map(app => ({
            label: `${app.name} · ${app.statusLabel}`,
            value: app.id,
            description: `${app.category} · ${app.description}`
        })), 0, 'enter insert   esc close');
        if (selected) {
            const app = apps.find(item => item.id === selected);
            if (app) this.insertAppMention(app);
        }
        return true;
    }

    protected insertAppMention(app: AgentConsoleAppStatus): void {
        const current = String(this.state.input || '');
        const spacer = current && !/\s$/.test(current) ? ' ' : '';
        const next = `${current}${spacer}$${app.id} `;
        this.state.updateDraft(next, next.length);
        this.notify(`${app.name} connector inserted · ${app.statusLabel}.`);
    }

    protected formatPluginLine(plugin: any): string {
        const name = String(plugin?.manifest?.name || plugin.id || '');
        const scope = String(plugin?.scope || '').trim();
        const description = String(plugin?.manifest?.description || '').trim();
        return `${name}${scope ? ` [${scope}]` : ''}${description ? ` · ${description}` : ''}`;
    }

    protected formatPluginDetail(plugin: any, contributions?: any): string {
        const lines = [
            `Plugin: ${String(plugin?.manifest?.name || plugin.id || '')}`,
            `Id: ${String(plugin.id || '')}`,
            String(plugin?.manifest?.description || '') ? `Description: ${plugin.manifest.description}` : '',
            String(plugin?.scope || '') ? `Scope: ${plugin.scope}` : '',
            String(plugin?.version || '') ? `Version: ${plugin.version}` : ''
        ];
        const skills = Array.isArray(contributions?.skills) ? contributions.skills : [];
        if (skills.length) lines.push(`Skills: ${skills.map((skill: any) => String(skill.id || '')).join(', ')}`);
        return lines.filter(Boolean).join('\n');
    }

    protected async runShareCommand(args?: string): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (this.appRpc) {
            try {
                const share = await this.appRpc.request('session.share.create', { sessionId });
                const token = String(share?.token || '').trim();
                if (!token) {
                    this.notify('Sharing is not available in this gateway.');
                    return true;
                }
                const url = String(share?.url || `/api/share/${token}`).trim();
                await this.openSharePanel(token, url);
                return true;
            } catch (error: any) {
                this.notify(`Failed to create a share: ${error?.message || String(error)}`);
                return true;
            }
        }
        this.notify('Sharing requires a gateway (app RPC). Start the agent through the gateway or web console.');
        return true;
    }

    protected async runUnshareCommand(args?: string): Promise<boolean> {
        const token = String(args || '').trim();
        if (!this.appRpc) {
            this.notify('Sharing requires a gateway (app RPC).');
            return true;
        }
        if (!token) {
            const shares = await this.appRpc.request('session.share.list', { sessionId: this.state.sessionId }).catch(() => []);
            if (!Array.isArray(shares) || !shares.length) {
                this.notify('No active shares for this session. Usage: /unshare <token>');
                return true;
            }
            const selected = await this.select('Active shares', shares.map((share: any) => ({
                label: `${String(share.token || '').slice(0, 12)}…  ${String(share.url || '')}`,
                value: String(share.token || ''),
                description: new Date(Number(share.createdAt) || Date.now()).toLocaleString()
            })), 0, 'enter revoke   esc close');
            if (!selected) return true;
            return this.revokeShare(selected);
        }
        return this.revokeShare(token);
    }

    protected async revokeShare(token: string): Promise<boolean> {
        try {
            const result = await this.appRpc?.request('session.share.revoke', { token });
            if (result?.revoked === false) {
                this.notify(`Share ${String(token).slice(0, 12)}… is no longer active.`);
                return true;
            }
            this.notify(`Share ${String(token).slice(0, 12)}… revoked.`);
        } catch (error: any) {
            this.notify(`Failed to revoke the share: ${error?.message || String(error)}`);
        }
        return true;
    }

    protected async openSharePanel(token: string, url: string): Promise<void> {
        const fullUrl = this.state.consoleOptions?.shareBaseUrl
            ? `${this.state.consoleOptions.shareBaseUrl.replace(/\/+$/, '')}${url}`
            : url;
        const selected = await this.select('Session share', [
            { label: 'Share created', value: 'info', description: `token ${String(token).slice(0, 8)}… · ${new Date().toLocaleString()}` },
            { label: fullUrl, value: 'copy', description: 'copy the share link' },
            { label: `Revoke (${String(token).slice(0, 8)}…)`, value: 'revoke', description: 'permanently disable this share' }
        ], 1, 'enter select   esc close');
        if (!selected) return;
        if (selected === 'copy') {
            await this.copyFocusedTextActionHandler(fullUrl, 'share link');
            return;
        }
        if (selected === 'revoke') {
            await this.revokeShare(token);
        }
    }

    protected async runApproveRetryCommand(): Promise<boolean> {
        if (!this.appRpc) {
            this.notify('Auto-review retry requires a gateway (app RPC).');
            return true;
        }
        const result = await this.appRpc.request('harness.rejected_actions', { sessionId: this.state.sessionId })
            .catch(() => null);
        const actions = Array.isArray(result?.actions) ? result.actions : [];
        if (!actions.length) {
            this.notify('No auto-review-rejected actions to retry.');
            return true;
        }
        const action = actions[0];
        const selected = await this.select('Approve retry', actions.map((item: any) => ({
            label: `${item.toolName}${String(item.inputSummary || '').trim() ? ` · ${item.inputSummary}` : ''}`,
            value: String(item.evidenceId || `${item.toolName}:${item.createdAt}`),
            description: String(item.falsificationReason || '')
        })), 0, 'enter retry once   esc close');
        if (!selected) return true;
        try {
            await this.appRpc.request('harness.retry_rejected_action', {
                sessionId: this.state.sessionId,
                evidenceId: selected,
                toolName: action.toolName
            });
            this.notify(`Retried ${action.toolName} once after auto-review rejection.`);
        } catch (error: any) {
            this.notify(`Retry failed: ${error?.message || String(error)}`);
        }
        return true;
    }

    protected async runExperimentalCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim();
        const parts = parsed.split(/\s+/).filter(Boolean);
        const experimental = { ...((this.options.ui?.experimental || {}) as Record<string, boolean>) };
        if (!parts.length) {
            if (!Object.keys(experimental).length) {
                this.notify('No experimental features enabled. Use /experimental <name> on|off.');
                return true;
            }
            const lines = Object.entries(experimental).map(([name, enabled]) => `${enabled ? 'on' : 'off'} ${name}`);
            this.notify(`Experimental features:\n${lines.join('\n')}`);
            return true;
        }
        const [name, state] = parts;
        if (!name || (state !== 'on' && state !== 'off')) {
            this.notify('Usage: /experimental [<name> on|off]');
            return true;
        }
        experimental[name] = state === 'on';
        this.options.ui = { ...(this.options.ui || {}), experimental };
        this.notify(`Experimental feature "${name}" ${state === 'on' ? 'enabled' : 'disabled'}.`);
        return true;
    }

    protected async runFeedbackCommand(): Promise<boolean> {
        this.notify([
            'Packaging diagnostics for feedback:',
            '1. Run /debug-config and include the output.',
            '2. Include the session transcript (messages panel or /export).',
            '3. Note the agent version and host (CLI/Web/IDE/Desktop).',
            '4. If it reproduces, include the exact command or prompt.'
        ].join('\n'));
        return true;
    }

    protected async runBackgroundTasksCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim();
        const parts = parsed.split(/\s+/).filter(Boolean);
        if (!this.backgroundTasks) {
            this.notify('Background task manager not available in this environment.');
            return true;
        }
        if (parts.length && parts[0].toLowerCase() === 'stop') {
            const taskId = parts[1];
            if (!taskId) {
                this.notify('Usage: /ps stop <taskId>');
                return true;
            }
            this.notify(this.backgroundTasks.cancel(taskId) ? `Background task ${taskId} cancelled.` : `No running background task ${taskId}.`);
            return true;
        }
        const tasks = this.backgroundTasks.list(this.state.sessionId);
        if (!tasks.length) {
            this.notify('No background tasks for this session. Start one with a /jobs or delegated long-running task.');
            return true;
        }
        const lines = tasks.map(task => {
            const status = String(task.status).toUpperCase();
            const meta = task.finishedAt ? ` (${new Date(task.finishedAt).toLocaleTimeString()})` : '';
            return `${status}${meta} ${task.id} - ${task.goal}`;
        });
        this.notify(`Background tasks:\n${lines.join('\n')}`);
        return true;
    }

    protected async runIdeCommand(args?: string): Promise<boolean> {
        const parsed = String(args || '').trim().toLowerCase();
        if (!this.ideBridge) {
            this.notify('No IDE bridge available. Attach an editor host (e.g. VS Code extension) to expose file context.');
            return true;
        }
        if (parsed === 'refresh' || parsed === 'detach') {
            this.notify(`IDE bridge: ${parsed === 'refresh' ? 'refreshed.' : 'detached.'}`);
            return true;
        }
        try {
            const context = await this.ideBridge.getContext();
            if (!context?.activeFile) {
                this.notify('IDE bridge connected, but no active file selected.');
                return true;
            }
            const selection = context.selection
                ? ` lines ${context.selection.startLine}-${context.selection.endLine}`
                : '';
            this.notify(`IDE context: ${context.activeFile}${selection}${context.platform ? ` (${context.platform})` : ''}`);
        } catch (error: any) {
            this.notify(error?.message || 'Failed to read IDE context.');
        }
        return true;
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
            this.notify('Editor closed without changes.');
            return true;
        }
        this.state.setInput(result.content, result.content.length);
        this.notify(`Draft updated from editor (${result.content.length} chars).`);
        return true;
    }

    protected async openExternalEditor(initial: string): Promise<{ content?: string; cancelled?: boolean } | undefined> {
        if (!this.editorBridge?.available) {
            this.notify('No external editor available. Set $EDITOR or $VISUAL (agent-cli host) to enable Ctrl+G / /editor.');
            return undefined;
        }
        try {
            return await this.editorBridge.open(initial);
        } catch (error: any) {
            this.notify(error?.message || 'External editor failed to start.');
            return undefined;
        }
    }

    protected decodeGlobalKey(raw: string): string {
        if (raw === '\u001b') return 'escape';
        const arrows: Record<string, string> = {
            '\u001b[A': 'up',
            '\u001b[B': 'down',
            '\u001b[C': 'right',
            '\u001b[D': 'left'
        };
        const arrow = arrows[raw];
        if (arrow) return arrow;
        const navigation: Record<string, string> = {
            '\u001b[5~': 'pageup',
            '\u001b[6~': 'pagedown',
            '\u001b[H': 'home',
            '\u001b[F': 'end',
            '\u001b[1~': 'home',
            '\u001b[4~': 'end',
            '\u001b[7~': 'home',
            '\u001b[8~': 'end'
        };
        const navKey = navigation[raw];
        if (navKey) return navKey;
        const functionKeys: Record<string, string> = {
            '\u001b[12~': 'f2',
            '\u001bOQ': 'f2',
            '\u001b[1;2Q': 'shift+f2',
            '\u001b[1;12~': 'shift+f2'
        };
        const functionKey = functionKeys[raw];
        if (functionKey) return functionKey;
        const modifiedKeys: Record<string, string> = {
            '\u001b\u000b': 'ctrl+alt+k'
        };
        const modifiedKey = modifiedKeys[raw];
        if (modifiedKey) return modifiedKey;
        if (raw.length === 1) {
            const code = raw.charCodeAt(0);
            if (code >= 1 && code <= 26) return `ctrl+${String.fromCharCode(96 + code)}`;
            if (!/[\u0000-\u001f\u007f]/.test(raw)) {
                if (code >= 65 && code <= 90) return `shift+${raw.toLowerCase()}`;
                return raw.toLowerCase();
            }
        }
        return '';
    }

    protected async handleGlobalKeyInput(raw: string): Promise<boolean> {
        if (this.keymapRecording) {
            if (raw === '\u001b') {
                this.keymapRecording = undefined;
                this.notify('Keymap recording cancelled.');
                return true;
            }
            const key = this.decodeGlobalKey(raw);
            if (key) {
                const { context, action } = this.keymapRecording;
                this.keymapRecording = undefined;
                if (this.globalKeymap!.set(key, action, context)) {
                    await this.persistGlobalKeymap();
                    this.notify(`Keymap set: ${key} -> ${action} (${context}).`);
                } else {
                    this.notify(`Cannot bind ${key}: unknown action ${action}.`);
                }
            }
            return true;
        }
        if (raw === '\u001b' && this.state.whichKeyVisible) {
            this.state.setWhichKeyVisible(false);
            return true;
        }
        if (raw === '\u001b' && (this.state.selectMenu || this.state.isAnyFocusActive())) return false;
        if (raw === '\u001b') {
            const action = this.globalKeymap!.resolve('escape', this.resolveKeymapContext());
            if (action === 'interrupt-turn') {
                if (!this.isTurnInProgress()) return this.handleIdleEscape();
                await this.interruptTurn();
                return true;
            }
            if (!action) return this.isTurnInProgress();
            await this.executeGlobalKeyAction(action);
            return true;
        }
        const key = this.decodeGlobalKey(raw);
        if (!key) {
            if (raw === '\u001b') this.globalKeyPending = '';
            return false;
        }
        if (this.state.whichKeyVisible && key !== 'ctrl+alt+k') {
            if (key === 'n') {
                this.state.setWhichKeyPage(this.state.whichKeyPage + 1);
                this.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'p') {
                this.state.setWhichKeyPage(this.state.whichKeyPage - 1);
                this.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'l' || key === 'L') {
                this.state.toggleWhichKeyLayout();
                this.refreshWhichKeyBindings();
                return true;
            }
            if (key === 'f' || key === 'F') {
                this.state.toggleWhichKeyFilterCustom();
                this.refreshWhichKeyBindings();
                return true;
            }
            this.state.setWhichKeyVisible(false);
        }
        return this.handleGlobalKeySequence(key);
    }

    protected async handleGlobalKeySequence(key: string): Promise<boolean> {
        const sequence = this.globalKeyPending ? `${this.globalKeyPending} ${key}` : key;
        const context = this.resolveKeymapContext();
        const action = this.globalKeymap!.resolve(sequence, context);
        const isPrefix = Object.keys(this.globalKeymap!.effectiveBindings(context)).some(binding => binding.startsWith(`${sequence} `));
        if (isPrefix && !action) {
            this.globalKeyPending = sequence;
            return true;
        }
        if (this.globalKeyPending) {
            this.globalKeyPending = '';
            if (!action) return true;
        }
        if (!action) return false;
        if (isAgentConsoleThreadNavigationAction(action) && !this.canThreadNavigate()) return false;
        if (isAgentConsoleMessageNavigationAction(action) && !this.canMessageNavigate()) return false;
        return await this.executeGlobalKeyAction(action);
    }

    protected async handleBrowserGlobalKeyInput(key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }): Promise<boolean> {
        const ctrlKey = !!(modifiers.ctrlKey || modifiers.metaKey);
        const altKey = !!modifiers.altKey;
        const rawKey = String(key || '').toLowerCase();
        const normalizedKey = ctrlKey
            ? (altKey ? `ctrl+alt+${rawKey}` : `ctrl+${rawKey}`)
            : /^f\d{1,2}$/.test(rawKey)
                ? (modifiers.shiftKey ? `shift+${rawKey}` : rawKey)
                : modifiers.shiftKey && /^[A-Z]$/.test(String(key || ''))
                    ? `shift+${rawKey}`
                    : rawKey;
        const arrowKeys: Record<string, string> = {
            arrowup: 'up',
            arrowdown: 'down',
            arrowleft: 'left',
            arrowright: 'right'
        };
        const navKeys: Record<string, string> = {
            pageup: 'pageup',
            pagedown: 'pagedown',
            home: 'home',
            end: 'end'
        };
        const functionKeys: Record<string, string> = {
            f1: 'f1', f2: 'f2', f3: 'f3', f4: 'f4',
            f5: 'f5', f6: 'f6', f7: 'f7', f8: 'f8',
            f9: 'f9', f10: 'f10', f11: 'f11', f12: 'f12',
            'shift+f1': 'shift+f1', 'shift+f2': 'shift+f2', 'shift+f3': 'shift+f3', 'shift+f4': 'shift+f4',
            'shift+f5': 'shift+f5', 'shift+f6': 'shift+f6', 'shift+f7': 'shift+f7', 'shift+f8': 'shift+f8',
            'shift+f9': 'shift+f9', 'shift+f10': 'shift+f10', 'shift+f11': 'shift+f11', 'shift+f12': 'shift+f12'
        };
        const mappedKey = arrowKeys[normalizedKey] || navKeys[normalizedKey] || functionKeys[normalizedKey] || normalizedKey;
        if (this.keymapRecording) {
            if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
                this.keymapRecording = undefined;
                this.notify('Keymap recording cancelled.');
                return true;
            }
            if (mappedKey) {
                const { context, action } = this.keymapRecording;
                this.keymapRecording = undefined;
                if (this.globalKeymap!.set(mappedKey, action, context)) {
                    await this.persistGlobalKeymap();
                    this.notify(`Keymap set: ${mappedKey} -> ${action} (${context}).`);
                } else {
                    this.notify(`Cannot bind ${mappedKey}: unknown action ${action}.`);
                }
            }
            return true;
        }
        if (this.state.selectMenu?.title?.startsWith('Command palette')) {
            if (normalizedKey === 'ctrl+p') return this.handleGlobalKeySequence(normalizedKey);
            if (!ctrlKey && normalizedKey === 'backspace') {
                this.openCommandPalette(this.commandPaletteQuery.slice(0, -1));
                return true;
            }
            if (!ctrlKey && key.length === 1) {
                this.openCommandPalette(`${this.commandPaletteQuery}${key}`);
                return true;
            }
            return false;
        }
        if (this.state.whichKeyVisible) {
            if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
                this.state.setWhichKeyVisible(false);
                return true;
            }
            if (mappedKey && this.globalKeymap!.resolve(mappedKey, this.resolveKeymapContext()) !== 'which-key-toggle') {
                this.state.setWhichKeyVisible(false);
            }
        }
        if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey) && (this.state.selectMenu || this.state.isAnyFocusActive())) {
            this.globalKeyPending = '';
            return false;
        }
        if (!ctrlKey && ['escape', 'esc'].includes(normalizedKey)) {
            const action = this.globalKeymap!.resolve('escape', this.resolveKeymapContext());
            if (action === 'interrupt-turn') {
                if (!this.isTurnInProgress()) return this.handleIdleEscape();
                await this.interruptTurn();
                return true;
            }
            if (!action) return this.isTurnInProgress();
            await this.executeGlobalKeyAction(action);
            return true;
        }
        if (!ctrlKey && !arrowKeys[normalizedKey] && !navKeys[normalizedKey] && !functionKeys[normalizedKey] && key.length !== 1 && !this.globalKeyPending) return false;
        return this.handleGlobalKeySequence(mappedKey);
    }

    /**
     * P130 edit-last-message Esc state machine (G55/G70):
     * edit-active Esc dismisses (records target for step-back); idle double
     * Esc within EDIT_ESCAPE_WINDOW_MS re-enters at the previous message, or
     * at the last editable user message when no dismissal is recent.
     */
    protected async handleIdleEscape(): Promise<boolean> {
        const now = Date.now();
        const withinWindow = now - this.lastEscapeAt <= AgentConsoleComponent.EDIT_ESCAPE_WINDOW_MS;
        this.lastEscapeAt = now;
        if (this.editTargetMessageId) {
            this.dismissEditMode();
            return true;
        }
        if (withinWindow) {
            this.lastEscapeAt = 0;
            await this.enterEditMode();
            return true;
        }
        return false;
    }

    protected getEditableUserMessages(): AgentMessage[] {
        return this.state.messages.filter(message =>
            message.role === 'user'
            && message.metadata?.kind !== 'steer'
            && !!String(message.content || '').trim()
        );
    }

    protected extractEditableMessageText(message: AgentMessage): string {
        const content = String(message?.content || '');
        const marker = '[Mention Context]';
        if (content.startsWith(marker)) {
            const separator = content.indexOf('\n\n', marker.length);
            if (separator >= 0) {
                return content.slice(separator + 2);
            }
        }
        return content;
    }

    protected getEditableImageParts(message: AgentMessage): Array<{ imageUrl: string; mediaType?: string; name?: string }> {
        const images: Array<{ imageUrl: string; mediaType?: string; name?: string }> = [];
        for (const part of message?.parts || []) {
            if (part?.type === 'image' && part?.imageUrl) {
                images.push({ imageUrl: part.imageUrl, mediaType: part.mediaType, name: part.name });
            }
        }
        return images;
    }

    protected async enterEditMode(): Promise<boolean> {
        const editable = this.getEditableUserMessages();
        if (!editable.length) {
            this.notify('No user message to edit.');
            return true;
        }
        const recentDismiss = this.editDismissedAt > 0
            && (Date.now() - this.editDismissedAt) <= AgentConsoleComponent.EDIT_ESCAPE_WINDOW_MS;
        if (recentDismiss && this.lastEditSessionMessageId) {
            const index = editable.findIndex(message => message.id === this.lastEditSessionMessageId);
            if (index > 0) {
                this.startEditTarget(editable[index - 1]);
                return true;
            }
            this.notify('Already at the first user message.');
            return true;
        }
        this.startEditTarget(editable[editable.length - 1]);
        return true;
    }

    protected startEditTarget(target: AgentMessage): void {
        this.editAttachmentsBefore = this.state.pendingAttachments.slice();
        this.editDraftBefore = this.state.input;
        this.editTargetMessageId = target.id;
        const text = this.extractEditableMessageText(target);
        this.state.setInput(text, text.length);
        const imageParts = this.getEditableImageParts(target);
        if (imageParts.length) {
            this.state.setPendingAttachments(imageParts.map((part, index) => ({
                id: `edit-${target.id}-${index}`,
                kind: 'image',
                path: part.imageUrl,
                name: part.name || `image-${index + 1}`,
                mediaType: part.mediaType,
                imageUrl: part.imageUrl
            })));
        } else {
            this.state.clearPendingAttachments();
        }
        this.notify(`Editing message ${target.id.slice(0, 8)}… Enter to submit, Esc cancels, Esc,Esc for previous.`);
    }

    protected dismissEditMode(): boolean {
        if (!this.editTargetMessageId) return true;
        this.lastEditSessionMessageId = this.editTargetMessageId;
        this.editDismissedAt = Date.now();
        this.editTargetMessageId = '';
        this.state.setInput(this.editDraftBefore, this.editDraftBefore.length);
        this.state.setPendingAttachments(this.editAttachmentsBefore);
        this.notify('Edit cancelled — draft restored.');
        return true;
    }

    protected async executeGlobalKeyAction(action: AgentConsoleGlobalAction): Promise<boolean> {
        if (action === 'command-palette') {
            this.openCommandPalette();
            return true;
        }
        if (action === 'interrupt-turn') {
            await this.interruptTurn();
            return true;
        }
        if (action === 'theme') {
            await this.handleCommand('/theme');
            return true;
        }
        if (action === 'toggle-thinking') {
            this.state.setShowThinking(!this.state.showThinking);
            this.notify(this.state.showThinking ? 'Showing reasoning messages.' : 'Hiding reasoning messages.');
            return true;
        }
        if (action === 'open-editor') {
            await this.runEditorCommand();
            return true;
        }
        if (action === 'thread-child-first') {
            return this.navigateThreadChildFirst();
        }
        if (action === 'thread-cycle-next') {
            return this.navigateThreadCycle(1);
        }
        if (action === 'thread-cycle-prev') {
            return this.navigateThreadCycle(-1);
        }
        if (action === 'thread-parent') {
            return this.navigateThreadParent();
        }
        if (action === 'message-page-up') {
            this.state.moveMessageSelectionPage(-1);
            return true;
        }
        if (action === 'message-page-down') {
            this.state.moveMessageSelectionPage(1);
            return true;
        }
        if (action === 'message-half-page-up') {
            this.state.moveMessageSelectionPage(-1, Math.max(1, Math.floor(this.state.consoleOptions.messageSelectionPageSize / 2)));
            return true;
        }
        if (action === 'message-half-page-down') {
            this.state.moveMessageSelectionPage(1, Math.max(1, Math.floor(this.state.consoleOptions.messageSelectionPageSize / 2)));
            return true;
        }
        if (action === 'message-line-up') {
            this.state.moveMessageSelectionPage(-1, 1);
            return true;
        }
        if (action === 'message-line-down') {
            this.state.moveMessageSelectionPage(1, 1);
            return true;
        }
        if (action === 'message-first') {
            this.state.selectFirstMessage();
            return true;
        }
        if (action === 'message-last') {
            this.state.selectLastMessage();
            return true;
        }
        if (action === 'message-last-user') {
            this.state.selectLastUserMessage();
            return true;
        }
        if (action === 'model-favorite-toggle') {
            await this.toggleModelFavorite();
            return true;
        }
        if (action === 'model-cycle-recent') {
            await this.cycleRecentModel(1);
            return true;
        }
        if (action === 'model-cycle-recent-back') {
            await this.cycleRecentModel(-1);
            return true;
        }
        if (action === 'model-variant-cycle') {
            await this.cycleModelVariant();
            return true;
        }
        if (action === 'which-key-toggle') {
            this.toggleWhichKeyOverlay();
            return true;
        }
        if (action === 'which-key-layout-toggle') {
            this.state.toggleWhichKeyLayout();
            if (this.state.whichKeyVisible) {
                this.refreshWhichKeyBindings();
            }
            return true;
        }
        if (action === 'which-key-pending-toggle') {
            this.state.toggleWhichKeyFilterCustom();
            if (this.state.whichKeyVisible) {
                this.refreshWhichKeyBindings();
            }
            return true;
        }
        if (action === 'status-health') {
            await this.toggleHealthPopover();
            return true;
        }
        if (action === 'timeline-mode') {
            await this.toggleTimelineMode();
            return true;
        }
        const commands: Record<Exclude<AgentConsoleGlobalAction, 'command-palette' | 'theme' | 'interrupt-turn' | 'toggle-thinking' | 'open-editor' | 'thread-child-first' | 'thread-cycle-next' | 'thread-cycle-prev' | 'thread-parent' | 'message-page-up' | 'message-page-down' | 'message-half-page-up' | 'message-half-page-down' | 'message-line-up' | 'message-line-down' | 'message-first' | 'message-last' | 'message-last-user' | 'model-favorite-toggle' | 'model-cycle-recent' | 'model-cycle-recent-back' | 'model-variant-cycle' | 'which-key-toggle' | 'which-key-layout-toggle' | 'which-key-pending-toggle' | 'status-health' | 'timeline-mode'>, string> = {
            'new-session': '/new',
            compact: '/compact',
            export: '/export',
            undo: '/undo',
            redo: '/redo',
            sessions: '/sessions',
            model: '/model',
            archetypes: '/archetype',
            status: '/status',
            copy: '/copy'
        };
        await this.handleCommand(commands[action]);
        return true;
    }

    protected toggleWhichKeyOverlay(): void {
        const visible = !this.state.whichKeyVisible;
        if (visible) {
            this.state.whichKeyPage = 0;
            this.refreshWhichKeyBindings();
        }
        this.state.setWhichKeyVisible(visible);
    }

    protected refreshWhichKeyBindings(): void {
        const context = this.resolveKeymapContext();
        const allBindings = Object.entries(this.globalKeymap!.effectiveBindings(context));
        const filtered = this.state.whichKeyFilterCustom
            ? allBindings.filter(([key]) => !(key in AGENT_CONSOLE_DEFAULT_KEYMAP) || AGENT_CONSOLE_DEFAULT_KEYMAP[key] === undefined)
            : allBindings;
        const pageSize = 25;
        const start = this.state.whichKeyPage * pageSize;
        const paged = filtered.slice(start, start + pageSize);
        this.state.setWhichKeyBindings(paged.map(([key, action]) => ({ key, action })));
    }

    protected async toggleHealthPopover(): Promise<void> {
        const visible = !this.state.healthPopoverVisible;
        if (visible) {
            this.state.setHealthItems(await this.collectHealthItems());
        }
        this.state.setHealthPopoverVisible(visible);
    }

    protected async collectHealthItems(): Promise<AgentConsoleHealthItem[]> {
        const items: AgentConsoleHealthItem[] = [];
        if (this.appRpc) {
            try {
                await this.appRpc.request('app.state');
                items.push({ id: 'gateway', label: 'Gateway', status: 'ok', detail: 'connected' });
            } catch {
                items.push({ id: 'gateway', label: 'Gateway', status: 'error', detail: 'unreachable' });
            }
        } else {
            items.push({ id: 'gateway', label: 'Gateway', status: 'unknown', detail: 'local runtime (no gateway)' });
        }
        const mcpServers = new Map<string, { total: number; active: number }>();
        const lspTools: string[] = [];
        for (const tool of this.state.tools) {
            if (tool.name.startsWith('mcp.')) {
                const parts = tool.name.split('.');
                const serverId = parts[1] || 'unknown';
                const entry = mcpServers.get(serverId) || { total: 0, active: 0 };
                entry.total += 1;
                if (tool.active) entry.active += 1;
                mcpServers.set(serverId, entry);
            } else if (tool.name.startsWith('lsp_')) {
                lspTools.push(tool.name);
            }
        }
        if (mcpServers.size) {
            mcpServers.forEach((stats, serverId) => {
                items.push({
                    id: `mcp:${serverId}`,
                    label: `MCP ${serverId}`,
                    status: stats.active === 0 ? 'error' : (stats.active === stats.total ? 'ok' : 'warn'),
                    detail: `${stats.active}/${stats.total} tools active`
                });
            });
        } else {
            items.push({ id: 'mcp', label: 'MCP', status: 'unknown', detail: 'no MCP servers configured' });
        }
        items.push(lspTools.length
            ? { id: 'lsp', label: 'LSP', status: 'ok', detail: `${lspTools.length} tools available` }
            : { id: 'lsp', label: 'LSP', status: 'unknown', detail: 'no LSP tools available' });
        return items;
    }

    protected canThreadNavigate(): boolean {
        return !!this.appRpc
            && this.state.hasMessageFocus()
            && !this.state.messageDetailOpen
            && !this.state.selectMenu;
    }

    protected canMessageNavigate(): boolean {
        return this.state.hasMessageFocus()
            && !this.state.messageDetailOpen
            && !this.state.selectMenu;
    }

    protected async navigateThreadChildFirst(): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            return false;
        }
        const children = await this.sessionService.getDelegationChildren(sessionId, {}, this.state);
        const first = children?.[0];
        if (!first?.childSessionId) {
            return false;
        }
        await this.openSession(String(first.childSessionId));
        return true;
    }

    protected async navigateThreadCycle(delta: 1 | -1): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            return false;
        }
        const lineage = await this.sessionService.getDelegationLineage(sessionId, { limit: 1 }, this.state);
        const parentEdge = lineage?.[0];
        if (!parentEdge?.parentSessionId) {
            return false;
        }
        const siblings = await this.sessionService.getDelegationChildren(String(parentEdge.parentSessionId), {}, this.state);
        if (siblings.length < 2) {
            return false;
        }
        const currentIndex = siblings.findIndex(edge => String(edge.childSessionId) === sessionId);
        if (currentIndex < 0) {
            return false;
        }
        const next = siblings[(currentIndex + delta + siblings.length) % siblings.length];
        if (!next?.childSessionId || String(next.childSessionId) === sessionId) {
            return false;
        }
        await this.openSession(String(next.childSessionId));
        return true;
    }

    protected async navigateThreadParent(): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            return false;
        }
        const lineage = await this.sessionService.getDelegationLineage(sessionId, { limit: 1 }, this.state);
        const parentEdge = lineage?.[0];
        if (!parentEdge?.parentSessionId) {
            return false;
        }
        await this.openSession(String(parentEdge.parentSessionId));
        return true;
    }

    protected openCommandPalette(query = ''): void {
        this.commandPaletteQuery = query;
        const commands = this.state.commandHints
            .filter(command => fuzzyMatchAgentConsoleCommand(command, query))
            .map(command => ({ label: command, value: command, description: 'command' }));
        this.state.openSelectMenu(query ? `Command palette: ${query}` : 'Command palette', commands, 0, 'type to filter   enter execute');
        this.state.selectMenuAction = async value => {
            this.commandPaletteQuery = '';
            if (value) await this.handleCommand(value);
        };
    }

    protected async handleCommandPaletteInput(decoded: TerminalInputSequenceResult, raw: string): Promise<boolean> {
        if (!this.state.selectMenu?.title?.startsWith('Command palette')) return false;
        if ((decoded.controlKey as string | undefined) === 'backspace' || raw === '\u007f' || raw === '\b') {
            this.openCommandPalette(this.commandPaletteQuery.slice(0, -1));
            return true;
        }
        if (decoded.controlKey || raw === '\u001b' || raw === '\r' || raw === '\n') return false;
        if (raw && !/[\u0000-\u001f\u007f]/.test(raw)) {
            this.openCommandPalette(`${this.commandPaletteQuery}${raw}`);
            return true;
        }
        return false;
    }

    async handleTerminalInput(
        decoded: TerminalInputSequenceResult,
        chunk: ConsoleTextChunk
    ): Promise<void> {
        if (this.closing) {
            return;
        }
        if (decoded.mouse) {
            this.dispatchTerminalMouseAt(decoded.mouse);
            return;
        }
        this.surfaceAccessor?.notifyNonMouseInput?.();
        if (this.state.isSshShellActive && this.sshShell) {
            const raw = decodeConsoleTextChunk(chunk);
            if (raw === SSH_SHELL_DETACH_SEQUENCE) {
                await this.detachSshShell('detached');
                return;
            }
            this.sshShell.write(raw);
            return;
        }
        const rawChunk = decodeConsoleTextChunk(chunk);
        if (await this.handleCommandPaletteInput(decoded, rawChunk)) {
            return;
        }
        if (await this.handleGlobalKeyInput(rawChunk)) {
            return;
        }
        if (this.state.vimMode && !this.state.isAnyFocusActive() && this.state.inputMode === 'normal') {
            const raw = decodeConsoleTextChunk(chunk);
            if (decoded.controlKey === 'return') {
                return;
            }
            if (!decoded.controlKey && raw && raw !== '\u001b' && !/[\u0000-\u001f\u007f]/.test(raw)) {
                this.state.handleVimKey(raw);
                return;
            }
        }
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
            case 'cancelTurn':
                if (this.isTurnInProgress()) {
                    const cancelled = await this.sessionService?.cancelTurn(this.state.sessionId) ?? false;
                    this.notify(cancelled
                        ? 'Cancelling current turn...'
                        : 'No running turn to cancel.');
                }
                return;
            case 'queueDraft':
                this.queueDraft();
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
        if (this.closing) {
            return;
        }
        this.closing = true;
        if (!this.app) {
            if (exitMessage) {
                this.notify(exitMessage);
            }
            this.surfaceAccessor?.stopTerminal?.();
            return;
        }
        try {
            await this.app.close();
        } catch {
            // Teardown must not surface as an unhandled rejection: the Ctrl+C
            // path invokes this fire-and-forget, and /exit awaits it. The core
            // destroy() fix guarantees super.destroy() (component onDestroy:
            // terminal restore + history persist) still runs even when a
            // @Shutdown handler throws during runners.stop().
        } finally {
            this.surfaceAccessor?.stopTerminal?.();
        }
        if (exitMessage && typeof globalThis.console?.log === 'function') {
            globalThis.console.log(exitMessage);
        }
    }

    protected async executeTurn(
        input: string,
        message?: AgentTurnMessageInput,
        profile?: string
    ): Promise<import('@tsdi/agent').AgentTurnResult | void> {
        if (this.appRpc) {
            await this.appRpc.request('run.turn', {
                sessionId: this.state.sessionId,
                input,
                ...(profile ? { profile } : {}),
                ...(message ? { message } : {})
            });
            return;
        }
        return this.runtime.runTurn(this.state.sessionId, input, undefined, message, profile);
    }

    protected async loadTools(sessionId = this.state.sessionId): Promise<any[]> {
        if (this.appRpc) {
            const tools = await this.appRpc.request('tools.list', { sessionId });
            return Array.isArray(tools) ? tools : [];
        }
        if (!this.toolRegistry) {
            return [];
        }
        return this.toolRegistry.getToolDefinitions(sessionId) as any[];
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
                        ,profile?.capabilities ? `Capabilities: ${Object.entries(profile.capabilities).filter(([, enabled]) => enabled === true || enabled === 'full' || enabled === 'partial').map(([name]) => name).join(', ')}` : ''
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

    protected async runInitCommand(args: string): Promise<void> {
        const force = String(args || '').trim().split(/\s+/).includes('--force');
        try {
            const result = await initAgentsDoc({ force, root: this.workspace || this.options.ui?.console?.workspace, fileAdapter: this.resolveFileAdapter() ?? undefined });
            if (result.created) {
                this.notify(`Created ${result.file}`);
            } else {
                this.notify(`AGENTS.md ${result.reason}`);
            }
        } catch (error) {
            this.notify(`Failed to create AGENTS.md: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runPlanCommand(args: string): Promise<void> {
        const sessionId = this.state.sessionId;
        const raw = String(args || '').trim().toLowerCase();
        let enabled: boolean;
        if (raw === 'on' || raw === '1' || raw === 'true') {
            enabled = true;
        } else if (raw === 'off' || raw === '0' || raw === 'false') {
            enabled = false;
        } else {
            enabled = !this.state.planMode;
        }
        try {
            if (this.appRpc) {
                await this.appRpc.request('session.plan_mode.set', { sessionId, enabled });
            } else {
                this.runtime.setPlanMode(sessionId, enabled);
            }
            this.state.setPlanMode(enabled);
            this.notify(enabled ? 'Plan mode enabled — write tools will be denied.' : 'Plan mode disabled.');
        } catch (error) {
            this.notify(`Failed to set plan mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runArchetypeCommand(args: string): Promise<void> {
        const sessionId = this.state.sessionId;
        const name = String(args || '').trim().toLowerCase();
        try {
            if (!name) {
                const current = this.runtime.getSessionArchetype(sessionId);
                const available = this.runtime.listArchetypes().join(', ');
                this.notify(`Session archetype: ${current}. Available: ${available}.`);
                return;
            }
            if (this.appRpc) {
                await this.appRpc.request('session.archetype.set', { sessionId, archetype: name });
            } else {
                this.runtime.setSessionArchetype(sessionId, name);
            }
            this.notify(`Session ${sessionId} switched to the "${name}" archetype.`);
        } catch (error) {
            this.notify(`Failed to set archetype: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runDelegationModeCommand(args: string): Promise<void> {
        const sessionId = this.state.sessionId;
        const mode = String(args || '').trim().toLowerCase();
        const modes = ['disabled', 'explicit', 'proactive'];
        try {
            if (!mode || mode === 'default') {
                if (mode === 'default') {
                    if (this.appRpc) {
                        await this.appRpc.request('session.delegation_mode.set', { sessionId, mode: 'default' });
                    } else {
                        this.runtime.setSessionDelegationMode(sessionId, null);
                    }
                    this.notify('Delegation mode reset to the configured default.');
                    return;
                }
                const current = await this.getSessionDelegationMode(sessionId);
                this.notify(`Delegation mode: ${current}. Valid modes: ${modes.join(' | ')}.`);
                return;
            }
            if (!modes.includes(mode)) {
                this.notify(`Invalid delegation mode "${mode}". Valid modes: ${modes.join(' | ')}.`);
                return;
            }
            if (this.appRpc) {
                await this.appRpc.request('session.delegation_mode.set', { sessionId, mode });
            } else {
                this.runtime.setSessionDelegationMode(sessionId, mode as import('@tsdi/agent').AgentDelegationMode);
            }
            this.notify(`Session ${sessionId} delegation mode set to "${mode}".`);
        } catch (error) {
            this.notify(`Failed to set delegation mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runVimCommand(args: string): Promise<void> {
        const raw = String(args || '').trim().toLowerCase();
        let enabled: boolean;
        if (raw === 'on' || raw === '1' || raw === 'true') {
            enabled = true;
        } else if (raw === 'off' || raw === '0' || raw === 'false') {
            enabled = false;
        } else {
            enabled = !this.state.vimMode;
        }
        this.state.setVimMode(enabled);
        this.notify(enabled
            ? 'Vim mode enabled — input starts in insert mode; press Esc for normal mode.'
            : 'Vim mode disabled.');
    }

    protected resolveKeymapContext(): AgentConsoleKeymapContext {
        if (this.state.hasApprovalFocus()) return 'approval';
        if (this.state.hasMessageFocus() || this.state.hasMessageDetailFocus()) return 'pager';
        if (this.state.hasSessionFocus() || this.state.hasTaskFocus() || this.state.hasScheduledJobFocus()
            || this.state.hasToolFocus() || this.state.hasBlockingSelectMenu()) return 'list';
        if (this.state.inputFocused && !this.state.isAnyFocusActive()) return 'composer';
        return 'global';
    }

    protected async runKeymapCommand(args: string): Promise<void> {
        const rawTokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        const first = (rawTokens[0] || '').toLowerCase();
        const isScopeToken = ['global', 'vim', 'composer', 'list', 'approval', 'pager'].includes(first);
        const scope = isScopeToken && (rawTokens.length > 1 || first !== 'list')
            ? rawTokens.shift()!.toLowerCase()
            : '';
        const context: AgentConsoleKeymapContext = isAgentConsoleKeymapContext(scope) ? scope : 'global';
        const tokens = rawTokens;
        const action = (tokens[0] || 'list').toLowerCase();
        if (action === 'list') {
            const globalEntries = Object.entries(this.globalKeymap!.effectiveBindings(context)).map(([key, value]) => `${key} -> ${value}`);
            const vimEntries = Object.entries(this.state.effectiveVimBindings).map(([key, value]) => `vim:${key} -> ${value}`);
            this.notify([...(scope === 'vim' ? [] : globalEntries), ...(scope === '' || scope === 'vim' ? vimEntries : [])].join('\n') || 'No key bindings.');
            return;
        }
        if (action === 'set') {
            const key = tokens[1];
            const target = tokens[2];
            if (!key || !target) {
                this.notify('Usage: /keymap [global|composer|list|approval|pager|vim] set <key> <action>');
                return;
            }
            if (scope !== 'vim' && isAgentConsoleGlobalAction(target) && this.globalKeymap!.set(key, target, context)) {
                await this.persistGlobalKeymap();
                const conflicts = this.globalKeymap!.conflicts(key, target, context);
                const conflictText = conflicts.length
                    ? `  conflicts with ${conflicts.map(({ context: c, action: a }) => `${c}:${a}`).join(', ')}`
                    : '';
                this.notify(`Keymap set: ${key} -> ${target}${conflictText}`);
                return;
            }
            if ((scope === 'vim' || scope === '') && isConsoleVimAction(target) && this.state.setVimBinding(key, target)) {
                this.notify(`Vim keymap set: ${key} -> ${target}`);
                return;
            }
            this.notify(`Unknown keymap action: ${target}  (global: ${AGENT_CONSOLE_GLOBAL_ACTIONS.join(', ')}; vim: ${VIM_ACTION_NAMES.join(', ')})`);
            return;
        }
        if (action === 'unset') {
            const key = tokens[1];
            if (!key) {
                this.notify('Usage: /keymap [global|composer|list|approval|pager|vim] unset <key>');
                return;
            }
            if (scope !== 'vim' && this.globalKeymap!.unset(key, context)) {
                await this.persistGlobalKeymap();
                this.notify(`${context === 'global' ? 'Global' : context} keymap unset: ${key}`);
                return;
            }
            if ((scope === 'vim' || scope === '') && this.state.unsetVimBinding(key)) {
                this.notify(`Vim keymap unset: ${key} (default restored if any)`);
                return;
            }
            this.notify(`No binding for key: ${key}`);
            return;
        }
        if (action === 'reset') {
            if (scope === '' || scope === 'vim') this.state.resetVimBindings();
            if (scope === '' || scope === 'global' || isAgentConsoleKeymapContext(scope)) {
                this.globalKeymap!.reset(scope === '' ? undefined : context);
                await this.persistGlobalKeymap();
            }
            this.notify('Keymap reset to defaults.');
            return;
        }
        if (action === 'record') {
            const target = tokens[1];
            if (!target) {
                this.notify('Usage: /keymap [global|composer|list|approval|pager|vim] record <action>');
                return;
            }
            if (scope === 'vim' || !isAgentConsoleGlobalAction(target)) {
                this.notify(`Unknown keymap action: ${target}  (global: ${AGENT_CONSOLE_GLOBAL_ACTIONS.join(', ')})`);
                return;
            }
            this.keymapRecording = { context, action: target };
            this.notify(`Recording key for ${target} (${context}) — press a key now, Esc to cancel.`);
            return;
        }
        this.notify('Usage: /keymap [global|composer|list|approval|pager|vim] [list|set <key> <action>|unset <key>|reset|record <action>]');
    }

    protected async runSshCommand(args: string): Promise<void> {
        const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        const action = (tokens[0] || 'list').toLowerCase();
        if (action === 'help' || action === '?') {
            this.notify('Usage: /ssh [list] | connect <host> | disconnect <host> | shell <host> | forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
            return;
        }
        if (action === 'list' || action === 'ls') {
            this.listSshHosts();
            return;
        }
        if (action === 'connect') {
            await this.connectSshHost(tokens[1]);
            return;
        }
        if (action === 'disconnect') {
            await this.disconnectSshHost(tokens[1]);
            return;
        }
        if (action === 'shell') {
            await this.startSshShell(tokens[1]);
            return;
        }
        if (action === 'forward') {
            await this.forwardSshTunnel(tokens.slice(1));
            return;
        }
        this.notify('Unknown /ssh command. Usage: /ssh [list] | connect <host> | disconnect <host> | shell <host> | forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
    }

    protected listSshHosts(): void {
        if (!this.sshManager) {
            this.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
            return;
        }
        const infos = this.sshManager.list();
        if (!infos.length) {
            this.notify('No SSH hosts configured.');
            return;
        }
        const lines = infos.map(info =>
            `${info.id} · ${info.username}@${info.host}:${info.port} · ${info.connected ? 'connected' : 'disconnected'}`
        );
        this.notify(lines.join('\n'));
    }

    protected async connectSshHost(id: string | undefined): Promise<void> {
        if (!id) {
            this.notify('Usage: /ssh connect <host>');
            return;
        }
        if (!this.sshManager) {
            this.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
            return;
        }
        if (!this.sshManager.hasHost(id)) {
            this.notify(`SSH host '${id}' is not configured. Use /ssh list to see available hosts.`);
            return;
        }
        try {
            const client = await this.sshManager.connect(id);
            this.notify(`Connected to ${client.hostId}.`);
        } catch (error) {
            this.notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async disconnectSshHost(id: string | undefined): Promise<void> {
        if (!id) {
            this.notify('Usage: /ssh disconnect <host>');
            return;
        }
        if (!this.sshManager) {
            this.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
            return;
        }
        const disconnected = await this.sshManager.disconnect(id);
        this.notify(disconnected
            ? `Disconnected from ${id}.`
            : `SSH host '${id}' is not connected.`);
    }

    protected async forwardSshTunnel(tokens: string[]): Promise<void> {
        const id = tokens[0];
        const destAddr = tokens[1];
        const destPort = Number(tokens[2]);
        if (!id || !destAddr || !Number.isInteger(destPort) || destPort < 1 || destPort > 65535) {
            this.notify('Usage: /ssh forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
            return;
        }
        if (!this.sshManager) {
            this.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
            return;
        }
        const srcAddr = tokens[3] || '127.0.0.1';
        const srcPort = tokens[4] == null ? 0 : Number(tokens[4]);
        if (!Number.isInteger(srcPort) || srcPort < 0 || srcPort > 65535) {
            this.notify('Invalid srcPort: must be an integer in 0..65535.');
            return;
        }
        let client: SshClient;
        try {
            client = await this.sshManager.connect(id);
        } catch (error) {
            this.notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        try {
            const channel = await client.forwardOut(srcAddr, srcPort, destAddr, destPort);
            channel.close();
            this.notify(`Tunnel established: ${srcAddr}:${srcPort} -> ${destAddr}:${destPort} via ${client.hostId}.`);
        } catch (error) {
            this.notify(`SSH forward failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async startSshShell(id: string | undefined): Promise<void> {
        if (!id) {
            this.notify('Usage: /ssh shell <host>');
            return;
        }
        if (!this.sshManager) {
            this.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
            return;
        }
        if (!this.sshManager.hasHost(id)) {
            this.notify(`SSH host '${id}' is not configured. Use /ssh list to see available hosts.`);
            return;
        }
        if (this.state.isSshShellActive) {
            this.notify(`Already in SSH shell on ${this.state.sshShell?.hostId}. Press Ctrl+] to detach.`);
            return;
        }
        let client: SshClient;
        try {
            client = await this.sshManager.connect(id);
        } catch (error) {
            this.notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        const size = this.surfaceAccessor?.getTerminalSize?.() ?? { cols: 80, rows: 24 };
        let shell: SshShellSession;
        try {
            shell = await client.shell({ term: 'xterm-256color', cols: size.cols, rows: size.rows });
        } catch (error) {
            this.notify(`SSH shell failed: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        this.sshShell = shell;
        this.state.sshShell = { hostId: id };
        shell.stream.on('data', (chunk: Uint8Array | string) => {
            this.surfaceAccessor?.writeRawTerminalData?.(String(chunk));
        });
        shell.stream.stderr?.on('data', (chunk: Uint8Array | string) => {
            this.surfaceAccessor?.writeRawTerminalData?.(String(chunk));
        });
        const onEnd = () => {
            if (this.state.isSshShellActive && this.sshShell === shell) {
                void this.detachSshShell('closed');
            }
        };
        shell.stream.on('close', onEnd);
        shell.stream.on('error', onEnd);
        this.notify(`SSH shell started on ${id}. Terminal bytes stream live; press Ctrl+] to detach.`);
    }

    protected async detachSshShell(reason: 'detached' | 'closed'): Promise<void> {
        const hostId = this.state.sshShell?.hostId || '';
        const shell = this.sshShell;
        this.sshShell = null;
        this.state.sshShell = null;
        if (shell) {
            try {
                await shell.close();
            } catch {
                void 0;
            }
        }
        this.surfaceAccessor?.resetTerminalRenderState?.();
        if (hostId) {
            this.notify(reason === 'detached'
                ? `SSH shell detached from ${hostId}.`
                : `SSH shell on ${hostId} closed.`);
        }
    }

    protected async runPermissionsCommand(args: string): Promise<void> {
        const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
        if (!tokens.length || tokens[0].toLowerCase() === 'status') {
            await this.showSandboxCapabilities();
            return;
        }
        const area = tokens[0].toLowerCase();
        if (area === 'readonly' || area === 'plan') {
            await this.runPlanCommand(tokens.slice(1).join(' '));
            return;
        }
        if (area !== 'sandbox') {
            this.notify('Usage: /permissions [readonly on|off] | [sandbox default|off|workspace|network-block]');
            return;
        }

        const rawMode = String(tokens[1] || '').trim().toLowerCase();
        if (!rawMode) {
            const mode = await this.getSessionSandboxMode(this.state.sessionId);
            this.notify(`Sandbox mode ${mode}.`);
            return;
        }
        if (!['default', 'off', 'workspace', 'network-block'].includes(rawMode)) {
            this.notify('Sandbox mode must be one of: default, off, workspace, network-block.');
            return;
        }
        try {
            await this.setSessionSandboxMode(this.state.sessionId, rawMode === 'default' ? null : rawMode as any);
            this.notify(`Sandbox mode set to ${rawMode}.`);
        } catch (error) {
            this.notify(`Failed to set sandbox mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async showSandboxCapabilities(): Promise<void> {
        const platform = (globalThis as { process?: { platform?: string } }).process?.platform;
        const probe = await detectSandboxExecTool(platform);
        const proxy = this.options?.sandbox?.proxy;
        const capabilities = describeSandboxCapabilities(platform, probe, !!(proxy?.http || proxy?.https));
        const mode = await this.getSessionSandboxMode(this.state.sessionId).catch(() => 'default');
        const lines = [`sandbox ${mode} · ${platform || 'unknown'} · ${probe.tool || 'process fallback'}`];
        for (const item of capabilities) {
            lines.push(`${item.capability} ${item.supported ? 'supported' : 'degraded'} · ${item.enforcement}`);
        }
        if (proxy?.required) {
            lines.push(`proxy required · ${proxy.http || proxy.https ? 'configured' : 'missing'}`);
        }
        this.notify(lines.join('\n'));
    }

    protected async runStatusCommand(): Promise<void> {
        const sessionId = this.state.sessionId;
        let planMode = this.state.planMode;
        let sandboxMode = await this.getSessionSandboxMode(sessionId).catch(() => 'default');
        let delegationMode = await this.getSessionDelegationMode(sessionId).catch(() => 'explicit');
        let archetype = (this.runtime as any).getSessionArchetype?.(sessionId) ?? 'build';
        if (this.appRpc) {
            const result = await this.appRpc.request('session.plan_mode.get', { sessionId }).catch(() => null);
            planMode = result?.enabled === true;
            const archetypeResult = await this.appRpc.request('session.archetype.get', { sessionId }).catch(() => null);
            if (archetypeResult?.archetype) {
                archetype = String(archetypeResult.archetype);
            }
        }
        const model = this.state.modelProfile || this.state.model || 'default';
        this.notify(`session ${sessionId} · model ${model} · archetype ${archetype} · plan mode ${planMode ? 'ON (read-only)' : 'off'} · sandbox ${sandboxMode} · delegation ${delegationMode}`);
    }

    protected async runGoalCommand(args: string): Promise<void> {
        const sessionId = this.state.sessionId;
        const [command = 'show', ...rest] = String(args || '').trim().split(/\s+/);
        try {
            if (command === 'create') {
                const parts = rest.join(' ').split('|').map(item => item.trim());
                if (parts.length < 2 || !parts[0] || !parts[1]) { this.notify('Usage: /goal create <title> | <objective> | criterion 1; criterion 2'); return; }
                const input = { title: parts[0], objective: parts[1], successCriteria: (parts[2] || '').split(';').map(item => item.trim()).filter(Boolean) };
                const goal = this.appRpc ? await this.appRpc.request('goal.create', { sessionId, ...input }) : await this.runtime.createGoal(input, sessionId);
                this.notify(`Goal ${goal.id} created: ${goal.title}`); return;
            }
            if (command === 'list') {
                const goals = this.appRpc ? await this.appRpc.request('goal.list', {}) : await this.runtime.listGoals();
                this.notify(goals.length ? goals.map((goal: any) => `${goal.id} [${goal.status}] ${goal.title}`).join('\n') : 'No goals.'); return;
            }
            if (command === 'link') {
                const goalId = rest[0]; if (!goalId) { this.notify('Usage: /goal link <goalId>'); return; }
                if (this.appRpc) await this.appRpc.request('goal.link', { sessionId, goalId }); else await this.runtime.linkSessionGoal(sessionId, goalId);
                this.notify(`Goal ${goalId} linked.`); return;
            }
            if (command === 'complete' || command === 'reopen') {
                const goal = this.appRpc ? await this.appRpc.request(`goal.${command}`, { sessionId, goalId: rest[0] }) : await (async () => {
                    const linked = rest[0] ? await this.runtime.getGoal(rest[0]) : await this.runtime.getSessionGoal(sessionId);
                    if (!linked) throw new Error('No goal linked to this session.');
                    return this.runtime.updateGoal(linked.id, { status: command === 'complete' ? 'completed' : 'active' });
                })();
                this.notify(`Goal ${goal.id} is ${goal.status}.`); return;
            }
            const goal = this.appRpc ? await this.appRpc.request('goal.get', { sessionId, goalId: command === 'show' ? rest[0] : command }) : await (command === 'show' ? (rest[0] ? this.runtime.getGoal(rest[0]) : this.runtime.getSessionGoal(sessionId)) : this.runtime.getGoal(command));
            this.notify(goal ? `${goal.id} [${goal.status}] ${goal.title}\n${goal.objective}\n${goal.successCriteria.map((item: string) => `- ${item}`).join('\n')}` : 'No goal linked to this session.');
        } catch (error) { this.notify(`Goal command failed: ${error instanceof Error ? error.message : String(error)}`); }
    }

    protected async setSessionSandboxMode(
        sessionId: string,
        mode: import('@tsdi/agent').SandboxMode | null
    ): Promise<void> {
        if (this.appRpc) {
            await this.appRpc.request('session.sandbox_mode.set', { sessionId, mode: mode ?? 'default' });
            return;
        }
        this.runtime.setSessionSandboxMode(sessionId, mode);
    }

    protected async getSessionSandboxMode(sessionId: string): Promise<string> {
        if (this.appRpc) {
            const result = await this.appRpc.request('session.sandbox_mode.get', { sessionId }).catch(() => null);
            return String(result?.mode || 'default');
        }
        return this.runtime.getSessionSandboxMode(sessionId) ?? 'default';
    }

    protected async getSessionDelegationMode(sessionId: string): Promise<string> {
        if (this.appRpc) {
            const result = await this.appRpc.request('session.delegation_mode.get', { sessionId }).catch(() => null);
            return String(result?.mode || 'explicit');
        }
        return this.runtime.getSessionDelegationMode(sessionId) ?? 'explicit';
    }

    protected async runUndoCommand(): Promise<void> {
        await this.runFileUndoRedo('undo');
    }

    protected async runRedoCommand(): Promise<void> {
        await this.runFileUndoRedo('redo');
    }

    protected async runFileUndoRedo(direction: 'undo' | 'redo'): Promise<void> {
        const sessionId = this.state.sessionId;
        try {
            const result = this.appRpc
                ? await this.appRpc.request(direction === 'undo' ? 'session.undo_file' : 'session.redo_file', { sessionId })
                : direction === 'undo'
                    ? await this.runtime.undoFileChange(sessionId)
                    : await this.runtime.redoFileChange(sessionId);
            if (!result || result.restored === 'none') {
                this.notify(direction === 'undo' ? 'Nothing to undo.' : 'Nothing to redo.');
                return;
            }
            this.notify(`${direction === 'undo' ? 'Undid' : 'Redid'} ${result.filePath} (${result.restored}).`);
        } catch (error) {
            this.notify(`Failed to ${direction}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runGitSnapshotsCommand(args: string): Promise<void> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            this.notify('No current session for git snapshots.');
            return;
        }
        const parts = args.split(/\s+/).filter(Boolean);
        const operation = parts[0] || 'list';
        const ref = parts[1] || '';
        if (operation === 'revert' || operation === 'restore') {
            if (!ref) {
                this.notify('Usage: /git-snapshots revert <messageId>');
                return;
            }
            const confirmed = await this.select(
                `Revert working tree to snapshot of message ${ref}?`,
                [
                    { label: 'revert', value: 'yes', detail: 'restore the working tree from this snapshot' },
                    { label: 'cancel', value: 'no', detail: 'keep the current working tree' }
                ],
                1,
                this.state.consoleOptions.selectHint
            );
            if (confirmed !== 'yes') {
                return;
            }
            const result = await this.sessionService.revertGitStepSnapshot(sessionId, ref);
            if (result?.reverted === true) {
                this.notify(`Working tree reverted to snapshot of message ${ref}. Use /git-snapshots unrevert to restore.`);
            } else {
                this.notify(`Revert failed: ${String(result?.error || 'unknown error')}`);
            }
            return;
        }
        if (operation === 'unrevert') {
            const confirmed = await this.select(
                'Restore the working tree captured before the last git revert?',
                [
                    { label: 'unrevert', value: 'yes', detail: 'restore the working tree' },
                    { label: 'cancel', value: 'no', detail: 'keep the reverted working tree' }
                ],
                1,
                this.state.consoleOptions.selectHint
            );
            if (confirmed !== 'yes') {
                return;
            }
            const result = await this.sessionService.unrevertGitStepSnapshot(sessionId);
            if (result?.reverted === true) {
                this.notify('Working tree restored after last git revert.');
            } else {
                this.notify(`Unrevert failed: ${String(result?.error || 'unknown error')}`);
            }
            return;
        }
        if (operation === 'diff') {
            if (!ref) {
                this.notify('Usage: /git-snapshots diff <messageId|snapshotId>');
                return;
            }
            await this.openGitSnapshotDiff(ref);
            return;
        }
        if (operation !== 'list') {
            this.notify('Usage: /git-snapshots [list|diff <ref>|revert <messageId>|unrevert]');
            return;
        }
        await this.openGitSnapshotList();
    }

    protected async openGitSnapshotList(): Promise<void> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            this.notify('No current session for git snapshots.');
            return;
        }
        const snapshots = await this.sessionService.listGitStepSnapshots(sessionId);
        if (!snapshots.length) {
            this.notify('No git step snapshots for the current session. Run an agent turn in a git workspace first.');
            return;
        }
        const choice = await this.select(
            `Git step snapshots (${snapshots.length})`,
            snapshots.map((snapshot, index) => {
                const label = String(snapshot.label || snapshot.messageId || `snapshot-${index + 1}`).trim();
                const createdAt = snapshot.timestamp ? ` · ${new Date(snapshot.timestamp).toLocaleString()}` : '';
                const ds = snapshot.diffStats;
                const diffLabel = ds ? ` · +${ds.totalAdditions}/-${ds.totalDeletions} (${ds.filesChanged} file${ds.filesChanged === 1 ? '' : 's'})` : '';
                return {
                    label: `${label}${createdAt}${diffLabel}`,
                    value: String(snapshot.messageId || snapshot.id || index),
                    detail: String(snapshot.id || '')
                };
            }),
            0,
            this.state.consoleOptions.selectHint
        );
        if (!choice) {
            return;
        }
        await this.openGitSnapshotDiff(choice);
    }

    protected async openGitSnapshotDiff(ref: string): Promise<void> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            this.notify('No current session for git snapshot diff.');
            return;
        }
        const diff = await this.sessionService.diffGitStepSnapshot(sessionId, ref);
        if (!diff) {
            this.notify(`No git step snapshot found for ${ref}.`);
            return;
        }
        const lines = this.buildGitSnapshotDiffLines(diff);
        if (!lines.length) {
            this.notify(`Snapshot ${ref} has no working tree changes to show.`);
            return;
        }
        const fileCount = Array.isArray(diff.files) ? diff.files.length : 0;
        this.state.closeReview();
        this.state.openGitSnapshotDetail(
            `git snapshot ${ref}`,
            lines,
            [`ref ${ref}`, fileCount ? `files ${fileCount}` : 'files -'].join(' · '),
            ref
        );
    }

    protected async revertGitSnapshotFromDetail(): Promise<void> {
        const ref = this.state.gitSnapshotCurrentRef;
        const sessionId = this.state.sessionId;
        if (!ref || !sessionId || !this.sessionService) {
            this.notify('No git snapshot selected for revert.');
            return;
        }
        const confirmed = await this.select(
            `Revert working tree to snapshot ${ref}?`,
            [
                { label: 'revert', value: 'yes', detail: 'restore the working tree from this snapshot' },
                { label: 'cancel', value: 'no', detail: 'keep the current working tree' }
            ],
            1,
            this.state.consoleOptions.selectHint
        );
        if (confirmed !== 'yes') {
            return;
        }
        const result = await this.sessionService.revertGitStepSnapshot(sessionId, ref);
        if (result?.reverted === true) {
            this.notify(`Working tree reverted to snapshot ${ref}. Use /git-snapshots unrevert to restore.`);
            this.state.closeGitSnapshotDetail();
        } else {
            this.notify(`Revert failed: ${String(result?.error || 'unknown error')}`);
        }
    }

    protected buildGitSnapshotDiffLines(diff: Record<string, any>): string[] {
        const lines: string[] = [];
        const rawPatch = String(diff.rawPatch ?? diff.patch ?? '');
        if (rawPatch) {
            const parts = rawPatch.replace(/\r\n/g, '\n').split('\n');
            while (parts.length && parts[parts.length - 1] === '') {
                parts.pop();
            }
            lines.push(...parts);
            return lines;
        }
        const files = Array.isArray(diff.files) ? diff.files : [];
        for (const file of files) {
            const filePath = String(file?.filePath ?? file?.path ?? '?');
            lines.push(`diff --git a/${filePath} b/${filePath}`);
            const status = String(file?.status ?? '');
            if (status) {
                lines.push(`status: ${status}`);
            }
        }
        return lines;
    }

    protected async activateModelProfile(profileName: string): Promise<void> {
        const name = String(profileName || '').trim();
        if (!name) {
            return;
        }
        if (this.appRpc) {
            const requestId = ++this.activateModelRequestId;
            const sessionId = this.state.sessionId;
            const result = await this.appRpc.request('model.activate', { sessionId, name });
            if (requestId !== this.activateModelRequestId || sessionId !== this.state.sessionId) {
                return;
            }
                this.state.setModelProfile(String(result?.modelProfile || name));
                if (result?.provider) {
                    this.state.setProvider(String(result.provider));
                }
                if (result?.model) {
                    this.state.setModel(String(result.model));
                }
            this.updateTerminalTitle();
            this.notify(`Switched model profile to ${name}.`);
            await this.recordRecentModel(String(result?.modelProfile || name));
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
            this.state.setModelProfile(name);
            if (resolved.provider) {
                this.state.setProvider(resolved.provider);
            }
            if (resolved.model) {
                this.state.setModel(resolved.model);
            }
        this.updateTerminalTitle();
        this.notify(`Switched model profile to ${name}.`);
        await this.recordRecentModel(name);
    }

    protected async restoreModelStore(): Promise<void> {
        const data = await this.modelStore?.load(this.resolveHistoryWorkspace());
        this.modelFavorites = data?.favorites || [];
        this.modelRecents = data?.recents || [];
        this.modelReasoningEffort = this.options.model?.reasoningEffort || 'medium';
    }

    protected async persistModelStore(): Promise<void> {
        await this.modelStore?.save(this.resolveHistoryWorkspace(), {
            favorites: this.modelFavorites,
            recents: this.modelRecents
        });
    }

    protected async toggleModelFavorite(): Promise<void> {
        const name = String(this.state.modelProfile || this.options.model?.defaultProfile || '').trim();
        if (!name) {
            this.notify('No active model profile to favorite.');
            return;
        }
        const index = this.modelFavorites.indexOf(name);
        if (index >= 0) {
            this.modelFavorites.splice(index, 1);
            await this.persistModelStore();
            this.notify(`Removed ${name} from favorites.`);
        } else {
            this.modelFavorites.push(name);
            await this.persistModelStore();
            this.notify(`Added ${name} to favorites.`);
        }
    }

    protected async cycleRecentModel(delta: 1 | -1): Promise<void> {
        if (!this.modelRecents.length) {
            this.notify('No recent models yet.');
            return;
        }
        const current = String(this.state.modelProfile || this.options.model?.defaultProfile || '').trim();
        let index = this.modelRecents.indexOf(current);
        if (index < 0) {
            index = delta > 0 ? -1 : 0;
        }
        const next = this.modelRecents[(index + delta + this.modelRecents.length) % this.modelRecents.length];
        await this.activateModelProfile(next);
    }

    protected async cycleModelVariant(): Promise<void> {
        const tiers: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
        const current = this.modelReasoningEffort;
        const next = tiers[(tiers.indexOf(current) + 1) % tiers.length];
        await this.setModelReasoningEffort(next);
    }

    protected async setModelReasoningEffort(next: 'low' | 'medium' | 'high'): Promise<void> {
        if (this.appRpc) {
            const sessionId = this.state.sessionId;
            const name = String(this.state.modelProfile || this.options.model?.defaultProfile || '').trim();
            if (!name) {
                this.notify('No active model profile to cycle variant for.');
                return;
            }
            const requestId = ++this.activateModelRequestId;
            const result = await this.appRpc.request('model.activate', { sessionId, name, reasoningEffort: next });
            if (requestId !== this.activateModelRequestId || sessionId !== this.state.sessionId) {
                return;
            }
            const returned = String(result?.reasoningEffort || '');
            if (returned === 'low' || returned === 'medium' || returned === 'high') {
                next = returned;
            }
        }
        this.modelReasoningEffort = next;
        this.options.model = this.options.model || {};
        this.options.model.reasoningEffort = next;
        await this.persistSettings({ thinkingLevel: next });
        this.notify(`Reasoning effort: ${this.modelReasoningEffort}.`);
    }

    protected async recordRecentModel(name: string): Promise<void> {
        const trimmed = String(name || '').trim();
        if (!trimmed) {
            return;
        }
        this.modelRecents = [trimmed, ...this.modelRecents.filter((item) => item !== trimmed)].slice(0, 10);
        await this.persistModelStore();
    }

    protected async queueNextTurnModelProfile(profileName: string): Promise<void> {
        const name = String(profileName || '').trim();
        if (!name) {
            this.notify('Usage: /model once <profile>.');
            return;
        }
        if (!this.appRpc) {
            const profiles = this.options.model?.profiles || {};
            if (!profiles[name]) {
                this.notify(`Unknown model profile: ${name}`);
                return;
            }
        }
        this.state.setOneShotModelProfile(name);
        this.notify(`Queued model profile ${name} for the next prompt.`);
    }

    protected consumePendingTurnModelProfile(): string | undefined {
        const profile = String(this.state.oneShotModelProfile || '').trim();
        if (!profile) {
            return undefined;
        }
        this.state.setOneShotModelProfile('');
        return profile;
    }

    protected async activateTool(name: string): Promise<boolean> {
        return this.activateToolForSession(name, this.state.sessionId);
    }

    protected async activateToolForSession(name: string, sessionId: string): Promise<boolean> {
        if (this.appRpc) {
            const result = await this.appRpc.request('tools.activate', { sessionId, name });
            return result?.activated !== false;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.activateTool !== 'function') {
            return false;
        }
        return !!(await this.toolRegistry.activateTool(sessionId, name));
    }

    protected async refreshTools(sessionId = this.state.sessionId): Promise<void> {
        const definitions = await this.loadTools(sessionId);
        if (!definitions.length) {
            if (sessionId === this.state.sessionId) {
                this.state.setTools([]);
            }
            return;
        }
        const tools = await Promise.all(definitions.map(async def => {
            const active = this.appRpc
                ? def.activation?.activated ?? true
                : this.toolRegistry && typeof this.toolRegistry.isToolActive === 'function'
                ? await this.toolRegistry.isToolActive(sessionId, def.name)
                : def.activation?.activated ?? true;
            return this.state.toToolItem(def, active);
        }));
        tools.sort((a, b) => a.name.localeCompare(b.name));
        if (sessionId !== this.state.sessionId) {
            return;
        }
        this.state.setTools(tools);
    }

}
