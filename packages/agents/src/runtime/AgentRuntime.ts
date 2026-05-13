import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext, RunContext, createRunContext } from '@tsdi/core';
import { ModelAdapter } from '../model/ModelAdapter';
import { ToolRegistry } from '../tools/ToolRegistry';
import { SessionStore } from '../memory/SessionStore';
import { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSummarizer } from '../memory/SessionSummarizer';
import { AGENT_MEMORY_STORE, AGENT_MODEL_ADAPTER, AGENT_OPTIONS, AGENT_SESSION_STORE, AGENT_SESSION_SUMMARIZER, AGENT_TURN_HANDLER } from '../tokens';
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
        @Inject(ApplicationContext) private app: ApplicationContext
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
            const result = await this.completeTurn(input.sessionId);
            await this.sessions.append(input.sessionId, result.message);
            await this.maybeSummarize(input.sessionId);
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

    private async completeTurn(sessionId: string): Promise<AgentTurnResult> {
        let round = 0;
        while (round <= (this.options.maxToolRounds ?? defaultAgentOptions.maxToolRounds!)) {
            const state = await this.sessions.get(sessionId);
            const memory = await this.memory.getAll(sessionId);
            const response = await this.modelAdapter.complete({
                sessionId,
                messages: state.messages,
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
                for (const toolCall of response.toolCalls) {
                    await this.app.publishEvent(new AgentToolInvokedEvent(this, sessionId, toolCall.name, toolCall.input));
                    const output = await this.toolRegistry.invoke(toolCall.name, toolCall.input, sessionId);
                    await this.app.publishEvent(new AgentToolCompletedEvent(this, sessionId, toolCall.name, output));
                    const toolMessage = this.createMessage('tool', JSON.stringify(output), toolCall.name, toolCall.id);
                    await this.sessions.append(sessionId, toolMessage);
                }
                round++;
                continue;
            }

            const message = this.createMessage('assistant', response.message ?? '');
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

    private createMessage(role: AgentMessage['role'], content: string, name?: string, toolCallId?: string): AgentMessage {
        return {
            id: `${Date.now()}-${Math.random()}`,
            role,
            content,
            name,
            toolCallId,
            createdAt: Date.now()
        };
    }
}
