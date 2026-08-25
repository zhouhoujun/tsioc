/**
 * Command dispatch handlers for AgentConsoleComponent (P199 batch F).
 *
 * Every slash-command that was previously inlined in the 89-case
 * `handleCommand` switch is now an independent exported function
 * receiving a minimal structural context (`CommandHandlerContext`).
 * The component retains thin delegation via `buildCommandContext()`.
 */

import type {
    AgentConsoleApprovalRequest,
    AgentConsolePendingAttachment,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem
} from './AgentConsoleSessionState';
import type { AgentConsoleSessionService } from './AgentConsoleSessionService';
import type { SessionSearchMatch } from '@tsdi/agent';

// ── Command handler context ──────────────────────────────────────────────────

export interface CommandHandlerContext {
    // ── state access ──
    readonly state: {
        readonly sessionId: string;
        readonly sessions: AgentConsoleSessionItem[];
        readonly projects: Array<{ key: string; label: string; sessionCount: number; lastActive?: number }>;
        readonly threads: Array<{ key: string; label: string; sessionCount: number; lastActive?: number; sections?: any[] }>;
        readonly sections: Array<{ id: string; label: string; createdAt: number }>;
        readonly messages: Array<{ id: string; role: string; content: string; sectionId?: string }>;
        readonly tools: any[];
        readonly toolRuns: any[];
        readonly pendingAttachments: AgentConsolePendingAttachment[];
        readonly notice: string;
        readonly input: string;
        readonly workspace: string;
        readonly status: string;
        readonly provider: string;
        readonly model: string;
        readonly planTodos: any[];
        readonly reviewFileSections: any[];
        readonly reviewFileAnnotations: Record<string, any>;
        readonly consoleOptions: { selectHint?: string };
        readonly commandHints: string[];

        // setters
        setInput(value: string, cursor?: number): void;
        setNotice(message: string): void;
        setTitle(title: string): void;
        setSessionsFocused(focused: boolean): void;
        setMessagesFocused(focused: boolean): void;
        setToolsFocused(focused: boolean): void;
        setApprovalsFocused(focused: boolean): void;
        setJobsFocused(focused: boolean): void;
        setTasksFocused(focused: boolean): void;
        setToolRunsFocused(focused: boolean): void;
        setProjectsFocused(focused: boolean): void;
        closeMessageDetail(): void;
        closeReview(): void;
        closeGitSnapshotDetail(): void;
        openTextOverlay(kind: string, lines: string[]): void;
        setPendingApprovals(pending: AgentConsoleApprovalRequest[]): void;
        getReviewAnnotationSummary(): string[];
        approveAllReviewFiles(): void;
        clearAllReviewAnnotations(): void;
        clearReviewFileAnnotation(): void;
        getReviewExportReport(): string[];
        computeFileRiskScore(section: any): { score: number; level: string };
        setReviewFileAnnotation(status: 'approved' | 'rejected', comment?: string): void;
        setSessions(sessions: AgentConsoleSessionItem[]): void;
        setProjects(projects: Array<{ key: string; label: string; sessionCount: number; lastActive?: number }>): void;
        setThreads(threads: any[]): void;
        setProjectContext(): void;
    };

    // ── UI primitives ──
    notify(message: string, duration?: number): void;
    select(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string): Promise<string | undefined>;

    // ── turn state ──
    isTurnInProgress(): boolean;
    notifyBusyState(): void;

    // ── session management ──
    readonly sessionService: AgentConsoleSessionService | null | undefined;
    openSession(sessionId?: string): Promise<void>;
    refreshSessions(): Promise<void>;
    refreshCurrentSections(): Promise<void>;
    refreshThreadTodoPlan(): Promise<void>;
    loadThreadCodingTasks(): Promise<any[]>;

    // ── terminal ──
    readonly workspace: string;
    updateTerminalTitle(): void;
    requestTerminalExit(message: string): Promise<void>;
    closingSessionMessage(): string;

    // ── delegated command methods ──
    runInitCommand(args: string): Promise<void>;
    runPlanCommand(args: string): Promise<void>;
    runArchetypeCommand(args: string): Promise<void>;
    runVimCommand(args: string): Promise<void>;
    runKeymapCommand(args: string): Promise<void>;
    runPermissionsCommand(args: string): Promise<void>;
    runStatusCommand(): Promise<void>;
    runCdCommand(args: string): void;
    runGoalCommand(args: string): Promise<void>;
    runUndoCommand(): Promise<void>;
    runRedoCommand(): Promise<void>;
    runExportCommand(args: string): Promise<boolean>;
    runAttachCommand(args: string): Promise<boolean>;
    runSkillsCommand(args: string): Promise<boolean>;
    runMcpCommand(args: string): Promise<boolean>;
    runPluginsCommand(args: string): Promise<boolean>;
    runAppsCommand(args: string): Promise<boolean>;
    runSshCommand(args: string): Promise<void>;
    runThemeCommand(args: string): Promise<boolean>;
    runThinkingCommand(args: string): Promise<boolean>;
    runDisplayCommand(args: string): Promise<boolean>;
    toggleTimelineMode(): void;
    runRawModeCommand(args: string): Promise<boolean>;
    runStashCommand(args: string): Promise<boolean>;
    runStatuslineCommand(args: string): Promise<boolean>;
    runHooksCommand(): Promise<boolean>;
    runMemoriesCommand(args: string): Promise<boolean>;
    runFastCommand(args: string): Promise<boolean>;
    runPersonalityCommand(args: string): Promise<boolean>;
    runDebugConfigCommand(): Promise<boolean>;
    runSettingsCommand(): Promise<boolean>;
    runYoloCommand(args: string): Promise<boolean>;
    runExperimentalCommand(args: string): Promise<boolean>;
    runFeedbackCommand(): Promise<boolean>;
    runBackgroundTasksCommand(args: string): Promise<boolean>;
    runIdeCommand(args: string): Promise<boolean>;
    runEditorCommand(args: string): Promise<boolean>;
    runShareCommand(args: string): Promise<boolean>;
    runUnshareCommand(args: string): Promise<boolean>;
    runTitleCommand(args: string): Promise<boolean>;
    runGitSnapshotsCommand(args: string): Promise<void>;
    runApproveRetryCommand(): Promise<boolean>;

    // ── coding task methods ──
    openScheduledJobsDashboard(args: string): Promise<boolean>;
    openCodingTaskInspector(args: string): Promise<boolean>;
    openThreadCodingTaskReviewSelector(): Promise<boolean>;
    openCodingTaskReview(arg: string): Promise<boolean>;
    openCodingTaskReviewSelector(): Promise<boolean>;
    openWorktreeDiff(args: string): Promise<boolean>;
    retryFailedCodingTask(args: string): Promise<boolean>;
    rollbackCodingTask(args: string): Promise<boolean>;

    // ── review / quality / diagnostics ──
    openSummaryQualityRecords(provider?: string): Promise<boolean>;
    openSummaryQualityTrend(provider?: string, bucketSize?: number, maxBuckets?: number): Promise<boolean>;
    parseSummaryQualityTrendArgs(args: string): { provider?: string; bucketSize?: number; maxBuckets?: number };
    formatSummaryQualityAggregate(aggregate: Record<string, any>): string;
    openCompactionHistory(args: string): Promise<boolean>;
    openCompactionHistoryTrend(sessionId?: string, bucketSize?: number, maxBuckets?: number): Promise<boolean>;
    parseCompactionHistoryTrendArgs(args: string): { sessionId?: string; bucketSize?: number; maxBuckets?: number };
    openTurnDiagnostics(sessionId?: string): Promise<boolean>;
    openTurnDiagnosticsList(sessionId?: string): Promise<boolean>;
    openTurnDiagnosticsTrend(sessionId?: string, bucketSize?: number, maxBuckets?: number): Promise<boolean>;
    parseTurnDiagnosticsTrendArgs(args: string): { sessionId?: string; bucketSize?: number; maxBuckets?: number };
    openDelegationTree(sessionId?: string, status?: string, depth?: number): Promise<boolean>;
    openDelegationLineage(sessionId?: string): Promise<boolean>;
    openDelegationList(sessionId?: string): Promise<boolean>;
    runDelegationModeCommand(args: string): Promise<void>;
    openHarnessAudit(sessionId?: string): Promise<boolean>;
    openHarnessProfile(sub?: string): Promise<boolean>;

    // ── voice ──
    handleVoiceCommand(arg: string): Promise<boolean>;

    // ── approvals ──
    getPendingApprovals(sessionId: string): Promise<AgentConsoleApprovalRequest[]>;
    applyApprovalDecision(decision: 'approve' | 'deny', requestId: string): Promise<boolean>;

    // ── copy / search ──
    copyFocusedTextActionHandler(text: string, label: string): Promise<void>;
    searchSessionContent(query: string, sessions: AgentConsoleSessionItem[]): Promise<Map<string, { count: number; snippet: string }>>;
    activateSelectedToolActionHandler(toolName: string): Promise<void>;

    // ── session navigation ──
    resolveSessionProjectKey(session: AgentConsoleSessionItem): string;
    resolveSessionThreadKey(session: AgentConsoleSessionItem): string;

    // ── menu / multiline ──
    handleMenuSelection(value: string): Promise<void>;
    submitMultilineDraft(): Promise<void>;

    // ── mutable internal fields ──
    multilineMode: boolean;
    draftLines: string[];
    shellMultilineMode: boolean;
    shellDraftLines: string[];

    // ── git diff review ──
    openGitDiffReview(base?: string): Promise<boolean>;
    runGitDiffReviewAnalysis(base?: string): Promise<boolean>;
    listReviewFindings(commit?: string): Promise<boolean>;
    showReviewRun(id?: string): Promise<boolean>;

    // ── model / usage ──
    openModelSwitcher(): Promise<void>;
    activateModelProfile(profileName: string): Promise<void>;
    queueNextTurnModelProfile(profileName: string): Promise<void>;
    openUsage(input?: string): Promise<boolean>;
}

// ── Command handler type ─────────────────────────────────────────────────────

export type CommandHandler = (
    ctx: CommandHandlerContext,
    args: string,
    resolved: { command: string; matches: string[] }
) => Promise<boolean>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseTrendTokens(args: string, sep = ' '): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
    const tokens = args.split(sep).filter(Boolean);
    let sessionId: string | undefined;
    let bucketSize: number | undefined;
    let maxBuckets: number | undefined;
    for (const token of tokens) {
        if (/^\d+d$/.test(token)) {
            bucketSize = parseInt(token, 10) * 86400000;
        } else if (/^\d+$/.test(token) && !sessionId) {
            sessionId = token;
        } else if (/^\d+$/.test(token) && sessionId && !maxBuckets) {
            maxBuckets = parseInt(token, 10);
        }
    }
    return { sessionId, bucketSize, maxBuckets };
}

// ── Handler functions ────────────────────────────────────────────────────────

async function handleHelp(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const helpSelection = await ctx.select('Help', [
        { label: '/model', value: '/model', description: 'switch model or queue next-turn profile' },
        { label: '/plan', value: '/plan', description: 'toggle read-only plan mode (write tools denied)' },
        { label: '/archetype', value: '/archetype', description: 'switch session archetype: /archetype [build|plan|review|name]' },
        { label: '/vim', value: '/vim', description: 'toggle vim-style normal/insert input mode' },
        { label: '/keymap', value: '/keymap', description: 'list/set/unset/reset key bindings per context (global/composer/list/approval/pager/vim); record <action> captures the next key' },
        { label: '/permissions', value: '/permissions', description: 'show or change readonly/sandbox session permissions' },
        { label: '/status', value: '/status', description: 'show session status' },
        { label: '/cd', value: '/cd', description: 'change working directory: /cd <path>' },
        { label: '/pwd', value: '/pwd', description: 'print current working directory' },
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
        { label: '/yolo', value: '/yolo', description: 'toggle auto-approve mode: /yolo [on|off]' },
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
    ], 0, ctx.state.consoleOptions.selectHint);
    if (helpSelection) {
        await ctx.handleMenuSelection(helpSelection);
    }
    return true;
}

async function handleModel(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    if (args) {
        const modelArgs = String(args || '').trim();
        if (modelArgs.toLowerCase().startsWith('once')) {
            const profileName = modelArgs.slice(4).trim();
            if (!profileName) {
                ctx.notify('Usage: /model once <profile>.');
                return true;
            }
            await ctx.queueNextTurnModelProfile(profileName);
            return true;
        }
        await ctx.activateModelProfile(args);
        return true;
    }
    await ctx.openModelSwitcher();
    return true;
}

// ── Simple guard + delegate handlers ─────────────────────────────────────────

async function guardDelegate(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }, method: (args: string) => Promise<boolean>): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    return method(args);
}

async function guardDelegateNoArgs(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }, method: () => Promise<boolean>): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    return method();
}

// ── /pwd ─────────────────────────────────────────────────────────────────────

async function handlePwd(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.notify(ctx.workspace);
    return true;
}

// ── /tools ───────────────────────────────────────────────────────────────────

async function handleTools(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (args) {
        await ctx.activateSelectedToolActionHandler(args);
        return true;
    }
    if (!ctx.state.tools.length) {
        ctx.notify('No tools available.');
        return true;
    }
    ctx.state.setSessionsFocused(false);
    ctx.state.setMessagesFocused(false);
    ctx.state.closeMessageDetail();
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setToolsFocused(true);
    return true;
}

// ── /clear ───────────────────────────────────────────────────────────────────

async function handleClear(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.openSession(undefined);
    ctx.notify('Started a new session.');
    return true;
}

// ── /approve + /deny ────────────────────────────────────────────────────────

async function handleApproveDeny(ctx: CommandHandlerContext, args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
    const isApprove = resolved.command === '/approve';
    if (isApprove && String(args || '').trim().toLowerCase() === 'retry') {
        return ctx.runApproveRetryCommand();
    }
    const pend = await ctx.getPendingApprovals(ctx.state.sessionId);
    if (!pend.length) { ctx.notify('No pending approvals.'); return true; }
    if (args) {
        const exact = pend.find((item: any) => item.id === args);
        const matches = exact ? [exact] : pend.filter((item: any) => item.id.startsWith(args));
        if (matches.length === 1) {
            const applied = await ctx.applyApprovalDecision(isApprove ? 'approve' : 'deny', matches[0].id);
            ctx.notify(applied
                ? `${isApprove ? 'Approved' : 'Denied'} ${matches[0].toolName} (${matches[0].id.slice(0, 8)}).`
                : `Approval request ${matches[0].id.slice(0, 8)} is no longer pending.`);
        } else {
            ctx.notify(matches.length > 1
                ? `Approval id "${args}" is ambiguous.`
                : `Approval id "${args}" not found.`);
        }
        return true;
    }
    const req = pend.length === 1 ? pend[0] : null;
    if (!req) {
        const sel = await ctx.select(isApprove ? 'Approve' : 'Deny',
            pend.map((r: any) => ({ label: r.toolName + ' (' + r.id.slice(0, 8) + ')', value: r.id, description: r.reason })));
        if (!sel) { return true; }
        const found = pend.find((r: any) => r.id === sel);
        if (found) {
            const applied = await ctx.applyApprovalDecision(isApprove ? 'approve' : 'deny', found.id);
            ctx.notify(applied
                ? `${isApprove ? 'Approved' : 'Denied'} ${found.toolName} (${found.id.slice(0, 8)}).`
                : `Approval request ${found.id.slice(0, 8)} is no longer pending.`);
        }
        return true;
    }
    if (req) {
        const applied = await ctx.applyApprovalDecision(isApprove ? 'approve' : 'deny', req.id);
        ctx.notify(applied
            ? `${isApprove ? 'Approved' : 'Denied'} ${req.toolName} (${req.id.slice(0, 8)}).`
            : `Approval request ${req.id.slice(0, 8)} is no longer pending.`);
    }
    return true;
}

// ── /quit + /exit ────────────────────────────────────────────────────────────

async function handleQuitExit(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.requestTerminalExit(ctx.closingSessionMessage());
    return true;
}

// ── /multiline ───────────────────────────────────────────────────────────────

async function handleMultiline(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.multilineMode = !ctx.multilineMode;
    if (!ctx.multilineMode) { ctx.draftLines = []; }
    return true;
}

// ── /cancel ──────────────────────────────────────────────────────────────────

async function handleCancel(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        const cancelled = await ctx.sessionService?.cancelTurn(ctx.state.sessionId) ?? false;
        ctx.notify(cancelled
            ? 'Cancelling current turn...'
            : 'No running turn to cancel.');
        return true;
    }
    ctx.draftLines = [];
    ctx.multilineMode = false;
    ctx.shellDraftLines = [];
    ctx.shellMultilineMode = false;
    return true;
}

// ── /send ────────────────────────────────────────────────────────────────────

async function handleSend(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.draftLines.length) { return true; }
    await ctx.submitMultilineDraft();
    return true;
}

// ── /copy ────────────────────────────────────────────────────────────────────

async function handleCopy(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (args) {
        switch (args) {
            case 'input':
                await ctx.copyFocusedTextActionHandler(ctx.state.input, 'input');
                return true;
            case 'workspace':
                await ctx.copyFocusedTextActionHandler(ctx.state.workspace, 'workspace');
                return true;
            case 'session':
                await ctx.copyFocusedTextActionHandler(ctx.state.sessionId, 'session');
                return true;
            case 'model':
                await ctx.copyFocusedTextActionHandler(
                    [ctx.state.provider, ctx.state.model].filter(Boolean).join(' / '),
                    'model'
                );
                return true;
            default:
                ctx.notify('Nothing to copy.');
                return true;
        }
    }
    const msgs = ctx.state.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant' && msgs[i].content) {
            await ctx.copyFocusedTextActionHandler(msgs[i].content, 'assistant message');
            return true;
        }
    }
    ctx.notify('Nothing to copy.');
    return true;
}

// ── /session ─────────────────────────────────────────────────────────────────

async function handleSession(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    if (args) {
        await ctx.refreshSessions();
        await ctx.openSession(args);
        return true;
    }
    if (!ctx.state.sessions.length) {
        ctx.notify('No sessions available.');
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setMessagesFocused(false);
    ctx.state.setSessionsFocused(true);
    return true;
}

// ── /new ─────────────────────────────────────────────────────────────────────

async function handleNew(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.openSession(args || undefined);
    return true;
}

// ── /sessions ────────────────────────────────────────────────────────────────

async function handleSessions(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.refreshSessions();
    if (!ctx.state.sessions.length) {
        ctx.notify('No sessions available.');
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setMessagesFocused(false);
    ctx.state.setSessionsFocused(true);
    return true;
}

// ── /resume ──────────────────────────────────────────────────────────────────

async function handleResume(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    const all = await ctx.sessionService?.listSessions(ctx.state.sessionId, undefined, { includeArchived: true }) || [];
    if (!all.length) { ctx.notify('No sessions available.'); return true; }
    const selected = await ctx.select('Resume session', all.map(item => ({
        label: `${item.id}${item.archived ? ' (archived)' : ''}`,
        value: item.id,
        description: item.title || item.summary || `${item.messageCount || 0} messages`
    })));
    if (selected) await ctx.openSession(selected);
    return true;
}

// ── /archive ─────────────────────────────────────────────────────────────────

async function handleArchive(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const archivedSessionId = ctx.state.sessionId;
    if (!archivedSessionId || !ctx.sessionService) { ctx.notify('No current session to archive.'); return true; }
    await ctx.sessionService.setSessionArchived(archivedSessionId, true);
    await ctx.refreshSessions();
    ctx.notify(`Archived session ${archivedSessionId}.`);
    return true;
}

// ── /fork + /side ────────────────────────────────────────────────────────────

async function handleForkSide(ctx: CommandHandlerContext, args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    const source = ctx.state.sessionId;
    if (!source || !ctx.sessionService) { ctx.notify('No current session to fork.'); return true; }
    const messageId = String(args || '').trim() || undefined;
    const forked = await ctx.sessionService.forkSession(source, messageId);
    if (!forked) { ctx.notify('Failed to fork the current session.'); return true; }
    await ctx.openSession(forked);
    ctx.notify(`${resolved.command === '/side' ? 'Opened side session' : 'Forked session'} ${forked}.`);
    return true;
}

// ── /pin + /unpin ────────────────────────────────────────────────────────────

async function handlePinUnpin(ctx: CommandHandlerContext, _args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
    const pinSessionId = ctx.state.sessionId;
    if (!pinSessionId || !ctx.sessionService) {
        ctx.notify('No current session to pin.');
        return true;
    }
    const pin = resolved.command === '/pin';
    await ctx.sessionService.setSessionPinned(pinSessionId, pin);
    await ctx.refreshSessions();
    ctx.notify(pin ? `Pinned session ${pinSessionId}.` : `Unpinned session ${pinSessionId}.`);
    return true;
}

// ── /title ───────────────────────────────────────────────────────────────────

async function handleTitle(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const titleText = String(args || '').trim();
    const titleVerb = titleText.split(/\s+/)[0]?.toLowerCase();
    if (!titleText || titleVerb === 'list' || titleVerb === 'set' || titleVerb === 'unset') {
        return ctx.runTitleCommand(titleText);
    }
    const titleSessionId = ctx.state.sessionId;
    if (!titleSessionId || !ctx.sessionService) {
        ctx.notify('No current session to title.');
        return true;
    }
    const title = titleText;
    await ctx.sessionService.setSessionTitle(titleSessionId, title || undefined);
    await ctx.refreshSessions();
    ctx.state.setTitle(title);
    ctx.updateTerminalTitle();
    ctx.notify(title ? `Session titled "${title}".` : 'Session title cleared.');
    return true;
}

// ── /snapshot ────────────────────────────────────────────────────────────────

async function handleSnapshot(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const snapshotSessionId = ctx.state.sessionId;
    if (!snapshotSessionId || !ctx.sessionService) {
        ctx.notify('No current session to snapshot.');
        return true;
    }
    const label = String(args || '').trim() || undefined;
    const snapshotId = await ctx.sessionService.createSessionSnapshot(snapshotSessionId, label);
    if (snapshotId) {
        ctx.notify(`Snapshot created: ${snapshotId}`);
    } else {
        ctx.notify('Snapshot creation failed.');
    }
    return true;
}

// ── /snapshots ───────────────────────────────────────────────────────────────

async function handleSnapshots(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const snapshotSessionId = ctx.state.sessionId;
    if (!snapshotSessionId || !ctx.sessionService) {
        ctx.notify('No current session for snapshots.');
        return true;
    }
    const snapshots = await ctx.sessionService.listSessionSnapshots(snapshotSessionId);
    if (!snapshots.length) {
        ctx.notify('No snapshots for the current session. Use /snapshot [label] to create one.');
        return true;
    }
    const choice = await ctx.select(
        `Snapshots (${snapshots.length})`,
        snapshots.map((snapshot, index) => ({
            label: `${String(snapshot.label || 'snapshot').trim()} · ${snapshot.messageCount ?? 0} msgs${snapshot.summary ? ` · ${snapshot.summary}` : ''}`,
            value: String(snapshot.snapshotId || index),
            detail: snapshot.snapshotId
        })),
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!choice) return true;
    const action = await ctx.select(
        'Snapshot action',
        [
            { label: 'restore', value: 'restore', detail: 'replace current transcript with this snapshot' },
            { label: 'delete', value: 'delete', detail: 'remove this snapshot' }
        ],
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!action) return true;
    if (action === 'restore') {
        await ctx.sessionService.restoreSessionSnapshot(snapshotSessionId, choice);
        await ctx.refreshSessions();
        await ctx.openSession(snapshotSessionId);
        ctx.notify('Snapshot restored.');
    } else {
        await ctx.sessionService.deleteSessionSnapshot(snapshotSessionId, choice);
        ctx.notify('Snapshot deleted.');
    }
    return true;
}

// ── /toolruns ────────────────────────────────────────────────────────────────

async function handleToolruns(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.state.toolRuns.length) {
        ctx.notify('No tool runs available.');
        return true;
    }
    ctx.state.setSessionsFocused(false);
    ctx.state.setMessagesFocused(false);
    ctx.state.setProjectsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.state.setApprovalsFocused(false);
    ctx.state.setTasksFocused(false);
    ctx.state.setJobsFocused(false);
    ctx.state.closeMessageDetail();
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setToolRunsFocused(true);
    return true;
}

// ── /messages ────────────────────────────────────────────────────────────────

async function handleMessages(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setSessionsFocused(false);
    ctx.state.setMessagesFocused(true);
    return true;
}

// ── /search ──────────────────────────────────────────────────────────────────

async function handleSearch(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!args || !args.trim()) {
        ctx.notify('Usage: /search <query>');
        return true;
    }
    {
        const rawQuery = args.trim();
        let agentResults: SessionSearchMatch[] = [];
        try {
            agentResults = await (ctx.sessionService?.searchSessions(rawQuery) ?? Promise.resolve([]));
        } catch {
            agentResults = [];
        }
        if (agentResults.length) {
            const currentId = ctx.state.sessionId;
            const sessionId = await ctx.select(
                `Search: "${rawQuery}" (${agentResults.length})`,
                agentResults.map(result => ({
                    label: `${result.sessionId}${result.sessionId === currentId ? ' [current]' : ''} (${result.count} msg)`,
                    value: result.sessionId,
                    detail: result.snippet || result.summary || result.workspace || ''
                })),
                0,
                ctx.state.consoleOptions.selectHint
            );
            if (sessionId) {
                await ctx.openSession(sessionId);
            }
            return true;
        }
        const query = rawQuery.toLowerCase();
        let sessions = ctx.state.sessions.slice();
        if (!sessions.length && ctx.sessionService) {
            const loaded = await ctx.sessionService.listSessions(ctx.state.sessionId);
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
            ctx.notify('No sessions to search.');
            return true;
        }
        const metadataMatches = sessions.filter(s => {
            const id = (s.id || '').toLowerCase();
            const summary = (s.summary || '').toLowerCase();
            const ws = (s.workspace || '').toLowerCase();
            const proj = (s.projectLabel || s.projectKey || s.projectId || '').toLowerCase();
            return id.includes(query) || summary.includes(query) || ws.includes(query) || proj.includes(query);
        });
        ctx.notify(`Searching ${sessions.length} session${sessions.length === 1 ? '' : 's'} for "${rawQuery}"…`);
        const contentHits = await ctx.searchSessionContent(query, sessions);
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
            ctx.notify(`No sessions matching "${rawQuery}".`);
            return true;
        }
        const sessionId = await ctx.select(
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
            ctx.state.consoleOptions.selectHint
        );
        if (sessionId) {
            await ctx.openSession(sessionId);
        }
    }
    return true;
}

// ── /projects ────────────────────────────────────────────────────────────────

async function handleProjects(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.state.projects.length) {
        await ctx.refreshSessions();
    }
    if (!ctx.state.projects.length) {
        ctx.notify('No projects available.');
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    {
        const project = await ctx.select(
            'Projects',
            ctx.state.projects.map(p => ({
                label: `${p.label} (${p.sessionCount})`,
                value: p.key,
                detail: p.lastActive ? `last active ${new Date(p.lastActive).toLocaleDateString()}` : undefined
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!project) return true;
        const projectSessions = ctx.state.sessions.filter(
            s => ctx.resolveSessionProjectKey(s) === project
        );
        if (!projectSessions.length) {
            ctx.notify('No sessions in this project.');
            return true;
        }
        const sessionId = await ctx.select(
            `Sessions in ${project}`,
            projectSessions.map(s => ({
                label: `${String(s.title || '').trim() || s.id}${s.current ? ' [current]' : ''} (${s.messageCount ?? '?'})${s.pinned ? ' 📌' : ''}`,
                value: s.id,
                detail: s.summary
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!sessionId) return true;
        await ctx.openSession(sessionId);
    }
    return true;
}

// ── /threads ─────────────────────────────────────────────────────────────────

async function handleThreads(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.state.threads.length) {
        await ctx.refreshSessions();
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    {
        if (!ctx.state.threads.length) {
            ctx.notify('No threads available.');
            return true;
        }
        const thread = await ctx.select(
            'Threads',
            ctx.state.threads.map(t => ({
                label: `${t.label} (${t.sessionCount})${t.sections?.length ? ` [${t.sections.length} sections]` : ''}`,
                value: t.key,
                detail: t.lastActive ? `last active ${new Date(t.lastActive).toLocaleDateString()}` : undefined
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!thread) return true;
        const threadSessions = ctx.state.sessions.filter(
            s => ctx.resolveSessionThreadKey(s) === thread
        );
        if (!threadSessions.length) {
            ctx.notify('No sessions in this thread.');
            return true;
        }
        const sessionId = await ctx.select(
            `Sessions in ${thread}`,
            threadSessions.map(s => ({
                label: `${String(s.title || '').trim() || s.id}${s.current ? ' [current]' : ''} (${s.messageCount ?? '?'})${s.pinned ? ' 📌' : ''}`,
                value: s.id,
                detail: s.summary
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!sessionId) return true;
        await ctx.openSession(sessionId);
    }
    return true;
}

// ── /sections ────────────────────────────────────────────────────────────────

async function handleSections(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const sectionSessionId = ctx.state.sessionId;
    if (!ctx.sessionService || !sectionSessionId) {
        ctx.notify('No session service or current session.');
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    const labelArg = String(args || '').trim();
    if (labelArg) {
        await ctx.sessionService.createSection(sectionSessionId, labelArg);
        await ctx.refreshCurrentSections();
        ctx.notify(`Section "${labelArg}" created.`);
        return true;
    }
    await ctx.refreshCurrentSections();
    if (!ctx.state.sections.length) {
        ctx.notify('No sections. Create one with /sections <label>.');
        return true;
    }
    const section = await ctx.select(
        'Sections',
        ctx.state.sections.map(item => {
            const count = ctx.state.messages.filter(message => message.sectionId === item.id).length;
            return {
                label: `${item.label}${count ? ` (${count} messages)` : ''}`,
                value: item.id,
                detail: `created ${new Date(item.createdAt).toLocaleString()}`
            };
        }),
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!section) {
        return true;
    }
    const action = await ctx.select(
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
        ctx.state.consoleOptions.selectHint
    );
    if (!action) {
        return true;
    }
    if (action === 'delete') {
        await ctx.sessionService.deleteSection(sectionSessionId, section);
        await ctx.refreshCurrentSections();
        ctx.notify('Section deleted.');
    } else if (action === 'start' || action === 'end') {
        const index = ctx.state.sections.findIndex(item => item.id === section);
        if (action === 'start' && index <= 0) {
            ctx.notify(index < 0 ? 'Section not found.' : 'Section already at start.');
            return true;
        }
        if (action === 'end' && (index < 0 || index === ctx.state.sections.length - 1)) {
            ctx.notify(index < 0 ? 'Section not found.' : 'Section already at end.');
            return true;
        }
        await ctx.sessionService.moveSection(
            sectionSessionId,
            section,
            undefined,
            { beforeId: action === 'start' ? ctx.state.sections[0].id : undefined }
        );
        await ctx.refreshCurrentSections();
        ctx.notify(action === 'start' ? 'Section moved to start.' : 'Section moved to end.');
    } else if (action === 'before' || action === 'after') {
        const targetIndex = ctx.state.sections.findIndex(item => item.id === section);
        const beforeId = action === 'before'
            ? section
            : ctx.state.sections[targetIndex + 1]?.id;
        const label = await ctx.select('New section label', [
            { label: 'Continue from previous section', value: '' },
            { label: 'Next step', value: 'Next step' },
            { label: 'Implementation', value: 'Implementation' },
            { label: 'Analysis', value: 'Analysis' }
        ], 0, ctx.state.consoleOptions.selectHint);
        if (label === undefined) {
            return true;
        }
        const created = await ctx.sessionService.createSection(sectionSessionId, label || 'Section', undefined, { beforeId });
        await ctx.refreshCurrentSections();
        ctx.notify(`Section "${created.label}" created.`);
    } else if (action === 'rename') {
        const label = await ctx.select('Rename section to', [
            { label: 'Next step', value: 'Next step' },
            { label: 'Implementation', value: 'Implementation' },
            { label: 'Analysis', value: 'Analysis' },
            { label: 'Refactor', value: 'Refactor' },
            { label: 'Review', value: 'Review' }
        ], 0, ctx.state.consoleOptions.selectHint);
        if (!label) {
            return true;
        }
        await ctx.sessionService.renameSection(sectionSessionId, section, label);
        await ctx.refreshCurrentSections();
        ctx.notify(`Section renamed to "${label}".`);
    }
    return true;
}

// ── /threadplan ──────────────────────────────────────────────────────────────

async function handleThreadplan(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    await ctx.refreshThreadTodoPlan();
    await ctx.loadThreadCodingTasks();
    if (!ctx.state.planTodos.length) {
        ctx.notify('No plan todos in this thread.');
    }
    ctx.state.setSessionsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.state.setApprovalsFocused(false);
    ctx.state.setJobsFocused(false);
    ctx.state.setMessagesFocused(false);
    ctx.state.setTasksFocused(true);
    return true;
}

// ── /approvals ───────────────────────────────────────────────────────────────

async function handleApprovals(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const pending = await ctx.getPendingApprovals(ctx.state.sessionId);
    if (!pending.length) {
        ctx.notify('No pending approvals.');
        return true;
    }
    ctx.state.setPendingApprovals(pending);
    ctx.state.setSessionsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.state.setMessagesFocused(false);
    ctx.state.closeMessageDetail();
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setApprovalsFocused(true);
    ctx.updateTerminalTitle();
    return true;
}

// ── /review ──────────────────────────────────────────────────────────────────

async function handleReview(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    if (args) {
        const arg = args.trim();
        if (arg === 'summary') {
            const lines = ctx.state.getReviewAnnotationSummary();
            for (const line of lines) {
                ctx.notify(line);
            }
            return true;
        }
        if (arg === 'approve-all') {
            ctx.state.approveAllReviewFiles();
            ctx.notify('All files approved.');
            return true;
        }
        if (arg === 'clear-all') {
            ctx.state.clearAllReviewAnnotations();
            ctx.notify('All annotations cleared.');
            return true;
        }
        if (arg === 'clear') {
            ctx.state.clearReviewFileAnnotation();
            ctx.notify('Annotation cleared.');
            return true;
        }
        if (arg === 'export') {
            const report = ctx.state.getReviewExportReport();
            if (!report.length) {
                ctx.notify('No review data to export.');
                return true;
            }
            for (const line of report) {
                ctx.notify(line);
            }
            return true;
        }
        if (arg === 'risk') {
            const sections = ctx.state.reviewFileSections;
            if (!sections.length) {
                ctx.notify('No review files to analyze.');
                return true;
            }
            for (const section of sections) {
                const risk = ctx.state.computeFileRiskScore(section);
                const annot = ctx.state.reviewFileAnnotations[section.path];
                const marker = annot ? (annot.status === 'approved' ? ' ✓' : ' ✗') : '';
                ctx.notify(`${String(risk.score).padStart(2, ' ')} ${risk.level.padEnd(8, ' ')} ${section.path} (+${section.additions}/-${section.deletions})${marker}${annot?.comment ? ` - ${annot.comment}` : ''}`);
            }
            return true;
        }
        if (arg.startsWith('approve')) {
            const comment = arg.slice(7).trim() || undefined;
            ctx.state.setReviewFileAnnotation('approved', comment);
            ctx.notify(comment ? `File approved: ${comment}` : 'File approved.');
            return true;
        }
        if (arg.startsWith('reject')) {
            const comment = arg.slice(6).trim() || undefined;
            ctx.state.setReviewFileAnnotation('rejected', comment);
            ctx.notify(comment ? `File rejected: ${comment}` : 'File rejected.');
            return true;
        }
        if (arg === 'diff' || arg.startsWith('diff ')) {
            const base = arg.length > 5 ? arg.slice(5).trim() : undefined;
            return ctx.openGitDiffReview(base);
        }
        if (arg === 'run' || arg.startsWith('run ')) {
            const base = arg.length > 4 ? arg.slice(4).trim() : undefined;
            return ctx.runGitDiffReviewAnalysis(base);
        }
        if (arg === 'findings' || arg.startsWith('findings ')) {
            const commit = arg.length > 9 ? arg.slice(9).trim() : undefined;
            return ctx.listReviewFindings(commit);
        }
        if (arg === 'show' || arg.startsWith('show ')) {
            const id = arg.length > 5 ? arg.slice(5).trim() : undefined;
            return ctx.showReviewRun(id);
        }
        await ctx.openCodingTaskReview(arg);
        return true;
    }
    return ctx.openCodingTaskReviewSelector();
}

// ── /quality ─────────────────────────────────────────────────────────────────

async function handleQuality(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    const arg = args?.trim() || '';
    if (arg === 'list' || arg.startsWith('list ')) {
        const provider = arg.slice(4).trim() || undefined;
        return ctx.openSummaryQualityRecords(provider);
    }
    if (arg === 'trend' || arg.startsWith('trend ')) {
        const { provider, bucketSize, maxBuckets } = ctx.parseSummaryQualityTrendArgs(arg.slice(5));
        return ctx.openSummaryQualityTrend(provider, bucketSize, maxBuckets);
    }
    const provider = arg || undefined;
    const aggregates = ctx.sessionService
        ? await ctx.sessionService.getSummaryQualityStats(provider)
        : [];
    if (!aggregates.length) {
        ctx.notify(
            provider
                ? `No summary quality stats recorded for provider '${provider}'.`
                : 'No summary quality stats recorded yet.'
        );
        return true;
    }
    ctx.notify(
        aggregates
            .map(item => ctx.formatSummaryQualityAggregate(item))
            .join(' | ')
    );
    return true;
}

// ── /compactions ─────────────────────────────────────────────────────────────

async function handleCompactions(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'trend' || arg.startsWith('trend ')) {
            const { sessionId, bucketSize, maxBuckets } = ctx.parseCompactionHistoryTrendArgs(arg.slice(5));
            return ctx.openCompactionHistoryTrend(sessionId, bucketSize, maxBuckets);
        }
    }
    return ctx.openCompactionHistory(args);
}

// ── /compact ─────────────────────────────────────────────────────────────────

async function handleCompact(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    const reason = args?.trim() || undefined;
    const result = await ctx.sessionService?.compactSession(ctx.state.sessionId, reason) ?? { compacted: false };
    if (result.error) {
        ctx.notify(`Compaction failed: ${result.error}`);
        return true;
    }
    if (!result.compacted) {
        ctx.notify('Nothing to compact: history already within budget.');
        return true;
    }
    const summary = typeof result.summary === 'string' && result.summary.trim()
        ? ` · ${result.summary.trim()}`
        : '';
    const before = typeof result.beforeMessageCount === 'number' ? result.beforeMessageCount : 0;
    const after = typeof result.afterMessageCount === 'number' ? result.afterMessageCount : 0;
    const ratio = typeof result.compressionRatio === 'number' ? `${result.compressionRatio}%` : 'n/a';
    ctx.notify(`Compacted ${before} -> ${after} messages (${ratio} tokens saved).${summary}`);
    return true;
}

// ── /diagnostics ─────────────────────────────────────────────────────────────

async function handleDiagnostics(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'trend' || arg.startsWith('trend ')) {
            const { sessionId, bucketSize, maxBuckets } = ctx.parseTurnDiagnosticsTrendArgs(arg.slice(5));
            return ctx.openTurnDiagnosticsTrend(sessionId, bucketSize, maxBuckets);
        }
        if (arg === 'list' || arg.startsWith('list ')) {
            const sessionId = arg.slice(4).trim() || undefined;
            return ctx.openTurnDiagnosticsList(sessionId);
        }
        const sessionId = arg || undefined;
        return ctx.openTurnDiagnostics(sessionId);
    }
}

// ── /delegation ──────────────────────────────────────────────────────────────

async function handleDelegation(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'tree' || arg.startsWith('tree ')) {
            const rest = arg.slice(4).trim();
            const tokens = rest.split(/\s+/).filter(Boolean);
            const sessionId = tokens[0];
            const status = tokens[1];
            const depthRaw = tokens[2] !== undefined && /^\d+$/.test(tokens[2]) ? parseInt(tokens[2], 10) : undefined;
            return ctx.openDelegationTree(sessionId, status, depthRaw);
        }
        if (arg === 'lineage' || arg.startsWith('lineage ')) {
            return ctx.openDelegationLineage(arg.slice(7).trim() || undefined);
        }
        if (arg === 'mode' || arg.startsWith('mode ')) {
            await ctx.runDelegationModeCommand(arg.slice(4).trim());
            return true;
        }
        return ctx.openDelegationList(arg || undefined);
    }
}

// ── /harness ─────────────────────────────────────────────────────────────────

async function handleHarness(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'audit' || arg.startsWith('audit ')) {
            const sessionId = arg.slice(5).trim() || undefined;
            return ctx.openHarnessAudit(sessionId);
        }
        if (arg === 'profile' || arg.startsWith('profile ')) {
            return ctx.openHarnessProfile(arg.slice(7).trim() || undefined);
        }
        ctx.notify('Usage: /harness audit [sessionId] | /harness profile [list|current|diff <from> <to>]');
        return true;
    }
}

// ── /git-snapshots (alias for /snapshots with guard) ─────────────────────────

async function handleGitSnapshots(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    await ctx.runGitSnapshotsCommand(String(args || '').trim());
    return true;
}

// ── Dispatch table ───────────────────────────────────────────────────────────

export const COMMAND_HANDLERS: Record<string, CommandHandler> = {
    '/help': handleHelp,
    '/model': handleModel,
    '/init': (ctx, args) => guardDelegate(ctx, args, { command: '/init', matches: [] }, a => ctx.runInitCommand(a).then(() => true)),
    '/plan': (ctx, args) => guardDelegate(ctx, args, { command: '/plan', matches: [] }, a => ctx.runPlanCommand(a).then(() => true)),
    '/archetype': (ctx, args) => guardDelegate(ctx, args, { command: '/archetype', matches: [] }, a => ctx.runArchetypeCommand(a).then(() => true)),
    '/vim': (ctx, args, r) => ctx.runVimCommand(args).then(() => true),
    '/keymap': (ctx, args) => ctx.runKeymapCommand(args).then(() => true),
    '/permissions': (ctx, args) => guardDelegate(ctx, args, { command: '/permissions', matches: [] }, a => ctx.runPermissionsCommand(a).then(() => true)),
    '/status': (ctx) => ctx.runStatusCommand().then(() => true),
    '/cd': (ctx, args) => { ctx.runCdCommand(args); return Promise.resolve(true); },
    '/pwd': handlePwd,
    '/goal': (ctx, args) => ctx.runGoalCommand(args).then(() => true),
    '/undo': (ctx, args) => guardDelegateNoArgs(ctx, args, { command: '/undo', matches: [] }, () => ctx.runUndoCommand().then(() => true)),
    '/redo': (ctx, args) => guardDelegateNoArgs(ctx, args, { command: '/redo', matches: [] }, () => ctx.runRedoCommand().then(() => true)),
    '/export': (ctx, args) => guardDelegate(ctx, args, { command: '/export', matches: [] }, a => ctx.runExportCommand(a)),
    '/attach': (ctx, args) => guardDelegate(ctx, args, { command: '/attach', matches: [] }, a => ctx.runAttachCommand(a)),
    '/tools': handleTools,
    '/skills': (ctx, args) => ctx.runSkillsCommand(args),
    '/mcp': (ctx, args) => ctx.runMcpCommand(args),
    '/plugins': (ctx, args) => ctx.runPluginsCommand(args),
    '/apps': (ctx, args) => ctx.runAppsCommand(args),
    '/ssh': (ctx, args) => ctx.runSshCommand(args).then(() => true),
    '/jobs': (ctx, args) => guardDelegate(ctx, args, { command: '/jobs', matches: [] }, a => ctx.openScheduledJobsDashboard(a)),
    '/tasks': (ctx, args) => guardDelegate(ctx, args, { command: '/tasks', matches: [] }, a => ctx.openCodingTaskInspector(a)),
    '/threadplan': handleThreadplan,
    '/threadreview': (ctx, _args) => guardDelegateNoArgs(ctx, '', { command: '/threadreview', matches: [] }, () => ctx.openThreadCodingTaskReviewSelector()),
    '/review': handleReview,
    '/diff': (ctx, args) => guardDelegate(ctx, args, { command: '/diff', matches: [] }, a => ctx.openWorktreeDiff(a)),
    '/theme': (ctx, args) => ctx.runThemeCommand(args),
    '/thinking': (ctx, args) => ctx.runThinkingCommand(args),
    '/display': (ctx, args) => ctx.runDisplayCommand(args),
    '/timeline': async (ctx) => { await ctx.toggleTimelineMode(); return true; },
    '/raw': (ctx, args) => ctx.runRawModeCommand(args),
    '/stash': (ctx, args) => ctx.runStashCommand(args),
    '/statusline': (ctx, args) => ctx.runStatuslineCommand(args),
    '/hooks': (ctx) => ctx.runHooksCommand(),
    '/memories': (ctx, args) => ctx.runMemoriesCommand(args),
    '/fast': (ctx, args) => ctx.runFastCommand(args),
    '/personality': (ctx, args) => ctx.runPersonalityCommand(args),
    '/debug-config': (ctx) => ctx.runDebugConfigCommand(),
    '/settings': (ctx) => ctx.runSettingsCommand(),
    '/yolo': (ctx, args) => ctx.runYoloCommand(args),
    '/experimental': (ctx, args) => ctx.runExperimentalCommand(args),
    '/feedback': (ctx) => ctx.runFeedbackCommand(),
    '/ps': (ctx, args) => ctx.runBackgroundTasksCommand(args),
    '/ide': (ctx, args) => ctx.runIdeCommand(args),
    '/editor': (ctx, args) => ctx.runEditorCommand(args),
    '/retry': (ctx, args) => guardDelegate(ctx, args, { command: '/retry', matches: [] }, a => ctx.retryFailedCodingTask(a)),
    '/rollback': (ctx, args) => guardDelegate(ctx, args, { command: '/rollback', matches: [] }, a => ctx.rollbackCodingTask(a)),
    '/clear': handleClear,
    '/approvals': handleApprovals,
    '/usage': (ctx, args) => guardDelegate(ctx, args, { command: '/usage', matches: [] }, a => ctx.openUsage(a?.trim() || undefined)),
    '/quality': handleQuality,
    '/compactions': handleCompactions,
    '/compact': handleCompact,
    '/diagnostics': handleDiagnostics,
    '/delegation': handleDelegation,
    '/harness': handleHarness,
    '/voice': (ctx, args) => ctx.handleVoiceCommand(args?.trim() || ''),
    '/copy': handleCopy,
    '/share': (ctx, args) => ctx.runShareCommand(args),
    '/unshare': (ctx, args) => ctx.runUnshareCommand(args),
    '/session': handleSession,
    '/new': handleNew,
    '/sessions': handleSessions,
    '/resume': handleResume,
    '/archive': handleArchive,
    '/fork': handleForkSide,
    '/side': handleForkSide,
    '/pin': handlePinUnpin,
    '/unpin': handlePinUnpin,
    '/title': handleTitle,
    '/snapshot': handleSnapshot,
    '/snapshots': handleSnapshots,
    '/git-snapshots': handleGitSnapshots,
    '/toolruns': handleToolruns,
    '/search': handleSearch,
    '/projects': handleProjects,
    '/threads': handleThreads,
    '/sections': handleSections,
    '/messages': handleMessages,
    '/approve': handleApproveDeny,
    '/deny': handleApproveDeny,
    '/quit': handleQuitExit,
    '/exit': handleQuitExit,
    '/multiline': handleMultiline,
    '/cancel': handleCancel,
    '/send': handleSend
};
