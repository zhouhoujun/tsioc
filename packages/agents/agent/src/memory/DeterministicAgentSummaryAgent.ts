import { Injectable } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentSessionSummary, AgentSummaryAgent } from './AgentSummaryAgent';

/**
 * Deterministic, zero-cost fallback title/summary generator. Derives the title
 * from the first substantive user message (first sentence, truncated) and the
 * summary from the same message truncated to a longer bound.
 *
 * Used as the module default (mirroring `SimpleSessionSummarizer` being the
 * default `SessionSummarizer`); applications that want LLM-derived titles
 * assemble `LLMAgentSummaryAgent` instead, which falls back to this class on
 * any model failure.
 */
@Injectable()
export class DeterministicAgentSummaryAgent extends AgentSummaryAgent {
    constructor(
        private readonly titleMaxLength: number = 60,
        private readonly summaryMaxLength: number = 160
    ) {
        super();
    }

    async generate(messages: AgentMessage[]): Promise<AgentSessionSummary> {
        const firstMessage = this.resolveFirstSubstantiveUserMessage(messages);
        if (!firstMessage) {
            return {};
        }
        return {
            title: this.truncateSentence(firstMessage, this.titleMaxLength),
            summary: this.truncate(firstMessage, this.summaryMaxLength)
        };
    }

    /**
     * First non-system user message that is not an empty/command/continuation
     * message (mirrors the substantive-message rule used by the compaction
     * summarizer so follow-up-only chatter never becomes a session title).
     */
    private resolveFirstSubstantiveUserMessage(messages: AgentMessage[]): string | undefined {
        for (const message of messages) {
            if (message.role !== 'user') {
                continue;
            }
            const text = String(message.content || '').replace(/\s+/g, ' ').trim();
            if (!text || text.startsWith('/')) {
                continue;
            }
            if (FOLLOW_UP_ONLY_MESSAGE_RE.test(text)) {
                continue;
            }
            return text;
        }
        return undefined;
    }

    private truncateSentence(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }
        // prefer breaking at the first sentence/clause boundary
        const boundary = text.search(/[。.!?；;]\s*/);
        if (boundary > 0 && boundary < maxLength) {
            return `${text.slice(0, boundary + 1)}`;
        }
        return this.truncate(text, maxLength);
    }

    private truncate(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }
        const boundary = text.lastIndexOf('.', maxLength - 3);
        if (boundary > Math.floor(maxLength / 2)) {
            return `${text.slice(0, boundary + 1)}..`;
        }
        return `${text.slice(0, maxLength - 3)}...`;
    }
}

/**
 * Follow-up-only user messages that should never be used as a session title
 * (mirrors `LLMSessionSummarizer`'s regex so behavior stays consistent).
 */
const FOLLOW_UP_ONLY_MESSAGE_RE = /^(?:继续|继续吧|继续下去|接着|接着说|接着来|然后呢|再来|下一步|下一部分|后面呢|展开|详细点|详细一点|再详细点|补充一下|继续输出|继续生成|more|continue|go on|keep going|carry on|next|proceed)(?:[\s.!?~。！？、]*)$/i;
