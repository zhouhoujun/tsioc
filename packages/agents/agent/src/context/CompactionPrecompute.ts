import type { AgentMessage } from '../runtime/AgentMessage';
import type { SessionSummarizer } from '../memory/SessionSummarizer';

interface CachedSummary {
    ids: string[];
    createdAt: number;
    summary: Promise<string | null>;
}

const MAX_AGE_MS = 15 * 60_000;

/**
 * P2.2: background compaction precompute. A near-threshold turn schedules a
 * summary of the compactable prefix; when compaction runs, the cache is used
 * only when its message ids are a prefix of the current old messages, and just
 * the suffix is summarized (incremental summary) — never stale full history.
 */
export class CompactionPrecompute {
    private cached?: CachedSummary;

    clear(): void {
        this.cached = undefined;
    }

    /** Decides whether the turn is near the compaction threshold, then schedules the compactable prefix. */
    maybeSchedule(input: {
        messages: AgentMessage[];
        summarizer?: SessionSummarizer;
        effectiveMinTokens: number;
        maxHistoryTokens: number;
        messageThreshold: number;
        split(messages: AgentMessage[]): { oldMessages: AgentMessage[] };
        estimate(messages: AgentMessage[]): number;
    }): void {
        if (!input.summarizer || !input.messages.length) {
            return;
        }
        const threshold = Math.min(input.effectiveMinTokens, input.maxHistoryTokens);
        const nearCount = input.messageThreshold > 0 && input.messages.length >= input.messageThreshold - 1;
        if (!nearCount && input.estimate(input.messages) < Math.floor(threshold * 0.7)) {
            return;
        }
        const { oldMessages } = input.split(input.messages);
        if (oldMessages.length) {
            this.schedule(oldMessages, input.summarizer);
        }
    }

    /** Schedule a summary for the compactable prefix at the end of a turn. */
    schedule(messages: AgentMessage[], summarizer: SessionSummarizer): void {
        if (!messages.length) {
            return;
        }
        const ids = messages.map(message => message.id);
        if (this.cached && this.sameIds(this.cached.ids, ids)) {
            return;
        }
        this.cached = {
            ids,
            createdAt: Date.now(),
            summary: summarizer.summarize(messages).then(text => (text ?? '').trim() || null).catch(() => null)
        };
    }

    /** Use the cached prefix when it still matches; summarize only the suffix. */
    async summary(oldMessages: AgentMessage[], summarizer: SessionSummarizer): Promise<string | null> {
        const cached = this.cached;
        if (cached
            && Date.now() - cached.createdAt < MAX_AGE_MS
            && cached.ids.length > 0
            && cached.ids.length <= oldMessages.length
            && this.sameIds(cached.ids, oldMessages.slice(0, cached.ids.length).map(message => message.id))) {
            const base = await cached.summary;
            this.cached = undefined;
            if (!base) {
                return this.summarize(oldMessages, summarizer);
            }
            const suffix = oldMessages.slice(cached.ids.length);
            if (!suffix.length) {
                return base;
            }
            const tail = await this.summarize(suffix, summarizer);
            return tail ? `${base}\n${tail}` : base;
        }
        return this.summarize(oldMessages, summarizer);
    }

    private summarize(messages: AgentMessage[], summarizer: SessionSummarizer): Promise<string | null> {
        if (!messages.length) {
            return Promise.resolve(null);
        }
        return summarizer.summarize(messages).then(text => (text ?? '').trim() || null).catch(() => null);
    }

    private sameIds(left: string[], right: string[]): boolean {
        return left.length === right.length && left.every((id, index) => id === right[index]);
    }
}
