import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ApplicationContext, RunContext, createRunContext } from '@tsdi/core';
import { randomUUID } from 'crypto';
import { ModelAdapter } from '../model/ModelAdapter';
import { ToolRegistry } from '../tools/ToolRegistry';
import { ToolLoopDetector } from '../tools/ToolLoopDetector';
import { ToolApprovalManager } from '../tools/ToolApprovalManager';
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
import { AgentErrorEvent, AgentMemoryUpdatedEvent, AgentModelCompletedEvent, AgentToolCompletedEvent, AgentToolInvokedEvent, AgentTurnCompletedEvent, AgentTurnStartedEvent, AgentStreamChunkEvent } from './AgentEvents';
import { AgentTurnInput } from './AgentTurnInput';
import { AgentToolDefinition } from '../tools/AgentTool';
import { ModelRequest } from '../model/ModelRequest';
import { AgentToolCall, ModelResponse } from '../model/ModelResponse';

@Injectable()
export class AgentRuntime {
    private contextManager: AgentContextManager;

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
        @Optional() private approvalManager?: ToolApprovalManager,
        @Optional() injectedContextManager?: AgentContextManager
    ) {
        this.contextManager = (injectedContextManager ?? new AgentContextManager()).configure({
            maxHistoryTokens: this.options.context?.maxHistoryTokens,
            maxMemoryRecords: this.options.context?.maxMemoryRecords,
            maxToolResults: this.options.context?.maxToolResultChars
        });
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
                tools: this.getToolDefinitions().map(t => ({ name: t.name, description: t.description })),
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
            tools: this.getToolDefinitions(),
            memory,
            summary: state.summary
        };
    }

    private getToolDefinitions(): AgentToolDefinition[] {
        return this.toolRegistry.getTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }));
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
                toolCalls: response.toolCalls,
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

    private canParallelize(toolCalls: Array<{ name: string }>, safeTools: string[]): boolean {
        return toolCalls.every(tc => safeTools.includes(tc.name));
    }

    private async executeToolsSequential(
        sessionId: string,
        toolCalls: AgentToolCall[],
        loopDetector: ToolLoopDetector
    ): Promise<Error | undefined> {
        let toolError: Error | undefined;
        for (const toolCall of toolCalls) {
            if (toolError) {
                await this.sessions.append(sessionId, this.createMessage('tool',
                    JSON.stringify({ error: 'Skipped because a previous tool call failed.' }),
                    toolCall.name, toolCall.id,
                    { input: toolCall.input, error: 'Skipped because a previous tool call failed.' }
                ));
                continue;
            }
            toolError = await this.invokeSingleTool(sessionId, toolCall, loopDetector);
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
                batch.map(tc => this.invokeSingleTool(sessionId, tc, loopDetector))
            );

            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                if (result.status === 'rejected') {
                    return result.reason instanceof Error ? result.reason : new Error(String(result.reason));
                }
                if (result.value) {
                    return result.value;
                }
            }
        }
        return undefined;
    }

    private async invokeSingleTool(
        sessionId: string,
        toolCall: { id: string; name: string; input?: any },
        loopDetector: ToolLoopDetector
    ): Promise<Error | undefined> {
        await this.app.publishEvent(new AgentToolInvokedEvent(this, sessionId, toolCall.name, toolCall.input));

        // Tool loop detection
        const loopResult = loopDetector.record(toolCall.name, toolCall.input);
        if (loopResult.severity === 'break') {
            const reason = loopResult.reason ?? 'Loop detected';
            await this.sessions.append(sessionId, this.createMessage('tool',
                JSON.stringify({ error: reason }),
                toolCall.name, toolCall.id,
                { input: toolCall.input, error: reason }
            ));
            return new Error(reason);
        }

        // Tool approval check
        if (this.approvalManager) {
            const approved = await this.approvalManager.requireApproval(toolCall.name, toolCall.input, sessionId);
            if (!approved) {
                const reason = `Tool "${toolCall.name}" was rejected.`;
                await this.sessions.append(sessionId, this.createMessage('tool',
                    JSON.stringify({ error: reason }),
                    toolCall.name, toolCall.id,
                    { input: toolCall.input, error: reason }
                ));
                return new Error(reason);
            }
        }

        try {
            const output = await this.toolRegistry.invoke(toolCall.name, toolCall.input, sessionId);
            loopDetector.record(toolCall.name, toolCall.input, output);
            await this.app.publishEvent(new AgentToolCompletedEvent(this, sessionId, toolCall.name, output));

            const maxChars = this.options.context?.maxToolResultChars ?? defaultAgentOptions.context!.maxToolResultChars!;
            const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
            const truncated = outputStr.length > maxChars ? outputStr.slice(0, maxChars) + '...[truncated]' : outputStr;

            await this.sessions.append(sessionId, this.createMessage('tool', truncated, toolCall.name, toolCall.id, {
                input: toolCall.input
            }));
            return undefined;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            await this.sessions.append(sessionId, this.createMessage('tool',
                JSON.stringify({ error: err.message }),
                toolCall.name, toolCall.id,
                { input: toolCall.input, error: err.message }
            ));
            return err;
        }
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
