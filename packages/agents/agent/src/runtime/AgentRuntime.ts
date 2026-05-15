import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ApplicationContext, RunContext, createRunContext } from '@tsdi/core';
import { randomUUID } from 'crypto';
import { ModelAdapter } from '../model/ModelAdapter';
import { ToolRegistry } from '../tools/ToolRegistry';
import { SessionStore } from '../memory/SessionStore';
import { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSummarizer } from '../memory/SessionSummarizer';
import { ExperienceDistiller } from '../memory/ExperienceDistiller';
import { AGENT_EXPERIENCE_DISTILLER, AGENT_MEMORY_STORE, AGENT_MODEL_ADAPTER, AGENT_OPTIONS, AGENT_SESSION_STORE, AGENT_SESSION_SUMMARIZER, AGENT_TURN_HANDLER } from '../tokens';
import { AgentOptions, defaultAgentOptions } from '../options';
import { AgentMessage } from './AgentMessage';
import { AgentTurnResult } from './AgentTurnResult';
import { AgentErrorEvent, AgentMemoryUpdatedEvent, AgentModelCompletedEvent, AgentToolCompletedEvent, AgentToolInvokedEvent, AgentTurnCompletedEvent, AgentTurnStartedEvent } from './AgentEvents';
import { AgentTurnInput } from './AgentTurnInput';

@Injectable()
export class AgentRuntime {
    constructor(
        @Inject(AGENT_MODEL_ADAPTER) private modelAdapter: ModelAdapter,
        private toolRegistry: ToolRegistry,
        @Inject(AGENT_SESSION_STORE) private sessions: SessionStore,
        @Inject(AGENT_MEMORY_STORE) private memory: MemoryStore,
        @Inject(AGENT_SESSION_SUMMARIZER) private summarizer: SessionSummarizer,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions,
        @Inject(ApplicationContext) private app: ApplicationContext,
        @Optional() @Inject(AGENT_EXPERIENCE_DISTILLER) private experienceDistiller?: ExperienceDistiller
    ) {
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
        let round = 0;
        while (round <= (this.options.maxToolRounds ?? defaultAgentOptions.maxToolRounds!)) {
            const state = await this.sessions.get(sessionId);
            const memory = await this.getRelevantMemory(query, sessionId);
            const response = await this.modelAdapter.complete({
                sessionId,
                messages: this.getRecentMessages(state.messages, currentUserMessageId),
                tools: this.toolRegistry.getTools().map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema
                })),
                memory,
                summary: state.summary
            });
            await this.app.publishEvent(new AgentModelCompletedEvent(this, sessionId, response));

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
                let toolError: Error | undefined;
                for (const toolCall of response.toolCalls) {
                    if (toolError) {
                        const skippedMessage = this.createMessage('tool', JSON.stringify({ error: 'Skipped because a previous tool call failed.' }), toolCall.name, toolCall.id, {
                            input: toolCall.input,
                            error: 'Skipped because a previous tool call failed.'
                        });
                        await this.sessions.append(sessionId, skippedMessage);
                        continue;
                    }
                    await this.app.publishEvent(new AgentToolInvokedEvent(this, sessionId, toolCall.name, toolCall.input));
                    try {
                        const output = await this.toolRegistry.invoke(toolCall.name, toolCall.input, sessionId);
                        await this.app.publishEvent(new AgentToolCompletedEvent(this, sessionId, toolCall.name, output));
                        const toolMessage = this.createMessage('tool', JSON.stringify(output), toolCall.name, toolCall.id, {
                            input: toolCall.input
                        });
                        await this.sessions.append(sessionId, toolMessage);
                    } catch (error) {
                        toolError = error instanceof Error ? error : new Error(String(error));
                        const toolMessage = this.createMessage('tool', JSON.stringify({ error: toolError.message }), toolCall.name, toolCall.id, {
                            input: toolCall.input,
                            error: toolError.message
                        });
                        await this.sessions.append(sessionId, toolMessage);
                    }
                }
                if (toolError) {
                    throw toolError;
                }
                round++;
                continue;
            }

            const message = this.createMessage('assistant', response.message ?? '', undefined, undefined, response.metadata);
            return { sessionId, message };
        }

        const fallback = this.createMessage('assistant', 'Stopped after reaching the tool round limit.');
        return { sessionId, message: fallback };
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
