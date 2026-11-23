import type { AgentMessage } from './AgentMessage';
import type { ModelRequest } from '../model/ModelRequest';
import type { ModelResponse } from '../model/ModelResponse';
import { findLatestFollowUpContextUserMessage } from './recovery-requests';
import type { SessionStore } from '../memory/SessionStore';

export interface TurnAssistantHost {
    sessions: SessionStore;
    createMessage(role: 'assistant', content: string, metadata?: Record<string, any>): AgentMessage;
}

/** Final assistant text, empty-response policy and recent tool errors. */
export class TurnAssistantController {
    constructor(private readonly host: TurnAssistantHost) {
    }

    shouldRetryEmptyResponse(response: ModelResponse): boolean {
        return !response.toolCalls?.length && !String(response.message ?? '').trim();
    }

    shouldRecoverEmptyFollowUp(request: ModelRequest, response: ModelResponse): boolean {
        return this.shouldRetryEmptyResponse(response)
            && !!findLatestFollowUpContextUserMessage(request.messages);
    }

    async createMessageFromResponse(sessionId: string, response: ModelResponse): Promise<AgentMessage> {
        return this.host.createMessage('assistant', await this.resolveResponseText(sessionId, response), response.metadata);
    }

    async resolveResponseText(sessionId: string, response: ModelResponse): Promise<string> {
        const explicitMessage = String(response.message ?? '');
        if (explicitMessage.trim()) {
            return explicitMessage;
        }
        const toolError = await this.findRecentToolError(sessionId);
        if (toolError) {
            return `I couldn't complete the request because a required tool failed: ${toolError}. Fix the tool input or path and retry.`;
        }
        return 'I couldn\'t complete the request because the model returned an empty response. This is usually a transient provider issue: retry the request, or check the configured model/provider.';
    }

    async findRecentToolError(sessionId: string): Promise<string | undefined> {
        const messages = (await this.host.sessions.get(sessionId)).messages;
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
}
