import { FileAdapter } from '@tsdi/common';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ApplicationArguments, ApplicationContext, RunContext, Runner, UuidGenerator, createRunContext } from '@tsdi/core';
import { AgentRuntime, AgentTurnUndoResult, CancelTurnResult, CompactNowResult, FileUndoRedoResult } from './AgentRuntime';
import { SessionTurnCheckpoints } from './SessionTurnCheckpoints';
import { SessionTurnLeaseManager } from './SessionTurnLeaseManager';
import { promoteInboxSteers } from './SessionInboxPromotion';
import { TurnHistoryStore } from './TurnHistoryStore';
import { TurnHistoryController } from './TurnHistoryController';
import { TurnObservabilityController } from './TurnObservabilityController';
import { collectStreamingResponse as collectStreamingResponseView } from './TurnStreamCollector';
import { TurnToolBatchController } from './TurnToolBatchController';
import { SessionPostTurnController } from './SessionPostTurnController';
import { hadPriorClarification, isClarificationAssistantMessage } from './ClarificationFollowUp';
import { TurnRequestController } from './TurnRequestController';
import { TurnTerminationController } from './TurnTerminationController';
import { TurnRecoveryController } from './TurnRecoveryController';
import type { TurnRecoveryState, TurnRepairRecipe } from './TurnRecoveryState';
import { cloneToolInput, safeSerializeToolInput, summarizeToolInput as summarizeToolInputView, summarizeToolOutput as summarizeToolOutputView } from './ToolInvocationSupport';
import { ToolInvocationLifecycle } from './ToolInvocationLifecycle';
import { runToolPreflight } from './ToolInvocationPreflight';
import { executeToolInvocation } from './ToolExecutionRunner';
import { TurnAssistantController } from './TurnAssistantController';
import { VerificationController } from './VerificationController';
import { TokenUsageController } from './TokenUsageController';
import { MemoryRetrievalController } from './MemoryRetrievalController';
import { SessionSnapshotController } from './SessionSnapshotController';
import { HookController } from './HookController';
import { PolicyResolutionController } from './PolicyResolutionController';
import { TurnLoopController } from './TurnLoopController';
import { SessionModeController } from './SessionModeController';
import { DelegationSessionController } from './DelegationSessionController';
import { SessionGoalController } from './SessionGoalController';
import { WorkspaceRootController } from './WorkspaceRootController';
import { TurnCompensationController } from './TurnCompensationController';
import type { TurnExecutionContext } from './TurnExecutionContext';
import { FALSIFICATION_ESCALATION_THRESHOLD, SCHEDULER_DEFAULT_SHUTDOWN_TIMEOUT_MS, TURN_DIAGNOSTICS_LIMIT, TURN_DIAGNOSTICS_RECENT_ATTEMPTS } from '../AgentLimits';
import { AgentTurnInput, AgentTurnAgentConfig } from './AgentTurnInput';
import { AgentTurnResult } from './AgentTurnResult';
import { TurnHandler } from './TurnHandler';
import { AgentMessage, AgentMessagePart, AgentTurnMessageInput, collectToolReadPaths, isImportedChildMessage, normalizeAgentMessageParts } from './AgentMessage';
import { AgentContextPreparedEvent, AgentErrorEvent, AgentMemoryRetrievedEvent, AgentMemoryRetrievalFailedEvent, AgentMemoryRetrievalStartedEvent, AgentMemoryUpdatedEvent, AgentModelCompletedEvent, AgentStreamChunkEvent, AgentTokenBudgetExceededEvent, AgentTokenBudgetReminderEvent, AgentToolCompletedEvent, AgentToolExecutionReceipt, AgentToolFailedEvent, AgentToolInvokedEvent, AgentToolSkippedEvent, AgentTurnCancelledEvent, AgentTurnCompletedEvent, AgentTurnDiagnostics, AgentTurnDiagnosticsEvent, AgentTurnStartedEvent } from './AgentEvents';
import { AgentTurnCancelledError } from './AgentTurnCancelledError';
import { TurnAbortScopes } from './TurnAbortScopes';
import { PlanContinuationTracker } from './PlanContinuation';
import { isWorkspaceMutatingTool, resolveWorkspaceTrustApproval } from '../project/workspace-trust';
import { ModelAdapter } from '../model/ModelAdapter';
import { ModelRequest } from '../model/ModelRequest';
import { AgentToolCall, ModelResponse } from '../model/ModelResponse';
import { StreamChunk } from '../model/StreamChunk';
import { PromptCacheRuntimeMetadata } from '../model/ModelProviderOptions';
import { ToolRegistry } from '../tools/ToolRegistry';
import { ToolLoopDetector } from '../tools/ToolLoopDetector';
import { ApprovalDecision, ApprovalManager, ApprovalRule, DefaultApprovalStrategy, ToolApprovalManager } from '../tools/ToolApprovalManager';
import { AgentSessionProjectMetadata, SessionSearchMatch, SessionSearchOptions, SessionStore } from '../memory/SessionStore';
import { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSummarizer } from '../memory/SessionSummarizer';
import { AgentSummaryAgent } from '../memory/AgentSummaryAgent';
import { AGENT_OPTIONS, AGENT_TELEMETRY, AGENT_WORKSPACE_TRUST, AgentWorkspaceTrustResolver } from '../tokens';
import { resolveAgentSandboxPolicy, AgentOptions, AgentPolicyResolution, DEFAULT_APPROVAL_REQUIRED_RULES, defaultAgentOptions } from '../options';
import { resolveApprovalPolicyOptions } from './approval-policy';
import { ExperienceDistiller } from '../memory/ExperienceDistiller';
import { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';
import { AgentClock, AGENT_CLOCK } from './Clock';
import { AgentContextManager, ContextPreparationReport, SynthesisOptions, SynthesisReport } from '../context/AgentContextManager';
import { AgentMemoryRetriever } from '../memory/AgentMemoryRetriever';
import { AgentToolDefinition } from '../tools/AgentTool';
import { FileSnapshot, FileSnapshotPart, FileSnapshotStore } from '../harness/FileSnapshotStore';
import { GitRevertResult, GitStepDiff, GitStepSnapshot, GitStepSnapshotStore } from '../harness/GitStepSnapshotStore';
import { summarizeToolDisplayText } from '../tools/ToolSummary';
import { AgentScheduler } from '../scheduler/AgentScheduler';
import { ToolExecutionCoordinator } from '../harness/ToolExecutionCoordinator';
import { ToolSchemaValidator } from '../harness/ToolSchemaValidator';
import { RateLimitManager } from '../harness/RateLimitManager';
import { OutputGuard } from '../harness/OutputGuard';
import { decorateToolSandboxReceipt, resolveSessionToolSandboxState } from '../harness/ToolSandboxPolicy';
import { createToolBaseReceipt } from '../harness/tool-receipt';
import { resolveRuntimeApprovalManager } from './approval-resolution';
import { buildEmptyResponseRetryRequest, buildFollowUpRecoveryRequest, buildToolErrorRecoveryRequest, findLatestFollowUpContextUserMessage } from './recovery-requests';
import { computeTurnFalsifyRate } from '../harness/turn-metrics';
import { effectiveSandboxMode } from '../harness/sandbox-mode';
import { requestSandboxEscalation } from '../harness/sandbox-escalation';
import { CompactionHistoryRecord, CompactionHistoryStore } from '../harness/CompactionHistoryStore';
import { TurnDiagnosticsRecord, TurnDiagnosticsStore } from '../harness/TurnDiagnosticsStore';
import { EvidenceLedger, ToolEvidenceEntry } from '../harness/EvidenceLedger';
import { spillToolOutput } from '../harness/ToolOutputSpill';
import { VerificationGate, DEFAULT_VERIFICATION_WRITE_TOOLS } from '../harness/VerificationGate';
import { VerifyCommandRunner, DEFAULT_VERIFY_TIMEOUT_MS, recordVerifyCommandEvidence } from '../harness/VerifyCommandRunner';
import { FalsificationAttempt, ResolvedRepairHint, buildAttemptSignature, buildExplorationGuidancePrompt, buildRepairPrompt, collectResolvedRepairHints } from '../harness/RepairExploration';
import { DelegationEdgeStatus, DelegationGraphStore } from '../harness/DelegationGraphStore';
import { TokenBudgetScopeState, TokenBudgetTracker } from '../harness/TokenBudgetTracker';
import { fenceToolOutputIfUntrusted } from '../harness/TrustBoundary';
import { AgentDelegationMode, DEFAULT_DELEGATION_MODE, buildDelegationModeHint, buildDelegationQualityNote, normalizeDelegationMode } from './DelegationMode';
import { dirnameAgentPath } from '../AgentWorkspacePath';
import { RepeatReadOnlyCallCache } from './tool-repeat-cache';
import { nearToolRoundLimitPrompt } from './tool-round-budget';
import { canParallelizeToolBatch, describeToolCallNames } from './tool-dispatch-policy';
import { AgentFunctionHookDefinition, AgentHookCommandExecutor, AgentHookContext, AgentHookExecutionResult, AgentHookManager, AgentHookTranscriptEntry, AgentLifecycleHookStage } from '../hooks/AgentHooks';
import { buildPersonalityHint } from '../prompt/personality-presets';
import { buildGoalContext, CreateGoalInput, Goal, GoalStatus, GoalStore } from '../goal/GoalStore';
import {
    AgentArchetype,
    DEFAULT_ARCHETYPE,
    buildArchetypeModeHint,
    buildArchetypeSwitchMessage,
    listArchetypes,
    resolveArchetype
} from '../archetype/AgentArchetype';

interface ToolInvocationResult {
    toolCall: { id: string; name: string; input?: any };
    content: string;
    metadata: Record<string, any>;
    receipt: AgentToolExecutionReceipt;
    error?: Error;
    /** G29: raw (pre-stringification) tool output for the delegation quality gate (coding_task only). */
    structuredOutput?: any;
}

@Injectable()
export class DefaultAgentRuntime extends AgentRuntime {
    protected contextManager: AgentContextManager;
    protected toolApprovalManager?: ApprovalManager;
    protected hookManager?: AgentHookManager;
    protected _stopped = false;
    private reviewGates = new Map<string, { active: boolean; taskId: string }>();
    protected sessionTurnQueues = new Map<string, Array<() => void>>();
    protected sessionTurnDepths = new Map<string, number>();
    protected sessionTurnsRunning = new Set<string>();
    protected turnAbortScopes = new TurnAbortScopes();
    protected pendingGitStepSnapshots = new Map<string, string>();
    protected planContinuation = new PlanContinuationTracker();
    protected sessionUsageTotals = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number }>(); protected sessionTurnCheckpoints = new SessionTurnCheckpoints(); private turnLeases?: SessionTurnLeaseManager; private turnObservability?: TurnObservabilityController; private turnToolBatch?: TurnToolBatchController; private postTurnController?: SessionPostTurnController; private turnRequestController?: TurnRequestController; private turnTerminationController?: TurnTerminationController; private toolLifecycle?: ToolInvocationLifecycle; private turnAssistant?: TurnAssistantController; private verification?: VerificationController; private tokenUsage?: TokenUsageController; private memoryRetrieval?: MemoryRetrievalController; private sessionSnapshots?: SessionSnapshotController; private hooksController?: HookController; private policyResolution?: PolicyResolutionController; private turnRecovery?: TurnRecoveryController;
    private turnHistoryController?: TurnHistoryController;
    protected tokenBudgetTracker: TokenBudgetTracker;
    protected static readonly MAX_PENDING_SESSION_TURNS = 32;

    constructor(
        protected modelAdapter: ModelAdapter,
        protected toolRegistry: ToolRegistry,
        protected sessions: SessionStore,
        protected memory: MemoryStore,
        protected summarizer: SessionSummarizer,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) protected options: AgentOptions,
        protected app: ApplicationContext,
        protected uuid: UuidGenerator,
        @Optional() @Inject(ExperienceDistiller) protected experienceDistiller?: ExperienceDistiller,
        @Optional() protected promptBuilder?: SystemPromptBuilder,
        @Optional() protected approvalManagerInput?: ApprovalManager,
        @Optional() protected injectedContextManager?: AgentContextManager,
        @Optional() @Inject(AgentMemoryRetriever) protected memoryRetriever?: AgentMemoryRetriever,
        @Optional() protected toolExecutionCoordinator?: ToolExecutionCoordinator,
        @Optional() protected compactionHistoryStore?: CompactionHistoryStore,
        @Optional() protected turnDiagnosticsStore?: TurnDiagnosticsStore,
        @Optional() protected delegationGraph?: DelegationGraphStore,
        @Optional() protected fileSnapshotStore?: FileSnapshotStore,
        @Optional() protected gitStepSnapshotStore?: GitStepSnapshotStore,
        @Optional() protected appArgs?: ApplicationArguments,
        @Optional() protected fileAdapter?: FileAdapter,
        @Optional() protected hookExecutor?: AgentHookCommandExecutor,
        @Optional() @Inject(AgentSummaryAgent) protected summaryAgent?: AgentSummaryAgent,
        @Optional() protected goalStore?: GoalStore,
        @Optional() @Inject(AGENT_CLOCK, { defaultValue: null }) protected clock?: AgentClock,
        @Optional() @Inject(AGENT_WORKSPACE_TRUST, { defaultValue: null }) protected workspaceTrust?: AgentWorkspaceTrustResolver | null,
        @Optional() @Inject(AGENT_TELEMETRY) protected telemetry?: import('../harness/AgentTelemetry').AgentTelemetry,
        @Optional() protected turnHistoryStore?: TurnHistoryStore
    ) {
        super();
        this.tokenBudgetTracker = new TokenBudgetTracker(this.options.tokenBudget);
        this.contextManager = (this.injectedContextManager ?? new AgentContextManager()).configure({
            maxHistoryTokens: this.options.context?.maxHistoryTokens,
            maxMemoryRecords: this.options.context?.maxMemoryRecords,
            maxToolResults: this.options.context?.maxToolResultChars,
            recentMessageWindow: this.options.context?.compactionRecentMessages,
            compactionMinTokens: this.options.context?.compactionMinTokens,
            experienceMemory: this.options.context?.experienceMemory,
        });
        if (this.summarizer && this.options.context?.compactionThreshold) {
            this.contextManager.setSummarizer(this.summarizer, this.options.context.compactionThreshold);
        }
        this.approvalManager = this.toolApprovalManager = this.resolveApprovalManager(this.approvalManagerInput);
        this.toolApprovalManager?.setPermissionRules?.(() => this.options.policy?.permissions);
        if (!this.toolExecutionCoordinator) {
            this.toolExecutionCoordinator = new ToolExecutionCoordinator(
                this.toolRegistry,
                new ToolSchemaValidator(),
                new RateLimitManager(this.clock),
                new OutputGuard(),
                this.app,
                this.uuid,
                undefined,
                undefined,
                undefined,
                this.telemetry
            );
        }
        this.hookManager = new AgentHookManager(this.options.hooks, this.hookExecutor);
        this.contextManager.setCompactionHookRunner(async (stage, compaction) => {
            if (!compaction.sessionId || !this.hookManager?.hasHooks(stage)) {
                return;
            }
            await this.hooks.run(stage, compaction.sessionId, {
                sessionId: compaction.sessionId,
                workspace: await this.resolveSessionWorkspace(compaction.sessionId),
                stage,
                compaction
            });
        });
    }

    protected now(): number {
        return this.clock?.now() ?? Date.now();
    }

    protected async sleep(ms: number): Promise<void> {
        if (!Number.isFinite(ms) || ms <= 0) {
            return;
        }
        await new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    updateModelOptions(model?: AgentOptions['model']): void { if (!model) return; if (this.options === defaultAgentOptions) { this.options = { ...defaultAgentOptions, model: { ...model } }; } else { this.options.model = model; } this.modelAdapter.updateOptions?.(model); }
    async runTurn(
        sessionId: string,
        input: string,
        principalId?: string,
        message?: AgentTurnMessageInput,
        profile?: string,
        agent?: AgentTurnAgentConfig, workspace?: string
    ): Promise<AgentTurnResult> {
        const release = await this.acquireSessionTurnLock(sessionId);
        this.turnAbortScopes.begin(sessionId);
        const span = this.telemetry?.startSpan('agent.turn', { sessionId, profile });
        let outcome: 'ok' | 'error' = 'error';
        try {
            await this.ensureSessionWorkspace(sessionId);
            const handler = typeof (this.app as any)?.get === 'function'
                ? (this.app as any).get(TurnHandler, null) as {
                    injector?: ApplicationContext,
                    handle(input: AgentTurnInput, context: RunContext): Promise<AgentTurnResult>
                } | null
                : null;
            if (!handler) {
                const result = await this.processTurn({ sessionId, input, principalId, message, profile, agent, workspace });
                outcome = 'ok';
                return result;
            }
            const result = await handler.handle({ sessionId, input, principalId, message, profile, agent }, createRunContext(handler.injector ?? this.app));
            outcome = 'ok';
            return result;
        } finally {
            span?.end(outcome);
            this.turnAbortScopes.end(sessionId);
            release();
        }
    }

    @Runner()
    async start(): Promise<void> {
        this._stopped = false;
        const bootstrapTurn = this.options.bootstrapTurn;
        if (!bootstrapTurn?.enabled || !bootstrapTurn.input?.trim()) {
            return;
        }
        const result = await this.runTurn(bootstrapTurn.sessionId || 'default', bootstrapTurn.input);
        bootstrapTurn.output = result.message.content;
    }

    async stop(): Promise<void> {
        if (this._stopped) {
            return;
        }
        this._stopped = true;
        const timeout = this.options.scheduler?.shutdownTimeoutMs ?? SCHEDULER_DEFAULT_SHUTDOWN_TIMEOUT_MS;
        const timer = setTimeout(() => {
            this.app.publishEvent(new AgentErrorEvent(this, 'system', new Error(`Forced shutdown after ${timeout}ms`)))
                .catch(() => {});
        }, timeout);
        try {
            const shutdownEvents = this.app.get(AgentScheduler, null);
            if (shutdownEvents && typeof (shutdownEvents as any).stop === 'function') {
                await (shutdownEvents as any).stop();
            }
        } catch {
            return;
        } finally {
            clearTimeout(timer);
        }
    }

    async executeTurn(input: AgentTurnInput, _context: RunContext): Promise<AgentTurnResult> {
        return this.processTurn(input);
    }

    async processTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
        await this.waitForPendingArchetypeSwitch(input.sessionId);
        await this.ensureSessionWorkspace(input.sessionId);
        const gate = this.reviewGates.get(input.sessionId);
        if (gate?.active) {
            throw new Error(`Review gate active for task "${gate.taskId}". Complete or release the review before continuing.`);
        }
        await this.app.publishEvent(new AgentTurnStartedEvent(this, input.sessionId, input.input));
        const userMessage = this.createMessage(
            'user',
            input.message?.content ?? input.input,
            undefined,
            undefined,
            input.message?.metadata,
            input.message?.parts
        );
        await this.recordSessionTurnCheckpoint(input.sessionId, input.message?.content ?? input.input);
        const appended = await this.sessions.append(input.sessionId, userMessage);
        if (appended.messages.length === 1) {
            await this.ensureSessionTitle(input.sessionId).catch(() => undefined);
        }
        const turnContext: TurnExecutionContext = {
            principalId: input.principalId,
            workspace: String(input.workspace || '').trim() || await this.resolveSessionWorkspace(input.sessionId),
            diagnostics: this.createTurnDiagnostics(),
            evidenceLedger: new EvidenceLedger(input.sessionId, this.uuid),
            recovery: this.createTurnRecovery(),
            profile: input.profile,
            agent: input.agent
        };
        await this.hooks.run('beforeTurn', input.sessionId, {
            sessionId: input.sessionId,
            principalId: input.principalId,
            workspace: turnContext.workspace,
            input: input.input,
            stage: 'beforeTurn',
            turn: { status: 'started', message: input.input }
        });

        await this.beginGitStepSnapshot(input.sessionId, turnContext.workspace);

        try {
            const result = await this.completeTurn(input.sessionId, input.input, userMessage.id, turnContext);
            this.bindGitStepSnapshot(input.sessionId, result.message.id);
            await this.sessions.append(input.sessionId, result.message);
            await this.evaluateSessionGoal(input.sessionId, result.message.content);
            await this.postTurn.maybeSummarize(input.sessionId, turnContext.evidenceLedger?.entriesFrom(0));
            await this.refreshSessionSummary(input.sessionId).catch(() => undefined);
            await this.postTurn.maybeDistillExperience(input.sessionId, userMessage, result.message);
            await this.observability.publishTurnDiagnostics(this, input.sessionId, turnContext.diagnostics);
            await this.observability.recordTurnDiagnostics(input.sessionId, turnContext.diagnostics, turnContext.evidenceLedger, turnContext.recovery, turnContext.workspace);
            await this.hooks.run('afterTurn', input.sessionId, {
                sessionId: input.sessionId,
                principalId: input.principalId,
                workspace: turnContext.workspace,
                input: input.input,
                stage: 'afterTurn',
                turn: { status: 'completed', message: result.message.content }
            });
            await this.app.publishEvent(new AgentTurnCompletedEvent(this, input.sessionId, result.message));
            return result;
        } catch (error) {
            this.pendingGitStepSnapshots.delete(input.sessionId);
            if (error instanceof AgentTurnCancelledError || this.turnAbortScopes.isAborted(input.sessionId)) {
                await this.rollbackTurnCompensations(input.sessionId, 'cancelled');
                await this.hooks.run('afterTurn', input.sessionId, {
                    sessionId: input.sessionId,
                    principalId: input.principalId,
                    workspace: turnContext.workspace,
                    input: input.input,
                    stage: 'afterTurn',
                    turn: { status: 'cancelled' }
                });
                await this.app.publishEvent(new AgentTurnCancelledEvent(this, input.sessionId));
                throw error instanceof AgentTurnCancelledError ? error : new AgentTurnCancelledError(input.sessionId);
            }
            const err = error instanceof Error ? error : new Error(String(error));
            await this.rollbackTurnCompensations(input.sessionId, 'error'); await this.sessions.append(input.sessionId, this.createMessage('assistant', `Error: ${err.message}`, undefined, undefined, { error: true })).catch(() => undefined);
            await this.hooks.run('afterTurn', input.sessionId, {
                sessionId: input.sessionId,
                principalId: input.principalId,
                workspace: turnContext.workspace,
                input: input.input,
                stage: 'afterTurn',
                turn: { status: 'failed', error: err.message }
            });
            await this.app.publishEvent(new AgentErrorEvent(this, input.sessionId, err));
            throw err;
        }
    }

    synthesizeExperiences(options?: SynthesisOptions): SynthesisReport {
        return this.contextManager.synthesizeExperiences(options);
    }

    override async createGoal(input: CreateGoalInput, sessionId?: string): Promise<Goal> { return this.goals.create(input, sessionId); }

    override async listGoals(status?: GoalStatus): Promise<Goal[]> { return this.goals.list(status); }

    override async getGoal(goalId: string): Promise<Goal | undefined> { return this.goals.get(goalId); }

    override async getSessionGoal(sessionId: string): Promise<Goal | undefined> { return this.goals.getSessionGoal(sessionId); }

    override async linkSessionGoal(sessionId: string, goalId?: string): Promise<void> { await this.goals.linkSession(sessionId, goalId); }

    override async updateGoal(goalId: string, patch: Partial<Pick<Goal, 'title' | 'objective' | 'successCriteria' | 'status'>>): Promise<Goal> {
        return this.goals.update(goalId, patch);
    }

    private async evaluateSessionGoal(sessionId: string, assistantText: string): Promise<void> { await this.goals.evaluateCompletion(sessionId, assistantText); }

    async *runStreamingTurn(
        sessionId: string,
        input: string,
        principalId?: string,
        message?: AgentTurnMessageInput,
        profile?: string,
        agent?: AgentTurnAgentConfig, workspace?: string
    ): AsyncGenerator<StreamChunk> {
        const release = await this.acquireSessionTurnLock(sessionId);
        this.turnAbortScopes.begin(sessionId);
        try {
            await this.waitForPendingArchetypeSwitch(sessionId);
            await this.ensureSessionWorkspace(sessionId);
            await this.app.publishEvent(new AgentTurnStartedEvent(this, sessionId, input));
            const userMessage = this.createMessage(
                'user',
                message?.content ?? input,
                undefined,
                undefined,
                message?.metadata,
                message?.parts
            );
            const appended = await this.sessions.append(sessionId, userMessage);
            if (appended.messages.length === 1) {
                await this.ensureSessionTitle(sessionId).catch(() => undefined);
            }
            const turnContext: TurnExecutionContext = {
                principalId,
                workspace: String(workspace || '').trim() || await this.resolveSessionWorkspace(sessionId),
                diagnostics: this.createTurnDiagnostics(),
                evidenceLedger: new EvidenceLedger(sessionId, this.uuid),
                recovery: this.createTurnRecovery(),
                profile,
                agent
            };
            await this.hooks.run('beforeTurn', sessionId, {
                sessionId,
                principalId,
                workspace: turnContext.workspace,
                input,
                stage: 'beforeTurn',
                turn: { status: 'started', message: input }
            });

            await this.beginGitStepSnapshot(sessionId, turnContext.workspace);

            try {
                const result = yield* this.completeStreamingTurn(sessionId, input, userMessage.id, turnContext);
                this.bindGitStepSnapshot(sessionId, result.message.id);
                await this.sessions.append(sessionId, result.message);
                await this.postTurn.maybeSummarize(sessionId, turnContext.evidenceLedger?.entriesFrom(0));
                await this.refreshSessionSummary(sessionId).catch(() => undefined);
                await this.postTurn.maybeDistillExperience(sessionId, userMessage, result.message);
                await this.observability.publishTurnDiagnostics(this, sessionId, turnContext.diagnostics);
                await this.observability.recordTurnDiagnostics(sessionId, turnContext.diagnostics, turnContext.evidenceLedger, turnContext.recovery, turnContext.workspace);
                await this.hooks.run('afterTurn', sessionId, {
                    sessionId,
                    principalId,
                    workspace: turnContext.workspace,
                    input,
                    stage: 'afterTurn',
                    turn: { status: 'completed', message: result.message.content }
                });
                await this.app.publishEvent(new AgentTurnCompletedEvent(this, sessionId, result.message));
                await this.app.publishEvent(new AgentStreamChunkEvent(this, sessionId, 'done'));
                yield { type: 'done' };
            } catch (error) {
                this.pendingGitStepSnapshots.delete(sessionId);
                if (error instanceof AgentTurnCancelledError || this.turnAbortScopes.isAborted(sessionId)) {
                    await this.rollbackTurnCompensations(sessionId, 'cancelled');
                    await this.hooks.run('afterTurn', sessionId, {
                        sessionId,
                        principalId,
                        workspace: turnContext.workspace,
                        input,
                        stage: 'afterTurn',
                        turn: { status: 'cancelled' }
                    });
                    await this.app.publishEvent(new AgentTurnCancelledEvent(this, sessionId));
                    throw error instanceof AgentTurnCancelledError ? error : new AgentTurnCancelledError(sessionId);
                }
                const err = error instanceof Error ? error : new Error(String(error));
                await this.rollbackTurnCompensations(sessionId, 'error'); await this.sessions.append(sessionId, this.createMessage('assistant', `Error: ${err.message}`, undefined, undefined, { error: true })).catch(() => undefined);
                await this.hooks.run('afterTurn', sessionId, {
                    sessionId,
                    principalId,
                    workspace: turnContext.workspace,
                    input,
                    stage: 'afterTurn',
                    turn: { status: 'failed', error: err.message }
                });
                await this.app.publishEvent(new AgentErrorEvent(this, sessionId, err));
                throw err;
            }
        } finally {
            this.turnAbortScopes.end(sessionId);
            release();
        }
    }

    protected async ensureSessionWorkspace(sessionId: string): Promise<void> { await this.workspaceRoot.ensureSessionWorkspace(sessionId); }

    protected async resolveSessionWorkspace(sessionId: string): Promise<string | undefined> { return this.workspaceRoot.resolveSessionWorkspace(sessionId); }

    protected resolveWorkspace(): string | undefined { return this.workspaceRoot.resolveWorkspace(); }

    async putMemory(sessionId: string, key: string, value: string, scope: 'session' | 'global' = 'session'): Promise<AgentMemoryRecord> {
        const record: AgentMemoryRecord = {
            id: `${Date.now()}-${Math.random()}`,
            sessionId,
            key,
            value,
            scope,
            createdAt: Date.now()
        };
        await this.memory.put(record);
        await this.app.publishEvent(new AgentMemoryUpdatedEvent(this, sessionId, record));
        return record;
    }

    async searchMemory(sessionId: string, query: string): Promise<AgentMemoryRecord[]> {
        return this.memory.search(query, sessionId);
    }

    async getMessages(sessionId: string): Promise<AgentMessage[]> {
        return (await this.sessions.get(sessionId)).messages;
    }

    async markSessionAutomation(sessionId: string): Promise<void> {
        const state = await this.sessions.get(sessionId);
        await this.sessions.setProjectMetadata(sessionId, {
            projectId: state.projectId,
            primaryThreadId: state.primaryThreadId,
            originThreadId: state.originThreadId,
            sessionRole: 'automation',
            rootRequest: state.rootRequest,
            focusSummary: state.focusSummary,
            threadStatus: state.threadStatus
        });
    }

    async searchSessions(query: string, options?: SessionSearchOptions): Promise<SessionSearchMatch[]> {
        return this.sessions.search(query, options);
    }

    async cancelTurn(sessionId: string): Promise<CancelTurnResult> {
        if (!this.turnAbortScopes.isActive(sessionId)) {
            return { cancelled: false, compensated: 0, toolCallIds: [] };
        }
        // Drop any pending approval requests for the session so the UI never
        // keeps stale entries after the turn is cancelled.
        this.toolApprovalManager?.cancelBySession(sessionId);
        this.turnAbortScopes.cancel(sessionId);
        // Cascade cancellation to any running child (sub-agent) sessions so
        // spawned workers do not keep running after their parent is cancelled.
        await this.cancelChildTurns(sessionId);
        // Undo the side effects the turn already applied, newest first.
        const rollback = await this.rollbackTurnCompensations(sessionId, 'cancelled');
        return { cancelled: true, ...rollback };
    }

    override setReviewGate(sessionId: string, taskId: string): void { this.reviewGates.set(sessionId, { active: true, taskId }); }

    override clearReviewGate(sessionId: string): void { this.reviewGates.delete(sessionId); }

    override getReviewGateStatus(sessionId: string): { active: boolean; taskId?: string } {
        const gate = this.reviewGates.get(sessionId);
        return gate ? { active: gate.active, taskId: gate.taskId } : { active: false };
    }

    /**
     * Force a context compaction for the session right now (backing the manual
     * `/compact` command). Rejects when a turn is currently running, because a
     * mid-turn snapshot would race the in-flight turn's message mutations.
     * Reuses the exact same compaction pipeline + history recording + event
     * emission as the automatic overflow path.
     */
    async compactNow(sessionId: string, reason?: string): Promise<CompactNowResult> {
        if (this.sessionTurnsRunning.has(sessionId)) {
            return { sessionId, compacted: false, reason, error: 'turn-in-progress' };
        }
        if (!await this.sessions.has(sessionId)) {
            return { sessionId, compacted: false, reason, error: 'session-not-found' };
        }
        const messages = (await this.sessions.get(sessionId)).messages;
        const prepared = await this.contextManager.compactNow(messages, sessionId);
        const report = prepared.report;
        // Same history record + context-prepared event as the overflow path.
        await this.publishContextPreparedEvent(sessionId, report);

        const summaryMessage = prepared.messages.find(
            m => m.role === 'system' && typeof m.content === 'string' && m.content.startsWith('[Context Summary')
        );
        return {
            sessionId,
            compacted: report.strategy !== 'unchanged' || report.toolMessagesCompacted > 0,
            reason,
            strategy: report.strategy,
            level: report.level,
            summaryInserted: report.summaryInserted,
            beforeMessageCount: report.beforeMessageCount,
            afterMessageCount: report.afterMessageCount,
            beforeTokens: report.beforeTokens,
            afterTokens: report.afterTokens,
            compactedMessageCount: report.compactedMessageCount,
            preservedAnchorCount: report.preservedAnchorCount,
            recentMessageCount: report.recentMessageCount,
            toolMessagesCompacted: report.toolMessagesCompacted,
            prunedMessageCount: report.prunedMessageCount,
            compressionRatio: report.compressionRatio,
            cumulativeTokenSavings: report.cumulativeTokenSavings,
            replayed: report.replayed,
            summary: summaryMessage ? String(summaryMessage.content) : undefined
        };
    }

    registerChildSession(parentSessionId: string, childSessionId: string, metadata?: Record<string, any>): void {
        this.delegation.register(parentSessionId, childSessionId, metadata);
    }

    unregisterChildSession(parentSessionId: string, childSessionId: string, status?: DelegationEdgeStatus): void {
        this.delegation.unregister(parentSessionId, childSessionId, status);
    }

    protected async cancelChildTurns(sessionId: string): Promise<void> {
        await this.delegation.cancelChildren(sessionId);
    }

    protected getCompensationStack(sessionId: string): ReturnType<TurnCompensationController['getStack']> {
        return this.compensations.getStack(sessionId);
    }

    protected pushToolCompensation(sessionId: string, toolName: string, toolCallId: string, captured: unknown): void {
        this.compensations.push(sessionId, toolName, toolCallId, captured);
    }

    protected async rollbackTurnCompensations(
        sessionId: string,
        reason: 'cancelled' | 'error'
    ): Promise<{ compensated: number; toolCallIds: string[] }> {
        return this.compensations.rollback(sessionId, reason);
    }

    private get observability(): TurnObservabilityController {
        return this.turnObservability ??= new TurnObservabilityController({
            app: this.app, uuid: this.uuid, telemetry: this.telemetry,
            turnDiagnosticsStore: this.turnDiagnosticsStore, compactionHistoryStore: this.compactionHistoryStore
        });
    }

    private get turnHistory(): TurnHistoryController {
        return this.turnHistoryController ??= new TurnHistoryController(this.turnHistoryStore, {
            sessions: this.sessions, checkpoints: this.sessionTurnCheckpoints, fileSnapshots: this.fileSnapshotStore, undoFile: id => this.undoFileChange(id), redoFile: id => this.redoFileChange(id)
        });
    }

    override async getSessionInbox(sessionId: string) { return this.sessions.listInbox(sessionId); }

    override async replaceSessionInbox(sessionId: string, items: import('../memory/SessionStore').AgentSessionInboxItem[]) { return this.sessions.replaceInbox(sessionId, items); }

    override async appendInboxItem(sessionId: string, item: import('../memory/SessionStore').AgentSessionInboxItem) { return this.sessions.appendInboxItem(sessionId, item); }

    override async undoTurn(sessionId: string): Promise<AgentTurnUndoResult> {
        if (this.sessionTurnsRunning.has(sessionId)) { return { restored: false }; }
        return this.turnHistory.undo(sessionId);
    }

    override async redoTurn(sessionId: string): Promise<AgentTurnUndoResult> { if (this.sessionTurnsRunning.has(sessionId)) { return { restored: false }; } return this.turnHistory.redo(sessionId); }

    private async promoteSteer(sessionId: string): Promise<void> {
        await promoteInboxSteers(this.sessions, sessionId, (role, content, metadata) => this.createMessage(role, content, undefined, undefined, metadata));
    }

    private async recordSessionTurnCheckpoint(sessionId: string, prompt: string): Promise<void> {
        try { await this.turnHistory.record(sessionId, prompt); } catch { /* Undo falls back to per-file snapshots. */ }
    }

    override async undoFileChange(sessionId: string): Promise<FileUndoRedoResult> { return this.snapshots.undoFile(sessionId); }

    override async redoFileChange(sessionId: string): Promise<FileUndoRedoResult> { return this.snapshots.redoFile(sessionId); }

    override listFileSnapshots(sessionId: string): FileSnapshot[] { return this.snapshots.listFiles(sessionId); }

    override async captureGitStepSnapshot(sessionId: string, workspace: string, messageId: string): Promise<GitStepSnapshot | null> { return this.snapshots.captureGit(sessionId, workspace, messageId); }

    override async revertGitStepSnapshot(sessionId: string, messageId: string): Promise<GitRevertResult> { return this.snapshots.revertGit(sessionId, messageId); }

    override async unrevertGitStepSnapshot(sessionId: string): Promise<GitRevertResult> { return this.snapshots.unrevertGit(sessionId); }

    override async listGitStepSnapshots(sessionId: string): Promise<GitStepSnapshot[]> { return this.snapshots.listGit(sessionId); }

    override async diffGitStepSnapshot(sessionId: string, ref: string): Promise<GitStepDiff | null> { return this.snapshots.diffGit(ref); }

    protected async beginGitStepSnapshot(sessionId: string, workspace?: string): Promise<void> { return this.snapshots.beginGit(sessionId, workspace); }

    protected bindGitStepSnapshot(sessionId: string, messageId: string): void { this.snapshots.bindGit(sessionId, messageId); }

    protected throwIfTurnCancelled(sessionId: string): void {
        this.turnAbortScopes.throwIfCancelled(sessionId);
    }
    /** Complete with a model span; streaming keeps its own chunk-level path. */
    protected completeModelRequest(request: ModelRequest): Promise<ModelResponse> {
        const span = this.telemetry?.startSpan('model.complete', { model: request.model });
        return this.modelAdapter.complete(request).then(
            response => { span?.end('ok'); return response; },
            error => { span?.end('error', { error: error instanceof Error ? error.message : String(error) }); throw error; }
        );
    }
    /** Stream with a model span that ends on completion or failure. */
    protected async *streamModelRequest(request: ModelRequest): AsyncGenerator<any, void, any> {
        const span = this.telemetry?.startSpan('model.stream', { model: request.model });
        try { yield* this.modelAdapter.stream(request); span?.end('ok'); }
        catch (error) { span?.end('error', { error: error instanceof Error ? error.message : String(error) }); throw error; }
    }
    protected prepareModelRequest(sessionId: string, request: ModelRequest, profile?: string, falsifyRate?: number, reasoning?: boolean): ModelRequest {
        this.throwIfTurnCancelled(sessionId);
        request.signal = this.turnAbortScopes.signal(sessionId);
        const resolvedProfile = profile || this.modes.modelProfile(sessionId);
        if (resolvedProfile) {
            request.profile = resolvedProfile;
        }
        if (falsifyRate != null) {
            request.falsifyRate = falsifyRate;
        }
        if (reasoning != null) {
            request.reasoning = reasoning;
        }
        return request;
    }

    private async completeTurn(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext): Promise<AgentTurnResult> {
        const run = this.turnLoop.run(sessionId, query, currentUserMessageId, turnContext, false);
        let step = await run.next();
        while (!step.done) {
            step = await run.next();
        }
        return step.value;
    }

    private async *respondNonStreaming(sessionId: string, request: ModelRequest): AsyncGenerator<StreamChunk, ModelResponse, void> {
        const response = await this.completeModelRequest(request);
        await this.tokenUsageController.recordUsage(sessionId, response);
        await this.app.publishEvent(this.tokenUsageController.buildCompletedEvent(sessionId, response));
        return response;
    }

    private async *respondStreaming(sessionId: string, request: ModelRequest): AsyncGenerator<StreamChunk, ModelResponse, void> {
        const response = yield* this.collectStreamingResponse(sessionId, request);
        await this.tokenUsageController.recordUsage(sessionId, response);
        return response;
    }

    private async finalizeTurnResponse(sessionId: string, currentUserMessageId: string, response: ModelResponse, turnContext: TurnExecutionContext): Promise<AgentMessage> {
        const message = await this.assistant.createMessageFromResponse(sessionId, response);
        this.capturePromptCacheDiagnostics(turnContext, response);
        await this.captureAssistantDiagnostics(sessionId, currentUserMessageId, message, turnContext);
        return message;
    }

    private async *completeStreamingTurn(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext): AsyncGenerator<StreamChunk, AgentTurnResult, void> { return yield* this.turnLoop.run(sessionId, query, currentUserMessageId, turnContext, true); }

    override async askSideQuestion(sessionId: string, question: string): Promise<string> {
        const text = String(question || '').trim();
        if (!text) {
            return '';
        }
        // Reuse the turn context builder (recent history, memory, goal) but
        // strip tools and keep the exchange out of the persisted conversation.
        const request = await this.buildModelRequest(sessionId, text, '', undefined);
        request.tools = [];
        request.messages = [
            ...request.messages,
            {
                id: `side-question-${Date.now()}`,
                role: 'user',
                content: text,
                createdAt: Date.now()
            }
        ];
        const response = await this.completeModelRequest(request);
        return String(response.message || '').trim();
    }

    private async buildModelRequest(sessionId: string, query: string, currentUserMessageId: string, turnContext?: TurnExecutionContext): Promise<ModelRequest> {
        return this.turnRequest.build(sessionId, query, currentUserMessageId, turnContext);
    }

    private async publishContextPreparedEvent(sessionId: string, report: ContextPreparationReport): Promise<void> {
        try {
            await this.app.publishEvent(new AgentContextPreparedEvent(this, sessionId, report));
        } catch {
            // context observability must not break turn execution
        }
        await this.observability.recordCompactionHistory(sessionId, report);
    }

    private createTurnDiagnostics(): AgentTurnDiagnostics { return { emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0, compressionRatio: undefined, compactionLevel: undefined }; }

    private createTurnRecovery(): TurnRecoveryState { return {
            loopPending: false,
            loopInjections: 0,
            repairPending: false,
            repairInjections: 0,
            consecutiveFalsifications: 0,
            totalFalsifications: 0,
            falsifiedEvidence: [],
            attemptHistory: [],
            repeatAttempts: 0,
            writeHints: [],
            editedFiles: [],
            repairHints: [],
            repairRecipes: [],
            terminated: false,
            terminationMessage: ''
        };
    }

    private async completeTerminationMessage(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext, termination: string): Promise<AgentMessage> {
        return this.turnTermination.complete(sessionId, query, currentUserMessageId, turnContext, termination);
    }

    private async *completeStreamingTerminationMessage(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext, termination: string): AsyncGenerator<StreamChunk, AgentMessage, void> {
        return yield* this.turnTermination.completeStreaming(sessionId, query, currentUserMessageId, turnContext, termination);
    }

    private async recordCompactionHistory(sessionId: string, report: ContextPreparationReport): Promise<void> { return this.observability.recordCompactionHistory(sessionId, report); }

    private capturePromptCacheDiagnostics(turnContext: TurnExecutionContext, response: ModelResponse): void {
        const diagnostics = turnContext.diagnostics;
        if (!diagnostics) {
            return;
        }
        const promptCache = response.metadata?.promptCache;
        if (promptCache) {
            diagnostics.promptCache = promptCache as PromptCacheRuntimeMetadata;
        }
    }

    private async captureAssistantDiagnostics(
        sessionId: string,
        currentUserMessageId: string,
        message: AgentMessage,
        turnContext: TurnExecutionContext
    ): Promise<void> {
        const diagnostics = turnContext.diagnostics;
        if (!diagnostics) {
            return;
        }
        diagnostics.finalAssistantWasClarification = isClarificationAssistantMessage(message.content);
        diagnostics.repeatedClarificationDetected = diagnostics.finalAssistantWasClarification
            && hadPriorClarification((await this.sessions.get(sessionId)).messages, currentUserMessageId);
    }

    setSessionToolFilter(sessionId: string, toolsets: string[]): void { this.modes.setToolFilter(sessionId, toolsets); }

    clearSessionToolFilter(sessionId: string): void { this.modes.clearToolFilter(sessionId); }

    setSessionModelProfile(sessionId: string, profileName: string): void { this.modes.setModelProfile(sessionId, profileName); }

    clearSessionModelProfile(sessionId: string): void { this.modes.clearModelProfile(sessionId); }

    protected resolveDefaultArchetype(): AgentPolicyResolution<string> { return this.policy.resolveDefaultArchetype(); }

    resolveSessionArchetype(sessionId: string): AgentPolicyResolution<string> { return this.policy.resolveSessionArchetype(sessionId); }

    resolveVerificationWriteTools(): AgentPolicyResolution<string[]> { return this.policy.resolveVerificationWriteTools(); }

    resolveApprovalRequired(): AgentPolicyResolution<ApprovalRule[]> { return this.policy.resolveApprovalRequired(); }

    resolveApprovalAutoReview(): AgentPolicyResolution<boolean> { return this.policy.resolveApprovalAutoReview(); }

    setApprovalTimeout(timeoutMs: number): void { this.policy.setApprovalTimeout(timeoutMs); }

    setPlanMode(sessionId: string, enabled: boolean): void { this.modes.setPlanMode(sessionId, enabled); }

    isPlanMode(sessionId: string): boolean { return this.modes.isPlanMode(sessionId); }

    setSessionArchetype(sessionId: string, archetype: string | null | undefined): void { this.modes.setArchetype(sessionId, archetype); }

    protected async waitForPendingArchetypeSwitch(sessionId: string): Promise<void> { await this.modes.waitForPendingSwitch(sessionId); }

    getSessionArchetype(sessionId: string): string { return this.modes.getArchetype(sessionId); }

    listArchetypes(): string[] { return this.modes.listArchetypeNames(); }

    listAgentProfiles(): AgentArchetype[] { return this.modes.listAgentProfiles(); }

    protected resolveArchetypeConfig(sessionId: string): AgentArchetype | undefined { return this.modes.archetypeConfig(sessionId); }

    override async setSessionWorkspace(sessionId: string, workspace?: string): Promise<void> { await this.sessions.setWorkspace(sessionId, workspace); }

    setSessionSandboxMode(sessionId: string, mode?: import('../harness/sandbox-exec').SandboxMode | null): void { this.modes.setSandboxMode(sessionId, mode); }

    getSessionSandboxMode(sessionId: string): import('../harness/sandbox-exec').SandboxMode | undefined { return this.modes.sandboxMode(sessionId); }

    override setSessionDelegationMode(sessionId: string, mode?: AgentDelegationMode | null): void { this.modes.setDelegationMode(sessionId, mode); }

    protected resolveDefaultDelegationMode(): AgentPolicyResolution<AgentDelegationMode> { return this.modes.resolveDefaultDelegationMode(); }

    resolveSessionDelegationMode(sessionId: string): AgentPolicyResolution<AgentDelegationMode> { return this.modes.resolveSessionDelegationMode(sessionId); }

    override getSessionDelegationMode(sessionId: string): AgentDelegationMode { return this.modes.getDelegationMode(sessionId); }

    protected resolveDelegationMode(sessionId: string, turnContext?: TurnExecutionContext): AgentDelegationMode { return this.modes.resolveDelegationMode(sessionId, turnContext); }

    private getToolDefinitions(sessionId: string): AgentToolDefinition[] {
        return this.modes.applyToolFilter(sessionId, this.toolRegistry.getCallableToolDefinitions(sessionId));
    }

    protected checkArchetypeToolGate(
        sessionId: string,
        definition: AgentToolDefinition,
        input: Record<string, any>
    ): string | undefined {
        return this.modes.checkToolGate(sessionId, definition, input);
    }

    private async *collectStreamingResponse(sessionId: string, request: ModelRequest): AsyncGenerator<StreamChunk, ModelResponse, void> {
        return yield* collectStreamingResponseView({
            source: this,
            stream: req => this.streamModelRequest(req),
            publish: event => this.app.publishEvent(event),
            estimateTokens: text => this.contextManager.estimateTokens(text),
            buildCompletedEvent: (id, response) => this.tokenUsageController.buildCompletedEvent(id, response)
        }, sessionId, request);
    }

    /** Tell the model how many tool rounds are left, once, before the cap hits. */
    private async warnNearToolRoundLimit(sessionId: string, round: number, maxRounds: number): Promise<void> {
        const prompt = nearToolRoundLimitPrompt(round, maxRounds);
        if (prompt) {
            await this.sessions.append(sessionId, this.createMessage('user', prompt));
        }
    }

    private async handleModelResponse(
        sessionId: string,
        response: ModelResponse,
        currentUserMessageId: string,
        loopDetector: ToolLoopDetector,
        callableTools: AgentToolDefinition[],
        turnContext: TurnExecutionContext
    ): Promise<{ message?: AgentMessage }> {
        if (response.toolCalls?.length) {
            const assistantToolCallMessage = this.createMessage('assistant', response.message ?? '', undefined, undefined, {
                toolCalls: response.toolCalls.map(toolCall => ({ id: toolCall.id, name: toolCall.name, input: toolCall.input })),
                model: response.metadata?.model,
                provider: response.metadata?.provider,
                finishReason: response.metadata?.finishReason,
                usage: response.metadata?.usage,
                reasoningContent: response.metadata?.reasoningContent
            });
            await this.sessions.append(sessionId, assistantToolCallMessage);

            await this.executeTools(sessionId, response.toolCalls, loopDetector, callableTools, turnContext);
            return {};
        }

        const message = await this.assistant.createMessageFromResponse(sessionId, response);
        this.capturePromptCacheDiagnostics(turnContext, response);

        const planContinuation = this.buildPlanContinuation(sessionId, turnContext);
        if (planContinuation) {
            await this.sessions.append(sessionId, message);
            await this.sessions.append(sessionId, this.createMessage('user', planContinuation));
            return {};
        }

        await this.captureAssistantDiagnostics(sessionId, currentUserMessageId, message, turnContext);
        return {
            message
        };
    }

    private trackPlanProgress(sessionId: string, turnContext: TurnExecutionContext, toolName: string, output: unknown): void {
        this.planContinuation.track(sessionId, turnContext, toolName, output);
    }

    private hasUnfinishedPlan(sessionId: string, turnContext: TurnExecutionContext): boolean {
        return this.planContinuation.hasUnfinished(sessionId, turnContext);
    }

    private buildPlanContinuation(sessionId: string, turnContext: TurnExecutionContext): string | undefined {
        return this.planContinuation.build(sessionId, turnContext, this.options.maxPlanContinuations ?? defaultAgentOptions.maxPlanContinuations ?? 3);
    }

    private sessionModeController?: SessionModeController;

    private get modes(): SessionModeController {
        return this.sessionModeController ??= new SessionModeController({
            options: this.options,
            sessions: this.sessions,
            messages: (id) => this.getMessages(id),
            createMessage: (role, content) => this.createMessage(role, content),
            resolveDefaultArchetype: () => this.policy.resolveDefaultArchetype()
        });
    }

    private goalController?: SessionGoalController;

    private get goals(): SessionGoalController {
        return this.goalController ??= new SessionGoalController({ goalStore: this.goalStore });
    }

    private workspaceRootController?: WorkspaceRootController;

    private get workspaceRoot(): WorkspaceRootController {
        return this.workspaceRootController ??= new WorkspaceRootController({
            options: this.options,
            appArgs: this.appArgs as { cwd?: string } | undefined,
            fileAdapter: this.fileAdapter,
            sessions: this.sessions
        });
    }

    private compensationController?: TurnCompensationController;

    private get compensations(): TurnCompensationController {
        return this.compensationController ??= new TurnCompensationController({
            toolRegistry: this.toolRegistry,
            memory: this.memory,
            publish: (event) => this.app.publishEvent(event),
            source: this
        });
    }

    private delegationSessionController?: DelegationSessionController;

    private get delegation(): DelegationSessionController {
        return this.delegationSessionController ??= new DelegationSessionController({
            sessions: this.sessions,
            delegationGraph: this.delegationGraph,
            isTurnActive: (id) => this.turnAbortScopes.isActive(id),
            cancelApprovals: (id) => this.toolApprovalManager?.cancelBySession(id),
            cancelTurn: (id) => this.turnAbortScopes.cancel(id),
            rollback: async (id, reason) => { await this.rollbackTurnCompensations(id, reason); }
        });
    }

    private turnLoopController?: TurnLoopController;

    private get turnLoop(): TurnLoopController {
        return this.turnLoopController ??= new TurnLoopController({
            maxRounds: this.options.maxToolRounds ?? defaultAgentOptions.maxToolRounds!,
            maxLoopRecoveries: this.options.maxLoopRecoveries ?? defaultAgentOptions.maxLoopRecoveries!,
            throwIfTurnCancelled: (id) => this.throwIfTurnCancelled(id),
            sleep: (ms) => this.sleep(ms),
            enforceBudget: (id) => this.tokenUsageController.enforceBudget(id),
            resolveTermination: (context, max) => this.recoveryController.resolveTermination(context, max),
            promoteSteer: (id) => this.promoteSteer(id),
            buildRequest: (id, query, userMessageId, context) => this.buildModelRequest(id, query, userMessageId, context),
            maybeInjectPrompt: (request, context) => this.recoveryController.maybeInjectPrompt(request, context),
            prepareRequest: (id, request, context) => this.prepareModelRequest(
                id, request, context.profile, computeTurnFalsifyRate(context.evidenceLedger), context.agent?.reasoning
            ),
            respond: (id, request) => this.respondNonStreaming(id, request),
            respondStreaming: (id, request) => this.respondStreaming(id, request),
            createMessage: (role, content) => this.createMessage(role, content),
            shouldRetryEmptyResponse: (response) => this.assistant.shouldRetryEmptyResponse(response),
            shouldRecoverEmptyFollowUp: (request, response) => this.assistant.shouldRecoverEmptyFollowUp(request, response),
            findRecentToolError: (id) => this.assistant.findRecentToolError(id),
            handleResponse: (id, response, messageId, detector, tools, context) => this.handleModelResponse(
                id, response, messageId, detector, tools!, context
            ),
            runGate: (id, context, roundStartEvidence) => this.verificationController.runGate(
                id, context, roundStartEvidence, this.options.maxRepairRounds ?? defaultAgentOptions.maxRepairRounds!
            ),
            warnNearToolRoundLimit: (id, round, maxRounds) => this.warnNearToolRoundLimit(id, round, maxRounds),
            buildPlanContinuation: (id, context) => this.buildPlanContinuation(id, context),
            append: async (id, message) => { await this.sessions.append(id, message); },
            finalizeResponse: (id, messageId, response, context) => this.finalizeTurnResponse(id, messageId, response, context),
            completeTermination: (id, query, messageId, context, termination) => this.completeTerminationMessage(id, query, messageId, context, termination),
            completeStreamingTermination: (id, query, messageId, context, termination) => this.completeStreamingTerminationMessage(id, query, messageId, context, termination)
        });
    }

    private get policy(): PolicyResolutionController {
        return this.policyResolution ??= new PolicyResolutionController({
            options: this.options, approvalManager: () => this.toolApprovalManager,
            sessionArchetype: id => this.modes.archetypes.get(id)
        });
    }

    private get hooks(): HookController {
        return this.hooksController ??= new HookController({
            hookManager: this.hookManager, sessions: this.sessions,
            signal: id => this.turnAbortScopes.signal(id),
            createMessage: (role, content, metadata) => this.createMessage(role, content, undefined, undefined, metadata)
        });
    }

    private get snapshots(): SessionSnapshotController {
        return this.sessionSnapshots ??= new SessionSnapshotController({
            fileAdapter: this.fileAdapter, fileSnapshots: this.fileSnapshotStore,
            gitSnapshots: this.gitStepSnapshotStore, afterFileChange: id => this.turnHistory.afterFileChange(id)
        });
    }

    private get memoryRetrievalController(): MemoryRetrievalController {
        return this.memoryRetrieval ??= new MemoryRetrievalController({
            sessions: this.sessions, memory: this.memory, memoryRetriever: this.memoryRetriever,
            app: this.app, source: this
        });
    }

    private get tokenUsageController(): TokenUsageController {
        return this.tokenUsage ??= new TokenUsageController({
            sessions: this.sessions, options: this.options, app: this.app, source: this,
            tokenBudgetTracker: this.tokenBudgetTracker, totals: this.sessionUsageTotals
        });
    }

    private get verificationController(): VerificationController {
        return this.verification ??= new VerificationController({
            options: this.options, turnDiagnosticsStore: this.turnDiagnosticsStore,
            signal: id => this.turnAbortScopes.signal(id),
            readFileText: path => this.snapshots.readText(path),
            resolveWriteTools: () => this.resolveVerificationWriteTools().value,
            hasUnfinishedPlan: (id, context) => this.hasUnfinishedPlan(id, context),
            falsificationSummary: recovery => this.recoveryController.buildFalsificationSummaryMessage(recovery)
        });
    }

    private get assistant(): TurnAssistantController {
        return this.turnAssistant ??= new TurnAssistantController({
            sessions: this.sessions,
            createMessage: (role, content, metadata) => this.createMessage(role, content, undefined, undefined, metadata)
        });
    }

    private get recoveryController(): TurnRecoveryController {
        return this.turnRecovery ??= new TurnRecoveryController({
            createMessage: (role, content) => this.createMessage(role, content)
        });
    }

    private get toolLifecycleController(): ToolInvocationLifecycle {
        return this.toolLifecycle ??= new ToolInvocationLifecycle({
            app: this.app, sessions: this.sessions, toolRegistry: this.toolRegistry as any,
            createMessage: (role, content, name, toolCallId, metadata) => this.createMessage(role, content, name, toolCallId, metadata),
            runAfterToolHooks: async (sessionId, result, workspace) => {
                await this.hooks.run('afterTool', sessionId, {
                    sessionId, workspace, stage: 'afterTool',
                    toolCall: { id: result.toolCall.id, name: result.toolCall.name, input: result.metadata?.toolCallInput },
                    executionMode: result.receipt.executionMode,
                    metadata: { receipt: result.receipt, error: result.error?.message, output: result.content }
                });
            }
        });
    }

    private get turnTermination(): TurnTerminationController {
        return this.turnTerminationController ??= new TurnTerminationController({
            sessions: this.sessions,
            buildWrapUp: termination => this.recoveryController.buildTerminationWrapUpMessage(termination),
            buildModelRequest: (sessionId, query, currentId, context) => this.buildModelRequest(sessionId, query, currentId, context),
            prepareRequest: (sessionId, request, context) => this.prepareModelRequest(sessionId, request, context.profile, computeTurnFalsifyRate(context.evidenceLedger), context.agent?.reasoning),
            completeModel: request => this.completeModelRequest(request),
            collectStreaming: (sessionId, request) => this.collectStreamingResponse(sessionId, request),
            recordUsage: (sessionId, response) => this.tokenUsageController.recordUsage(sessionId, response),
            publishCompleted: async (sessionId, response) => { await this.app.publishEvent(this.tokenUsageController.buildCompletedEvent(sessionId, response)); },
            createMessage: (role, content, metadata) => this.createMessage(role, content, undefined, undefined, metadata)
        });
    }

    private get turnRequest(): TurnRequestController {
        return this.turnRequestController ??= new TurnRequestController({
            sessions: this.sessions, goalStore: this.goalStore, contextManager: this.contextManager,
            memory: this.memory, promptBuilder: this.promptBuilder, modelAdapter: this.modelAdapter as any,
            options: this.options,
            getRecentMessages: (messages, currentId) => this.getRecentMessages(messages, currentId),
            getRelevantMemory: (query, sessionId) => this.memoryRetrievalController.getRelevantMemory(query, sessionId),
            publishContextPrepared: (sessionId, report) => this.publishContextPreparedEvent(sessionId, report),
            getToolDefinitions: sessionId => this.getToolDefinitions(sessionId),
            resolveArchetypeConfig: sessionId => this.resolveArchetypeConfig(sessionId),
            resolveDelegationMode: (sessionId, context) => this.resolveDelegationMode(sessionId, context),
            createMessage: (role, content) => this.createMessage(role, content)
        });
    }

    private get postTurn(): SessionPostTurnController {
        return this.postTurnController ??= new SessionPostTurnController({
            sessions: this.sessions, memory: this.memory, summarizer: this.summarizer,
            summaryAgent: this.summaryAgent, experienceDistiller: this.experienceDistiller,
            options: this.options, app: this.app, uuid: this.uuid,
            signal: sessionId => this.turnAbortScopes.signal(sessionId)
        });
    }

    private get toolBatch(): TurnToolBatchController {
        return this.turnToolBatch ??= new TurnToolBatchController({
            options: this.options,
            requiresApproval: this.toolApprovalManager
                ? (name, input) => this.toolApprovalManager!.requiresApproval(name, input)
                : undefined,
            getToolDefinition: name => this.toolRegistry.getToolDefinition(name),
            runSequential: async (sessionId, call, detector, tools, context) => { await this.invokeSingleTool(sessionId, call, detector, 'sequential', tools, context); },
            runParallel: (sessionId, call, detector, tools, context) => this.performToolInvocation(sessionId, call, detector, 'parallel', tools, context),
            settle: async (sessionId, result, context) => {
                this.recordToolEvidence(context, result.receipt, result.error);
                this.maybeApplyDelegationQualityGate(sessionId, result, context);
                await this.toolLifecycleController.finalize(sessionId, result);
            },
            settleError: async (sessionId, error, context) => {
                this.recordToolEvidence(context, {
                    receiptId: this.uuid.generate(), toolCallId: 'unknown', toolName: 'unknown',
                    executionMode: 'parallel', status: 'error', error: error.message
                }, error);
                await this.sessions.append(sessionId, this.createMessage('tool', JSON.stringify({ error: error.message }), 'unknown', undefined, { error: error.message }));
            }
        });
    }

    private async executeTools(sessionId: string, toolCalls: AgentToolCall[], loopDetector: ToolLoopDetector, callableTools: AgentToolDefinition[], turnContext: TurnExecutionContext): Promise<void> {
        return this.toolBatch.execute(sessionId, toolCalls, loopDetector, callableTools, turnContext);
    }

    private async invokeSingleTool(
        sessionId: string,
        toolCall: { id: string; name: string; input?: any },
        loopDetector: ToolLoopDetector,
        executionMode: 'sequential' | 'parallel',
        callableTools: AgentToolDefinition[],
        turnContext: TurnExecutionContext,
        persistMessage = true
    ): Promise<Error | undefined> {
        const result = await this.performToolInvocation(sessionId, toolCall, loopDetector, executionMode, callableTools, turnContext);
        this.recordToolEvidence(turnContext, result.receipt, result.error);
        this.maybeApplyDelegationQualityGate(sessionId, result, turnContext);
        if (persistMessage) {
            await this.toolLifecycleController.finalize(sessionId, result);
        }
        return result.error;
    }

    /**
     * G29: in proactive delegation mode, a coding_task that ended with a
     * failed action or incomplete delivery sets a transient quality note that
     * the next model request injects as a system message (delegate the
     * remaining work to sub-agents). The note is consumed exactly once.
     */
    private maybeApplyDelegationQualityGate(
        sessionId: string,
        result: ToolInvocationResult,
        turnContext: TurnExecutionContext
    ): void {
        if (this.resolveDelegationMode(sessionId, turnContext) !== 'proactive') {
            return;
        }
        if (result.toolCall.name !== 'coding_task') {
            return;
        }
        const note = buildDelegationQualityNote(result.error, result.structuredOutput);
        if (note && turnContext && !turnContext.delegationQualityNote) {
            turnContext.delegationQualityNote = note;
        }
    }

    private recordToolEvidence(turnContext: TurnExecutionContext, receipt: AgentToolExecutionReceipt, error?: Error): void {
        const definition = this.toolRegistry?.getTool?.(receipt.toolName);
        turnContext.evidenceLedger?.record({
            toolName: receipt.toolName,
            status: receipt.status === 'running' ? 'success' : receipt.status,
            readOnly: definition?.execution?.readOnly === true,
            inputSummary: receipt.inputSummary,
            outputSummary: receipt.outputSummary,
            durationMs: receipt.durationMs,
            error: receipt.error ?? error?.message,
            lspDiagnostics: receipt.lspDiagnostics
        });
    }

    private async performToolInvocation(
        sessionId: string,
        toolCall: { id: string; name: string; input?: any },
        loopDetector: ToolLoopDetector,
        executionMode: 'sequential' | 'parallel',
        callableTools: AgentToolDefinition[],
        turnContext: TurnExecutionContext
    ): Promise<ToolInvocationResult> {
        const preflight = await runToolPreflight({
            fail: (call, input, summary, receipt, error, skip) => this.toolLifecycleController.failed(call, input, summary, receipt, error, skip),
            getDefinition: (name, id) => this.toolRegistry.getToolDefinition(name, id),
            checkArchetypeGate: (id, definition, input) => this.checkArchetypeToolGate(id, definition, input),
            ensureActivation: (id, definition) => this.toolLifecycleController.ensureActivation(id, definition),
            resolveSandbox: (definition, workspace, supported, mode) => resolveSessionToolSandboxState(definition, workspace, supported, mode),
            decorateSandbox: (receipt, state) => decorateToolSandboxReceipt(receipt, state),
            supportsSandbox: () => !!this.toolExecutionCoordinator?.isSandboxExecutionSupported(),
            sessionSandboxMode: id => id ? effectiveSandboxMode(this.modes.sandboxMode(id), this.options) : undefined,
            trust: this.workspaceTrust ?? undefined,
            isWorkspaceMutating: definition => isWorkspaceMutatingTool(definition),
            resolveTrust: input => resolveWorkspaceTrustApproval(input),
            approvalManager: this.toolApprovalManager,
            runHooks: (stage, id, context) => this.hooks.run(stage, id, context),
            isAborted: id => this.turnAbortScopes.isAborted(id),
            throwIfCancelled: id => this.throwIfTurnCancelled(id),
            uuid: () => this.uuid.generate()
        }, sessionId, toolCall, loopDetector, executionMode, callableTools, turnContext);
        if (preflight.failed) {
            return preflight.failed;
        }
        let { toolCallInput, inputSummary, baseReceipt } = preflight as any;
        const { definition, sandboxState } = preflight as any;
        let sandboxReceipt = preflight.sandboxReceipt as any;

        await this.app.publishEvent(new AgentToolInvokedEvent(this, sessionId, toolCall.name, toolCallInput, sandboxReceipt));

        return executeToolInvocation({
            app: this.app, options: this.options, toolRegistry: this.toolRegistry,
            toolExecutionCoordinator: this.toolExecutionCoordinator, fileAdapter: this.fileAdapter,
            memory: this.memory, approvalManager: this.toolApprovalManager,
            now: () => this.now(), signal: id => this.turnAbortScopes.signal(id), sandboxMode: id => effectiveSandboxMode(this.modes.sandboxMode(id), this.options),
            fail: (call, input, summary, receipt, error) => this.toolLifecycleController.failed(call, input, summary, receipt, error),
            recordLoop: (name, input, output) => loopDetector.record(name, input, output),
            trackPlan: (id, context, name, output) => this.trackPlanProgress(id, context, name, output),
            pushCompensation: (id, name, callId, capture) => this.pushToolCompensation(id, name, callId, capture),
            captureWriteHint: (id, context, call, def, snapshot) => this.verificationController.captureWriteHint(id, context, call, def, snapshot),
            pushFileSnapshot: (id, snapshot) => this.snapshots.pushFile(id, snapshot),
            trackEditedFile: (context, call, def, snapshot) => this.verificationController.trackEditedFile(context, call, def, snapshot)
        }, sessionId, toolCall, loopDetector, executionMode, toolCallInput, inputSummary, definition, sandboxReceipt, turnContext);
    }

    private async acquireSessionTurnLock(sessionId: string): Promise<() => void> {
        this.turnLeases ??= new SessionTurnLeaseManager(this.sessions, this.uuid.generate());
        const releaseLease = await this.turnLeases.enter(sessionId);
        const currentDepth = this.sessionTurnDepths.get(sessionId) ?? 0;
        if (currentDepth >= DefaultAgentRuntime.MAX_PENDING_SESSION_TURNS) {
            releaseLease();
            throw new Error(`Session '${sessionId}' turn queue limit reached.`);
        }
        this.sessionTurnDepths.set(sessionId, currentDepth + 1);

        if (this.sessionTurnsRunning.has(sessionId)) {
            await new Promise<void>(resolve => {
                const queue = this.sessionTurnQueues.get(sessionId) ?? [];
                queue.push(resolve);
                this.sessionTurnQueues.set(sessionId, queue);
            });
        } else {
            this.sessionTurnsRunning.add(sessionId);
        }

        let released = false;

        return () => {
            if (released) {
                return;
            }
            released = true;

            const depth = this.sessionTurnDepths.get(sessionId) ?? 1;
            if (depth <= 1) {
                this.sessionTurnDepths.delete(sessionId);
            } else {
                this.sessionTurnDepths.set(sessionId, depth - 1);
            }

            const queue = this.sessionTurnQueues.get(sessionId);
            const next = queue?.shift();
            if (queue && !queue.length) {
                this.sessionTurnQueues.delete(sessionId);
            }
            if (next) {
                next();
                return;
            }
            this.sessionTurnsRunning.delete(sessionId);
            releaseLease();
        };
    }

    override registerHookFunction(stage: AgentLifecycleHookStage, hook: AgentFunctionHookDefinition): void { this.hooks.register(stage, hook); }

    override unregisterHookFunction(stage: AgentLifecycleHookStage, name?: string): void { this.hooks.unregister(stage, name); }

    override getHookSummary(): Array<{ stage: AgentLifecycleHookStage; commands: string[]; functions: string[] }> { return this.hooks.summary(); }

    listPermissionRules(sessionId?: string): import('../permissions/PermissionEngine').PermissionRule[] { return this.toolApprovalManager?.listPermissionRules?.(sessionId) ?? []; }

    inspectPermission(toolName: string, input: any, sessionId?: string): import('../permissions/PermissionEngine').PermissionDecision | undefined { return this.toolApprovalManager?.inspectPermission?.(toolName, input, sessionId); }

    async ensureSessionTitle(sessionId: string): Promise<string | undefined> { return this.postTurn.ensureSessionTitle(sessionId); }

    async refreshSessionSummary(sessionId: string): Promise<string | undefined> { return this.postTurn.refreshSessionSummary(sessionId); }

    override async getTokenBudgetState(sessionId: string): Promise<TokenBudgetScopeState[]> { return this.tokenUsageController.getState(sessionId); }

    private resolveApprovalManager(approvalManager?: ApprovalManager): ApprovalManager | undefined {
        return resolveRuntimeApprovalManager({
            approvalManager,
            required: this.resolveApprovalRequired().value,
            autoReview: this.resolveApprovalAutoReview().value,
            options: this.options,
            app: this.app,
            uuid: this.uuid,
            clock: this.clock
        });
    }

    private getRecentMessages(messages: AgentMessage[], currentUserMessageId: string): AgentMessage[] {
        const recentLimit = this.options.session?.recentMessages ?? defaultAgentOptions.session!.recentMessages!;
        if (!recentLimit || recentLimit < 0 || messages.length <= recentLimit) {
            return messages;
        }
        const currentUserMessage = messages.find(message => message.id === currentUserMessageId);
        if (!currentUserMessage) {
            return messages;
        }
        const currentIndex = messages.indexOf(currentUserMessage);
        // Keep the whole in-flight turn; window only the prior-turn prefix. Dropping
        // the active turn's tool history makes the model forget its own actions.
        const turnMessages = messages.slice(currentIndex);
        const prefix = messages.slice(0, currentIndex);
        const prefixBudget = Math.max(0, recentLimit - turnMessages.length);
        if (prefix.length <= prefixBudget) {
            return messages;
        }
        let sliceStart = this.alignSliceStartToToolRound(prefix, prefix.length - prefixBudget);
        const keptPrefix = prefix.slice(sliceStart);
        return [...keptPrefix, ...turnMessages];
    }

    // Never begin a retained window mid tool-round: an orphaned tool result forces the adapter to synthesize an assistant tool-call message without reasoning_content.
    private alignSliceStartToToolRound(messages: AgentMessage[], sliceStart: number): number {
        if (sliceStart <= 0 || messages[sliceStart]?.role !== 'tool') {
            return sliceStart;
        }
        const leadingToolCallId = messages[sliceStart].toolCallId;
        let probe = sliceStart;
        while (probe > 0 && messages[probe].role === 'tool') {
            probe--;
        }
        const owner = messages[probe];
        const toolCalls = owner?.metadata?.toolCalls;
        const ownerMatches = owner?.role === 'assistant' && Array.isArray(toolCalls) && toolCalls.length > 0
            && (!leadingToolCallId || toolCalls.some((call: { id?: string }) => call.id === leadingToolCallId));
        if (ownerMatches) {
            return probe;
        }
        let adjusted = sliceStart;
        while (adjusted < messages.length && messages[adjusted]?.role === 'tool') {
            adjusted++;
        }
        return adjusted;
    }

    protected createMessage(
        role: AgentMessage['role'],
        content: string,
        name?: string,
        toolCallId?: string,
        metadata?: Record<string, any>,
        parts?: AgentMessagePart[]
    ): AgentMessage {
        return {
            id: `${Date.now()}-${Math.random()}`,
            role,
            content,
            parts: normalizeAgentMessageParts(parts),
            name,
            toolCallId,
            createdAt: Date.now(),
            metadata
        };
    }
}
