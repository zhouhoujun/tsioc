import type { SessionStore } from '../memory/SessionStore';
import type { AgentMessage } from './AgentMessage';
import type { AgentTurnResult } from './AgentTurnResult';
import type { ModelRequest } from '../model/ModelRequest';
import type { ModelResponse } from '../model/ModelResponse';
import type { StreamChunk } from '../model/StreamChunk';

export interface TurnTerminationHost {
    sessions: SessionStore;
    buildWrapUp(termination: string): AgentMessage;
    buildModelRequest(sessionId: string, query: string, currentUserMessageId: string, context: any): Promise<ModelRequest>;
    prepareRequest(sessionId: string, request: ModelRequest, context: any): ModelRequest;
    completeModel(request: ModelRequest): Promise<ModelResponse>;
    collectStreaming(sessionId: string, request: ModelRequest): AsyncGenerator<StreamChunk, ModelResponse, void>;
    recordUsage(sessionId: string, response: ModelResponse): Promise<void>;
    publishCompleted(sessionId: string, response: ModelResponse): Promise<void>;
    createMessage(role: 'assistant', content: string, metadata?: Record<string, any>): AgentMessage;
}

/** Ask the model for a short wrap-up when a turn must terminate early. */
export class TurnTerminationController {
    constructor(private readonly host: TurnTerminationHost) {
    }

    async complete(sessionId: string, query: string, currentUserMessageId: string, context: any, termination: string): Promise<AgentMessage> {
        await this.host.sessions.append(sessionId, this.host.buildWrapUp(termination));
        try {
            const request = await this.host.buildModelRequest(sessionId, query, currentUserMessageId, context);
            const response = await this.host.completeModel(this.host.prepareRequest(sessionId, request, context));
            await this.host.recordUsage(sessionId, response);
            await this.host.publishCompleted(sessionId, response);
            const text = String(response.message ?? '').trim();
            if (text) {
                return this.host.createMessage('assistant', text, response.metadata);
            }
        } catch {
            // wrap-up failure must not mask the raw termination summary
        }
        return this.host.createMessage('assistant', termination);
    }

    async *completeStreaming(sessionId: string, query: string, currentUserMessageId: string, context: any, termination: string): AsyncGenerator<StreamChunk, AgentMessage, void> {
        await this.host.sessions.append(sessionId, this.host.buildWrapUp(termination));
        try {
            const request = await this.host.buildModelRequest(sessionId, query, currentUserMessageId, context);
            const response = yield* this.host.collectStreaming(sessionId, this.host.prepareRequest(sessionId, request, context));
            await this.host.recordUsage(sessionId, response);
            const text = String(response.message ?? '').trim();
            if (text) {
                return this.host.createMessage('assistant', text, response.metadata);
            }
        } catch {
            // wrap-up failure must not mask the raw termination summary
        }
        yield { type: 'text', content: `\n\n${termination}\n\n` };
        return this.host.createMessage('assistant', termination);
    }
}
