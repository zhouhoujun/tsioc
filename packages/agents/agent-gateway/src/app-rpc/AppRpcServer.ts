import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { UuidGenerator } from '@tsdi/core';
import { AGENT_OPTIONS, AgentMessage, AgentOptions, AgentRuntime, AgentTurnCancelledError, AgentTurnMessageInput, AuditSink, applyNavFilter, buildAgentsRuleDraft, buildCompactionHistoryTrend, buildNavTree, buildSummaryQualityTrend, CompactionHistoryStore, defaultAgentOptions, defaultAgentProviderRegistry, DelegationGraphStore, diffHarnessProfiles, getBuiltinHarnessProfiles, HarnessProfile, MemoryStore, MemoryCommandOutputStore, NavFilter, NavSessionSource, normalizeDelegationMode, ProjectMemoryService, resolveHarnessProfile, ReviewFindingsStore, SessionStore, SummaryQualityStore, TimelineHistoryStore, ToolApprovalManager, ToolRegistry, TurnDiagnosticsStore, WeaknessMiner, normalizeAgentMessageParts, snapshotHarnessProfile, RedactionFilter, CommandOutputQuery, AgentConsoleCommandOutputHistoryEntry } from '@tsdi/agent';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { SessionHandler } from '../api/SessionHandler';
import { EventHandler, GatewayEventRecord } from '../api/EventHandler';
import { AppRpcError, AppRpcRequest, AppRpcRequestContext, AppRpcResponse, AppRpcTransportMessage } from '../contracts/AppRpc';
import { summarizeUsageForSessions } from '../usage/UsageStats';
import { AudioSessionHandler, AudioSessionState } from '../audio';
import { SessionShareStore } from '../share/SessionShareStore';
import { CloudTaskQueue } from '../cloud/CloudTaskQueue';
import { QuestionStore } from './QuestionStore';

@Injectable()
export class AppRpcServer {
    protected static readonly CONSOLE_INPUT_HISTORY_KEY = 'agent-ui.console.input-history';
    protected static readonly REVIEW_ANNOTATIONS_CACHE_KEY = 'agent-ui.review.annotations-cache';
    protected static readonly commandOutputRedactor = new RedactionFilter();

    constructor(
        private runtime: AgentRuntime,
        private uuid: UuidGenerator,
        private sessions: SessionStore,
        private memory: MemoryStore,
        private tools: ToolRegistry,
        private owners: SessionOwnerStore,
        private sessionHandler: SessionHandler,
        private events: EventHandler,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions = defaultAgentOptions,
        @Optional() private audit?: AuditSink | null,
        @Optional() private approvalManager?: ToolApprovalManager | null,
        @Optional() private summaryQuality?: SummaryQualityStore | null,
        @Optional() private compactionHistory?: CompactionHistoryStore | null,
        @Optional() private turnDiagnostics?: TurnDiagnosticsStore | null,
        @Optional() private delegation?: DelegationGraphStore | null,
        @Optional() private weaknessMiner?: WeaknessMiner | null,
        @Optional() private reviewFindings?: ReviewFindingsStore | null,
        @Optional() private audio?: AudioSessionHandler | null,
        @Optional() private shares?: SessionShareStore | null,
        @Optional() private cloudTasks?: CloudTaskQueue | null,
        @Optional() private projectMemory?: ProjectMemoryService | null,
        @Optional() private timeline?: TimelineHistoryStore | null,
        @Optional() private questionStore?: QuestionStore | null,
        @Optional() private onQuestionAnswered?: ((questionId: string, sessionId: string, answer?: string, dismissed?: boolean) => void | Promise<void>) | null
    ) {
    }

    protected readonly audioStatesBySession = new Map<string, AudioSessionState>();
    protected readonly questionResponses = new Map<string, { questionId: string; sessionId: string; status: 'answered' | 'dismissed'; answer?: string; updatedAt: number }>();

    async handlePayload(payload: AppRpcRequest | AppRpcRequest[], context: AppRpcRequestContext = {}): Promise<AppRpcResponse | AppRpcResponse[] | null> {
        if (Array.isArray(payload)) {
            if (!payload.length) {
                return {
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32600,
                        message: 'Invalid Request'
                    }
                };
            }
            const responses: AppRpcResponse[] = [];
            for (const request of payload) {
                const response = await this.handle(request, context);
                if (response) {
                    responses.push(response);
                }
            }
            return responses.length ? responses : null;
        }
        return this.handle(payload, context);
    }

    async handle(request: AppRpcRequest, context: AppRpcRequestContext = {}): Promise<AppRpcResponse | null> {
        if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string' || !request.method.trim()) {
            throw new AppRpcError(-32600, 'Invalid Request');
        }

        const id = request.id ?? null;
        const method = request.method.trim();

        try {
            const result = await this.dispatch(method, request.params ?? {}, context);
            if (request.id === undefined) {
                return null;
            }
            return {
                jsonrpc: '2.0',
                id,
                result
            };
        } catch (error: any) {
            const rpcError = error instanceof AppRpcError
                ? error
                : new AppRpcError(-32603, error?.message ?? 'Internal error');
            if (request.id === undefined) {
                return null;
            }
            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: rpcError.code,
                    message: rpcError.message,
                    data: rpcError.data
                }
            };
        }
    }

    async *streamPayload(payload: AppRpcRequest, context: AppRpcRequestContext = {}): AsyncGenerator<AppRpcTransportMessage, void, void> {
        const request = payload;
        if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string' || !request.method.trim()) {
            yield this.createErrorResponse(request?.id, new AppRpcError(-32600, 'Invalid Request'));
            return;
        }
        if (request.method.trim() !== 'run.turn_stream') {
            const response = await this.handle(request, context);
            if (response) {
                yield response;
            }
            return;
        }

        try {
            yield* this.streamTurn(request, context);
        } catch (error: any) {
            if (request.id === undefined) {
                return;
            }
            yield this.createErrorResponse(request.id, error instanceof AppRpcError
                ? error
                : new AppRpcError(-32603, error?.message ?? 'Internal error'));
        }
    }

    private async dispatch(method: string, params: any, context: AppRpcRequestContext): Promise<any> {
        switch (method) {
            case 'app.ping':
                return {
                    ok: true,
                    transport: 'json-rpc',
                    timestamp: Date.now()
                };
            case 'app.capabilities':
                return {
                    protocol: 'json-rpc-2.0',
                    transports: ['http', 'stdio', 'ws'],
                    methods: [
                        'app.ping',
                        'app.capabilities',
                        'app.state',
                        'app.inputHistory.get',
                        'app.inputHistory.put',
                        'command_output.list',
                        'command_output.append',
                        'command_output.get',
                        'command_output.replay',
                        'command_output.clear',
                        'session.create',
                        'session.fork',
                        'session.list',
                        'session.list_projects',
                        'session.list_threads',
                        'nav.query',
                        'session.messages',
                        'session.search',
                        'session.delete',
                        'session.export',
                        'session.plan_mode.set',
                        'session.plan_mode.get',
                        'session.archetype.set',
                        'session.archetype.get',
                        'session.sandbox_mode.set',
                        'session.sandbox_mode.get',
                        'session.delegation_mode.set',
                        'session.delegation_mode.get',
                        'session.undo_file',
                        'session.redo_file',
                        'session.set_title',
                        'session.set_pinned',
                        'session.set_archived',
                        'session.section.list',
                        'session.section.create',
                        'session.section.rename',
                        'session.section.move',
                        'session.section.delete',
                        'session.snapshot.create',
                        'session.snapshot.list',
                        'session.snapshot.restore',
                        'session.snapshot.delete',
                        'session.git_snapshot.create',
                        'session.git_snapshot.list',
                        'session.git_snapshot.diff',
                        'session.git_snapshot.revert',
                        'session.git_snapshot.unrevert',
                        'session.compact',
                        'session.share.create',
                        'session.share.revoke',
                        'session.share.list',
                        'run.turn',
                        'run.turn_stream',
                        'run.cancel',
                        'cloud.task.submit',
                        'cloud.task.list',
                        'cloud.task.get',
                        'cloud.task.cancel',
                        'cloud.task.apply',
                        'approval.list',
                        'approval.approve',
                        'approval.reject',
                        'tools.list',
                        'tools.activate',
                        'tools.invoke',
                        'model.list',
                        'model.activate',
                        'memory.list',
                        'memory.put',
                        'memory.search',
                        'project_memory.list',
                        'project_memory.add',
                        'project_memory.remove',
                        'events.history',
                        'timeline.query',
                        'timeline.replay',
                        'audit.list',
                        'todo.get',
                        'coding_task.list',
                        'coding_task.get',
                        'coding_task.diff',
                        'coding_task.cancel',
                        'coding_task.retry_failed',
                        'coding_task.rollback',
                        'review_annotations.save',
                        'review_annotations.load',
                        'review.conclusions.write',
                        'review_gate.set',
                        'review_gate.clear',
                        'review_gate.status',
                        'summary_quality.list',
                        'summary_quality.stats',
                        'summary_quality.trend',
                        'usage.stats',
                        'compaction_history.list',
                        'compaction_history.stats',
                        'compaction_history.trend',
                        'turn_diagnostics.list',
                        'turn_diagnostics.stats',
                        'turn_diagnostics.trend',
                        'audio.status',
                        'audio.start',
                        'audio.feed',
                        'audio.end',
                        'audio.cancel',
                        'harness.audit',
                        'harness.rejected_actions',
                        'harness.retry_rejected_action',
                        'harness.profile.list',
                        'harness.profile.current',
                        'harness.profile.diff',
                        'delegation.tree',
                        'delegation.lineage',
                        'delegation.children',
                        'delegation.list',
                        'review.diff',
                        'review.list',
                        'review.get',
                        'review.save',
                        'project.trust_status',
                        'project.trust',
                        'goal.create',
                        'goal.get',
                        'goal.list',
                        'goal.link',
                        'goal.complete',
                        'goal.reopen'
                    ],
                    streamingMethods: ['run.turn_stream']
                };
            case 'app.state':
                return this.getAppState(params, context);
            case 'app.inputHistory.get':
                return this.getInputHistory(params, context);
            case 'app.inputHistory.put':
                return this.putInputHistory(params, context);
            case 'command_output.list':
                return this.listCommandOutput(params, context);
            case 'command_output.append':
                return this.appendCommandOutput(params, context);
            case 'command_output.get':
                return this.getCommandOutput(params, context);
            case 'command_output.replay':
                return this.replayCommandOutput(params, context);
            case 'command_output.clear':
                return this.clearCommandOutput(params, context);
            case 'session.create':
                return this.createSession(params, context);
            case 'session.fork':
                return this.forkSession(params, context);
            case 'session.list':
                return this.listSessions(params, context);
            case 'session.list_projects':
                return this.listSessionProjects(params, context);
            case 'session.list_threads':
                return this.listSessionThreads(params, context);
            case 'nav.query':
                return this.queryNav(params, context);
            case 'session.messages':
                return this.getSessionMessages(params, context);
            case 'session.search':
                return this.searchSessions(params, context);
            case 'session.delete':
                return this.deleteSession(this.requireSessionId(params), context);
            case 'session.export':
                return this.exportSession(params, context);
            case 'session.plan_mode.set':
                return this.setSessionPlanMode(params, context);
            case 'session.plan_mode.get':
                return this.getSessionPlanMode(params, context);
            case 'session.archetype.set':
                return this.setSessionArchetype(params, context);
            case 'session.archetype.get':
                return this.getSessionArchetype(params, context);
            case 'session.sandbox_mode.set':
                return this.setSessionSandboxMode(params, context);
            case 'session.sandbox_mode.get':
                return this.getSessionSandboxMode(params, context);
            case 'session.delegation_mode.set':
                return this.setSessionDelegationMode(params, context);
            case 'session.delegation_mode.get':
                return this.getSessionDelegationMode(params, context);
            case 'session.undo_file':
                return this.undoFile(params, context);
            case 'session.redo_file':
                return this.redoFile(params, context);
            case 'session.set_title':
                return this.setSessionTitle(params, context);
            case 'session.set_pinned':
                return this.setSessionPinned(params, context);
            case 'session.set_archived':
                return this.setSessionArchived(params, context);
            case 'session.section.list':
                return this.listSessionSections(params, context);
            case 'session.section.create':
                return this.createSessionSection(params, context);
            case 'session.section.rename':
                return this.renameSessionSection(params, context);
            case 'session.section.move':
                return this.moveSessionSection(params, context);
            case 'session.section.delete':
                return this.deleteSessionSection(params, context);
            case 'session.snapshot.create':
                return this.createSessionSnapshot(params, context);
            case 'session.snapshot.list':
                return this.listSessionSnapshots(params, context);
            case 'session.snapshot.restore':
                return this.restoreSessionSnapshot(params, context);
            case 'session.snapshot.delete':
                return this.deleteSessionSnapshot(params, context);
            case 'session.git_snapshot.create':
                return this.createGitStepSnapshot(params, context);
            case 'session.git_snapshot.list':
                return this.listGitStepSnapshots(params, context);
            case 'session.git_snapshot.diff':
                return this.diffGitStepSnapshot(params, context);
            case 'session.git_snapshot.revert':
                return this.revertGitStepSnapshot(params, context);
            case 'session.git_snapshot.unrevert':
                return this.unrevertGitStepSnapshot(params, context);
            case 'session.compact':
                return this.compactSession(params, context);
            case 'session.share.create':
                return this.createSessionShare(params, context);
            case 'session.share.revoke':
                return this.revokeSessionShare(params, context);
            case 'session.share.list':
                return this.listSessionShares(params, context);
            case 'goal.create': return this.createGoal(params, context);
            case 'goal.get': return this.getGoal(params, context);
            case 'goal.list': return this.runtime.listGoals(params?.status);
            case 'goal.link': return this.linkGoal(params, context);
            case 'goal.complete': return this.updateGoalStatus(params, context, 'completed');
            case 'goal.reopen': return this.updateGoalStatus(params, context, 'active');
            case 'run.turn':
                return this.runTurn(params, context);
            case 'run.cancel':
                return this.cancelTurn(params, context);
            case 'question.answer':
                return this.answerQuestion(params, context);
            case 'question.list':
                return this.listQuestionResponses(params, context);
            case 'cloud.task.submit':
                return this.submitCloudTask(params, context);
            case 'cloud.task.list':
                return this.listCloudTasks(context);
            case 'cloud.task.get':
                return this.getCloudTask(params, context);
            case 'cloud.task.cancel':
                return this.cancelCloudTask(params, context);
            case 'cloud.task.apply':
                return this.applyCloudTask(params, context);
            case 'approval.list':
                return this.listApprovals(params, context);
            case 'approval.approve':
                return this.decideApproval(params, context, true);
            case 'approval.reject':
                return this.decideApproval(params, context, false);
            case 'tools.list':
                return this.tools.getToolDefinitions(this.optionalSessionId(params));
            case 'tools.activate':
                return this.activateTool(params, context);
            case 'tools.invoke':
                return this.invokeTool(params, context);
            case 'model.list':
                return this.listModelProfiles();
            case 'model.activate':
                return this.activateModelProfile(params, context);
            case 'memory.list':
                return this.listMemory(params, context);
            case 'memory.put':
                return this.putMemory(params, context);
            case 'memory.search':
                return this.searchMemory(params, context);
            case 'project_memory.list':
                return this.listProjectMemory(params, context);
            case 'project_memory.add':
                return this.addProjectMemory(params, context);
            case 'project_memory.remove':
                return this.removeProjectMemory(params, context);
            case 'events.history':
                return this.getEventHistory(this.requireSessionId(params), context);
            case 'timeline.query':
                return this.queryTimeline(params, context);
            case 'timeline.replay':
                return this.replayTimeline(params, context);
            case 'audit.list':
                return this.listAudit(params, context);
            case 'todo.get':
                return this.getTodoPlan(params, context);
            case 'coding_task.list':
                return this.listCodingTasks(params, context);
            case 'coding_task.get':
                return this.getCodingTask(params, context);
            case 'coding_task.diff':
                return this.getCodingTaskDiff(params, context);
            case 'coding_task.cancel':
                return this.cancelCodingTask(params, context);
            case 'coding_task.retry_failed':
                return this.retryFailedCodingTask(params, context);
            case 'coding_task.rollback':
                return this.rollbackCodingTask(params, context);
            case 'review_annotations.save':
                return this.saveReviewAnnotations(params, context);
            case 'review_annotations.load':
                return this.loadReviewAnnotations(params, context);
            case 'review_gate.set':
                return this.setReviewGate(params, context);
            case 'review_gate.clear':
                return this.clearReviewGate(params, context);
            case 'review_gate.status':
                return this.getReviewGateStatus(params, context);
            case 'review.conclusions.write':
                return this.writeReviewConclusions(params, context);
            case 'summary_quality.list':
                return this.listSummaryQuality(params, context);
            case 'summary_quality.stats':
                return this.getSummaryQualityStats(params, context);
            case 'summary_quality.trend':
                return this.getSummaryQualityTrend(params, context);
            case 'usage.stats':
                return this.getUsageStats(params, context);
            case 'compaction_history.list':
                return this.listCompactionHistory(params, context);
            case 'compaction_history.stats':
                return this.getCompactionHistoryStats(params, context);
            case 'compaction_history.trend':
                return this.getCompactionHistoryTrend(params, context);
            case 'turn_diagnostics.list':
                return this.listTurnDiagnostics(params, context);
            case 'turn_diagnostics.stats':
                return this.getTurnDiagnosticsStats(params, context);
            case 'turn_diagnostics.trend':
                return this.getTurnDiagnosticsTrend(params, context);
            case 'audio.status':
                return this.getAudioStatus(params, context);
            case 'audio.start':
                return this.startAudioSession(params, context);
            case 'audio.feed':
                return this.feedAudioChunk(params, context);
            case 'audio.end':
                return this.endAudioSession(params, context);
            case 'audio.cancel':
                return this.cancelAudioSession(params, context);
            case 'harness.audit':
                return this.runHarnessAudit(params, context);
            case 'harness.rejected_actions':
                return this.listRejectedActions(params, context);
            case 'harness.retry_rejected_action':
                return this.retryRejectedAction(params, context);
            case 'harness.profile.list':
                return this.listHarnessProfiles(params, context);
            case 'harness.profile.current':
                return this.currentHarnessProfile(params, context);
            case 'harness.profile.diff':
                return this.diffHarnessProfiles(params, context);
            case 'delegation.tree':
                return this.getDelegationTree(params, context);
            case 'delegation.lineage':
                return this.getDelegationLineage(params, context);
            case 'delegation.children':
                return this.getDelegationChildren(params, context);
            case 'delegation.list':
                return this.getDelegationList(params, context);
            case 'review.diff':
                return this.reviewDiff(params, context);
            case 'review.list':
                return this.listReviewRuns(params, context);
            case 'review.get':
                return this.getReviewRun(params, context);
            case 'review.save':
                return this.saveReviewRun(params, context);
            case 'project.trust_status':
                return this.getProjectTrustStatus(params, context);
            case 'project.trust':
                return this.setProjectTrust(params, context);
            default:
                throw new AppRpcError(-32601, `Method '${method}' not found`);
        }
    }

    private async createSession(params: any, context: AppRpcRequestContext): Promise<any> {
        const requested = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : `rpc-${this.uuid.generate()}`;
        await this.ensureSessionAccess(requested, context, { createIfMissing: true });
        this.sessionHandler.track(requested);
        await this.setSessionWorkspace(requested);
        const state = await this.sessions.get(requested);
        // Create a MemoryCommandOutputStore recordId for this session, keyed by
        // workspace:principal:session. The scheme matches the command_output.* handlers
        // so that the browser (or any host) can create a matching
        // MemoryCommandOutputStore and persist history that survives session restarts
        // and cross-session access.
        const workspace = state.workspace || this.resolveWorkspace();
        const principalId = this.resolveHistoryPrincipalId(context);
        const sessionRecordId = this.createCommandOutputRecordId(workspace, principalId, requested);
        // Store the recordId on the session state so downstream consumers can create
        // a matching store; the gateway also retains it in case it needs to persist
        // records through the RPC handlers.
        // @ts-ignore — property will be set dynamically
        state.commandOutputRecordId = sessionRecordId;
        return {
            sessionId: requested,
            createdAt: state.createdAt,
            updatedAt: state.updatedAt,
            workspace: state.workspace,
            commandOutputRecordId: sessionRecordId
        };
    }

    private async createGoal(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        return this.runtime.createGoal({
            title: this.requireString(params?.title, 'goal title'),
            objective: this.requireString(params?.objective, 'goal objective'),
            successCriteria: Array.isArray(params?.successCriteria) ? params.successCriteria.map(String) : []
        }, sessionId);
    }

    private async getGoal(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return params?.goalId ? this.runtime.getGoal(String(params.goalId)) : this.runtime.getSessionGoal(sessionId);
    }

    private async linkGoal(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        await this.runtime.linkSessionGoal(sessionId, params?.goalId ? String(params.goalId) : undefined);
        return { linked: true, sessionId, goalId: params?.goalId };
    }

    private async updateGoalStatus(params: any, context: AppRpcRequestContext, status: 'active' | 'completed'): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const linked = await this.runtime.getSessionGoal(sessionId);
        const goalId = String(params?.goalId || linked?.id || '').trim();
        if (!goalId) throw new Error('No goal linked to this session.');
        return this.runtime.updateGoal(goalId, { status });
    }

    private async forkSession(params: any, context: AppRpcRequestContext): Promise<any> {
        const sourceId = this.requireSessionId(params);
        await this.ensureSessionAccess(sourceId, context);
        const state = await this.sessions.fork(sourceId, params?.messageId, params?.forkSessionId);
        await this.owners.create(state.sessionId, context.principalId);
        this.sessionHandler.track(state.sessionId);
        return { sessionId: state.sessionId, sourceSessionId: sourceId, messageCount: state.messages.length };
    }

    private async getAppState(params: any, context: AppRpcRequestContext): Promise<any> {
        const workspace = this.resolveWorkspace();
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : await this.resolveAppStateSessionId(workspace, context);
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        await this.setSessionWorkspace(sessionId);
        const state = await this.sessions.get(sessionId);

        return {
            sessionId,
            workspace,
            title: this.options.ui?.title || defaultAgentOptions.ui?.title || '',
            provider: this.options.model?.provider || '',
            model: this.options.model?.model || '',
            modelProfile: this.resolveModelProfile(),
            createdAt: state.createdAt,
            updatedAt: state.updatedAt
        };
    }

    private async resolveAppStateSessionId(workspace: string, context: AppRpcRequestContext): Promise<string> {
        // Contract: only an explicit --session resumes history; otherwise start fresh.
        const bootstrapSessionId = String(this.options.bootstrapTurn?.sessionId || '').trim();
        if (bootstrapSessionId) {
            return bootstrapSessionId;
        }
        return `chat${this.uuid.generate().replace(/-/g, '')}`;
    }

    private async getInputHistory(params: any, context: AppRpcRequestContext): Promise<string[]> {
        const workspace = this.resolveHistoryRequestWorkspace(params);
        const principalIds = this.resolveHistoryPrincipalIds(context);
        const records = this.listConsoleInputHistoryRecords(await this.memory.getAll(undefined), workspace, principalIds);
        return this.mergeConsoleInputHistoryEntries(records.map(record => this.parseInputHistoryEntries(record.value)));
    }

    private async putInputHistory(params: any, context: AppRpcRequestContext): Promise<{ workspace: string; entries: string[] }> {
        const workspace = this.resolveHistoryRequestWorkspace(params);
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
            this.sessionHandler.track(sessionId);
        }
        const principalId = this.resolveHistoryPrincipalId(context);
        const entries = this.normalizeInputHistoryEntries(params?.entries);
        const existing = this.findConsoleInputHistoryRecord(await this.memory.getAll(sessionId), workspace, principalId, sessionId);
        const id = this.createConsoleInputHistoryRecordId(workspace, principalId, sessionId);
        await this.memory.delete(id, undefined, 'global');
        await this.memory.put({
            id,
            key: AppRpcServer.CONSOLE_INPUT_HISTORY_KEY,
            value: JSON.stringify(entries),
            scope: 'global',
            namespace: 'agent-ui',
            category: 'workspace',
            metadata: {
                workspace,
                principalId,
                sessionId: sessionId || '',
                kind: 'console-input-history'
            },
            createdAt: existing?.createdAt || Date.now(),
            updatedAt: Date.now()
        });
        return { workspace, entries };
    }

    private createCommandOutputRecordId(workspace: string, principalId: string, sessionId: string): string {
        return `agent-ui:console-command-output:${encodeURIComponent(principalId)}:${encodeURIComponent(workspace)}:${encodeURIComponent(sessionId)}`;
    }

    private createCommandOutputStore(params: any, context: AppRpcRequestContext, sessionId: string): MemoryCommandOutputStore {
        const workspace = this.resolveHistoryRequestWorkspace(params);
        const principalId = this.resolveHistoryPrincipalId(context);
        return new MemoryCommandOutputStore(this.memory, this.createCommandOutputRecordId(workspace, principalId, sessionId));
    }

    private redactCommandOutputEntry(entry: AgentConsoleCommandOutputHistoryEntry): AgentConsoleCommandOutputHistoryEntry {
        const redactedText = AppRpcServer.commandOutputRedactor.redactText(entry.text);
        const redactedCommand = AppRpcServer.commandOutputRedactor.redactText(entry.command);
        const argsSummary = entry.argsSummary
            ? AppRpcServer.commandOutputRedactor.redactText(entry.argsSummary)
            : entry.argsSummary;
        return { ...entry, text: redactedText, command: redactedCommand, argsSummary };
    }

    private async listCommandOutput(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const store = this.createCommandOutputStore(params, context, sessionId);
        const query: CommandOutputQuery = {
            sessionId,
            filter: typeof params?.filter === 'string' && params.filter.trim() ? params.filter.trim() : undefined,
            cursor: typeof params?.cursor === 'string' && params.cursor ? params.cursor : undefined,
            limit: typeof params?.limit === 'number' && Number.isFinite(params.limit) ? params.limit : undefined
        };
        const page = await store.list(query);
        return {
            items: page.items.map(entry => this.redactCommandOutputEntry(entry)),
            nextCursor: page.nextCursor,
            total: page.total
        };
    }

    private async appendCommandOutput(params: any, context: AppRpcRequestContext): Promise<{ id: string }> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        const raw = params?.entry;
        if (!raw || typeof raw !== 'object') throw new AppRpcError(-32602, 'command_output.append: entry is required');
        const id = this.requireString(raw.id, 'entry.id');
        const command = this.requireString(raw.command, 'entry.command');
        const entry: AgentConsoleCommandOutputHistoryEntry = this.redactCommandOutputEntry({
            id,
            command,
            text: String(raw.text || ''),
            ts: Number(raw.ts) || Date.now(),
            kind: raw.kind === 'error' || raw.kind === 'notice' ? raw.kind : 'result',
            requestId: raw.requestId ? String(raw.requestId) : undefined,
            argsSummary: raw.argsSummary ? String(raw.argsSummary) : undefined,
            status: raw.status,
            durationMs: Number.isFinite(raw.durationMs) ? Number(raw.durationMs) : undefined,
            sessionId,
            source: 'rpc'
        });
        await this.createCommandOutputStore(params, context, sessionId).append(entry);
        return { id };
    }

    private async getCommandOutput(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const id = this.requireString(params?.id, 'id');
        const store = this.createCommandOutputStore(params, context, sessionId);
        const entry = await store.get(id, sessionId);
        return entry ? this.redactCommandOutputEntry(entry) : null;
    }

    private async clearCommandOutput(params: any, context: AppRpcRequestContext): Promise<{ removed: number }> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const store = this.createCommandOutputStore(params, context, sessionId);
        const removed = await store.clear(sessionId, { all: params?.all === true });
        return { removed };
    }

    private async replayCommandOutput(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const id = this.requireString(params?.id, 'id');
        const store = this.createCommandOutputStore(params, context, sessionId);
        const entry = await store.get(id, sessionId);
        if (!entry || !String(entry.command || '').trim()) {
            throw new AppRpcError(-32602, `command_output.replay: entry '${id}' has no command to replay`);
        }
        await this.setSessionWorkspace(sessionId);
        this.sessionHandler.track(sessionId);
        const turn = await this.runtime.runTurn(sessionId, entry.command.trim(), context.principalId, undefined, undefined, undefined);
        const messages = await this.runtime.getMessages(sessionId);
        return {
            sessionId,
            runId: turn.message?.id ?? null,
            message: messages[messages.length - 1] ?? null
        };
    }

    private async listSessions(params: any, context: AppRpcRequestContext): Promise<any[]> {
        return this.sessionHandler.listSessionInfos(context.principalId, params?.includeArchived === true, params?.includeAutomation === true);
    }

    private async listSessionProjects(params: any, context: AppRpcRequestContext): Promise<any[]> {
        return this.sessionHandler.groupSessionInfos(await this.sessionHandler.listSessionInfos(context.principalId, false, params?.includeAutomation === true));
    }

    private async listSessionThreads(params: any, context: AppRpcRequestContext): Promise<any[]> {
        return this.sessionHandler.groupThreadInfos(await this.sessionHandler.listSessionInfos(context.principalId, false, params?.includeAutomation === true));
    }

    private async queryNav(params: any, context: AppRpcRequestContext): Promise<any> {
        const infos = await this.sessionHandler.listSessionInfos(context.principalId, params?.includeArchived === true, params?.includeAutomation === true);
        const ownedIds = new Set(infos.map(info => info.id));
        const sessions: NavSessionSource[] = infos.map(info => ({
            id: info.id,
            workspace: info.workspace,
            projectId: info.projectId,
            primaryThreadId: info.primaryThreadId,
            sessionRole: info.sessionRole,
            status: info.threadStatus,
            title: info.title,
            summary: info.summary,
            messageCount: info.messageCount,
            pinned: info.pinned,
            archived: info.archived,
            lastActiveAt: info.lastActiveAt,
            createdAt: info.createdAt
        }));
        const [projects, threads] = await Promise.all([
            this.sessions.listProjects(),
            this.sessions.listThreads()
        ]);
        const ownedProjects = projects
            .filter(project => project.sessionIds.some(id => ownedIds.has(id)))
            .map(project => ({ ...project, sessionIds: project.sessionIds.filter(id => ownedIds.has(id)) }));
        const ownedThreads = threads
            .filter(thread => thread.sessionIds.some(id => ownedIds.has(id)))
            .map(thread => ({ ...thread, sessionIds: thread.sessionIds.filter(id => ownedIds.has(id)) }));
        const filter = params?.filter && typeof params.filter === 'object' ? params.filter as NavFilter : undefined;
        return applyNavFilter(buildNavTree(ownedProjects, ownedThreads, sessions, Date.now()), filter);
    }

    private async getSessionMessages(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const state = await this.sessions.get(sessionId);
        const messages = Array.isArray(state.messages) ? state.messages : [];
        const requestedLimit = typeof params?.limit === 'number' && params.limit > 0 ? Math.floor(params.limit) : undefined;
        const limit = Math.min(Math.max(requestedLimit ?? 50, 1), 500);
        const cursor = typeof params?.cursor === 'string' && params.cursor.trim()
            ? params.cursor.trim()
            : '';
        const before = !!params?.before;

        let page: typeof messages;
        let hasMore = false;
        if (!cursor) {
            page = messages.slice(Math.max(messages.length - limit, 0));
            hasMore = messages.length > page.length;
        } else if (before) {
            const cursorIndex = messages.findIndex(message => message.id === cursor);
            if (cursorIndex < 0) {
                throw new AppRpcError(-32602, `Invalid params: cursor message '${cursor}' not found`);
            }
            page = messages.slice(Math.max(cursorIndex - limit, 0), cursorIndex);
            hasMore = cursorIndex > limit;
        } else {
            const cursorIndex = messages.findIndex(message => message.id === cursor);
            if (cursorIndex < 0) {
                throw new AppRpcError(-32602, `Invalid params: cursor message '${cursor}' not found`);
            }
            page = messages.slice(cursorIndex + 1, cursorIndex + 1 + limit);
            hasMore = cursorIndex + 1 + limit < messages.length;
        }

        const sections = Array.isArray(state.sections)
            ? state.sections.map(section => ({ ...section }))
            : [];
        const goalSummary = typeof (this.runtime as any).getSessionGoal === 'function'
            ? await (this.runtime as any).getSessionGoal(sessionId)
            : undefined;
        return {
            sessionId,
            messages: page,
            sections,
            goalSummary,
            nextCursor: page.length ? page[page.length - 1].id : (cursor || undefined),
            hasMore
        };
    }

    private async listSessionSections(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return this.sessions.listSections(sessionId);
    }

    private async createSessionSection(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        const label = this.requireString(params?.label, 'section label');
        const beforeId = typeof params?.beforeId === 'string' && params.beforeId.trim()
            ? params.beforeId.trim()
            : undefined;
        const section = await this.sessions.addSection(sessionId, label, beforeId);
        return { sessionId, section };
    }

    private async renameSessionSection(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const sectionId = this.requireString(params?.sectionId, 'sectionId');
        const label = this.requireString(params?.label, 'section label');
        await this.sessions.renameSection(sessionId, sectionId, label);
        return { updated: true, sessionId, sectionId, label };
    }

    private async moveSessionSection(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const sectionId = this.requireString(params?.sectionId, 'sectionId');
        const beforeId = typeof params?.beforeId === 'string' && params.beforeId.trim()
            ? params.beforeId.trim()
            : undefined;
        await this.sessions.moveSection(sessionId, sectionId, beforeId);
        return { updated: true, sessionId, sectionId, beforeId };
    }

    private async deleteSessionSection(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const sectionId = this.requireString(params?.sectionId, 'sectionId');
        await this.sessions.deleteSection(sessionId, sectionId);
        return { deleted: true, sessionId, sectionId };
    }

    private async searchSessions(params: any, context: AppRpcRequestContext): Promise<any> {
        const query = this.requireString(params?.query, 'session.search query');
        const requestedLimit = typeof params?.limit === 'number' && params.limit > 0 ? Math.floor(params.limit) : undefined;
        const limit = requestedLimit ? Math.min(requestedLimit, 100) : undefined;
        const results = await this.runtime.searchSessions(query, { limit });
        if (!context.principalId) {
            return results;
        }
        const ownedIds = await this.owners.listOwned(results.map(result => result.sessionId), context.principalId);
        const owned = new Set(ownedIds);
        return results.filter(result => owned.has(result.sessionId));
    }

    private async deleteSession(sessionId: string, context: AppRpcRequestContext): Promise<any> {
        await this.ensureSessionAccess(sessionId, context);
        await this.owners.unbind(sessionId);
        await this.sessions.delete(sessionId);
        await this.memory.deleteBySession(sessionId);
        return { deleted: true, sessionId };
    }

    private async setSessionTitle(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const title = typeof params?.title === 'string' ? params.title : undefined;
        await this.sessions.setTitle(sessionId, title);
        return { updated: true, sessionId, title };
    }

    private async setSessionPinned(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const pinned = !!params?.pinned;
        await this.sessions.setPinned(sessionId, pinned);
        return { updated: true, sessionId, pinned };
    }

    private async setSessionArchived(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const archived = !!params?.archived;
        await this.sessions.setArchived(sessionId, archived);
        return { updated: true, sessionId, archived };
    }

    private async createSessionShare(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        if (!this.shares) {
            throw new AppRpcError(-32603, 'Session sharing is not available in this gateway.');
        }
        const state = await this.sessions.get(sessionId);
        const snapshot = this.shares.create({
            sessionId,
            title: state.title,
            summary: state.summary,
            messages: await this.runtime.getMessages(sessionId)
        }, state.workspace);
        return { id: snapshot.id, token: snapshot.token, url: `/api/share/${snapshot.token}`, createdAt: snapshot.createdAt };
    }

    private async revokeSessionShare(params: any, context: AppRpcRequestContext): Promise<any> {
        const token = String(params?.token || '').trim();
        if (!token) {
            throw new AppRpcError(-32602, 'token required');
        }
        const snapshot = this.shares?.get(token);
        if (!snapshot) {
            return { revoked: false, reason: 'share not found' };
        }
        await this.ensureSessionAccess(snapshot.sessionId, context);
        this.shares?.revoke(token);
        return { revoked: true, token };
    }

    private async listSessionShares(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return this.shares?.listBySession(sessionId) || [];
    }

    private async createSessionSnapshot(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const label = typeof params?.label === 'string' ? params.label : undefined;
        const snapshotId = await this.sessions.snapshot(sessionId, label);
        return { snapshotId, sessionId };
    }

    private async listSessionSnapshots(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return this.sessions.listSnapshots(sessionId);
    }

    private async restoreSessionSnapshot(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const snapshotId = String(params?.snapshotId || '').trim();
        if (!snapshotId) {
            throw new Error('snapshotId required');
        }
        await this.sessions.restoreSnapshot(sessionId, snapshotId);
        return { restored: true, sessionId, snapshotId };
    }

    private async deleteSessionSnapshot(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const snapshotId = String(params?.snapshotId || '').trim();
        if (!snapshotId) {
            throw new Error('snapshotId required');
        }
        await this.sessions.deleteSnapshot(sessionId, snapshotId);
        return { deleted: true, sessionId, snapshotId };
    }

    private async createGitStepSnapshot(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const state = await this.sessions.get(sessionId);
        const workspace = String(state.workspace || '').trim();
        if (!workspace) {
            throw new Error('session has no workspace configured');
        }
        const messageId = typeof params?.messageId === 'string' ? params.messageId.trim() : '';
        const snapshot = this.runtime.captureGitStepSnapshot(sessionId, workspace, messageId);
        if (!snapshot) {
            return { captured: false, sessionId, reason: 'workspace is not a git repo or has no tracked changes' };
        }
        return { captured: true, sessionId, snapshot };
    }

    private async listGitStepSnapshots(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.listGitStepSnapshots(sessionId);
    }

    private async diffGitStepSnapshot(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const ref = String(params?.ref || params?.snapshotId || params?.messageId || '').trim();
        if (!ref) {
            throw new Error('ref (messageId or snapshotId) required');
        }
        const diff = this.runtime.diffGitStepSnapshot(sessionId, ref);
        if (!diff) {
            throw new Error(`no git step snapshot found for ${ref}`);
        }
        return diff;
    }

    private async revertGitStepSnapshot(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const messageId = String(params?.messageId || params?.ref || '').trim();
        if (!messageId) {
            throw new Error('messageId required');
        }
        return this.runtime.revertGitStepSnapshot(sessionId, messageId);
    }

    private async unrevertGitStepSnapshot(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.unrevertGitStepSnapshot(sessionId);
    }

    private async exportSession(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const state = await this.sessions.get(sessionId);
        const format = this.resolveExportFormat(params?.format);
        const messages = Array.isArray(state.messages) ? state.messages.slice() : await this.runtime.getMessages(sessionId);
        const toolCalls = this.collectExportToolCalls(messages);
        const exportedAt = Date.now();
        const session = {
            id: sessionId,
            createdAt: state.createdAt ?? null,
            updatedAt: state.updatedAt ?? null,
            summary: state.summary ?? null,
            workspace: state.workspace ?? null,
            projectId: state.projectId ?? null,
            primaryThreadId: state.primaryThreadId ?? null,
            originThreadId: state.originThreadId ?? null,
            sessionRole: state.sessionRole ?? null,
            rootRequest: state.rootRequest ?? null,
            focusSummary: state.focusSummary ?? null,
            threadStatus: state.threadStatus ?? null,
            messageCount: messages.length,
            toolCallCount: toolCalls.length
        };
        return {
            sessionId,
            format,
            exportedAt,
            fileName: this.buildExportFileName(sessionId, exportedAt, format),
            contentType: this.resolveExportContentType(format),
            content: this.serializeSessionExport(format, exportedAt, session, messages, toolCalls),
            session,
            messages,
            toolCalls
        };
    }

    private async setSessionPlanMode(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const enabled = params?.enabled === true;
        this.runtime.setPlanMode(sessionId, enabled);
        return { sessionId, enabled };
    }

    private async getSessionPlanMode(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return { sessionId, enabled: this.runtime.isPlanMode(sessionId) };
    }

    private async setSessionArchetype(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const archetype = params?.archetype ? String(params.archetype) : undefined;
        this.runtime.setSessionArchetype(sessionId, archetype);
        return { sessionId, archetype: this.runtime.getSessionArchetype(sessionId) };
    }

    private async getSessionArchetype(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return {
            sessionId,
            archetype: this.runtime.getSessionArchetype(sessionId),
            available: this.runtime.listArchetypes()
        };
    }

    private async setSessionSandboxMode(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const mode = this.normalizeSandboxMode(params?.mode);
        this.runtime.setSessionSandboxMode(sessionId, mode);
        return { sessionId, mode: mode ?? 'default' };
    }

    private async getSessionSandboxMode(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return { sessionId, mode: this.runtime.getSessionSandboxMode(sessionId) ?? 'default' };
    }

    private async setSessionDelegationMode(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const mode = this.normalizeDelegationModeValue(params?.mode);
        this.runtime.setSessionDelegationMode(sessionId, mode);
        return { sessionId, mode: mode ?? this.runtime.getSessionDelegationMode(sessionId) };
    }

    private async getSessionDelegationMode(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return { sessionId, mode: this.runtime.getSessionDelegationMode(sessionId) };
    }

    private async undoFile(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.undoFileChange(sessionId);
    }

    private async redoFile(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.redoFileChange(sessionId);
    }

    private optionalProfile(value: any): string | undefined {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    private optionalAgent(value: any): import('@tsdi/agent').AgentTurnAgentConfig | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        const agent: import('@tsdi/agent').AgentTurnAgentConfig = {};
        const permissions = (value as any).permissions;
        if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
            const clean: Record<string, 'allow' | 'ask' | 'deny'> = {};
            for (const [toolName, level] of Object.entries(permissions as Record<string, unknown>)) {
                if (level === 'allow' || level === 'ask' || level === 'deny') {
                    clean[toolName] = level;
                }
            }
            if (Object.keys(clean).length > 0) {
                agent.permissions = clean;
            }
        }
        const maxSteps = (value as any).maxSteps;
        if (typeof maxSteps === 'number' && Number.isInteger(maxSteps) && maxSteps > 0) {
            agent.maxSteps = maxSteps;
        }
        const reasoning = (value as any).reasoning;
        if (typeof reasoning === 'boolean') {
            agent.reasoning = reasoning;
        }
        return Object.keys(agent).length > 0 ? agent : undefined;
    }

    private async runTurn(params: any, context: AppRpcRequestContext): Promise<any> {
        const message = this.parseTurnMessage(params?.message);
        const input = this.requireTurnInput(params?.input, message, 'run.turn input');
        const profile = this.optionalProfile(params?.profile);
        const agent = this.optionalAgent(params?.agent);
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : `rpc-${this.uuid.generate()}`;
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        await this.setSessionWorkspace(sessionId);
        const turn = await this.runtime.runTurn(sessionId, input, context.principalId, message, profile, agent);
        const messages = await this.runtime.getMessages(sessionId);
        return {
            sessionId,
            turn,
            message: messages[messages.length - 1] ?? null
        };
    }

    private async answerQuestion(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const questionId = String(params?.questionId || '').trim();
        if (!questionId) throw new AppRpcError(-32602, 'questionId is required');
        const action = params?.action === 'dismiss' ? 'dismiss' : 'answer';
        const answer = typeof params?.answer === 'string' ? params.answer.trim() : '';
        if (action === 'answer' && !answer) throw new AppRpcError(-32602, 'answer is required');
        if (this.questionStore) {
            const outcome = action === 'dismiss'
                ? this.questionStore.dismiss(questionId, sessionId)
                : this.questionStore.answer(questionId, sessionId, answer);
            if (outcome.expired) {
                throw new AppRpcError(-32603, 'Question expired');
            }
            const result = this.toQuestionView(outcome.result);
            if (!outcome.expired && this.onQuestionAnswered) {
                await this.onQuestionAnswered(questionId, sessionId, action === 'answer' ? answer : undefined, action === 'dismiss');
            }
            return { ...result, duplicate: outcome.duplicate };
        }
        const key = `${sessionId}:${questionId}`;
        const existing = this.questionResponses.get(key);
        if (existing) return { ...existing, duplicate: true };
        const result = { questionId, sessionId, status: action === 'answer' ? 'answered' as const : 'dismissed' as const, ...(answer ? { answer } : {}), updatedAt: Date.now() };
        this.questionResponses.set(key, result);
        if (this.onQuestionAnswered) {
            await this.onQuestionAnswered(questionId, sessionId, action === 'answer' ? answer : undefined, action === 'dismiss');
        }
        return { ...result, duplicate: false };
    }

    private async listQuestionResponses(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        if (this.questionStore) {
            return this.questionStore.list(sessionId).map(item => this.toQuestionView(item));
        }
        return Array.from(this.questionResponses.values()).filter(item => item.sessionId === sessionId);
    }

    private toQuestionView(item: any): any {
        return {
            questionId: item.questionId,
            sessionId: item.sessionId,
            status: item.status,
            question: item.question,
            options: item.options,
            context: item.context,
            severity: item.severity,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            expiresAt: item.expiresAt,
            ...(item.answer ? { answer: item.answer } : {})
        };
    }

    private async compactSession(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const reason = typeof params?.reason === 'string' && params.reason.trim()
            ? params.reason.trim()
            : undefined;
        return this.runtime.compactNow(sessionId, reason);
    }

    private async cancelTurn(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        if (!await this.sessions.has(sessionId)) {
            // Idempotent cancel: there is nothing to cancel for an unknown session.
            return { sessionId, cancelled: false, compensated: 0, toolCallIds: [] };
        }
        await this.ensureSessionAccess(sessionId, context);
        const result = await this.runtime.cancelTurn(sessionId);
        return {
            sessionId,
            cancelled: result.cancelled,
            compensated: result.compensated,
            toolCallIds: result.toolCallIds
        };
    }

    private requireCloudTasks(): CloudTaskQueue {
        if (!this.cloudTasks) throw new AppRpcError(-32000, 'Cloud task queue is unavailable.');
        return this.cloudTasks;
    }

    private cloudPrincipal(context: AppRpcRequestContext): string {
        return String(context.principalId || 'anonymous');
    }

    private async submitCloudTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const prompt = typeof params?.prompt === 'string' ? params.prompt.trim() : '';
        if (!prompt) throw new AppRpcError(-32602, 'cloud.task.submit requires prompt.');
        const principalId = this.cloudPrincipal(context);
        const source = this.optionalCloudTaskSource(params?.source) || 'api';
        const externalId = this.optionalCloudTaskExternalId(params?.externalId);
        const existing = externalId ? this.requireCloudTasks().findExternal(principalId, source, externalId) : undefined;
        if (existing) return { task: existing, deduplicated: true };
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : `cloud-${this.uuid.generate()}`;
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        const task = this.requireCloudTasks().submit({
            principalId,
            prompt,
            sessionId,
            profile: this.optionalProfile(params?.profile),
            source,
            externalId,
            metadata: this.optionalCloudTaskMetadata(params?.metadata)
        });
        this.sessionHandler.track(task.sessionId);
        await this.setSessionWorkspace(task.sessionId);
        return { task };
    }

    private optionalCloudTaskSource(value: any): string | undefined {
        if (value === undefined || value === null || value === '') return undefined;
        const source = String(value).trim().toLowerCase();
        if (!/^[a-z][a-z0-9_-]{0,31}$/.test(source)) {
            throw new AppRpcError(-32602, 'cloud task source must be a lowercase identifier up to 32 characters.');
        }
        return source;
    }

    private optionalCloudTaskExternalId(value: any): string | undefined {
        if (value === undefined || value === null || value === '') return undefined;
        const externalId = String(value).trim();
        if (!externalId || externalId.length > 256) {
            throw new AppRpcError(-32602, 'cloud task externalId must be between 1 and 256 characters.');
        }
        return externalId;
    }

    private optionalCloudTaskMetadata(value: any): Record<string, string> | undefined {
        if (value === undefined || value === null) return undefined;
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new AppRpcError(-32602, 'cloud task metadata must be an object.');
        }
        const entries = Object.entries(value);
        if (entries.length > 20) throw new AppRpcError(-32602, 'cloud task metadata supports at most 20 entries.');
        const metadata: Record<string, string> = {};
        for (const [key, entry] of entries) {
            const normalizedKey = String(key).trim();
            const normalizedValue = typeof entry === 'string' ? entry.trim() : '';
            if (!normalizedKey || normalizedKey.length > 64 || !normalizedValue || normalizedValue.length > 512) {
                throw new AppRpcError(-32602, 'cloud task metadata keys and string values exceed allowed bounds.');
            }
            metadata[normalizedKey] = normalizedValue;
        }
        return metadata;
    }

    private listCloudTasks(context: AppRpcRequestContext): any {
        return { tasks: this.requireCloudTasks().list(this.cloudPrincipal(context)) };
    }

    private getCloudTask(params: any, context: AppRpcRequestContext): any {
        const taskId = String(params?.taskId || '').trim();
        if (!taskId) throw new AppRpcError(-32602, 'cloud taskId is required.');
        const task = this.requireCloudTasks().get(taskId, this.cloudPrincipal(context));
        if (!task) throw new AppRpcError(-32004, `Cloud task "${taskId}" was not found.`);
        return { task };
    }

    private async cancelCloudTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const taskId = String(params?.taskId || '').trim();
        if (!taskId) throw new AppRpcError(-32602, 'cloud taskId is required.');
        const task = await this.requireCloudTasks().cancel(taskId, this.cloudPrincipal(context));
        if (!task) throw new AppRpcError(-32004, `Cloud task "${taskId}" was not found.`);
        return { task };
    }

    private applyCloudTask(params: any, context: AppRpcRequestContext): any {
        const taskId = String(params?.taskId || '').trim();
        if (!taskId) throw new AppRpcError(-32602, 'cloud taskId is required.');
        const queue = this.requireCloudTasks();
        const existing = queue.get(taskId, this.cloudPrincipal(context));
        if (!existing) throw new AppRpcError(-32004, `Cloud task "${taskId}" was not found.`);
        if (existing.status !== 'completed') {
            throw new AppRpcError(-32009, `Cloud task "${taskId}" is ${existing.status}, not completed.`);
        }
        return { task: queue.apply(taskId, this.cloudPrincipal(context)) };
    }

    private async listApprovals(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.approvalManager) {
            return { sessionId: null, requests: [] };
        }
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const requests = this.approvalManager.getPending();
        const scoped = sessionId
            ? requests.filter(request => request.sessionId === sessionId)
            : requests;
        if (!context.principalId) {
            return { sessionId: sessionId ?? null, requests: scoped };
        }
        const sessionIds = Array.from(new Set(scoped.map(request => request.sessionId)));
        const ownedIds = await this.owners.listOwned(sessionIds, context.principalId);
        const owned = new Set(ownedIds);
        return {
            sessionId: sessionId ?? null,
            requests: scoped.filter(request => owned.has(request.sessionId))
        };
    }

    private async decideApproval(params: any, context: AppRpcRequestContext, approve: boolean): Promise<any> {
        const requestId = this.requireString(params?.requestId ?? params?.id, 'requestId');
        if (!this.approvalManager) {
            throw new AppRpcError(-32004, 'Approval is not configured');
        }
        const pending = this.approvalManager.getPending().find(request => request.id === requestId);
        if (!pending) {
            return { requestId, applied: false };
        }
        await this.ensureSessionAccess(pending.sessionId, context);
        const applied = approve
            ? this.approvalManager.approve(requestId)
            : this.approvalManager.reject(requestId);
        return {
            requestId,
            sessionId: pending.sessionId,
            applied,
            decision: approve ? 'approved' : 'denied'
        };
    }

    private async *streamTurn(request: AppRpcRequest, context: AppRpcRequestContext): AsyncGenerator<AppRpcTransportMessage, void, void> {        const params = request.params ?? {};
        const message = this.parseTurnMessage(params?.message);
        const input = this.requireTurnInput(params?.input, message, 'run.turn_stream input');
        const profile = this.optionalProfile(params?.profile);
        const agent = this.optionalAgent(params?.agent);
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : `rpc-${this.uuid.generate()}`;
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        this.sessionHandler.track(sessionId);
        await this.setSessionWorkspace(sessionId);
        yield {
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: request.id ?? null,
                sessionId,
                chunkType: 'event',
                eventType: 'turn_started',
                label: 'state',
                status: 'running',
                content: 'Analyzing request'
            }
        };

        const pendingEvents: GatewayEventRecord[] = [];
        const unsubscribe = this.events.subscribe(sessionId, record => {
            if (record.type !== 'turn_started') {
                pendingEvents.push(record);
            }
        });

        try {
            for await (const chunk of this.runtime.runStreamingTurn(sessionId, input, context.principalId, message, profile, agent)) {
                yield* this.flushPendingStreamEvents(request.id ?? null, sessionId, pendingEvents);
                if (chunk.type === 'done') {
                    continue;
                }
                yield {
                    jsonrpc: '2.0',
                    method: 'run.turn_stream.chunk',
                    params: {
                        requestId: request.id ?? null,
                        sessionId,
                        chunkType: chunk.type,
                        content: chunk.content,
                        ...(chunk.toolCalls !== undefined ? { toolCalls: chunk.toolCalls } : {}),
                        ...(chunk.usage !== undefined ? { usage: chunk.usage } : {})
                    }
                };
            }
            yield* this.flushPendingStreamEvents(request.id ?? null, sessionId, pendingEvents);
        } catch (error) {
            if (error instanceof AgentTurnCancelledError) {
                yield* this.flushPendingStreamEvents(request.id ?? null, sessionId, pendingEvents);
                if (request.id !== undefined) {
                    yield {
                        jsonrpc: '2.0',
                        id: request.id,
                        result: {
                            sessionId,
                            cancelled: true
                        }
                    };
                }
                return;
            }
            throw error;
        } finally {
            unsubscribe();
        }

        if (request.id === undefined) {
            return;
        }
        const messages = await this.runtime.getMessages(sessionId);
        yield {
            jsonrpc: '2.0',
            id: request.id ?? null,
            result: {
                sessionId,
                message: messages[messages.length - 1] ?? null
            }
        };
    }

    private async *flushPendingStreamEvents(
        requestId: string | number | null,
        sessionId: string,
        pendingEvents: GatewayEventRecord[]
    ): AsyncGenerator<AppRpcTransportMessage, void, void> {
        while (pendingEvents.length) {
            const record = pendingEvents.shift();
            if (!record) {
                continue;
            }
            const payload = this.toStreamEventChunk(requestId, sessionId, record);
            if (payload) {
                yield payload;
            }
        }
    }

    private toStreamEventChunk(
        requestId: string | number | null,
        sessionId: string,
        record: GatewayEventRecord
    ): AppRpcTransportMessage | null {
        const event = this.describeStreamEvent(record);
        if (!event) {
            return null;
        }
        const data = record.data || {};
        return {
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId,
                sessionId,
                chunkType: 'event',
                eventType: event.eventType,
                label: event.label,
                status: event.status,
                content: event.content,
                ...(event.toolName ? { toolName: event.toolName } : {}),
                ...(event.toolCallId ? { toolCallId: event.toolCallId } : {}),
                ...(event.approvalId ? { approvalId: event.approvalId } : {}),
                ...(data.report ? { report: data.report } : {}),
                ...(data.diagnostics ? { diagnostics: data.diagnostics } : {}),
                ...(data.compensated ? { compensated: data.compensated } : {})
            }
        };
    }

    private describeStreamEvent(record: GatewayEventRecord): {
        eventType: string;
        label: string;
        status: 'running' | 'success' | 'failed' | 'error';
        content: string;
        toolName?: string;
        toolCallId?: string;
        approvalId?: string;
    } | null {
        const data = record.data || {};
        switch (record.type) {
            case 'turn_started':
                return {
                    eventType: 'turn_started',
                    label: 'state',
                    status: 'running',
                    content: 'Analyzing request'
                };
            case 'tool_invoked':
                return {
                    eventType: 'tool_invoked',
                    label: 'tool',
                    status: 'running',
                    toolName: String(data.toolName || ''),
                    toolCallId: String(data?.receipt?.toolCallId || ''),
                    content: this.describeToolInvocationEvent(data)
                };
            case 'tool_completed':
                return {
                    eventType: 'tool_completed',
                    label: 'tool',
                    status: 'success',
                    toolName: String(data.toolName || ''),
                    toolCallId: String(data?.receipt?.toolCallId || ''),
                    content: this.describeToolCompletedEvent(data)
                };
            case 'tool_failed':
                return {
                    eventType: 'tool_failed',
                    label: 'tool',
                    status: 'error',
                    toolName: String(data.toolName || ''),
                    toolCallId: String(data?.receipt?.toolCallId || ''),
                    content: `${data.toolName || 'tool'} failed${data.error ? `: ${data.error}` : ''}`
                };
            case 'tool_skipped':
                return {
                    eventType: 'tool_skipped',
                    label: 'tool',
                    status: 'failed',
                    toolName: String(data.toolName || ''),
                    toolCallId: String(data?.receipt?.toolCallId || ''),
                    content: `${data.toolName || 'tool'} skipped${data.reason ? `: ${data.reason}` : ''}`
                };
            case 'error':
                return {
                    eventType: 'error',
                    label: 'error',
                    status: 'error',
                    content: String(data.error || 'Unknown error')
                };
            case 'turn_cancelled':
                return {
                    eventType: 'turn_cancelled',
                    label: 'state',
                    status: 'failed',
                    content: 'Turn cancelled'
                };
            case 'turn_completed':
                return {
                    eventType: 'turn_completed',
                    label: 'state',
                    status: 'success',
                    content: 'Turn completed'
                };
            case 'background_task_started':
                return {
                    eventType: 'background_task_started',
                    label: 'tool',
                    status: 'running',
                    content: `Background task ${String(data?.taskId || '')} started${data?.goal ? `: ${String(data.goal).slice(0, 120)}` : ''}`
                };
            case 'background_task_completed':
                return {
                    eventType: 'background_task_completed',
                    label: 'tool',
                    status: 'success',
                    content: `Background task ${String(data?.taskId || '')} completed${data?.summary ? `: ${String(data.summary).slice(0, 120)}` : ''}`
                };
            case 'background_task_failed':
                return {
                    eventType: 'background_task_failed',
                    label: 'tool',
                    status: 'error',
                    content: `Background task ${String(data?.taskId || '')} failed: ${String(data?.error || 'unknown error')}`
                };
            case 'approval_requested':
                return {
                    eventType: 'approval_requested',
                    label: 'approval',
                    status: 'running',
                    toolName: String(data?.request?.toolName || ''),
                    approvalId: String(data?.request?.id || ''),
                    content: data?.request?.summary
                        ? `Approval required for ${data.request.toolName}: ${data.request.summary}`
                        : `Approval required for ${data?.request?.toolName || 'tool'}`
                };
            case 'approval_completed':
                return {
                    eventType: 'approval_completed',
                    label: 'approval',
                    status: data?.approved === true ? 'success' : 'failed',
                    toolName: String(data?.request?.toolName || ''),
                    content: `${data?.request?.toolName || 'tool'} ${data?.approved === true ? 'approved' : 'denied'}`
                };
            case 'approval_failed':
                return {
                    eventType: 'approval_failed',
                    label: 'approval',
                    status: 'error',
                    toolName: String(data?.request?.toolName || ''),
                    content: `${data?.request?.toolName || 'tool'} approval failed: ${data?.error || 'unknown error'}`
                };
            case 'compensation':
                return {
                    eventType: 'compensation',
                    label: 'rollback',
                    status: 'success',
                    content: `Rolled back ${Number(data?.compensated || 0)} side-effecting tool call${Number(data?.compensated || 0) === 1 ? '' : 's'}`
                };
            case 'context_prepared':
                return {
                    eventType: 'context_prepared',
                    label: 'model',
                    status: 'success',
                    content: this.describeContextPreparedEvent(data)
                };
            case 'turn_diagnostics':
                return {
                    eventType: 'turn_diagnostics',
                    label: 'state',
                    status: 'success',
                    content: this.describeTurnDiagnosticsEvent(data)
                };
            default:
                return null;
        }
    }

    private describeContextPreparedEvent(data: any): string {
        const report = data?.report || {};
        const strategy = String(report.strategy || 'unchanged');
        const before = Number(report.beforeTokens ?? 0);
        const after = Number(report.afterTokens ?? 0);
        const savings = Number(report.compressionRatio ?? 0);
        if (strategy === 'unchanged' && !before && !after) {
            return 'Context unchanged';
        }
        if (strategy === 'unchanged') {
            return `Context unchanged (${before} tokens)`;
        }
        return `Context ${strategy}: ${before}→${after} tokens (${savings}% saved)`;
    }

    private describeTurnDiagnosticsEvent(data: any): string {
        const diagnostics = data?.diagnostics || {};
        const compactionCount = Number(diagnostics.compactionCount ?? 0);
        const totalSavings = Number(diagnostics.totalTokenSavings ?? 0);
        const parts: string[] = [];
        if (compactionCount || totalSavings) {
            parts.push(`${compactionCount} compaction${compactionCount === 1 ? '' : 's'}, ${totalSavings} tokens saved`);
        }
        const promptCache = diagnostics.promptCache;
        if (promptCache) {
            const support = String(promptCache.supported || 'none');
            const applied = promptCache.applied ? 'applied' : 'not applied';
            const cachedTokens = promptCache.observedCachedPromptTokens ?? 0;
            parts.push(`prompt cache ${support} (${applied}${cachedTokens ? `, ${cachedTokens} cached tokens` : ''})`);
        }
        if (!parts.length) {
            return 'Turn diagnostics: no compaction or prompt cache activity';
        }
        return `Turn diagnostics: ${parts.join('; ')}`;
    }

    private describeToolInvocationEvent(data: any): string {
        const toolName = String(data?.toolName || 'tool');
        const summary = this.summarizeToolEventDetail(toolName, data?.receipt?.inputSummary ?? data?.inputSummary, 'input');
        return summary ? `${toolName} · ${summary}` : toolName;
    }

    private describeToolCompletedEvent(data: any): string {
        const toolName = String(data?.toolName || 'tool');
        const outputSummary = this.summarizeToolEventDetail(toolName, data?.receipt?.outputSummary, 'output');
        return outputSummary ? `${toolName} · ${outputSummary}` : `${toolName} completed`;
    }

    private summarizeToolEventDetail(toolName: string, summary: unknown, phase: 'input' | 'output'): string {
        const text = String(summary || '').trim();
        if (!text || text === '{}' || text === '[]') {
            return '';
        }
        const payload = this.parseToolSummary(text);
        if (!payload) {
            return text;
        }

        const pathSummary = this.pickPathSummary(payload);
        if (pathSummary) {
            if (toolName === 'read_file' && phase === 'output' && payload.truncated === true) {
                return `${pathSummary} (truncated)`;
            }
            return pathSummary;
        }

        if (toolName === 'location') {
            const label = this.pickString(payload.label)
                || [this.pickString(payload.city), this.pickString(payload.region), this.pickString(payload.countryCode) || this.pickString(payload.country)]
                    .filter(Boolean)
                    .join(', ');
            return label || '';
        }

        if (toolName === 'weather') {
            const location = this.pickString(payload.location) || this.pickString(payload.label);
            const temperature = typeof payload.temperature === 'number' ? payload.temperature : undefined;
            const description = this.pickString(payload.description);
            const unit = payload.units === 'imperial' ? 'F' : 'C';
            return [location, temperature !== undefined ? `${temperature}°${unit}` : '', description].filter(Boolean).join(' ');
        }

        const url = this.pickString(payload.url) || this.pickString(payload.href);
        if (url) {
            return url;
        }

        const location = this.pickString(payload.location) || this.pickString(payload.label) || this.pickString(payload.name);
        if (location) {
            return location;
        }

        return text;
    }

    private parseToolSummary(text: string): Record<string, any> | undefined {
        try {
            const payload = JSON.parse(text);
            return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : undefined;
        } catch {
            return undefined;
        }
    }

    private pickPathSummary(payload: Record<string, any>): string {
        const single = this.pickString(payload.path)
            || this.pickString(payload.file)
            || this.pickString(payload.filePath)
            || this.pickString(payload.dir)
            || this.pickString(payload.directory)
            || this.pickString(payload.from)
            || this.pickString(payload.to);
        if (single) {
            return single;
        }
        if (Array.isArray(payload.paths)) {
            const values = payload.paths.map((value: unknown) => this.pickString(value)).filter(Boolean);
            if (values.length) {
                return values.join(', ');
            }
        }
        return '';
    }

    private pickString(value: unknown): string {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    private async activateTool(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const name = this.requireString(params?.name, 'tools.activate name');
        await this.ensureSessionAccess(sessionId, context);
        const activated = await this.tools.activateTool(sessionId, name);
        return { sessionId, name, activated };
    }

    private async invokeTool(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const name = this.requireString(params?.name, 'tools.invoke name');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.tools.invoke(name, params?.input, sessionId, context.principalId);
        return { sessionId, name, output };
    }

    private listModelProfiles(): any[] {
        const profiles = this.options.model?.profiles || {};
        const current = String(this.options.model?.defaultProfile || '').trim();
        if (!Object.keys(profiles).length) {
            return defaultAgentProviderRegistry.list().flatMap(provider => provider.models.map(model => ({
                name: `${provider.id}/${model.id}`,
                selected: this.options.model?.provider === provider.id && this.options.model?.model === model.id,
                provider: provider.id, model: model.id, baseUrl: provider.baseUrl || '',
                capabilities: defaultAgentProviderRegistry.resolveModel(provider.id, model.id).capabilities,
                catalog: true
            })));
        }
        return Object.entries(profiles)
            .filter(([, profile]) => !!profile)
            .map(([name, profile]) => ({
                name,
                selected: current === name,
                provider: profile?.provider || this.options.model?.provider || '',
                model: profile?.model || this.options.model?.model || '',
                baseUrl: profile?.baseUrl || this.options.model?.baseUrl || '',
                reasoning: profile?.reasoning,
                thinkingBudget: profile?.thinkingBudget
            }))
            .sort((left, right) => left.name.localeCompare(right.name));
    }

    private async activateModelProfile(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
            this.sessionHandler.track(sessionId);
        }
        const name = this.requireString(params?.name, 'model.activate name');
        const reasoningEffort = typeof params?.reasoningEffort === 'string' ? params.reasoningEffort : undefined;
        if (reasoningEffort !== undefined && reasoningEffort !== 'low' && reasoningEffort !== 'medium' && reasoningEffort !== 'high') {
            throw new AppRpcError(-32602, `Invalid params: reasoningEffort must be 'low', 'medium' or 'high'`);
        }
        const profiles = this.options.model?.profiles || {};
        const profile = profiles[name];
        if (!profile) {
            const separator = name.indexOf('/');
            const providerId = separator > 0 ? name.slice(0, separator) : '';
            const modelId = separator > 0 ? name.slice(separator + 1) : '';
            const provider = defaultAgentProviderRegistry.get(providerId);
            if (!provider || !provider.models.some(model => model.id === modelId)) {
                throw new AppRpcError(-32602, `Invalid params: unknown model profile '${name}'`);
            }
            this.options.model = {
                ...(this.options.model || {}), provider: provider.id, model: modelId,
                baseUrl: provider.baseUrl, apiKeyEnv: provider.apiKeyEnv, defaultProfile: undefined,
                ...(reasoningEffort !== undefined ? { reasoningEffort } : {})
            };
            return { sessionId: sessionId || null, modelProfile: name, provider: provider.id, model: modelId, catalog: true, reasoningEffort: this.options.model.reasoningEffort };
        }
        this.options.model = this.options.model || {};
        this.options.model.defaultProfile = name;
        if (reasoningEffort !== undefined) {
            this.options.model.reasoningEffort = reasoningEffort;
        }
        return {
            sessionId: sessionId || null,
            modelProfile: name,
            provider: profile.provider || this.options.model.provider || '',
            model: profile.model || this.options.model.model || '',
            reasoningEffort: this.options.model.reasoningEffort
        };
    }

    private async listMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.optionalSessionId(params);
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
            return this.memory.getAll(sessionId);
        }
        const allIds = await this.sessions.listSessionIds();
        const ids = context.principalId
            ? await this.owners.listOwned(allIds, context.principalId)
            : allIds;
        const records = await Promise.all(ids.map(id => this.memory.getAll(id)));
        return records.flat();
    }

    private async putMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const key = this.requireString(params?.key, 'memory.put key');
        const value = this.requireString(params?.value, 'memory.put value');
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        return this.runtime.putMemory(sessionId, key, value, 'session');
    }

    private async searchMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const query = this.requireString(params?.query, 'memory.search query');
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.searchMemory(sessionId, query);
    }

    private async listProjectMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const projectId = await this.resolveProjectMemoryId(params, context);
        return this.projectMemory ? this.projectMemory.list(projectId) : [];
    }

    private async addProjectMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const projectId = await this.resolveProjectMemoryId(params, context);
        if (!this.projectMemory) throw new AppRpcError(-32601, 'Project memory is unavailable');
        return this.projectMemory.add({
            projectId,
            key: this.requireString(params?.key, 'project_memory.add key'),
            value: this.requireString(params?.value, 'project_memory.add value'),
            ttlMs: params?.ttlMs == null ? undefined : Number(params.ttlMs),
            conflict: params?.conflict
        });
    }

    private async removeProjectMemory(params: any, context: AppRpcRequestContext): Promise<any> {
        const projectId = await this.resolveProjectMemoryId(params, context);
        if (!this.projectMemory) return { removed: 0 };
        return { removed: await this.projectMemory.remove(projectId, this.requireString(params?.target, 'project_memory.remove target')) };
    }

    private async resolveProjectMemoryId(params: any, context: AppRpcRequestContext): Promise<string> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const state = await this.sessions.get(sessionId);
        const projectId = String(state.projectId || state.workspace || '').trim();
        if (!projectId) throw new AppRpcError(-32602, 'Project memory requires a session project or workspace');
        return projectId;
    }

    private async getEventHistory(sessionId: string, context: AppRpcRequestContext): Promise<any> {
        await this.ensureSessionAccess(sessionId, context);
        return this.events.getHistory(sessionId);
    }

    private async queryTimeline(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        if (!this.timeline) {
            return { sessionId, entries: [], hasMore: false };
        }
        const cursor = typeof params?.cursor === 'string' && params.cursor.trim() ? params.cursor.trim() : undefined;
        const limit = typeof params?.limit === 'number' ? params.limit : undefined;
        const page = await this.timeline.query(sessionId, { cursor, limit });
        return {
            sessionId,
            entries: page.entries,
            ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
            hasMore: page.hasMore
        };
    }

    private async replayTimeline(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        if (!this.timeline) {
            return { sessionId, events: [] };
        }
        const sinceSeqRaw = Number(params?.sinceSeq);
        const sinceSeq = Number.isFinite(sinceSeqRaw) ? sinceSeqRaw : undefined;
        const events = await this.timeline.replay(sessionId, sinceSeq);
        return { sessionId, sinceSeq: sinceSeq ?? -1, events };
    }

    private async listAudit(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const toolName = typeof params?.toolName === 'string' && params.toolName.trim() ? params.toolName.trim() : undefined;
        const status = typeof params?.status === 'string' && params.status.trim() ? params.status.trim() : undefined;
        const records = await this.audit?.list(sessionId) ?? [];
        return {
            sessionId,
            records: records.filter(record => {
                if (toolName && record.toolName !== toolName) {
                    return false;
                }
                if (status && record.status !== status) {
                    return false;
                }
                return true;
            }).map(record => ({
                id: record.id,
                sessionId: record.sessionId,
                toolName: record.toolName,
                toolCallId: record.toolCallId,
                status: record.status,
                inputSummary: record.inputSummary ?? null,
                outputSummary: record.outputSummary ?? null,
                error: record.error ?? null,
                durationMs: record.durationMs ?? null,
                attemptCount: record.attemptCount ?? null,
                principalId: record.principalId ?? null,
                createdAt: record.createdAt,
                metadata: record.metadata ?? null
            }))
        };
    }

    private async listSummaryQuality(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.summaryQuality) {
            return { records: [] };
        }
        const provider = typeof params?.provider === 'string' && params.provider.trim()
            ? params.provider.trim()
            : undefined;
        const model = typeof params?.model === 'string' && params.model.trim()
            ? params.model.trim()
            : undefined;
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(0, Math.floor(limitRaw)), 200) : 200;
        const records = await this.summaryQuality.list({ provider, model, limit });
        return {
            records: records.map(record => ({
                id: record.id,
                provider: record.provider,
                model: record.model ?? null,
                total: record.total,
                fieldCompleteness: record.fieldCompleteness,
                annotationQuality: record.annotationQuality,
                lengthBalance: record.lengthBalance,
                truncationScore: record.truncationScore,
                fallbackUsed: record.fallbackUsed,
                summaryLength: record.summaryLength,
                evidenceCoverage: record.evidenceCoverage ?? null,
                createdAt: record.createdAt
            }))
        };
    }

    private async getSummaryQualityStats(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.summaryQuality) {
            return { aggregates: [] };
        }
        const provider = typeof params?.provider === 'string' && params.provider.trim()
            ? params.provider.trim()
            : undefined;
        const model = typeof params?.model === 'string' && params.model.trim()
            ? params.model.trim()
            : undefined;
        const aggregates = await this.summaryQuality.aggregate(provider, model);
        return { aggregates };
    }

    private async getSummaryQualityTrend(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.summaryQuality) {
            return { trend: [] };
        }
        const provider = typeof params?.provider === 'string' && params.provider.trim()
            ? params.provider.trim()
            : undefined;
        const model = typeof params?.model === 'string' && params.model.trim()
            ? params.model.trim()
            : undefined;
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(0, Math.floor(limitRaw)), 500) : 500;
        const bucketSizeRaw = Number(params?.bucketSize);
        const bucketSize = Number.isFinite(bucketSizeRaw) && bucketSizeRaw > 0 ? bucketSizeRaw : undefined;
        const maxBucketsRaw = Number(params?.maxBuckets);
        const maxBuckets = Number.isFinite(maxBucketsRaw) ? Math.min(Math.max(1, Math.floor(maxBucketsRaw)), 90) : undefined;
        const records = await this.summaryQuality.list({ provider, model, limit });
        const trend = buildSummaryQualityTrend(records, { provider, model, bucketSize, maxBuckets });
        return {
            trend: trend.map(point => ({
                provider: point.provider,
                bucketStart: point.bucketStart,
                recordCount: point.recordCount,
                avgTotal: point.avgTotal,
                minTotal: point.minTotal,
                maxTotal: point.maxTotal,
                avgFieldCompleteness: point.avgFieldCompleteness,
                avgAnnotationQuality: point.avgAnnotationQuality,
                avgLengthBalance: point.avgLengthBalance,
                avgTruncationScore: point.avgTruncationScore,
                fallbackRate: point.fallbackRate,
                avgEvidenceCoverage: point.avgEvidenceCoverage
            }))
        };
    }

    private async getUsageStats(params: any, context: AppRpcRequestContext): Promise<any> {
        const range = this.resolveUsageRange(params?.range);
        const since = this.resolveUsageSince(params?.since);
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        let sessionIds: string[];
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
            sessionIds = [sessionId];
        } else {
            const allSessionIds = await this.sessions.listSessionIds();
            sessionIds = context.principalId
                ? await this.owners.listOwned(allSessionIds, context.principalId)
                : allSessionIds;
        }
        const budgets: Record<string, any> = {};
        for (const scopedId of sessionIds) {
            try {
                budgets[scopedId] = await this.runtime.getTokenBudgetState(scopedId);
            } catch {
                budgets[scopedId] = [];
            }
        }
        const usage = await summarizeUsageForSessions(this.sessions, sessionIds, this.turnDiagnostics, { since });
        return {
            usage,
            ...(range ? { range, selected: usage[range] } : {}),
            ...(since ? { since } : {}),
            budgets
        };
    }

    private resolveUsageRange(value: unknown): 'daily' | 'weekly' | 'cumulative' | undefined {
        if (value == null || value === '') return undefined;
        if (value === 'daily' || value === 'weekly' || value === 'cumulative') return value;
        throw new AppRpcError(-32602, "usage.stats range must be 'daily', 'weekly', or 'cumulative'.");
    }

    private resolveUsageSince(value: unknown): number | undefined {
        if (value == null || value === '') return undefined;
        const parsed = typeof value === 'number' ? value : /^\d+$/.test(String(value)) ? Number(value) : Date.parse(String(value));
        if (!Number.isFinite(parsed) || parsed < 0) throw new AppRpcError(-32602, 'usage.stats since must be an epoch millisecond value or ISO date.');
        return parsed;
    }

    private async listCompactionHistory(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.compactionHistory) {
            return { records: [] };
        }
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const levelRaw = typeof params?.level === 'string' && params.level.trim()
            ? params.level.trim()
            : undefined;
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(0, Math.floor(limitRaw)), 200) : 200;
        const records = await this.compactionHistory.list(sessionId, { limit });
        return {
            records: records
                .filter(record => !levelRaw || record.level === levelRaw)
                .map(record => ({
                    id: record.id,
                    sessionId: record.sessionId,
                    strategy: record.strategy,
                    compactionTriggered: record.compactionTriggered,
                    level: record.level,
                    summaryInserted: record.summaryInserted,
                    beforeMessageCount: record.beforeMessageCount,
                    afterMessageCount: record.afterMessageCount,
                    beforeTokens: record.beforeTokens,
                    afterTokens: record.afterTokens,
                    compactedMessageCount: record.compactedMessageCount,
                    preservedAnchorCount: record.preservedAnchorCount,
                    recentMessageCount: record.recentMessageCount,
                    prunedMessageCount: record.prunedMessageCount,
                    toolMessagesCompacted: record.toolMessagesCompacted,
                    compressionRatio: record.compressionRatio,
                    cumulativeTokenSavings: record.cumulativeTokenSavings,
                    replayed: record.replayed,
                    replayKind: record.replayKind ?? null,
                    createdAt: record.createdAt,
                    metadata: record.metadata ?? null
                }))
        };
    }

    private async getCompactionHistoryStats(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.compactionHistory) {
            return { aggregates: [] };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const aggregates = await this.compactionHistory.aggregate(sessionId);
        return {
            aggregates: aggregates.map(aggregate => ({
                sessionId: aggregate.sessionId,
                recordCount: aggregate.recordCount,
                compactedCount: aggregate.compactedCount,
                prunedCount: aggregate.prunedCount,
                avgCompressionRatio: aggregate.avgCompressionRatio,
                totalTokensBefore: aggregate.totalTokensBefore,
                totalTokensAfter: aggregate.totalTokensAfter,
                totalTokensSaved: aggregate.totalTokensSaved,
                timeRange: aggregate.timeRange ?? null
            }))
        };
    }

    private async getCompactionHistoryTrend(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.compactionHistory) {
            return { trend: [] };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const bucketSizeRaw = Number(params?.bucketSize);
        const bucketSize = Number.isFinite(bucketSizeRaw) && bucketSizeRaw > 0 ? bucketSizeRaw : undefined;
        const maxBucketsRaw = Number(params?.maxBuckets);
        const maxBuckets = Number.isFinite(maxBucketsRaw) ? Math.min(Math.max(1, Math.floor(maxBucketsRaw)), 90) : undefined;
        const trend = await this.compactionHistory.trend(sessionId, { bucketSize, maxBuckets });
        return {
            trend: trend.map(point => ({
                sessionId: point.sessionId,
                bucketStart: point.bucketStart,
                recordCount: point.recordCount,
                compactedCount: point.compactedCount,
                prunedCount: point.prunedCount,
                avgCompressionRatio: point.avgCompressionRatio,
                totalTokensBefore: point.totalTokensBefore,
                totalTokensAfter: point.totalTokensAfter,
                totalTokensSaved: point.totalTokensSaved
            }))
        };
    }

    private async listTurnDiagnostics(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.turnDiagnostics) {
            return { records: [] };
        }
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(0, Math.floor(limitRaw)), 200) : 200;
        const records = await this.turnDiagnostics.list(sessionId, { limit });
        return {
            records: records.map(record => ({
                id: record.id,
                sessionId: record.sessionId,
                createdAt: record.createdAt,
                emptyResponseRetryCount: record.emptyResponseRetryCount,
                followUpRecoveryCount: record.followUpRecoveryCount,
                followUpContextRewritten: record.followUpContextRewritten,
                finalAssistantWasClarification: record.finalAssistantWasClarification,
                repeatedClarificationDetected: record.repeatedClarificationDetected,
                compactionCount: record.compactionCount,
                totalTokenSavings: record.totalTokenSavings,
                compressionRatio: record.compressionRatio ?? null,
                compactionLevel: record.compactionLevel ?? null,
                promptCache: record.promptCache ?? null
            }))
        };
    }

    private async getTurnDiagnosticsStats(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.turnDiagnostics) {
            return { aggregate: null };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
            return { aggregate: await this.turnDiagnostics.aggregate([sessionId]) };
        }
        const all = await this.turnDiagnostics.list();
        const sessionIds = [...new Set(all.map(record => record.sessionId))];
        const owned = await this.owners.listOwned(sessionIds, context.principalId);
        return { aggregate: await this.turnDiagnostics.aggregate(owned) };
    }

    private async getTurnDiagnosticsTrend(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.turnDiagnostics) {
            return { trend: [] };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        const bucketSizeRaw = Number(params?.bucketSize);
        const bucketSize = Number.isFinite(bucketSizeRaw) && bucketSizeRaw > 0 ? bucketSizeRaw : undefined;
        const maxBucketsRaw = Number(params?.maxBuckets);
        const maxBuckets = Number.isFinite(maxBucketsRaw) && maxBucketsRaw > 0 ? Math.min(Math.floor(maxBucketsRaw), 90) : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
            const trend = await this.turnDiagnostics.trend([sessionId], { bucketSize, maxBuckets });
            return { trend: trend.map(point => this.toTurnDiagnosticsTrendView(point)) };
        }
        const all = await this.turnDiagnostics.list();
        const sessionIds = [...new Set(all.map(record => record.sessionId))];
        const owned = await this.owners.listOwned(sessionIds, context.principalId);
        const trend = await this.turnDiagnostics.trend(owned, { bucketSize, maxBuckets });
        return { trend: trend.map(point => this.toTurnDiagnosticsTrendView(point)) };
    }

    private async getAudioStatus(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.audio) {
            return { available: false, missing: ['streaming STT adapter', 'streaming TTS adapter'], active: false };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const state = sessionId ? this.audioStatesBySession.get(sessionId) : undefined;
        return {
            available: this.audio.isAvailable,
            missing: this.audio.missingComponents,
            active: state?.active ?? false,
            processing: state?.processing ?? false,
            bufferedBytes: state?.bufferedBytes ?? 0
        };
    }

    private async startAudioSession(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        if (!this.audio) {
            return { sessionId, ok: false, error: 'audio unavailable: missing streaming STT and TTS adapters' };
        }
        const state = this.audioStatesBySession.get(sessionId) ?? this.audio.createSessionState();
        const format = typeof params?.format === 'string' ? params.format : undefined;
        if (format && !['pcm16k', 'wav', 'webm'].includes(format)) {
            throw new AppRpcError(-32602, `Invalid params: unsupported audio format '${format}'`);
        }
        const result = this.audio.startSession(state, format);
        if (result.ok) {
            this.audioStatesBySession.set(sessionId, state);
        }
        return { sessionId, ...result, available: this.audio.isAvailable };
    }

    private async feedAudioChunk(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const state = this.audioStatesBySession.get(sessionId);
        if (!state) {
            return { sessionId, ok: false, error: 'no active audio session; call audio.start first' };
        }
        const chunk = this.requireAudioChunk(params?.chunk);
        const accepted = this.audio?.feedAudio(state, chunk, {}, sessionId) ?? false;
        return { sessionId, ok: accepted, bufferedBytes: state.bufferedBytes };
    }

    private async endAudioSession(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const state = this.audioStatesBySession.get(sessionId);
        if (!state) {
            return { sessionId, ok: false, error: 'no active audio session; call audio.start first' };
        }
        let transcribed: string | undefined;
        let reply: string | undefined;
        let error: string | undefined;
        const audioChunks: string[] = [];
        let audioBytes = 0;
        let audioTruncated = false;
        await this.audio?.endSession(state, {
            onTranscribed: text => { transcribed = text; },
            onReply: text => { reply = text; },
            onAudioChunk: chunk => {
                if (audioBytes + chunk.byteLength > this.audio!.maxResponseAudioBytes) {
                    audioTruncated = true;
                    return;
                }
                audioBytes += chunk.byteLength;
                audioChunks.push(Buffer.from(chunk).toString('base64'));
            },
            onError: err => { error = err.message; }
        }, sessionId);
        this.audioStatesBySession.delete(sessionId);
        return {
            sessionId,
            ok: !error,
            transcribed,
            reply,
            error,
            audio: audioChunks.length || audioTruncated ? {
                format: this.audio?.outputFormat,
                chunks: audioChunks,
                totalBytes: audioBytes,
                truncated: audioTruncated
            } : undefined
        };
    }

    private async cancelAudioSession(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const state = this.audioStatesBySession.get(sessionId);
        if (state) {
            await this.audio?.cancelSession(state);
            this.audioStatesBySession.delete(sessionId);
        }
        return { sessionId, ok: true, cancelled: !!state };
    }

    private requireAudioChunk(value: unknown): Uint8Array {
        if (typeof value !== 'string' || !value) {
            throw new AppRpcError(-32602, 'Invalid params: chunk must be a non-empty base64 string');
        }
        return Buffer.from(value, 'base64');
    }

    private async runHarnessAudit(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.weaknessMiner) {
            return { report: null };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
            const report = await this.weaknessMiner.mine({ sessionIds: [sessionId], topN: this.parseTopN(params?.topN), failureRateThreshold: this.parseThreshold(params?.failureRateThreshold), minFailures: this.parseMinFailures(params?.minFailures) });
            return { report, ...(params?.includeDraft ? { agentsRuleDraft: buildAgentsRuleDraft(report) } : {}) };
        }
        const all = await this.turnDiagnostics?.list() ?? [];
        const sessionIds = [...new Set(all.map(record => record.sessionId))];
        const owned = await this.owners.listOwned(sessionIds, context.principalId);
        const since = Number.isFinite(Number(params?.since)) ? Number(params.since) : undefined;
        const report = await this.weaknessMiner.mine({
            sessionIds: owned.length > 0 ? owned : undefined,
            since,
            topN: this.parseTopN(params?.topN),
            failureRateThreshold: this.parseThreshold(params?.failureRateThreshold),
            minFailures: this.parseMinFailures(params?.minFailures)
        });
        return { report, ...(params?.includeDraft ? { agentsRuleDraft: buildAgentsRuleDraft(report) } : {}) };
    }

    private async listRejectedActions(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        if (!this.turnDiagnostics) {
            return { actions: [] };
        }
        const records = await this.turnDiagnostics.list(sessionId, { limit: 50 });
        const actions = records
            .flatMap(record => (record.evidence?.entries ?? [])
                .filter(entry => entry.falsified === true)
                .map(entry => ({
                    evidenceId: entry.id,
                    turnId: record.id,
                    toolName: entry.toolName,
                    inputSummary: entry.inputSummary ?? '',
                    falsificationReason: entry.falsificationReason ?? '',
                    createdAt: entry.createdAt ?? record.createdAt
                })))
            .sort((left, right) => right.createdAt - left.createdAt)
            .slice(0, 10);
        return { actions };
    }

    private async retryRejectedAction(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const evidenceId = String(params?.evidenceId || '').trim();
        const toolName = String(params?.toolName || '').trim();
        if (!toolName) {
            throw new AppRpcError(-32602, 'toolName required');
        }
        if (!this.turnDiagnostics) {
            throw new AppRpcError(-32603, 'Turn diagnostics are not available in this gateway.');
        }
        let input: any = {};
        if (evidenceId) {
            const records = await this.turnDiagnostics.list(sessionId, { limit: 50 });
            for (const record of records) {
                const entry = (record.evidence?.entries ?? []).find(item => item.id === evidenceId && item.toolName === toolName);
                if (entry) {
                    const summary = String(entry.inputSummary ?? '').trim();
                    try {
                        const parsed = summary ? JSON.parse(summary) : undefined;
                        if (parsed && typeof parsed === 'object') {
                            input = parsed;
                        }
                    } catch {
                        input = { input: summary };
                    }
                    break;
                }
            }
        }
        const result = await this.tools.invoke(toolName, input, sessionId, context.principalId);
        return { retried: true, toolName, evidenceId: evidenceId || null, result };
    }

    private parseTopN(raw: any): number | undefined {
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 50) : undefined;
    }

    private parseThreshold(raw: any): number | undefined {
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0 ? value : undefined;
    }

    private parseMinFailures(raw: any): number | undefined {
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;
    }

    private async listHarnessProfiles(params: any, context: AppRpcRequestContext): Promise<any> {
        const registry = getBuiltinHarnessProfiles();
        return {
            profiles: Object.values(registry).map(profile => this.toHarnessProfileView(profile)),
            current: typeof this.options.harnessProfile === 'string' ? this.options.harnessProfile : undefined
        };
    }

    private async currentHarnessProfile(params: any, context: AppRpcRequestContext): Promise<any> {
        const reference = this.options.harnessProfile;
        const resolved = reference
            ? resolveHarnessProfile(reference) ?? snapshotHarnessProfile(this.options, this.resolveCurrentProfileName())
            : snapshotHarnessProfile(this.options, this.resolveCurrentProfileName());
        return {
            profile: this.toHarnessProfileView(resolved),
            reference: typeof reference === 'string' ? reference : undefined
        };
    }

    private async diffHarnessProfiles(params: any, context: AppRpcRequestContext): Promise<any> {
        const fromName = typeof params?.from === 'string' && params.from.trim() ? params.from.trim() : 'default';
        const toName = typeof params?.to === 'string' && params.to.trim() ? params.to.trim() : 'current';
        const registry = getBuiltinHarnessProfiles();
        const from = fromName === 'current'
            ? snapshotHarnessProfile(this.options, 'current')
            : registry[fromName];
        const to = toName === 'current'
            ? snapshotHarnessProfile(this.options, 'current')
            : registry[toName];
        if (!from || !to) {
            return { error: `Unknown harness profile: '${!from ? fromName : toName}'` };
        }
        return {
            from: fromName,
            to: toName,
            diff: diffHarnessProfiles(from, to)
        };
    }

    private resolveCurrentProfileName(): string {
        return typeof this.options.harnessProfile === 'string' && this.options.harnessProfile.trim()
            ? this.options.harnessProfile.trim()
            : 'default';
    }

    private toHarnessProfileView(profile: HarnessProfile): Record<string, any> {
        return {
            name: profile.name,
            version: profile.version,
            requireApproval: profile.requireApproval,
            sandbox: profile.sandbox,
            maxRepairRounds: profile.maxRepairRounds,
            maxLoopRecoveries: profile.maxLoopRecoveries,
            verificationWriteTools: profile.verificationWriteTools,
            granularCategories: profile.granularCategories,
            formatter: profile.formatter
        };
    }

    private toTurnDiagnosticsTrendView(point: import('@tsdi/agent').TurnDiagnosticsTrendPoint): Record<string, any> {        return {
            sessionId: point.sessionId,
            bucketStart: point.bucketStart,
            recordCount: point.recordCount,
            emptyResponseCount: point.emptyResponseCount,
            repeatedClarificationCount: point.repeatedClarificationCount,
            followUpRecoveryCount: point.followUpRecoveryCount,
            compactionCount: point.compactionCount,
            totalTokenSavings: point.totalTokenSavings,
            avgCompressionRatio: point.avgCompressionRatio
        };
    }

    private async getDelegationTree(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.delegation) {
            return { tree: null };
        }
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const status = this.parseDelegationStatus(params?.status);
        const depthRaw = Number(params?.depth);
        const depth = Number.isFinite(depthRaw) && depthRaw >= 0 ? Math.min(Math.floor(depthRaw), 100) : undefined;
        const tree = await this.delegation.tree(sessionId, { status, depth });
        return {
            sessionId,
            tree: this.toDelegationTreeView(tree)
        };
    }

    private async getDelegationLineage(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.delegation) {
            return { lineage: [] };
        }
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : undefined;
        const lineage = await this.delegation.ancestors(sessionId, { limit });
        return {
            sessionId,
            lineage: lineage.map(edge => this.toDelegationEdgeView(edge))
        };
    }

    private async getDelegationChildren(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.delegation) {
            return { children: [] };
        }
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const status = this.parseDelegationStatus(params?.status);
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : undefined;
        const children = await this.delegation.children(sessionId, { status, limit });
        return {
            sessionId,
            children: children.map(edge => this.toDelegationEdgeView(edge))
        };
    }

    private async getDelegationList(params: any, context: AppRpcRequestContext): Promise<any> {
        if (!this.delegation) {
            return { edges: [] };
        }
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const limitRaw = Number(params?.limit);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : 200;
        const offsetRaw = Number(params?.offset);
        const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
        let edges = await this.delegation.list({ sessionId, limit, offset });
        if (!sessionId && context.principalId) {
            const involvedSessionIds = Array.from(new Set(edges.flatMap(edge => [edge.parentSessionId, edge.childSessionId])));
            const ownedIds = await this.owners.listOwned(involvedSessionIds, context.principalId);
            const owned = new Set(ownedIds);
            edges = edges.filter(edge => owned.has(edge.parentSessionId) || owned.has(edge.childSessionId));
        }
        return {
            edges: edges.map(edge => this.toDelegationEdgeView(edge))
        };
    }

    private parseDelegationStatus(status: unknown): import('@tsdi/agent').DelegationEdgeStatus | import('@tsdi/agent').DelegationEdgeStatus[] | undefined {
        const isStatus = (value: unknown): value is import('@tsdi/agent').DelegationEdgeStatus =>
            typeof value === 'string' && ['active', 'completed', 'failed', 'cancelled'].includes(value);
        if (typeof status === 'string') {
            const values = status.split(',').map(value => value.trim()).filter(isStatus);
            if (!values.length) {
                return undefined;
            }
            return values.length === 1 ? values[0] : values;
        }
        if (Array.isArray(status)) {
            const values = status.filter(isStatus);
            return values.length ? values : undefined;
        }
        return undefined;
    }

    private toDelegationEdgeView(edge: import('@tsdi/agent').DelegationEdgeRecord): Record<string, any> {
        return {
            id: edge.id,
            parentSessionId: edge.parentSessionId,
            childSessionId: edge.childSessionId,
            kind: edge.kind ?? null,
            status: edge.status,
            createdAt: edge.createdAt,
            completedAt: edge.completedAt ?? null,
            metadata: edge.metadata ?? null
        };
    }

    private toDelegationTreeView(node: import('@tsdi/agent').DelegationTreeNode): Record<string, any> {
        return {
            sessionId: node.sessionId,
            edgeId: node.edgeId ?? null,
            kind: node.kind ?? null,
            status: node.status ?? null,
            createdAt: node.createdAt ?? null,
            completedAt: node.completedAt ?? null,
            metadata: node.metadata ?? null,
            children: node.children.map(child => this.toDelegationTreeView(child))
        };
    }

    private async reviewDiff(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const base = typeof params?.base === 'string' && params.base.trim() ? params.base.trim() : 'HEAD';
        const input: Record<string, any> = { base };
        if (typeof params?.scope === 'string' && params.scope.trim()) {
            input.scope = params.scope.trim();
        }
        const range = typeof params?.range === 'string' && params.range.trim() ? params.range.trim() : undefined;
        if (range) {
            input.range = range;
        }
        if (Array.isArray(params?.paths)) {
            const paths = params.paths.map((path: unknown) => String(path).trim()).filter((path: string) => !!path);
            if (paths.length) {
                input.paths = paths;
            }
        }
        if (typeof params?.includeStats === 'boolean') {
            input.includeStats = params.includeStats;
        }
        if (typeof params?.maxDiffChars === 'number' && Number.isFinite(params.maxDiffChars)) {
            input.maxDiffChars = params.maxDiffChars;
        }
        input.workdir = this.resolveReviewWorkdir(params, sessionId);
        const output = await this.tools.invoke('review_diff', input, sessionId, context.principalId, input.workdir);
        return {
            sessionId,
            review: output
        };
    }

    private resolveReviewWorkdir(params: any, sessionId: string): string {
        const requested = typeof params?.workdir === 'string' && params.workdir.trim() ? params.workdir.trim() : '';
        if (requested) {
            return requested;
        }
        const workspace = this.resolveWorkspace();
        if (workspace) {
            return workspace;
        }
        return process.cwd();
    }

    private async listReviewRuns(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const commit = typeof params?.commit === 'string' && params.commit.trim() ? params.commit.trim() : undefined;
        const runs = await this.reviewFindings?.list(sessionId, commit) ?? [];
        return {
            sessionId: sessionId ?? null,
            runs: runs.map(run => this.toReviewRunView(run))
        };
    }

    private async getReviewRun(params: any, context: AppRpcRequestContext): Promise<any> {
        const id = this.requireString(params?.id, 'review.get id');
        const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
        if (sessionId) {
            await this.ensureSessionAccess(sessionId, context);
        }
        const run = await this.reviewFindings?.get(id) ?? null;
        if (!run) {
            throw new AppRpcError(-32004, `Review run '${id}' not found`);
        }
        if (!sessionId) {
            await this.ensureSessionAccess(run.sessionId, context);
        }
        return { run: this.toReviewRunView(run) };
    }

    private async saveReviewRun(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        if (!this.reviewFindings) {
            throw new AppRpcError(-32603, 'ReviewFindingsStore is not available');
        }
        const run = params?.run;
        if (!run || typeof run !== 'object') {
            throw new AppRpcError(-32602, 'Invalid params: run is required');
        }
        const id = typeof run.id === 'string' && run.id.trim() ? run.id.trim() : `review-${this.uuid.generate()}`;
        const base = typeof run.base === 'string' && run.base.trim() ? run.base.trim() : 'HEAD';
        const files = Array.isArray(run.files) ? run.files.map((file: unknown) => String(file).trim()).filter((file: string) => !!file) : [];
        const findings = Array.isArray(run.findings) ? run.findings : [];
        const saved = await this.reviewFindings.save({
            id,
            sessionId,
            base,
            range: typeof run.range === 'string' && run.range.trim() ? run.range.trim() : undefined,
            paths: Array.isArray(run.paths) ? run.paths.map((path: unknown) => String(path).trim()).filter((path: string) => !!path) : undefined,
            commitSha: typeof run.commitSha === 'string' && run.commitSha.trim() ? run.commitSha.trim() : undefined,
            files,
            diffSummary: typeof run.diffSummary === 'string' ? run.diffSummary : undefined,
            createdAt: typeof run.createdAt === 'number' && Number.isFinite(run.createdAt) ? run.createdAt : Date.now(),
            findings
        });
        return {
            sessionId,
            run: this.toReviewRunView(saved)
        };
    }

    private toReviewRunView(run: import('@tsdi/agent').ReviewRun): Record<string, any> {
        return {
            id: run.id,
            sessionId: run.sessionId,
            base: run.base,
            range: run.range ?? null,
            paths: run.paths ?? null,
            commitSha: run.commitSha ?? null,
            files: run.files,
            diffSummary: run.diffSummary ?? null,
            createdAt: run.createdAt,
            findings: run.findings
        };
    }

    private async listCodingTasks(params: any, context: AppRpcRequestContext): Promise<any> {        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'list' }, context);
        return {
            sessionId,
            tasks: Array.isArray(output?.tasks) ? output.tasks : [],
            total: typeof output?.total === 'number' ? output.total : 0
        };
    }

    private async getCodingTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'get', task_id: taskId }, context);
        return {
            sessionId,
            task: output?.task ?? null
        };
    }

    private async getCodingTaskDiff(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'get', task_id: taskId }, context);
        const task = output?.task;
        return {
            sessionId,
            taskId,
            executionMode: task?.result?.executionMode ?? task?.metadata?.executionMode ?? null,
            diff: task?.result?.diff ?? null,
            workers: Array.isArray(task?.result?.workers) ? task.result.workers : []
        };
    }

    private async getTodoPlan(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.tools.invoke('todo', undefined, sessionId, context.principalId);
        return {
            sessionId,
            todos: Array.isArray(output?.todos) ? output.todos : [],
            summary: output?.summary ?? {
                total: 0,
                pending: 0,
                in_progress: 0,
                completed: 0,
                cancelled: 0
            }
        };
    }

    private async rollbackCodingTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'rollback', task_id: taskId }, context);
        return {
            sessionId,
            taskId,
            task: output?.task ?? null,
            rolledBack: output?.rolledBack === true
        };
    }

    private async cancelCodingTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'cancel', task_id: taskId }, context);
        return {
            sessionId,
            taskId,
            task: output?.task ?? null,
            cancelled: output?.cancelled === true
        };
    }

    private async retryFailedCodingTask(params: any, context: AppRpcRequestContext): Promise<any> {
        const sessionId = this.requireSessionId(params);
        const taskId = this.requireString(params?.taskId ?? params?.task_id, 'taskId');
        await this.ensureSessionAccess(sessionId, context);
        const output = await this.invokeCodingTask(sessionId, { action: 'retry_failed', task_id: taskId }, context);
        return {
            sessionId,
            taskId,
            task: output?.task ?? null,
            retried: output?.ran === true
        };
    }

    private async invokeCodingTask(sessionId: string, input: Record<string, any>, context: AppRpcRequestContext): Promise<any> {
        const definition = this.tools.getToolDefinition('coding_task', sessionId);
        if (!definition) {
            throw new AppRpcError(-32004, 'coding_task tool is not available');
        }
        if (definition.activation?.kind === 'deferred' && definition.activation?.scope === 'session') {
            await this.tools.activateTool(sessionId, 'coding_task');
        }
        return this.tools.invoke('coding_task', input, sessionId, context.principalId);
    }

    private async ensureSessionAccess(
        sessionId: string,
        context: AppRpcRequestContext,
        options?: { createIfMissing?: boolean; }
    ): Promise<void> {
        const exists = await this.sessions.has(sessionId);
        if (!exists && options?.createIfMissing) {
            await this.owners.create(sessionId, context.principalId);
            return;
        }
        if (!exists) {
            throw new AppRpcError(-32004, `Session '${sessionId}' not found`);
        }
        if (!context.principalId) {
            return;
        }
        const owner = await this.owners.getOwner(sessionId);
        if (!owner) {
            await this.owners.create(sessionId, context.principalId);
            return;
        }
        if (owner !== context.principalId) {
            throw new AppRpcError(-32003, 'Forbidden', { sessionId });
        }
    }

    private async setSessionWorkspace(sessionId: string): Promise<void> {
        const workspace = this.resolveWorkspace();
        if (!workspace) {
            return;
        }
        const state = await this.sessions.get(sessionId);
        if (state.workspace === workspace) {
            return;
        }
        await this.sessions.setWorkspace(sessionId, workspace);
    }

    private resolveWorkspace(): string {
        const uiConsole = this.options.ui?.console as Record<string, any> | undefined;
        const workspace = String(uiConsole?.workspace || '').trim();
        // Workspace is an agent-side concern: when no workspace is configured,
        // fall back to the agent process's current working directory so input
        // history (and session workspace) is naturally scoped per launch
        // directory, mirroring shell up-arrow history behavior.
        return workspace || process.cwd();
    }

    private resolveHistoryRequestWorkspace(params: any): string {
        const requested = typeof params?.workspace === 'string' && params.workspace.trim()
            ? params.workspace.trim()
            : '';
        if (requested) {
            return requested;
        }
        return this.resolveWorkspace();
    }

    private getProjectTrustStatus(params: any, _context: AppRpcRequestContext): any {
        const workspace = typeof params?.workspace === 'string' && params.workspace.trim()
            ? params.workspace.trim()
            : this.resolveWorkspace();
        const store = this.resolveTrustedProjectStore();
        if (!store) {
            return { workspace, trusted: false, storePath: undefined };
        }
        const status = store.isTrusted(workspace);
        return { workspace, trusted: status.trusted, storePath: status.storePath };
    }

    private setProjectTrust(params: any, _context: AppRpcRequestContext): any {
        const workspace = typeof params?.workspace === 'string' && params.workspace.trim()
            ? params.workspace.trim()
            : this.resolveWorkspace();
        const store = this.resolveTrustedProjectStore();
        if (!store) {
            throw new AppRpcError(-32000, 'Trusted project store is unavailable (no agent root configured).');
        }
        if (params?.untrust === true) {
            const removed = store.untrust(workspace);
            return { workspace, trusted: !removed, storePath: store.storePathFor(workspace) };
        }
        store.trust(workspace);
        return { workspace, trusted: true, storePath: store.storePathFor(workspace) };
    }

    private resolveTrustedProjectStore(): import('@tsdi/agent').TrustedProjectStore | null {
        const root = (this.options as any).trustedProjectsRoot as string | undefined;
        if (!root) {
            return null;
        }
        const nodePath = require('path') as typeof import('path');
        const nodeFs = require('fs') as typeof import('fs');
        const fileAdapter = {
            isAbsolute: (p: string) => nodePath.isAbsolute(p),
            normalize: (p: string) => nodePath.normalize(p),
            join: (...p: string[]) => nodePath.join(...p),
            resolve: (...p: string[]) => nodePath.resolve(...p),
            extname: (p: string) => nodePath.extname(p),
            existsSync: (p: string) => nodeFs.existsSync(p),
            read: (p: string, o?: any) => nodeFs.createReadStream(p, o),
            find: async () => null,
            readText: async (p: string, e?: any) => (await nodeFs.promises.readFile(p, e)).toString(),
            readTextSync: (p: string, e?: any) => nodeFs.readFileSync(p, e).toString(),
            readJSON: async (p: string) => JSON.parse(nodeFs.readFileSync(p, 'utf-8')),
            readJSONSync: (p: string) => JSON.parse(nodeFs.readFileSync(p, 'utf-8')),
            writeText: async (p: string, c: string) => { nodeFs.writeFileSync(p, c); },
            mkdir: async (p: string, o?: { recursive?: boolean }) => { nodeFs.mkdirSync(p, o); },
            remove: async (p: string, o?: { recursive?: boolean; force?: boolean }) => { nodeFs.rmSync(p, o); },
            stat: async () => null,
            list: async () => []
        };
        const TrustedProjectStore = require('@tsdi/agent').TrustedProjectStore as new (options: any) => import('@tsdi/agent').TrustedProjectStore;
        return new TrustedProjectStore({ fileAdapter, root });
    }

    private async saveReviewAnnotations(params: any, context: AppRpcRequestContext): Promise<{ ok: boolean }> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const cache = params?.cache;
        if (cache === undefined || cache === null) {
            throw new AppRpcError(-32602, 'Invalid params: cache is required');
        }
        const cacheKey = this.resolveReviewAnnotationsCacheKey(params) || sessionId;
        const serialized = JSON.stringify(cache);
        await this.runtime.putMemory(sessionId, this.reviewAnnotationsMemoryKey(cacheKey), serialized, 'session');
        return { ok: true };
    }

    private async loadReviewAnnotations(params: any, context: AppRpcRequestContext): Promise<Record<string, Record<string, any>> | null> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const records = await this.memory.getAll(sessionId);
        const cacheKey = this.resolveReviewAnnotationsCacheKey(params) || sessionId;
        const record = (records || []).find(r => r.key === this.reviewAnnotationsMemoryKey(cacheKey))
            || (records || []).find(r => r.key === AppRpcServer.REVIEW_ANNOTATIONS_CACHE_KEY);
        if (!record) {
            return null;
        }
        try {
            const parsed = JSON.parse(record.value);
            return parsed || null;
        } catch {
            return null;
        }
    }

    private resolveReviewAnnotationsCacheKey(params: any): string | undefined {
        const cacheKey = typeof params?.cacheKey === 'string' && params.cacheKey.trim()
            ? params.cacheKey.trim()
            : '';
        if (cacheKey) {
            return cacheKey;
        }
        const reviewTaskId = typeof params?.reviewTaskId === 'string' && params.reviewTaskId.trim()
            ? params.reviewTaskId.trim()
            : '';
        if (!reviewTaskId) {
            return undefined;
        }
        const sourceSessionId = typeof params?.sourceSessionId === 'string' && params.sourceSessionId.trim()
            ? params.sourceSessionId.trim()
            : '';
        return sourceSessionId ? `${sourceSessionId}:${reviewTaskId}` : reviewTaskId;
    }

    private reviewAnnotationsMemoryKey(cacheKey: string): string {
        return `${AppRpcServer.REVIEW_ANNOTATIONS_CACHE_KEY}:${cacheKey}`;
    }

    private async setReviewGate(params: any, context: AppRpcRequestContext): Promise<{ ok: boolean; taskId: string }> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        const taskId = this.requireString(params?.taskId, 'taskId');
        this.runtime.setReviewGate(sessionId, taskId);
        return { ok: true, taskId };
    }

    private async clearReviewGate(params: any, context: AppRpcRequestContext): Promise<{ ok: boolean }> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        this.runtime.clearReviewGate(sessionId);
        return { ok: true };
    }

    private async getReviewGateStatus(params: any, context: AppRpcRequestContext): Promise<{ active: boolean; taskId?: string }> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context);
        return this.runtime.getReviewGateStatus(sessionId);
    }

    private async writeReviewConclusions(params: any, context: AppRpcRequestContext): Promise<{ ok: boolean; key: string }> {
        const sessionId = this.requireSessionId(params);
        await this.ensureSessionAccess(sessionId, context, { createIfMissing: true });
        const conclusions = params?.conclusions;
        if (!conclusions || typeof conclusions !== 'object') {
            throw new AppRpcError(-32602, 'review.conclusions.write requires a conclusions object');
        }
        const key = 'review.conclusions';
        const value = JSON.stringify(conclusions);
        await this.runtime.putMemory(sessionId, key, value, 'session');
        return { ok: true, key };
    }

    private resolveExportFormat(format?: unknown): 'json' | 'jsonl' {
        return String(format || '').trim().toLowerCase() === 'jsonl'
            ? 'jsonl'
            : 'json';
    }

    private normalizeSandboxMode(value: unknown): import('@tsdi/agent').SandboxMode | undefined {
        if (value == null || value === '' || value === 'default') {
            return undefined;
        }
        if (value === 'off' || value === 'workspace' || value === 'network-block') {
            return value;
        }
        throw new AppRpcError(-32602, 'Invalid session.sandbox_mode mode');
    }

    private normalizeDelegationModeValue(value: unknown): import('@tsdi/agent').AgentDelegationMode | undefined {
        if (value == null || value === '' || value === 'default' || value === 'explicit') {
            return undefined;
        }
        const mode = normalizeDelegationMode(value);
        if (mode) {
            return mode;
        }
        throw new AppRpcError(-32602, 'Invalid session.delegation_mode mode');
    }

    private buildExportFileName(sessionId: string, exportedAt: number, format: 'json' | 'jsonl'): string {
        const ext = format === 'jsonl' ? 'jsonl' : 'json';
        const stamp = new Date(exportedAt).toISOString().replace(/[:.]/g, '-');
        const safeSessionId = String(sessionId || 'session').replace(/[^a-zA-Z0-9._-]+/g, '-');
        return `agent-session-${safeSessionId}-${stamp}.${ext}`;
    }

    private resolveExportContentType(format: 'json' | 'jsonl'): string {
        return format === 'jsonl'
            ? 'application/x-ndjson; charset=utf-8'
            : 'application/json; charset=utf-8';
    }

    private serializeSessionExport(
        format: 'json' | 'jsonl',
        exportedAt: number,
        session: Record<string, any>,
        messages: AgentMessage[],
        toolCalls: Array<Record<string, any>>
    ): string {
        if (format === 'jsonl') {
            const lines = [
                JSON.stringify({ type: 'session', exportedAt, session }),
                ...messages.map(message => JSON.stringify({ type: 'message', message })),
                ...toolCalls.map(toolCall => JSON.stringify({ type: 'tool_call', toolCall }))
            ];
            return `${lines.join('\n')}\n`;
        }
        return JSON.stringify({
            type: 'session_export',
            format,
            exportedAt,
            session,
            messages,
            toolCalls
        }, null, 2);
    }

    private collectExportToolCalls(messages: AgentMessage[]): Array<Record<string, any>> {
        const records: Array<Record<string, any>> = [];
        for (const message of messages || []) {
            const toolCalls = Array.isArray(message?.metadata?.toolCalls)
                ? message.metadata.toolCalls
                : [];
            for (const toolCall of toolCalls) {
                if (!toolCall || typeof toolCall !== 'object') {
                    continue;
                }
                const id = typeof toolCall.id === 'string' ? toolCall.id : '';
                const name = typeof toolCall.name === 'string' ? toolCall.name : '';
                if (!id && !name) {
                    continue;
                }
                records.push({
                    id: id || null,
                    name: name || null,
                    input: toolCall.input ?? null,
                    messageId: message.id,
                    createdAt: message.createdAt
                });
            }
        }
        return records;
    }

    private requireSessionId(params: any): string {
        return this.requireString(params?.sessionId, 'sessionId');
    }

    private optionalSessionId(params: any): string | undefined {
        return typeof params?.sessionId === 'string' && params.sessionId.trim()
            ? params.sessionId.trim()
            : undefined;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new AppRpcError(-32602, `Invalid params: ${field} must be a non-empty string`);
        }
        return value.trim();
    }

    private requireTurnInput(value: unknown, message: AgentTurnMessageInput | undefined, field: string): string {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
        if (message?.parts?.length) {
            return typeof value === 'string' ? value.trim() : '';
        }
        throw new AppRpcError(-32602, `Invalid params: ${field} must be a non-empty string`);
    }

    private parseTurnMessage(value: unknown): AgentTurnMessageInput | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        const input = value as Record<string, any>;
        const content = typeof input.content === 'string' ? input.content : undefined;
        const parts = normalizeAgentMessageParts(input.parts);
        const metadata = input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
            ? input.metadata as Record<string, any>
            : undefined;
        if (!content && !parts?.length && !metadata) {
            return undefined;
        }
        return { content, parts, metadata };
    }

    private resolveModelProfile(): string {
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

    private resolveHistoryPrincipalId(context: AppRpcRequestContext): string {
        return String(context?.principalId || '').trim() || 'anonymous';
    }

    private resolveHistoryPrincipalIds(context: AppRpcRequestContext): string[] {
        const principalId = this.resolveHistoryPrincipalId(context);
        return principalId === 'local-system'
            ? [principalId, 'anonymous']
            : [principalId];
    }

    private createConsoleInputHistoryRecordId(workspace: string, principalId: string, sessionId?: string): string {
        return `agent-ui:console-input-history:${encodeURIComponent(principalId)}:${encodeURIComponent(workspace)}:${encodeURIComponent(String(sessionId || '').trim() || 'default')}`;
    }

    private findConsoleInputHistoryRecord(records: any[], workspace: string, principalId: string, sessionId?: string): any | undefined {
        const resolvedSessionId = String(sessionId || '').trim();
        return this.listConsoleInputHistoryRecords(records, workspace, [principalId])
            .find(record => String(record?.metadata?.sessionId || '').trim() === resolvedSessionId);
    }

    private listConsoleInputHistoryRecords(records: any[], workspace: string, principalIds: string[]): any[] {
        const allowedPrincipals = new Set((principalIds || []).map(id => String(id || '').trim()).filter(Boolean));
        return (records || [])
            .filter(record => record?.scope === 'global'
                && record?.key === AppRpcServer.CONSOLE_INPUT_HISTORY_KEY
                && record?.metadata?.workspace === workspace
                && allowedPrincipals.has(String(record?.metadata?.principalId || '').trim()))
            .map((record, index) => ({ record, index }))
            .sort((left, right) => {
                const timeDelta = (right.record?.updatedAt || right.record?.createdAt || 0) - (left.record?.updatedAt || left.record?.createdAt || 0);
                return timeDelta !== 0 ? timeDelta : right.index - left.index;
            })
            .map(entry => entry.record);
    }

    private mergeConsoleInputHistoryEntries(groups: any[]): string[] {
        const merged: string[] = [];
        const seen = new Set<string>();
        for (const group of groups) {
            for (const entry of this.normalizeInputHistoryEntries(group)) {
                if (!seen.has(entry)) {
                    seen.add(entry);
                    merged.push(entry);
                }
                if (merged.length >= 200) {
                    return merged;
                }
            }
        }
        return merged;
    }

    private parseInputHistoryEntries(value: unknown): any[] {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value !== 'string') {
            return Array.isArray((value as any)?.entries) ? (value as any).entries : [];
        }
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.entries)
                    ? parsed.entries
                    : [];
        } catch {
            return [];
        }
    }

    private normalizeInputHistoryEntries(value: unknown): string[] {
        const entries: any[] = Array.isArray(value)
            ? value
            : Array.isArray((value as any)?.entries)
                ? (value as any).entries
                : [];
        return Array.from(new Set(entries
            .map((entry: any) => String(entry || '').trim())
            .filter(Boolean)))
            .slice(0, 200);
    }

    private createErrorResponse(id: string | number | null | undefined, error: AppRpcError): AppRpcResponse {
        return {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
                code: error.code,
                message: error.message,
                data: error.data
            }
        };
    }
}
