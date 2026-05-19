import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ApplicationContext, RunContext, Runner, createRunContext } from '@tsdi/core';
import { randomUUID } from 'crypto';
import { ModelAdapter } from '../model/ModelAdapter';
import { ToolRegistry } from '../tools/ToolRegistry';
import { ToolLoopDetector } from '../tools/ToolLoopDetector';
import { ApprovalDecision, DefaultApprovalStrategy, ToolApprovalManager } from '../tools/ToolApprovalManager';
import { SessionStore } from '../memory/SessionStore';
import { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSummarizer } from '../memory/SessionSummarizer';
import { ExperienceDistiller } from '../memory/ExperienceDistiller';
import { AgentContextManager } from '../context/AgentContextManager';
import { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';
import { AGENT_EXPERIENCE_DISTILLER, AGENT_MEMORY_STORE, AGENT_MODEL_ADAPTER, AGENT_OPTIONS, AGENT_SESSION_STORE, AGENT_SESSION_SUMMARIZER, AGENT_TURN_HANDLER } from '../tokens';
import { AgentOptions, defaultAgentOptions } from '../options';
import { AgentMessage } from './AgentMessage';
import { AgentTurnResult } from './AgentTurnResult';
import { AgentErrorEvent, AgentMemoryUpdatedEvent, AgentModelCompletedEvent, AgentToolCompletedEvent, AgentToolExecutionReceipt, AgentToolFailedEvent, AgentToolInvokedEvent, AgentToolSkippedEvent, AgentTurnCompletedEvent, AgentTurnStartedEvent, AgentStreamChunkEvent } from './AgentEvents';
import { AgentTurnInput } from './AgentTurnInput';
import { AgentToolDefinition } from '../tools/AgentTool';
import { ModelRequest } from '../model/ModelRequest';
import { AgentToolCall, ModelResponse } from '../model/ModelResponse';

interface ToolInvocationResult {
    toolCall: { id: string; name: string; input?: any };
    content: string;
    metadata: Record<string, any>;
    receipt: AgentToolExecutionReceipt;
    error?: Error;
}

@Injectable()
export class AgentRuntime {
    private contextManager: AgentContextManager;
    private toolApprovalManager?: ToolApprovalManager;

    constructor(
        @Inject(AGENT_MODEL_ADAPTER) private modelAdapter: ModelAdapter,
        private toolRegistry: ToolRegistry,
        @Inject(AGENT_SESSION_STORE) private sessions: SessionStore,
        @Inject(AGENT_MEMORY_STORE) private memory: MemoryStore,
        @Inject(AGENT_SESSION_SUMMARIZER) private summarizer: SessionSummarizer,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions,
        @Inject(ApplicationContext) private app: ApplicationContext,
        @Optional() @Inject(AGENT_EXPERIENCE_DISTILLER) private experienceDistiller?: ExperienceDistiller,
        @Optional() private promptBuilder?: SystemPromptBuilder,
        @Optional() approvalManager?: ToolApprovalManager,
        @Optional() injectedContextManager?: AgentContextManager
    ) {
        this.contextManager = (injectedContextManager ?? new AgentContextManager()).configure({
            maxHistoryTokens: this.options.context?.maxHistoryTokens,
            maxMemoryRecords: this.options.context?.maxMemoryRecords,
            maxToolResults: this.options.context?.maxToolResultChars
        });
        this.toolApprovalManager = this.resolveApprovalManager(approvalManager);
    }

    @Runner()
    async start(): Promise<void> {
        const bootstrapTurn = this.options.bootstrapTurn;
        if (!bootstrapTurn?.enabled || !bootstrapTurn.input?.trim()) {
            return;
        }
        const result = await this.runTurn(bootstrapTurn.sessionId || 'default', bootstrapTurn.input);
        bootstrapTurn.output = result.message.content;
    }

    async runTurn(sessionId: string, input: string): Promise<AgentTurnResult> {
        const handler = typeof (this.app as any)?.get === 'function' ? (this.app as any).get(AGENT_TURN_HANDLER, null) as { injector?: ApplicationContext, handle(input: AgentTurnInput, context: RunContext): Promise<AgentTurnResult> } | null : null;
        if (!handler) {
            return this.processTurn({ sessionId, input });
        }
        return handler.handle({ sessionId, input }, createRunContext(handler.injector ?? this.app));
    }

    async executeTurn(input: AgentTurnInput, _context: RunContext): Promise<AgentTurnResult> {
        return this.processTurn(input);
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

    /**
     * Run a turn with streaming — each model chunk is published as an AgentStreamChunkEvent
     * so UI components can render tokens incrementally.
     */
    async *runStreamingTurn(sessionId: string, input: string): AsyncGenerator<{ type: 'text' | 'reasoning' | 'tool_call' | 'done'; content?: string }> {
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

            const handled = await this.handleModelResponse(sessionId, response, loopDetector);
            if (handled.message) {
                return { sessionId, message: handled.message };
            }
            if (handled.error) {
                throw handled.error;
            }

            round++;
        }

        const fallback = this.createMessage('assistant', 'Stopped after reaching the tool round limit.');
        return { sessionId, message: fallback };
    }

    private async *completeStreamingTurn(sessionId: string, query: string, currentUserMessageId: string): AsyncGenerator<{ type: 'text' | 'reasoning' | 'tool_call' | 'done'; content?: string }, AgentTurnResult, void> {
        const loopDetector = new ToolLoopDetector();
        loopDetector.reset();
        let round = 0;
        const maxRounds = this.options.maxToolRounds ?? defaultAgentOptions.maxToolRounds!;

        while (round <= maxRounds) {
            const request = await this.buildModelRequest(sessionId, query, currentUserMessageId);
            const response = yield* this.collectStreamingResponse(sessionId, request);

            const handled = await this.handleModelResponse(sessionId, response, loopDetector);
            if (handled.message) {
                return { sessionId, message: handled.message };
            }
            if (handled.error) {
                throw handled.error;
            }

            round++;
        }

        const fallback = this.createMessage('assistant', 'Stopped after reaching the tool round limit.');
        return { sessionId, message: fallback };
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
        return this.toolRegistry.getToolDefinitions(sessionId);
    }

    private async *collectStreamingResponse(
        sessionId: string,
        request: ModelRequest
    ): AsyncGenerator<{ type: 'text' | 'reasoning' | 'tool_call' | 'done'; content?: string }, ModelResponse, void> {
        let message = '';
        let reasoningContent = '';
        let toolCalls: AgentToolCall[] = [];
        let usage: Record<string, any> | undefined;
        let metadata: Record<string, any> = {};

        for await (const chunk of this.modelAdapter.stream(request)) {
            if (chunk.type !== 'done') {
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

            if (chunk.type !== 'done') {
                yield { type: chunk.type, content: chunk.content };
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
        loopDetector: ToolLoopDetector
    ): Promise<{ message?: AgentMessage; error?: Error }> {
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

            const toolError = await this.executeTools(sessionId, response.toolCalls, loopDetector);
            return { error: toolError };
        }

        return {
            message: this.createMessage('assistant', response.message ?? '', undefined, undefined, response.metadata)
        };
    }

    private async executeTools(
        sessionId: string,
        toolCalls: AgentToolCall[],
        loopDetector: ToolLoopDetector
    ): Promise<Error | undefined> {
        const toolOpts = this.options.tools ?? defaultAgentOptions.tools!;

        if (toolOpts.parallelExecution && toolCalls.length > 1 && this.canParallelize(toolCalls, toolOpts.parallelSafeTools ?? [])) {
            return this.executeToolsParallel(sessionId, toolCalls, loopDetector);
        }
        return this.executeToolsSequential(sessionId, toolCalls, loopDetector);
    }

    private canParallelize(toolCalls: Array<{ name: string; input?: any }>, safeTools: string[]): boolean {
        if (this.toolApprovalManager && toolCalls.some(tc => this.toolApprovalManager!.requiresApproval(tc.name, tc.input))) {
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
        loopDetector: ToolLoopDetector
    ): Promise<Error | undefined> {
        let toolError: Error | undefined;
        for (const toolCall of toolCalls) {
            if (toolError) {
                const reason = 'Skipped because a previous tool call failed.';
                const receipt = this.createSkippedReceipt(toolCall, 'sequential', reason);
                await this.app.publishEvent(new AgentToolSkippedEvent(this, sessionId, toolCall.name, reason, receipt));
                await this.sessions.append(sessionId, this.createMessage('tool',
                    JSON.stringify({ error: reason }),
                    toolCall.name, toolCall.id,
                    {
                        inputSummary: this.summarizeToolInput(toolCall.input),
                        error: reason,
                        receipt
                    }
                ));
                continue;
            }
            toolError = await this.invokeSingleTool(sessionId, toolCall, loopDetector, 'sequential');
        }
        return toolError;
    }

    private async executeToolsParallel(
        sessionId: string,
        toolCalls: AgentToolCall[],
        loopDetector: ToolLoopDetector
    ): Promise<Error | undefined> {
        const maxParallel = this.options.tools?.maxParallelTools ?? defaultAgentOptions.tools!.maxParallelTools!;
        for (let i = 0; i < toolCalls.length; i += maxParallel) {
            const batch = toolCalls.slice(i, i + maxParallel);
            const results = await Promise.allSettled(
                batch.map(tc => this.performToolInvocation(sessionId, tc, loopDetector, 'parallel'))
            );

            const finalized: ToolInvocationResult[] = [];
            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                if (result.status === 'rejected') {
                    return result.reason instanceof Error ? result.reason : new Error(String(result.reason));
                }
                finalized.push(result.value);
            }

            for (const result of finalized) {
                await this.finalizeToolInvocation(sessionId, result);
                if (result.error) {
                    return result.error;
                }
            }
        }
        return undefined;
    }

    private async invokeSingleTool(
        sessionId: string,
        toolCall: { id: string; name: string; input?: any },
        loopDetector: ToolLoopDetector,
        executionMode: 'sequential' | 'parallel',
        persistMessage = true
    ): Promise<Error | undefined> {
        const result = await this.performToolInvocation(sessionId, toolCall, loopDetector, executionMode);
        if (persistMessage) {
            await this.finalizeToolInvocation(sessionId, result);
        }
        return result.error;
    }

    private async performToolInvocation(
        sessionId: string,
        toolCall: { id: string; name: string; input?: any },
        loopDetector: ToolLoopDetector,
        executionMode: 'sequential' | 'parallel'
    ): Promise<ToolInvocationResult> {
        const toolCallInput = this.cloneToolInput(toolCall.input);
        const inputSummary = this.summarizeToolInput(toolCallInput);
        const baseReceipt = this.createBaseReceipt(toolCall, executionMode, inputSummary);
        // Tool loop detection
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

        // Tool approval check
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

        const startedAt = Date.now();
        await this.app.publishEvent(new AgentToolInvokedEvent(this, sessionId, toolCall.name, toolCallInput, baseReceipt));

        try {
            const output = await this.toolRegistry.invoke(toolCall.name, toolCallInput, sessionId);
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

    private createSkippedReceipt(
        toolCall: { id: string; name: string },
        executionMode: 'sequential' | 'parallel',
        error: string
    ): AgentToolExecutionReceipt {
        return {
            receiptId: randomUUID(),
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            executionMode,
            status: 'skipped',
            durationMs: 0,
            error
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
                autoDeny: true
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
        return this.memory.search(normalized, sessionId);
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

    private createMessage(role: AgentMessage['role'], content: string, name?: string, toolCallId?: string, metadata?: Record<string, any>): AgentMessage {
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
