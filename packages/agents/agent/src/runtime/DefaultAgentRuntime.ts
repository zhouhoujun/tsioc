import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ApplicationContext, RunContext, Runner, createRunContext } from '@tsdi/core';
import { randomUUID } from 'crypto';
import { AgentRuntime } from './AgentRuntime';
import { AgentTurnInput } from './AgentTurnInput';
import { AgentTurnResult } from './AgentTurnResult';
import { TurnHandler } from './TurnHandler';
import { AgentMessage } from './AgentMessage';
import { AgentErrorEvent, AgentMemoryRetrievedEvent, AgentMemoryRetrievalFailedEvent, AgentMemoryRetrievalStartedEvent, AgentMemoryUpdatedEvent, AgentModelCompletedEvent, AgentStreamChunkEvent, AgentToolCompletedEvent, AgentToolExecutionReceipt, AgentToolFailedEvent, AgentToolInvokedEvent, AgentToolSkippedEvent, AgentTurnCompletedEvent, AgentTurnStartedEvent } from './AgentEvents';
import { ModelAdapter } from '../model/ModelAdapter';
import { ModelRequest } from '../model/ModelRequest';
import { AgentToolCall, ModelResponse } from '../model/ModelResponse';
import { ToolRegistry } from '../tools/ToolRegistry';
import { ToolLoopDetector } from '../tools/ToolLoopDetector';
import { ApprovalDecision, DefaultApprovalStrategy, ToolApprovalManager } from '../tools/ToolApprovalManager';
import { SessionStore } from '../memory/SessionStore';
import { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSummarizer } from '../memory/SessionSummarizer';
import { AGENT_OPTIONS } from '../tokens';
import { AgentOptions, defaultAgentOptions } from '../options';
import { ExperienceDistiller } from '../memory/ExperienceDistiller';
import { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';
import { AgentContextManager } from '../context/AgentContextManager';
import { AgentMemoryRetriever } from '../memory/AgentMemoryRetriever';
import { AgentToolDefinition } from '../tools/AgentTool';
import { AgentScheduler } from '../scheduler/AgentScheduler';
import { ToolExecutionCoordinator } from '../harness/ToolExecutionCoordinator';
import { ToolSchemaValidator } from '../harness/ToolSchemaValidator';
import { RateLimitManager } from '../harness/RateLimitManager';
import { OutputGuard } from '../harness/OutputGuard';

interface ToolInvocationResult {
    toolCall: { id: string; name: string; input?: any };
    content: string;
    metadata: Record<string, any>;
    receipt: AgentToolExecutionReceipt;
    error?: Error;
}

@Injectable()
export class DefaultAgentRuntime extends AgentRuntime {
    protected contextManager: AgentContextManager;
    protected toolApprovalManager?: ToolApprovalManager;
    protected _stopped = false;
    protected activePrincipalId?: string;

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
            maxToolResults: this.options.context?.maxToolResultChars
        });
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
        this.activePrincipalId = principalId;
        const handler = typeof (this.app as any)?.get === 'function'
            ? (this.app as any).get(TurnHandler, null) as {
                injector?: ApplicationContext,
                handle(input: AgentTurnInput, context: RunContext): Promise<AgentTurnResult>
            } | null
            : null;
        if (!handler) {
            return this.processTurn({ sessionId, input });
        }
        return handler.handle({ sessionId, input }, createRunContext(handler.injector ?? this.app));
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

    setPrincipalId(principalId?: string): void {
        this.activePrincipalId = principalId;
    }

    async processTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
        await this.app.publishEvent(new AgentTurnStartedEvent(this, input.sessionId, input.input));
        const userMessage = this.createMessage('user', input.input);
        await this.sessions.append(input.sessionId, userMessage);

        try {
            const result = await this.completeTurn(input.sessionId, input.input, userMessage.id);
            await this.sessions.append(input.sessionId, result.message);
            await this.maybeSummarize(input.sessionId);
            await this.maybeDistillExperience(input.sessionId, userMessage, result.message);
            await this.app.publishEvent(new AgentTurnCompletedEvent(this, input.sessionId, result.message));
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            await this.app.publishEvent(new AgentErrorEvent(this, input.sessionId, err));
            throw err;
        }
    }

    async *runStreamingTurn(sessionId: string, input: string): AsyncGenerator<{ type: 'text' | 'reasoning' | 'tool_call' | 'done'; content?: string; usage?: Record<string, any> }> {
        await this.app.publishEvent(new AgentTurnStartedEvent(this, sessionId, input));
        const userMessage = this.createMessage('user', input);
        await this.sessions.append(sessionId, userMessage);

        try {
            const result = yield* this.completeStreamingTurn(sessionId, input, userMessage.id);
            await this.sessions.append(sessionId, result.message);
            await this.maybeSummarize(sessionId);
            await this.maybeDistillExperience(sessionId, userMessage, result.message);
            await this.app.publishEvent(new AgentTurnCompletedEvent(this, sessionId, result.message));
            await this.app.publishEvent(new AgentStreamChunkEvent(this, sessionId, 'done'));
            yield { type: 'done' };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            await this.app.publishEvent(new AgentErrorEvent(this, sessionId, err));
            throw err;
        }
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

    private async completeTurn(sessionId: string, query: string, currentUserMessageId: string): Promise<AgentTurnResult> {
        const loopDetector = new ToolLoopDetector();
        loopDetector.reset();
        let round = 0;
        const maxRounds = this.options.maxToolRounds ?? defaultAgentOptions.maxToolRounds!;

        while (round <= maxRounds) {
            const request = await this.buildModelRequest(sessionId, query, currentUserMessageId);
            const response = await this.modelAdapter.complete(request);
            await this.app.publishEvent(new AgentModelCompletedEvent(this, sessionId, response));

            const handled = await this.handleModelResponse(sessionId, response, loopDetector, request.tools);
            if (handled.message) {
                return { sessionId, message: handled.message };
            }

            round++;
        }

        const limitMessage = this.createMessage('user', 'You have reached the maximum number of tool call rounds. Please provide your best answer now based on the results you have so far.');
        await this.sessions.append(sessionId, limitMessage);

        const finalRequest = await this.buildModelRequest(sessionId, query, currentUserMessageId);
        const finalResponse = await this.modelAdapter.complete(finalRequest);
        await this.app.publishEvent(new AgentModelCompletedEvent(this, sessionId, finalResponse));

        const finalMessage = this.createMessage('assistant', finalResponse.message ?? '', undefined, undefined, finalResponse.metadata);
        return { sessionId, message: finalMessage };
    }

    private async *completeStreamingTurn(sessionId: string, query: string, currentUserMessageId: string): AsyncGenerator<{ type: 'text' | 'reasoning' | 'tool_call' | 'done'; content?: string }, AgentTurnResult, void> {
        const loopDetector = new ToolLoopDetector();
        loopDetector.reset();
        let round = 0;
        const maxRounds = this.options.maxToolRounds ?? defaultAgentOptions.maxToolRounds!;

        while (round <= maxRounds) {
            const request = await this.buildModelRequest(sessionId, query, currentUserMessageId);
            const response = yield* this.collectStreamingResponse(sessionId, request);

            const handled = await this.handleModelResponse(sessionId, response, loopDetector, request.tools);
            if (handled.message) {
                return { sessionId, message: handled.message };
            }

            round++;
        }

        yield { type: 'text', content: '\n\n[Reached tool round limit. Requesting final answer...]\n\n' };
        const limitMessage = this.createMessage('user', 'You have reached the maximum number of tool call rounds. Please provide your best answer now based on the results you have so far.');
        await this.sessions.append(sessionId, limitMessage);

        const finalRequest = await this.buildModelRequest(sessionId, query, currentUserMessageId);
        const finalResponse = yield* this.collectStreamingResponse(sessionId, finalRequest);

        const finalMessage = this.createMessage('assistant', finalResponse.message ?? '', undefined, undefined, finalResponse.metadata);
        return { sessionId, message: finalMessage };
    }

    private async buildModelRequest(sessionId: string, query: string, currentUserMessageId: string): Promise<ModelRequest> {
        const state = await this.sessions.get(sessionId);
        let messages = this.getRecentMessages(state.messages, currentUserMessageId);
        messages = this.contextManager.pruneHistory(messages);

        const memory = this.contextManager.trimMemory(
            await this.getRelevantMemory(query, sessionId)
        );

        if (this.promptBuilder) {
            const systemPrompt = await this.promptBuilder.build({
                sessionId,
                tools: this.getToolDefinitions(sessionId).map(t => ({ name: t.name, description: t.description })),
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

    private getToolDefinitions(sessionId: string): AgentToolDefinition[] {
        return this.toolRegistry.getCallableToolDefinitions(sessionId);
    }

    private async *collectStreamingResponse(
        sessionId: string,
        request: ModelRequest
    ): AsyncGenerator<{ type: 'text' | 'reasoning' | 'tool_call' | 'done'; content?: string; usage?: Record<string, any> }, ModelResponse, void> {
        let message = '';
        let reasoningContent = '';
        let toolCalls: AgentToolCall[] = [];
        let usage: Record<string, any> | undefined;
        let metadata: Record<string, any> = {};

        for await (const chunk of this.modelAdapter.stream(request)) {
            if (chunk.type !== 'done' || chunk.usage) {
                await this.app.publishEvent(new AgentStreamChunkEvent(
                    this,
                    sessionId,
                    chunk.type,
                    chunk.content,
                    chunk.toolCalls,
                    chunk.usage
                ));
            }

            if (chunk.type === 'text') {
                message += chunk.content ?? '';
            }
            if (chunk.type === 'reasoning') {
                reasoningContent += chunk.content ?? '';
            }
            if (chunk.type === 'tool_call' && chunk.toolCalls?.length) {
                toolCalls = toolCalls.concat(chunk.toolCalls);
            }
            if (chunk.usage) {
                usage = chunk.usage as Record<string, any>;
            }
            if (chunk.metadata) {
                metadata = { ...metadata, ...chunk.metadata };
            }

            if (chunk.type !== 'done' || chunk.usage) {
                yield { type: chunk.type, content: chunk.content, usage: chunk.usage as Record<string, any> | undefined };
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

    private async handleModelResponse(
        sessionId: string,
        response: ModelResponse,
        loopDetector: ToolLoopDetector,
        callableTools: AgentToolDefinition[]
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

            await this.executeTools(sessionId, response.toolCalls, loopDetector, callableTools);
            return {};
        }

        return {
            message: this.createMessage('assistant', response.message ?? '', undefined, undefined, response.metadata)
        };
    }

    private async executeTools(
        sessionId: string,
        toolCalls: AgentToolCall[],
        loopDetector: ToolLoopDetector,
        callableTools: AgentToolDefinition[]
    ): Promise<void> {
        const toolOpts = this.options.tools ?? defaultAgentOptions.tools!;

        if (toolOpts.parallelExecution && toolCalls.length > 1 && this.canParallelize(toolCalls, toolOpts.parallelSafeTools ?? [])) {
            await this.executeToolsParallel(sessionId, toolCalls, loopDetector, callableTools);
        } else {
            await this.executeToolsSequential(sessionId, toolCalls, loopDetector, callableTools);
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
        callableTools: AgentToolDefinition[]
    ): Promise<void> {
        for (const toolCall of toolCalls) {
            await this.invokeSingleTool(sessionId, toolCall, loopDetector, 'sequential', callableTools);
        }
    }

    private async executeToolsParallel(
        sessionId: string,
        toolCalls: AgentToolCall[],
        loopDetector: ToolLoopDetector,
        callableTools: AgentToolDefinition[]
    ): Promise<void> {
        const maxParallel = this.options.tools?.maxParallelTools ?? defaultAgentOptions.tools!.maxParallelTools!;
        for (let i = 0; i < toolCalls.length; i += maxParallel) {
            const batch = toolCalls.slice(i, i + maxParallel);
            const results = await Promise.allSettled(
                batch.map(tc => this.performToolInvocation(sessionId, tc, loopDetector, 'parallel', callableTools))
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
        persistMessage = true
    ): Promise<Error | undefined> {
        const result = await this.performToolInvocation(sessionId, toolCall, loopDetector, executionMode, callableTools);
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
        callableTools: AgentToolDefinition[]
    ): Promise<ToolInvocationResult> {
        const toolCallInput = this.cloneToolInput(toolCall.input);
        const inputSummary = this.summarizeToolInput(toolCallInput);
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

        if (this.toolApprovalManager) {
            const approval = await this.toolApprovalManager.checkApproval(toolCall.name, toolCallInput, sessionId);
            if (approval.decision === ApprovalDecision.DENIED || approval.decision === ApprovalDecision.TIMEOUT) {
                const reason = approval.decision === ApprovalDecision.TIMEOUT
                    ? `Tool "${toolCall.name}" approval timed out.`
                    : `Tool "${toolCall.name}" was rejected.`;
                return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, {
                    ...baseReceipt,
                    status: 'skipped',
                    durationMs: 0,
                    error: reason
                }, reason, { sessionId, reason });
            }
        }

        await this.app.publishEvent(new AgentToolInvokedEvent(this, sessionId, toolCall.name, toolCallInput, baseReceipt));

        if (this.toolExecutionCoordinator) {
            const definition = callableTools.find(tool => tool.name === toolCall.name) ?? this.toolRegistry.getToolDefinition(toolCall.name, sessionId);
            if (!definition) {
                return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, {
                    ...baseReceipt,
                    status: 'error',
                    durationMs: 0,
                    error: `Tool "${toolCall.name}" definition was not found.`
                }, `Tool "${toolCall.name}" definition was not found.`);
            }
            const outcome = await this.toolExecutionCoordinator.execute({
                sessionId,
                principalId: this.activePrincipalId,
                toolCall: { id: toolCall.id, name: toolCall.name, input: toolCallInput },
                definition,
                executionMode,
                inputSummary,
                baseReceipt
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
            const output = await this.toolRegistry.invoke(toolCall.name, toolCallInput, sessionId, this.activePrincipalId);
            loopDetector.record(toolCall.name, toolCallInput, output);
            const maxChars = this.options.context?.maxToolResultChars ?? defaultAgentOptions.context!.maxToolResultChars!;
            const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
            const truncated = outputStr.length > maxChars ? outputStr.slice(0, maxChars) + '...[truncated]' : outputStr;
            const completedReceipt: AgentToolExecutionReceipt = {
                ...baseReceipt,
                status: 'success',
                durationMs: Math.max(0, Date.now() - startedAt),
                outputSummary: this.summarizeToolOutput(output)
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
                ...baseReceipt,
                status: 'error',
                durationMs: Math.max(0, Date.now() - startedAt),
                error: err.message
            };
            await this.app.publishEvent(new AgentToolFailedEvent(this, sessionId, toolCall.name, err, failedReceipt));
            return this.createFailedToolInvocationResult(toolCall, toolCallInput, inputSummary, failedReceipt, err.message);
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

    private summarizeToolInput(input: any): string | undefined {
        const text = typeof input === 'string' ? input : this.safeSerialize(input);
        if (!text) {
            return undefined;
        }
        return text.length > 200 ? `${text.slice(0, 200)}...[truncated]` : text;
    }

    private summarizeToolOutput(output: any): string | undefined {
        const text = typeof output === 'string' ? output : this.safeSerialize(output);
        if (!text) {
            return undefined;
        }
        return text.length > 200 ? `${text.slice(0, 200)}...[truncated]` : text;
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
