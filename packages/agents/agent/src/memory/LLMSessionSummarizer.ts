import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ModelAdapter } from '../model/ModelAdapter';
import { SessionSummarizer } from './SessionSummarizer';
import { AgentMessage } from '../runtime/AgentMessage';
import { ModelRequest } from '../model/ModelRequest';

const COMPACTION_SYSTEM_PROMPT = 'You are a context compression assistant for a coding agent. Compress the conversation into a concise summary preserving: 1) User goals and requirements, 2) Decisions made and rationale, 3) Files created/modified/deleted with paths, 4) Errors encountered and how they were resolved, 5) Current task state and next steps. Output a single structured paragraph. Be factual — do not infer or add information not present in the conversation.';

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

        const conversationText = this.formatMessagesForSummarization(messages);

        const request: ModelRequest = {
            sessionId: 'summarizer',
            messages: [
                {
                    id: 'summarize-sys',
                    role: 'system',
                    content: COMPACTION_SYSTEM_PROMPT,
                    createdAt: 0
                },
                {
                    id: 'summarize-user',
                    role: 'user',
                    content: `Compress this conversation:\n\n${conversationText}`,
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
                return response.message.trim();
            }
        } catch {
            // fall through to naive fallback
        }

        return this.naiveFallback(messages);
    }

    private formatMessagesForSummarization(messages: AgentMessage[]): string {
        const parts: string[] = [];
        let totalChars = 0;
        const maxChars = 12000;

        for (const msg of messages) {
            if (msg.role === 'system') {
                continue;
            }

            const prefix = msg.role === 'user' ? 'Human' : msg.role === 'assistant' ? 'Assistant' : 'Tool';
            let content = msg.content;

            if (msg.role === 'tool' && msg.name) {
                content = `[${msg.name}] ${content}`;
            }

            if (msg.metadata?.toolCalls?.length) {
                const toolNames = msg.metadata.toolCalls.map((tc: any) => tc.name).filter(Boolean);
                if (toolNames.length) {
                    content = `${content || ''} [called: ${toolNames.join(', ')}]`.trim();
                }
            }

            content = content.slice(0, 1500);
            const line = `${prefix}: ${content}`;

            if (totalChars + line.length > maxChars) {
                break;
            }
            parts.push(line);
            totalChars += line.length;
        }

        return parts.join('\n');
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
