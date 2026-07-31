import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ApplicationContext, RunContext, Runner, createRunContext } from '@tsdi/core';
import { randomUUID } from 'crypto';
import { AgentRuntime } from './AgentRuntime';
import { AgentTurnInput } from './AgentTurnInput';
import { AgentTurnResult } from './AgentTurnResult';
import { TurnHandler } from './TurnHandler';
import { AgentMessage } from './AgentMessage';
import { AgentContextPreparedEvent, AgentErrorEvent, AgentMemoryRetrievedEvent, AgentMemoryRetrievalFailedEvent, AgentMemoryRetrievalStartedEvent, AgentMemoryUpdatedEvent, AgentModelCompletedEvent, AgentStreamChunkEvent, AgentToolCompletedEvent, AgentToolExecutionReceipt, AgentToolFailedEvent, AgentToolInvokedEvent, AgentToolSkippedEvent, AgentTurnCancelledEvent, AgentTurnCompletedEvent, AgentTurnDiagnostics, AgentTurnDiagnosticsEvent, AgentTurnStartedEvent } from './AgentEvents';
import { AgentTurnCancelledError } from './AgentTurnCancelledError';
import { ModelAdapter } from '../model/ModelAdapter';
import { ModelRequest } from '../model/ModelRequest';
import { AgentToolCall, ModelResponse } from '../model/ModelResponse';
import { StreamChunk } from '../model/StreamChunk';
import { ToolRegistry } from '../tools/ToolRegistry';
import { ToolLoopDetector } from '../tools/ToolLoopDetector';
import { ApprovalDecision, DefaultApprovalStrategy, ToolApprovalManager } from '../tools/ToolApprovalManager';
import { SessionSearchMatch, SessionSearchOptions, SessionStore } from '../memory/SessionStore';
import { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSummarizer } from '../memory/SessionSummarizer';
import { AGENT_OPTIONS } from '../tokens';
import { AgentOptions, defaultAgentOptions } from '../options';
import { ExperienceDistiller } from '../memory/ExperienceDistiller';
import { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';
import { AgentContextManager, ContextPreparationReport, SynthesisOptions, SynthesisReport } from '../context/AgentContextManager';
import { AgentMemoryRetriever } from '../memory/AgentMemoryRetriever';
import { AgentToolDefinition } from '../tools/AgentTool';
import { summarizeToolDisplayText } from '../tools/ToolSummary';
import { AgentScheduler } from '../scheduler/AgentScheduler';
import { ToolExecutionCoordinator } from '../harness/ToolExecutionCoordinator';
import { ToolSchemaValidator } from '../harness/ToolSchemaValidator';
import { RateLimitManager } from '../harness/RateLimitManager';
import { OutputGuard } from '../harness/OutputGuard';
import { resolveToolSandboxState, ToolSandboxState } from '../harness/ToolSandboxPolicy';

interface ToolInvocationResult {
    toolCall: { id: string; name: string; input?: any };
    content: string;
    metadata: Record<string, any>;
    receipt: AgentToolExecutionReceipt;
    error?: Error;
}

interface TurnExecutionContext {
    principalId?: string;
    workspace?: string;
    diagnostics?: AgentTurnDiagnostics;
}

const EMPTY_RESPONSE_RETRY_SYSTEM_PROMPT = 'Your previous reply was empty. Use the existing conversation context and provide a non-empty helpful answer. If the latest user message already answers a prior clarification, continue the original task directly and call tools if needed. If you still need information, ask one concise follow-up question.';
const FOLLOW_UP_EMPTY_RESPONSE_RECOVERY_SYSTEM_PROMPT = 'The latest user message already contains follow-up context answering a prior clarification. Continue the original task directly using that follow-up context. Provide a non-empty response, and call tools if needed. Do not repeat the same clarification question.';
@Injectable()
export class DefaultAgentRuntime extends AgentRuntime {
    protected contextManager: AgentContextManager;
    protected toolApprovalManager?: ToolApprovalManager;
    protected _stopped = false;
    protected sessionTurnQueues = new Map<string, Array<() => void>>();
    protected sessionTurnDepths = new Map<string, number>();
    protected sessionTurnsRunning = new Set<string>();
    protected sessionTurnAborts = new Map<string, AbortController>();
    protected sessionChildSessions = new Map<string, Set<string>>();
    protected static readonly MAX_PENDING_SESSION_TURNS = 32;

    constructor(
        protected modelAdapter: ModelAdapter,
        protected toolRegistry: ToolRegistry,
        protected sessions: SessionStore,
        protected memory: MemoryStore,
        protected summarizer: SessionSummarizer,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) protected options: AgentOptions,
        protected app: ApplicationContext,
        @Optional() @Inject(ExperienceDistiller) protected experienceDistiller?: ExperienceDistiller,
        @Optional() protected promptBuilder?: SystemPromptBuilder,
        @Optional() protected approvalManagerInput?: ToolApprovalManager,
        @Optional() protected injectedContextManager?: AgentContextManager,
        @Optional() @Inject(AgentMemoryRetriever) protected memoryRetriever?: AgentMemoryRetriever,
        @Optional() protected toolExecutionCoordinator?: ToolExecutionCoordinator
    ) {
        super();
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
        this.toolApprovalManager = this.resolveApprovalManager(this.approvalManagerInput);
        if (!this.toolExecutionCoordinator) {
            this.toolExecutionCoordinator = new ToolExecutionCoordinator(
                this.toolRegistry,
                new ToolSchemaValidator(),
                new RateLimitManager(),
                new OutputGuard(),
                this.app
            );
        }
    }

    async runTurn(sessionId: string, input: string, principalId?: string): Promise<AgentTurnResult> {
        const release = await this.acquireSessionTurnLock(sessionId);
        this.beginTurnAbortScope(sessionId);
        try {
            await this.ensureSessionWorkspace(sessionId);
            const handler = typeof (this.app as any)?.get === 'function'
                ? (this.app as any).get(TurnHandler, null) as {
                    injector?: ApplicationContext,
                    handle(input: AgentTurnInput, context: RunContext): Promise<AgentTurnResult>
                } | null
                : null;
            if (!handler) {
                return await this.processTurn({ sessionId, input, principalId });
            }
            return await handler.handle({ sessionId, input, principalId }, createRunContext(handler.injector ?? this.app));
        } finally {
            this.endTurnAbortScope(sessionId);
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
        const timeout = this.options.scheduler?.shutdownTimeoutMs ?? 10000;
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
        await this.ensureSessionWorkspace(input.sessionId);
        await this.app.publishEvent(new AgentTurnStartedEvent(this, input.sessionId, input.input));
        const userMessage = this.createMessage('user', input.input);
        await this.sessions.append(input.sessionId, userMessage);
        const turnContext: TurnExecutionContext = {
            principalId: input.principalId,
            workspace: await this.resolveSessionWorkspace(input.sessionId),
            diagnostics: this.createTurnDiagnostics()
        };

        try {
            const result = await this.completeTurn(input.sessionId, input.input, userMessage.id, turnContext);
            await this.sessions.append(input.sessionId, result.message);
            await this.maybeSummarize(input.sessionId);
            await this.maybeDistillExperience(input.sessionId, userMessage, result.message);
            await this.publishTurnDiagnosticsEvent(input.sessionId, turnContext.diagnostics);
            await this.app.publishEvent(new AgentTurnCompletedEvent(this, input.sessionId, result.message));
            return result;
        } catch (error) {
            if (error instanceof AgentTurnCancelledError || this.isTurnAborted(input.sessionId)) {
                await this.app.publishEvent(new AgentTurnCancelledEvent(this, input.sessionId));
                throw error instanceof AgentTurnCancelledError ? error : new AgentTurnCancelledError(input.sessionId);
            }
            const err = error instanceof Error ? error : new Error(String(error));
            await this.app.publishEvent(new AgentErrorEvent(this, input.sessionId, err));
            throw err;
        }
    }

    synthesizeExperiences(options?: SynthesisOptions): SynthesisReport {
        return this.contextManager.synthesizeExperiences(options);
    }

    async *runStreamingTurn(sessionId: string, input: string, principalId?: string): AsyncGenerator<StreamChunk> {
        const release = await this.acquireSessionTurnLock(sessionId);
        this.beginTurnAbortScope(sessionId);
        try {
            await this.ensureSessionWorkspace(sessionId);
            await this.app.publishEvent(new AgentTurnStartedEvent(this, sessionId, input));
            const userMessage = this.createMessage('user', input);
            await this.sessions.append(sessionId, userMessage);
            const turnContext: TurnExecutionContext = {
                principalId,
                workspace: await this.resolveSessionWorkspace(sessionId),
                diagnostics: this.createTurnDiagnostics()
            };

            try {
                const result = yield* this.completeStreamingTurn(sessionId, input, userMessage.id, turnContext);
                await this.sessions.append(sessionId, result.message);
                await this.maybeSummarize(sessionId);
                await this.maybeDistillExperience(sessionId, userMessage, result.message);
                await this.publishTurnDiagnosticsEvent(sessionId, turnContext.diagnostics);
                await this.app.publishEvent(new AgentTurnCompletedEvent(this, sessionId, result.message));
                await this.app.publishEvent(new AgentStreamChunkEvent(this, sessionId, 'done'));
                yield { type: 'done' };
            } catch (error) {
                if (error instanceof AgentTurnCancelledError || this.isTurnAborted(sessionId)) {
                    await this.app.publishEvent(new AgentTurnCancelledEvent(this, sessionId));
                    throw error instanceof AgentTurnCancelledError ? error : new AgentTurnCancelledError(sessionId);
                }
                const err = error instanceof Error ? error : new Error(String(error));
                await this.app.publishEvent(new AgentErrorEvent(this, sessionId, err));
                throw err;
            }
        } finally {
            this.endTurnAbortScope(sessionId);
            release();
        }
    }

    protected async ensureSessionWorkspace(sessionId: string): Promise<void> {
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

    protected async resolveSessionWorkspace(sessionId: string): Promise<string | undefined> {
        const state = await this.sessions.get(sessionId);
        return String(state.workspace || '').trim() || undefined;
    }

    protected resolveWorkspace(): string | undefined {
        const consoleOptions = this.options.ui?.console as Record<string, any> | undefined;
        const workspace = String(consoleOptions?.workspace || '').trim();
        return workspace || undefined;
    }

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

    async searchSessions(query: string, options?: SessionSearchOptions): Promise<SessionSearchMatch[]> {
        return this.sessions.search(query, options);
    }

    async cancelTurn(sessionId: string): Promise<boolean> {
        const controller = this.sessionTurnAborts.get(sessionId);
        if (!controller || controller.signal.aborted) {
            return false;
        }
        // Drop any pending approval requests for the session so the UI never
        // keeps stale entries after the turn is cancelled.
        this.toolApprovalManager?.cancelBySession(sessionId);
        controller.abort();
        // Cascade cancellation to any running child (sub-agent) sessions so
        // spawned workers do not keep running after their parent is cancelled.
        await this.cancelChildTurns(sessionId);
        return true;
    }

    registerChildSession(parentSessionId: string, childSessionId: string): void {
        const children = this.sessionChildSessions.get(parentSessionId) ?? new Set<string>();
        children.add(childSessionId);
        this.sessionChildSessions.set(parentSessionId, children);
    }

    unregisterChildSession(parentSessionId: string, childSessionId: string): void {
        const children = this.sessionChildSessions.get(parentSessionId);
        if (!children) {
            return;
        }
        children.delete(childSessionId);
        if (!children.size) {
            this.sessionChildSessions.delete(parentSessionId);
        }
    }

    protected async cancelChildTurns(sessionId: string): Promise<void> {
        const children = this.sessionChildSessions.get(sessionId);
        if (!children?.size) {
            return;
        }
        for (const childSessionId of Array.from(children)) {
            const controller = this.sessionTurnAborts.get(childSessionId);
            if (!controller || controller.signal.aborted) {
                continue;
            }
            this.toolApprovalManager?.cancelBySession(childSessionId);
            controller.abort();
            await this.cancelChildTurns(childSessionId);
        }
    }

    protected beginTurnAbortScope(sessionId: string): void {
        this.sessionTurnAborts.set(sessionId, new AbortController());
    }

    protected endTurnAbortScope(sessionId: string): void {
        this.sessionTurnAborts.delete(sessionId);
    }

    protected getTurnAbortSignal(sessionId: string): AbortSignal | undefined {
        return this.sessionTurnAborts.get(sessionId)?.signal;
    }

    protected isTurnAborted(sessionId: string): boolean {
        return this.sessionTurnAborts.get(sessionId)?.signal.aborted === true;
    }

    protected throwIfTurnCancelled(sessionId: string): void {
        if (this.isTurnAborted(sessionId)) {
            throw new AgentTurnCancelledError(sessionId);
        }
    }

    protected prepareModelRequest(sessionId: string, request: ModelRequest): ModelRequest {
        this.throwIfTurnCancelled(sessionId);
        request.signal = this.getTurnAbortSignal(sessionId);
        return request;
    }

    private async completeTurn(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext): Promise<AgentTurnResult> {
        const loopDetector = new ToolLoopDetector();
        loopDetector.reset();
        let round = 0;
        const maxRounds = this.options.maxToolRounds ?? defaultAgentOptions.maxToolRounds!;
        let emptyResponseRetried = false;

        while (round <= maxRounds) {
            this.throwIfTurnCancelled(sessionId);
            const request = await this.buildModelRequest(sessionId, query, currentUserMessageId, turnContext);
            let response = await this.modelAdapter.complete(this.prepareModelRequest(sessionId, request));
            await this.app.publishEvent(new AgentModelCompletedEvent(this, sessionId, response));
            if (!emptyResponseRetried && this.shouldRetryEmptyResponse(response)) {
                emptyResponseRetried = true;
                if (turnContext.diagnostics) {
                    turnContext.diagnostics.emptyResponseRetryCount++;
                }
                response = await this.modelAdapter.complete(this.prepareModelRequest(sessionId, this.buildEmptyResponseRetryRequest(request)));
                await this.app.publishEvent(new AgentModelCompletedEvent(this, sessionId, response));
            }
            if (this.shouldRecoverEmptyFollowUpResponse(request, response)) {
                if (turnContext.diagnostics) {
                    turnContext.diagnostics.followUpRecoveryCount++;
                }
                response = await this.modelAdapter.complete(this.prepareModelRequest(sessionId, this.buildFollowUpRecoveryRequest(request)));
                await this.app.publishEvent(new AgentModelCompletedEvent(this, sessionId, response));
            }

            const handled = await this.handleModelResponse(sessionId, response, currentUserMessageId, loopDetector, request.tools, turnContext);
            if (handled.message) {
                return { sessionId, message: handled.message };
            }

            round++;
        }

        this.throwIfTurnCancelled(sessionId);
        const limitMessage = this.createMessage('user', 'You have reached the maximum number of tool call rounds. Please provide your best answer now based on the results you have so far.');
        await this.sessions.append(sessionId, limitMessage);

        const finalRequest = await this.buildModelRequest(sessionId, query, currentUserMessageId, turnContext);
        const finalResponse = await this.modelAdapter.complete(this.prepareModelRequest(sessionId, finalRequest));
        await this.app.publishEvent(new AgentModelCompletedEvent(this, sessionId, finalResponse));

        const finalMessage = await this.createAssistantMessageFromResponse(sessionId, finalResponse);
        await this.captureAssistantDiagnostics(sessionId, currentUserMessageId, finalMessage, turnContext);
        return { sessionId, message: finalMessage };
    }

    private async *completeStreamingTurn(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext): AsyncGenerator<StreamChunk, AgentTurnResult, void> {
        const loopDetector = new ToolLoopDetector();
        loopDetector.reset();
        let round = 0;
        const maxRounds = this.options.maxToolRounds ?? defaultAgentOptions.maxToolRounds!;
        let emptyResponseRetried = false;

        while (round <= maxRounds) {
            this.throwIfTurnCancelled(sessionId);
            const request = await this.buildModelRequest(sessionId, query, currentUserMessageId, turnContext);
            let response = yield* this.collectStreamingResponse(sessionId, this.prepareModelRequest(sessionId, request));
            if (!emptyResponseRetried && this.shouldRetryEmptyResponse(response)) {
                emptyResponseRetried = true;
                if (turnContext.diagnostics) {
                    turnContext.diagnostics.emptyResponseRetryCount++;
                }
                response = yield* this.collectStreamingResponse(sessionId, this.prepareModelRequest(sessionId, this.buildEmptyResponseRetryRequest(request)));
            }
            if (this.shouldRecoverEmptyFollowUpResponse(request, response)) {
                if (turnContext.diagnostics) {
                    turnContext.diagnostics.followUpRecoveryCount++;
                }
                response = yield* this.collectStreamingResponse(sessionId, this.prepareModelRequest(sessionId, this.buildFollowUpRecoveryRequest(request)));
            }

            const handled = await this.handleModelResponse(sessionId, response, currentUserMessageId, loopDetector, request.tools, turnContext);
            if (handled.message) {
                return { sessionId, message: handled.message };
            }

            round++;
        }

        this.throwIfTurnCancelled(sessionId);
        yield { type: 'text', content: '\n\n[Reached tool round limit. Requesting final answer...]\n\n' };
        const limitMessage = this.createMessage('user', 'You have reached the maximum number of tool call rounds. Please provide your best answer now based on the results you have so far.');
        await this.sessions.append(sessionId, limitMessage);

        const finalRequest = await this.buildModelRequest(sessionId, query, currentUserMessageId, turnContext);
        const finalResponse = yield* this.collectStreamingResponse(sessionId, this.prepareModelRequest(sessionId, finalRequest));

        const finalMessage = await this.createAssistantMessageFromResponse(sessionId, finalResponse);
        await this.captureAssistantDiagnostics(sessionId, currentUserMessageId, finalMessage, turnContext);
        return { sessionId, message: finalMessage };
    }

    private async buildModelRequest(sessionId: string, query: string, currentUserMessageId: string, turnContext?: TurnExecutionContext): Promise<ModelRequest> {
        const state = await this.sessions.get(sessionId);
        let messages = this.getRecentMessages(state.messages, currentUserMessageId);
        const rewrittenMessages = this.rewriteClarificationFollowUp(messages, currentUserMessageId);
        if (turnContext?.diagnostics && rewrittenMessages !== messages) {
            turnContext.diagnostics.followUpContextRewritten = true;
        }
        messages = rewrittenMessages;
        const preparedHistory = await this.contextManager.prepareHistory(messages, sessionId);
        messages = preparedHistory.messages;
        await this.publishContextPreparedEvent(sessionId, preparedHistory.report);

        // Capture compression metrics for diagnostics
        const report = preparedHistory.report;
        if (report.compactionTriggered && turnContext?.diagnostics) {
            turnContext.diagnostics.compactionCount = (turnContext.diagnostics.compactionCount || 0) + 1;
            turnContext.diagnostics.totalTokenSavings = (turnContext.diagnostics.totalTokenSavings || 0) + report.cumulativeTokenSavings;
            turnContext.diagnostics.compressionRatio = report.compressionRatio;
            turnContext.diagnostics.compactionLevel = report.level;
        }

        // Auto-synthesise cross-session experiences when compaction happened
        if (this.contextManager.isExperienceMemoryEnabled() && preparedHistory.report.strategy !== 'unchanged') {
            this.contextManager.autoSynthesizeExperiences(this.memory);
        }

        // Selective detail recovery: if the user query refers to previously compacted
        // content, inject the relevant original messages into the history.
        if (this.contextManager.hasCompactedContent(sessionId)) {
            const recovered = this.contextManager.recoverDetail(sessionId, query);
            if (recovered && recovered.length > 0) {
                // Insert recovered messages before the recent window, after any summary
                let insertAt = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].role === 'system' && messages[i].content.includes('Context Summary')) {
                        insertAt = i;
                        break;
                    }
                }
                messages = [
                    ...messages.slice(0, insertAt + 1),
                    ...recovered,
                    ...messages.slice(insertAt + 1)
                ];
            }
        }

        const relevantMemory = await this.getRelevantMemory(query, sessionId);
        const memory = this.contextManager.trimMemory(
            this.contextManager.isExperienceMemoryEnabled()
                ? [...relevantMemory, ...(await this.contextManager.loadExperienceMemory(this.memory))]
                : relevantMemory
        );

        if (this.promptBuilder) {
            const systemPrompt = await this.promptBuilder.build({
                sessionId,
                tools: this.getToolDefinitions(sessionId).map(t => ({
                    name: t.name,
                    description: t.description,
                    activation: t.activation
                })),
                memory: memory.map(m => `- ${m.key}: ${m.value}`).join('\n'),
                dateTime: new Date().toISOString()
            });
            if (systemPrompt) {
                messages = [
                    this.createMessage('system', systemPrompt),
                    ...messages
                ];
            }
        }

        return {
            sessionId,
            messages,
            tools: this.getToolDefinitions(sessionId),
            memory,
            summary: state.summary
        };
    }

    private async publishContextPreparedEvent(sessionId: string, report: ContextPreparationReport): Promise<void> {
        try {
            await this.app.publishEvent(new AgentContextPreparedEvent(this, sessionId, report));
        } catch {
            // context observability must not break turn execution
        }
    }

    private createTurnDiagnostics(): AgentTurnDiagnostics {
        return {
            emptyResponseRetryCount: 0,
            followUpRecoveryCount: 0,
            followUpContextRewritten: false,
            finalAssistantWasClarification: false,
            repeatedClarificationDetected: false,
            compactionCount: 0,
            totalTokenSavings: 0,
            compressionRatio: undefined,
            compactionLevel: undefined
        };
    }

    private async publishTurnDiagnosticsEvent(sessionId: string, diagnostics?: AgentTurnDiagnostics): Promise<void> {
        if (!diagnostics) {
            return;
        }
        try {
            await this.app.publishEvent(new AgentTurnDiagnosticsEvent(this, sessionId, { ...diagnostics }));
        } catch {
            // diagnostics observability must not break turn execution
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
        diagnostics.finalAssistantWasClarification = this.isClarificationAssistantMessage(message.content);
        diagnostics.repeatedClarificationDetected = diagnostics.finalAssistantWasClarification
            && await this.hadPriorClarification(sessionId, currentUserMessageId);
    }

    private async hadPriorClarification(sessionId: string, currentUserMessageId: string): Promise<boolean> {
        const messages = (await this.sessions.get(sessionId)).messages;
        const currentIndex = messages.findIndex(message => message.id === currentUserMessageId);
        if (currentIndex < 1) {
            return false;
        }
        const previousAssistantIndex = this.findPreviousMessageIndex(messages, currentIndex - 1, 'assistant');
        if (previousAssistantIndex < 0) {
            return false;
        }
        return this.isClarificationAssistantMessage(messages[previousAssistantIndex]?.content);
    }

    private rewriteClarificationFollowUp(messages: AgentMessage[], currentUserMessageId: string): AgentMessage[] {
        const currentIndex = messages.findIndex(message => message.id === currentUserMessageId);
        if (currentIndex < 1) {
            return messages;
        }
        const currentUserMessage = messages[currentIndex];
        if (currentUserMessage.role !== 'user' || !this.isShortClarificationAnswer(currentUserMessage.content)) {
            return messages;
        }
        if (String(currentUserMessage.content || '').includes('[Follow-up Context]')) {
            return messages;
        }
        const previousAssistantIndex = this.findPreviousMessageIndex(messages, currentIndex - 1, 'assistant');
        if (previousAssistantIndex < 0) {
            return messages;
        }
        const previousAssistant = messages[previousAssistantIndex];
        if (!this.isClarificationAssistantMessage(previousAssistant.content)) {
            return messages;
        }
        const previousUserIndex = this.findPreviousMessageIndex(messages, previousAssistantIndex - 1, 'user');
        if (previousUserIndex < 0) {
            return messages;
        }
        const previousUser = messages[previousUserIndex];
        const rewritten = this.buildClarificationFollowUpContent(
            previousUser.content,
            previousAssistant.content,
            currentUserMessage.content
        );
        return messages.map((message, index) => index === currentIndex
            ? { ...message, content: rewritten }
            : message);
    }

    private findPreviousMessageIndex(messages: AgentMessage[], startIndex: number, role: AgentMessage['role']): number {
        for (let index = startIndex; index >= 0; index--) {
            const message = messages[index];
            if (message?.role !== role) {
                continue;
            }
            if (message?.metadata?.streaming || message?.metadata?.slashCommand) {
                continue;
            }
            return index;
        }
        return -1;
    }

    private isShortClarificationAnswer(content: string): boolean {
        const text = String(content || '').trim();
        if (!text || text.startsWith('/') || text.includes('\n') || text.includes('@')) {
            return false;
        }
        if (text.length > 80) {
            return false;
        }
        return !(/[.?!。？！]/.test(text) && text.length > 32);
    }

    private isClarificationAssistantMessage(content: string): boolean {
        const text = String(content || '').trim();
        if (!text) {
            return false;
        }
        if (text.includes('?') || text.includes('？')) {
            return true;
        }
        return /(please tell me|tell me|please provide|provide|which one|what is|what are|where is|where are|who is|who are|when is|when are|how many|i still need|i need|missing|clarify|confirmation|confirm|请告诉我|告诉我|请发我|请提供|请补充|还需要|需要你|缺少|确认一下|补充一下)/i.test(text);
    }

    private buildClarificationFollowUpContent(previousUser: string, previousAssistant: string, currentAnswer: string): string {
        return [
            '[Follow-up Context]',
            `Previous user request: ${String(previousUser || '').trim()}`,
            `Assistant clarification: ${String(previousAssistant || '').trim()}`,
            `User follow-up answer: ${String(currentAnswer || '').trim()}`,
            '',
            'Continue the original task directly using the follow-up answer above.'
        ].join('\n');
    }

    private findLatestFollowUpContextUserMessage(messages: AgentMessage[]): AgentMessage | undefined {
        for (let index = messages.length - 1; index >= 0; index--) {
            const message = messages[index];
            if (message?.role !== 'user') {
                continue;
            }
            if (String(message.content || '').includes('[Follow-up Context]')) {
                return message;
            }
        }
        return undefined;
    }

    protected sessionToolFilters = new Map<string, Set<string>>();

    setSessionToolFilter(sessionId: string, toolsets: string[]): void {
        if (toolsets.length === 0) {
            this.sessionToolFilters.delete(sessionId);
        } else {
            this.sessionToolFilters.set(sessionId, new Set(toolsets));
        }
    }

    clearSessionToolFilter(sessionId: string): void {
        this.sessionToolFilters.delete(sessionId);
    }

    private getToolDefinitions(sessionId: string): AgentToolDefinition[] {
        const defs = this.toolRegistry.getCallableToolDefinitions(sessionId);
        const filter = this.sessionToolFilters.get(sessionId);
        if (!filter || filter.size === 0) {
            return defs;
        }
        return defs.filter(d => d.toolset && filter.has(d.toolset));
    }

    private async *collectStreamingResponse(
        sessionId: string,
        request: ModelRequest
    ): AsyncGenerator<StreamChunk, ModelResponse, void> {
        let message = '';
        let reasoningContent = '';
        let toolCalls: AgentToolCall[] = [];
        let usage: Record<string, any> | undefined;
        let metadata: Record<string, any> = {};
        const seenToolCalls = new Set<string>();

        for await (const chunk of this.modelAdapter.stream(request)) {
            const freshToolCalls = this.collectFreshStreamingToolCalls(seenToolCalls, chunk.toolCalls);

            if (chunk.type !== 'done' || chunk.usage || freshToolCalls.length) {
                await this.app.publishEvent(new AgentStreamChunkEvent(
                    this,
                    sessionId,
                    chunk.type === 'done' && freshToolCalls.length ? 'tool_call' : chunk.type,
                    chunk.type === 'tool_call' || (chunk.type === 'done' && freshToolCalls.length)
                        ? this.describeStreamingToolCalls(freshToolCalls)
                        : chunk.content,
                    freshToolCalls.length ? freshToolCalls : chunk.toolCalls,
                    chunk.usage
                ));
            }

            if (chunk.type === 'text') {
                message += chunk.content ?? '';
            }
            if (chunk.type === 'reasoning') {
                reasoningContent += chunk.content ?? '';
            }
            if (freshToolCalls.length) {
                toolCalls = toolCalls.concat(freshToolCalls);
            }
            if (chunk.usage) {
                usage = chunk.usage as Record<string, any>;
            }
            if (chunk.metadata) {
                metadata = { ...metadata, ...chunk.metadata };
            }

            if (chunk.type === 'done' && freshToolCalls.length) {
                yield {
                    type: 'tool_call',
                    content: this.describeStreamingToolCalls(freshToolCalls),
                    toolCalls: freshToolCalls
                };
            }

            if (chunk.type !== 'done' || chunk.usage) {
                yield {
                    type: chunk.type,
                    content: chunk.type === 'tool_call'
                        ? this.describeStreamingToolCalls(freshToolCalls)
                        : chunk.content,
                    toolCalls: chunk.type === 'tool_call' ? freshToolCalls : undefined,
                    usage: chunk.usage as Record<string, any> | undefined
                };
            }
        }

        const response: ModelResponse = {
            message,
            toolCalls: toolCalls.length ? toolCalls : undefined,
            metadata: {
                ...metadata,
                usage,
                reasoningContent: reasoningContent || undefined
            }
        };
        await this.app.publishEvent(new AgentModelCompletedEvent(this, sessionId, response));
        return response;
    }

    private collectFreshStreamingToolCalls(
        seen: Set<string>,
        incoming?: AgentToolCall[]
    ): AgentToolCall[] {
        if (!incoming?.length) {
            return [];
        }

        const fresh: AgentToolCall[] = [];
        for (const toolCall of incoming) {
            const id = String(toolCall.id || '').trim() || `tool-${toolCall.name}-${fresh.length}`;
            if (seen.has(id)) {
                continue;
            }
            seen.add(id);
            const normalized = { ...toolCall, id };
            fresh.push(normalized);
        }
        return fresh;
    }

    private describeStreamingToolCalls(toolCalls: AgentToolCall[]): string {
        return toolCalls.map(toolCall => toolCall.name).filter(Boolean).join(', ');
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
                toolCalls: response.toolCalls.map(toolCall => ({ id: toolCall.id, name: toolCall.name })),
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

        const message = await this.createAssistantMessageFromResponse(sessionId, response);
        await this.captureAssistantDiagnostics(sessionId, currentUserMessageId, message, turnContext);
        return {
            message
        };
    }

    private async executeTools(
        sessionId: string,
        toolCalls: AgentToolCall[],
        loopDetector: ToolLoopDetector,
        callableTools: AgentToolDefinition[],
        turnContext: TurnExecutionContext
    ): Promise<void> {
        const toolOpts = this.options.tools ?? defaultAgentOptions.tools!;

        if (toolOpts.parallelExecution && toolCalls.length > 1 && this.canParallelize(toolCalls, toolOpts.parallelSafeTools ?? [])) {
            await this.executeToolsParallel(sessionId, toolCalls, loopDetector, callableTools, turnContext);
        } else {
            await this.executeToolsSequential(sessionId, toolCalls, loopDetector, callableTools, turnContext);
        }
    }

    private canParallelize(toolCalls: Array<{ name: string; input?: any }>, safeTools: string[]): boolean {
        const approvalManager = this.toolApprovalManager;
        if (approvalManager && toolCalls.some(tc => approvalManager.requiresApproval(tc.name, tc.input))) {
            return false;
        }

        return toolCalls.every(tc => {
            const definition = this.toolRegistry.getToolDefinition(tc.name);
            const fallbackSafe = safeTools.includes(tc.name);
            return definition ? this.isParallelSafeTool(definition, fallbackSafe) : fallbackSafe;
        });
    }

    private isParallelSafeTool(definition: AgentToolDefinition, fallbackSafe: boolean): boolean {
        if (definition.execution?.requiresSequential) {
            return false;
        }
        if (definition.execution?.readOnly === true) {
            return true;
        }
        return fallbackSafe;
    }

    private async executeToolsSequential(
        sessionId: string,
        toolCalls: AgentToolCall[],
        loopDetector: ToolLoopDetector,
        callableTools: AgentToolDefinition[],
        turnContext: TurnExecutionContext
    ): Promise<void> {
        for (const toolCall of toolCalls) {
            await this.invokeSingleTool(sessionId, toolCall, loopDetector, 'sequential', callableTools, turnContext);
        }
    }

    private async executeToolsParallel(
        sessionId: string,
        toolCalls: AgentToolCall[],
        loopDetector: ToolLoopDetector,
        callableTools: AgentToolDefinition[],
        turnContext: TurnExecutionContext
    ): Promise<void> {
        const maxParallel = this.options.tools?.maxParallelTools ?? defaultAgentOptions.tools!.maxParallelTools!;
        for (let i = 0; i < toolCalls.length; i += maxParallel) {
            const batch = toolCalls.slice(i, i + maxParallel);
            const results = await Promise.allSettled(
                batch.map(tc => this.performToolInvocation(sessionId, tc, loopDetector, 'parallel', callableTools, turnContext))
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    await this.finalizeToolInvocation(sessionId, result.value);
                } else {
                    const err = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
                    await this.sessions.append(sessionId, this.createMessage(
                        'tool',
                        JSON.stringify({ error: err.message }),
                        'unknown', undefined,
                        { error: err.message }
                    ));
                }
            }
        }
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
        if (persistMessage) {
            await this.finalizeToolInvocation(sessionId, result);
        }
        return result.error;
    }

    private async performToolInvocation(
        sessionId: string,
        toolCall: { id: string; name: string; input?: any },
        loopDetector: ToolLoopDetector,
        executionMode: 'sequential' | 'parallel',
        callableTools: AgentToolDefinition[],
        turnContext: TurnExecutionContext
    ): Promise<ToolInvocationResult> {
        const toolCallInput = this.cloneToolInput(toolCall.input);
        const inputSummary = this.summarizeToolInput(toolCall.name, toolCallInput);
        const baseReceipt = this.createBaseReceipt(toolCall, executionMode, inputSummary);
        const callableToolNames = new Set(callableTools.map(tool => tool.name));
        if (!callableToolNames.has(toolCall.name)) {
            const reason = `Tool "${toolCall.name}" is not available for this turn. Activate or expose it before invoking.`;
            return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, {
                ...baseReceipt,
                status: 'skipped',
                durationMs: 0,
                error: reason
            }, reason, { sessionId, reason });
        }
        const loopResult = loopDetector.record(toolCall.name, toolCallInput);
        if (loopResult.severity === 'break') {
            const reason = loopResult.reason ?? 'Loop detected';
            return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, {
                ...baseReceipt,
                status: 'skipped',
                durationMs: 0,
                error: reason
            }, reason, { sessionId, reason });
        }

        const definition = callableTools.find(tool => tool.name === toolCall.name) ?? this.toolRegistry.getToolDefinition(toolCall.name, sessionId);
        if (!definition) {
            return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, {
                ...baseReceipt,
                status: 'error',
                durationMs: 0,
                error: `Tool "${toolCall.name}" definition was not found.`
            }, `Tool "${toolCall.name}" definition was not found.`);
        }

        const activationError = await this.ensureToolActivation(sessionId, definition);
        if (activationError) {
            return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, {
                ...baseReceipt,
                status: 'error',
                durationMs: 0,
                error: activationError.message
            }, activationError.message);
        }

        const sandboxState = this.resolveToolSandboxState(definition, turnContext.workspace);
        const sandboxReceipt = this.decorateReceiptWithSandbox(baseReceipt, sandboxState);

        if (this.toolApprovalManager) {
            const approval = await this.toolApprovalManager.checkApproval(toolCall.name, toolCallInput, sessionId);
            if (approval.decision === ApprovalDecision.DENIED || approval.decision === ApprovalDecision.TIMEOUT) {
                const reason = approval.decision === ApprovalDecision.TIMEOUT
                    ? `Tool "${toolCall.name}" approval timed out.`
                    : `Tool "${toolCall.name}" was rejected.`;
                return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, {
                    ...sandboxReceipt,
                    status: 'skipped',
                    durationMs: 0,
                    error: reason
                }, reason, { sessionId, reason });
            }
            if (approval.decision === ApprovalDecision.CANCELLED || this.isTurnAborted(sessionId)) {
                this.throwIfTurnCancelled(sessionId);
                const reason = `Tool "${toolCall.name}" approval was cancelled.`;
                return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, {
                    ...sandboxReceipt,
                    status: 'skipped',
                    durationMs: 0,
                    error: reason
                }, reason, { sessionId, reason });
            }
        }

        await this.app.publishEvent(new AgentToolInvokedEvent(this, sessionId, toolCall.name, toolCallInput, sandboxReceipt));

        if (this.toolExecutionCoordinator) {
            const outcome = await this.toolExecutionCoordinator.execute({
                sessionId,
                principalId: turnContext.principalId,
                workspace: turnContext.workspace,
                toolCall: { id: toolCall.id, name: toolCall.name, input: toolCallInput },
                definition,
                executionMode,
                inputSummary,
                baseReceipt: sandboxReceipt
            });
            if (outcome.redactedOutput !== undefined) {
                loopDetector.record(toolCall.name, toolCallInput, outcome.redactedOutput);
            }
            const maxChars = this.options.context?.maxToolResultChars ?? defaultAgentOptions.context!.maxToolResultChars!;
            const outputStr = outcome.redactedOutput === undefined
                ? JSON.stringify({ error: outcome.error?.message ?? outcome.receipt.error ?? 'tool failed' })
                : (typeof outcome.redactedOutput === 'string' ? outcome.redactedOutput : JSON.stringify(outcome.redactedOutput));
            const truncated = outputStr.length > maxChars ? outputStr.slice(0, maxChars) + '...[truncated]' : outputStr;
            if (outcome.error) {
                return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, outcome.receipt, outcome.error.message);
            }
            return {
                toolCall,
                content: truncated,
                metadata: {
                    toolCallInput,
                    inputSummary,
                    receipt: outcome.receipt,
                    attempts: outcome.attempts
                },
                receipt: outcome.receipt
            };
        }

        const startedAt = Date.now();
        try {
            const output = await this.toolRegistry.invoke(toolCall.name, toolCallInput, sessionId, turnContext.principalId, turnContext.workspace);
            loopDetector.record(toolCall.name, toolCallInput, output);
            const maxChars = this.options.context?.maxToolResultChars ?? defaultAgentOptions.context!.maxToolResultChars!;
            const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
            const truncated = outputStr.length > maxChars ? outputStr.slice(0, maxChars) + '...[truncated]' : outputStr;
            const completedReceipt: AgentToolExecutionReceipt = {
                ...sandboxReceipt,
                status: 'success',
                durationMs: Math.max(0, Date.now() - startedAt),
                outputSummary: this.summarizeToolOutput(toolCall.name, output)
            };
            await this.app.publishEvent(new AgentToolCompletedEvent(this, sessionId, toolCall.name, output, completedReceipt));
            return {
                toolCall,
                content: truncated,
                metadata: {
                    toolCallInput,
                    inputSummary,
                    receipt: completedReceipt
                },
                receipt: completedReceipt
            };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const failedReceipt: AgentToolExecutionReceipt = {
                ...sandboxReceipt,
                status: 'error',
                durationMs: Math.max(0, Date.now() - startedAt),
                error: err.message
            };
            await this.app.publishEvent(new AgentToolFailedEvent(this, sessionId, toolCall.name, err, failedReceipt));
            return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, failedReceipt, err.message);
        }
    }

    private async ensureToolActivation(sessionId: string, definition: AgentToolDefinition): Promise<Error | undefined> {
        if (definition.activation?.kind !== 'deferred' || definition.activation?.scope !== 'session') {
            return undefined;
        }
        const active = this.toolRegistry && typeof this.toolRegistry.isToolActive === 'function'
            ? await this.toolRegistry.isToolActive(sessionId, definition.name)
            : definition.activation?.activated === true;
        if (active) {
            return undefined;
        }
        if (!this.toolRegistry || typeof this.toolRegistry.activateTool !== 'function') {
            return new Error(`Tool "${definition.name}" requires session activation, but no activation flow is available.`);
        }
        try {
            const activated = await this.toolRegistry.activateTool(sessionId, definition.name);
            if (!activated && !(await this.toolRegistry.isToolActive(sessionId, definition.name))) {
                return new Error(`Tool "${definition.name}" could not be activated for this session.`);
            }
            return undefined;
        } catch (error) {
            return error instanceof Error
                ? error
                : new Error(`Tool "${definition.name}" could not be activated for this session.`);
        }
    }

    private safeSerialize(input: any): string | undefined {
        if (input === undefined) {
            return undefined;
        }
        const seen = new WeakSet<object>();
        try {
            return JSON.stringify(input, (_key, current) => {
                if (typeof current === 'bigint') {
                    return current.toString();
                }
                if (current && typeof current === 'object') {
                    if (seen.has(current)) {
                        return '[circular]';
                    }
                    seen.add(current);
                }
                return current;
            });
        } catch {
            return '[unserializable]';
        }
    }

    private cloneToolInput(input: any): any {
        const serialized = this.safeSerialize(input);
        if (serialized == null) {
            return input;
        }
        try {
            return JSON.parse(serialized);
        } catch {
            return serialized;
        }
    }

    private summarizeToolInput(toolName: string, input: any): string | undefined {
        return summarizeToolDisplayText(toolName, input, 'input');
    }

    private summarizeToolOutput(toolName: string, output: any): string | undefined {
        return summarizeToolDisplayText(toolName, output, 'output');
    }

    private async finalizeToolInvocation(sessionId: string, result: ToolInvocationResult): Promise<void> {
        await this.sessions.append(sessionId, this.createMessage(
            'tool',
            result.content,
            result.toolCall.name,
            result.toolCall.id,
            result.metadata
        ));
    }

    private async createAssistantMessageFromResponse(sessionId: string, response: ModelResponse): Promise<AgentMessage> {
        const content = await this.resolveAssistantResponseText(sessionId, response);
        return this.createMessage('assistant', content, undefined, undefined, response.metadata);
    }

    private shouldRetryEmptyResponse(response: ModelResponse): boolean {
        return !response.toolCalls?.length && !String(response.message ?? '').trim();
    }

    private buildEmptyResponseRetryRequest(request: ModelRequest): ModelRequest {
        return {
            ...request,
            messages: [
                this.createMessage('system', EMPTY_RESPONSE_RETRY_SYSTEM_PROMPT),
                ...request.messages
            ]
        };
    }

    private shouldRecoverEmptyFollowUpResponse(request: ModelRequest, response: ModelResponse): boolean {
        return this.shouldRetryEmptyResponse(response)
            && !!this.findLatestFollowUpContextUserMessage(request.messages);
    }

    private buildFollowUpRecoveryRequest(request: ModelRequest): ModelRequest {
        const latestFollowUpUser = this.findLatestFollowUpContextUserMessage(request.messages);
        if (!latestFollowUpUser) {
            return this.buildEmptyResponseRetryRequest(request);
        }
        const systemMessages = request.messages.filter(message => message.role === 'system');
        return {
            ...request,
            messages: [
                ...systemMessages,
                this.createMessage('system', FOLLOW_UP_EMPTY_RESPONSE_RECOVERY_SYSTEM_PROMPT),
                { ...latestFollowUpUser }
            ]
        };
    }

    private async resolveAssistantResponseText(sessionId: string, response: ModelResponse): Promise<string> {
        const explicitMessage = String(response.message ?? '');
        if (explicitMessage.trim()) {
            return explicitMessage;
        }
        const toolError = await this.findRecentToolError(sessionId);
        if (toolError) {
            return `I couldn't complete the request because a required tool failed: ${toolError}`;
        }
        return 'I couldn\'t complete the request because the model returned an empty response.';
    }

    private async findRecentToolError(sessionId: string): Promise<string | undefined> {
        const messages = (await this.sessions.get(sessionId)).messages;
        for (let index = messages.length - 1; index >= 0; index--) {
            const message = messages[index];
            if (message.role === 'user') {
                break;
            }
            if (message.role === 'tool' && typeof message.metadata?.error === 'string' && message.metadata.error.trim()) {
                return message.metadata.error.trim();
            }
        }
        return undefined;
    }

    private async acquireSessionTurnLock(sessionId: string): Promise<() => void> {
        const currentDepth = this.sessionTurnDepths.get(sessionId) ?? 0;
        if (currentDepth >= DefaultAgentRuntime.MAX_PENDING_SESSION_TURNS) {
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
        };
    }

    private createBaseReceipt(
        toolCall: { id: string; name: string },
        executionMode: 'sequential' | 'parallel',
        inputSummary?: string
    ): AgentToolExecutionReceipt {
        return {
            receiptId: randomUUID(),
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            executionMode,
            status: 'running',
            inputSummary
        };
    }

    private resolveToolSandboxState(definition: AgentToolDefinition, workspace?: string): ToolSandboxState {
        const supported = !!this.toolExecutionCoordinator?.isSandboxExecutionSupported();
        return resolveToolSandboxState(definition, workspace, supported);
    }

    private decorateReceiptWithSandbox(
        receipt: AgentToolExecutionReceipt,
        sandboxState: ToolSandboxState
    ): AgentToolExecutionReceipt {
        return {
            ...receipt,
            sandboxCapability: sandboxState.capability,
            sandboxPolicy: sandboxState.policy ?? null,
            sandboxSupported: sandboxState.supported,
            sandboxApplied: sandboxState.applied
        };
    }

    private createFailedToolInvocationResult(
        toolCall: { id: string; name: string; input?: any },
        toolCallInput: any,
        inputSummary: string | undefined,
        receipt: AgentToolExecutionReceipt,
        error: string,
        skipEvent?: { sessionId: string; reason: string }
    ): ToolInvocationResult {
        if (skipEvent) {
            void this.app.publishEvent(new AgentToolSkippedEvent(this, skipEvent.sessionId, toolCall.name, skipEvent.reason, receipt));
        }
        return {
            toolCall,
            content: JSON.stringify({ error }),
            metadata: {
                toolCallInput,
                inputSummary,
                error,
                receipt
            },
            receipt,
            error: new Error(error)
        };
    }

    private resolveApprovalManager(approvalManager?: ToolApprovalManager): ToolApprovalManager | undefined {
        if (approvalManager?.isConfigured()) {
            return approvalManager;
        }
        const required = this.options.tools?.requireApproval ?? defaultAgentOptions.tools?.requireApproval ?? [];
        if (!required.length) {
            return undefined;
        }
        return new ToolApprovalManager(
            this.app,
            new DefaultApprovalStrategy(required),
            {
                defaultTimeoutMs: this.options.tools?.approvalTimeoutMs ?? defaultAgentOptions.tools?.approvalTimeoutMs,
                autoDeny: false
            }
        );
    }

    private async maybeSummarize(sessionId: string): Promise<void> {
        const state = await this.sessions.get(sessionId);
        const threshold = this.options.session?.summaryThreshold ?? defaultAgentOptions.session!.summaryThreshold!;
        if (state.messages.length >= threshold) {
            const summary = await this.summarizer.summarize(state.messages);
            await this.sessions.setSummary(sessionId, summary);
        }
    }

    private async getRelevantMemory(query: string, sessionId: string): Promise<AgentMemoryRecord[]> {
        const normalized = query.trim();
        if (!normalized) {
            return [];
        }
        await this.publishMemoryRetrievalEvent(new AgentMemoryRetrievalStartedEvent(this, sessionId, normalized));
        try {
            const retriever = this.memoryRetriever;
            const records = retriever
                ? await retriever.retrieve({ sessionId, query: normalized })
                : await this.memory.search(normalized, sessionId);
            await this.publishMemoryRetrievalEvent(new AgentMemoryRetrievedEvent(this, sessionId, normalized, records));
            return records;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            await this.publishMemoryRetrievalEvent(new AgentMemoryRetrievalFailedEvent(this, sessionId, normalized, err));
            return [];
        }
    }

    private async publishMemoryRetrievalEvent(event: AgentMemoryRetrievalStartedEvent | AgentMemoryRetrievedEvent | AgentMemoryRetrievalFailedEvent): Promise<void> {
        try {
            await this.app.publishEvent(event);
        } catch {
            return;
        }
    }

    private async maybeDistillExperience(sessionId: string, userMessage: AgentMessage, assistantMessage: AgentMessage): Promise<void> {
        if (!this.experienceDistiller) {
            return;
        }
        try {
            const records = await this.experienceDistiller.distill({
                sessionId,
                userMessage,
                assistantMessage,
                createdAt: Date.now()
            });
            for (const record of records) {
                const persisted = this.createDistilledMemoryRecord(sessionId, record);
                await this.memory.put(persisted);
                try {
                    await this.app.publishEvent(new AgentMemoryUpdatedEvent(this, sessionId, persisted));
                } catch {
                    continue;
                }
            }
        } catch (error) {
            try {
                const err = error instanceof Error ? error : new Error(String(error));
                await this.app.publishEvent(new AgentErrorEvent(this, sessionId, err));
            } catch {
                return;
            }
        }
    }

    private createDistilledMemoryRecord(sessionId: string, record: AgentMemoryRecord): AgentMemoryRecord {
        const createdAt = record.createdAt ?? Date.now();
        return {
            ...record,
            id: randomUUID(),
            sessionId,
            scope: record.scope ?? 'session',
            createdAt,
            updatedAt: record.updatedAt ?? createdAt
        };
    }

    private getRecentMessages(messages: AgentMessage[], currentUserMessageId: string): AgentMessage[] {
        const recentLimit = this.options.session?.recentMessages ?? defaultAgentOptions.session!.recentMessages!;
        if (!recentLimit || recentLimit < 0 || messages.length <= recentLimit) {
            return messages;
        }
        const currentUserMessage = messages.find(message => message.id === currentUserMessageId);
        const recentMessages = messages.slice(-recentLimit);
        if (!currentUserMessage || recentMessages.some(message => message.id === currentUserMessage.id)) {
            return recentMessages;
        }
        return [currentUserMessage, ...recentMessages];
    }

    protected createMessage(role: AgentMessage['role'], content: string, name?: string, toolCallId?: string, metadata?: Record<string, any>): AgentMessage {
        return {
            id: `${Date.now()}-${Math.random()}`,
            role,
            content,
            name,
            toolCallId,
            createdAt: Date.now(),
            metadata
        };
    }
}
