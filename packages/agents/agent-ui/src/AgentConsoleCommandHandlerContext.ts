// Command handler context extracted from AgentConsoleCommandHandlers (P7 ratchet).

import type {
    AgentConsoleApprovalRequest,
    AgentConsoleCommandOutputEntry,
    AgentConsolePendingAttachment,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem
} from './AgentConsoleSessionState';
import type { AgentConsoleSessionService } from './AgentConsoleSessionService';
import type { NavFilter, NavSelection } from '@tsdi/agent';
import type { AgentUiTranslator } from './agent-ui.i18n';
export interface CommandHandlerContext {
    translator?: AgentUiTranslator | null;
    /** Request-scoped cancellation signal. Handlers may forward it to async ports. */
    readonly abortSignal?: AbortSignal;
    readonly transcriptNavigationController: { setFocused(focused: boolean): void };
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
        toggleCommandOutputs(): void;
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
        setNavFilter(filter?: NavFilter): void;
        setNavSelection(selection?: NavSelection): void;
        setNavViewScroll(viewId: string, scroll: number): void;
    };

    // ── UI primitives ──
    notify(message: string, duration?: number): void;
    pushCommandOutput(command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']): void;
    select(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string): Promise<string | undefined>;

    // ── transcript pager (base-layer surface owns the mechanics) ──
    openPager(query?: string): boolean;
    closePager(): boolean;

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
    runCdCommand(args: string): void | Promise<void>;
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
    runLayoutCommand(args: string): Promise<boolean>;
    runTimelineModeCommand(args?: string): Promise<boolean>;
    runRawModeCommand(args: string): Promise<boolean>;
    runStashCommand(args: string): Promise<boolean>;
    runQueueCommand(args?: string): Promise<boolean>;
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
    openHarnessTree(sessionId?: string): Promise<boolean>;
    openHarnessList(sessionId?: string): Promise<boolean>;
    runHarnessStopCommand(taskId: string): Promise<boolean>;

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
    startProviderWizard(): void | Promise<void>;
    openUsage(input?: string): Promise<boolean>;
}
