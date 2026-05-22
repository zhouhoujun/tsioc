import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ModelAdapter } from '../model/ModelAdapter';
import { SessionSummarizer } from './SessionSummarizer';
import { AgentMessage } from '../runtime/AgentMessage';
import { ModelRequest } from '../model/ModelRequest';

/**
 * LLM-based session summarizer that uses the configured ModelAdapter
 * to generate concise conversation summaries.
 *
 * Falls back to SimpleSessionSummarizer if the model fails.
 */
@Injectable()
export class LLMSessionSummarizer extends SessionSummarizer {
    constructor(
        @Optional() @Inject(ModelAdapter)
        private modelAdapter?: ModelAdapter | null
    ) {
        super();
    }

    async summarize(messages: AgentMessage[]): Promise<string> {
        if (!this.modelAdapter || messages.length === 0) {
            return this.naiveFallback(messages);
        }

        const conversationText = messages
            .filter(m => m.role !== 'system')
            .map(m => {
                const prefix = m.role === 'user' ? 'Human' : m.role === 'assistant' ? 'Assistant' : 'Tool';
                return `${prefix}: ${m.content.slice(0, 1000)}`;
            })
            .join('\n')
            .slice(0, 12000);

        const request: ModelRequest = {
            sessionId: 'summarizer',
            messages: [
                {
                    id: 'summarize-sys',
                    role: 'system',
                    content: 'Summarize the key points of this conversation concisely. Focus on decisions made, tasks completed, and important context. Output a single paragraph.',
                    createdAt: 0
                },
                {
                    id: 'summarize-user',
                    role: 'user',
                    content: `Summarize this conversation:\n\n${conversationText}`,
                    createdAt: 0
                }
            ],
            tools: [],
            memory: [],
            summary: undefined
        };

        try {
            const response = await this.modelAdapter.complete(request);
            if (response.message && response.message.trim()) {
                return `[Summary] ${response.message.trim()}`;
            }
        } catch {
            // fall through to naive fallback
        }

        return this.naiveFallback(messages);
    }

    private naiveFallback(messages: AgentMessage[]): string {
        if (messages.length === 0) {
            return '';
        }
        return messages
            .filter(m => m.role !== 'system')
            .slice(-10)
            .map(msg => `${msg.role}: ${msg.content}`)
            .join(' | ')
            .slice(0, 2000);
    }
}
