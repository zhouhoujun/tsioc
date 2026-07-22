import { Injectable } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { SessionSummarizer } from '../memory/SessionSummarizer';

export interface ContextBudget {
    maxHistoryTokens: number;
    maxMemoryRecords: number;
    maxToolResults: number;
}

const DEFAULT_BUDGET: ContextBudget = {
    maxHistoryTokens: 32000,
    maxMemoryRecords: 50,
    maxToolResults: 8000
};

@Injectable()
export class AgentContextManager {
    private budget: ContextBudget = { ...DEFAULT_BUDGET };
    private summarizer?: SessionSummarizer;
    private compactionThreshold = 0;

    configure(budget?: Partial<ContextBudget>): this {
        this.budget = { ...DEFAULT_BUDGET, ...(budget ?? {}) };
        return this;
    }

    setSummarizer(summarizer: SessionSummarizer, compactionThreshold?: number): this {
        this.summarizer = summarizer;
        this.compactionThreshold = compactionThreshold ?? 0;
        return this;
    }

    estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    estimateMessages(messages: AgentMessage[]): number {
        return messages.reduce((sum, m) => sum + this.estimateTokens(m.content) + 10, 0);
    }

    shouldCompact(messages: AgentMessage[]): boolean {
        return this.compactionThreshold > 0 && messages.length >= this.compactionThreshold;
    }

    async compactHistory(messages: AgentMessage[]): Promise<AgentMessage[]> {
        if (!this.shouldCompact(messages) || !this.summarizer) {
            return messages;
        }

        const systemMessages: AgentMessage[] = [];
        const recentMessages: AgentMessage[] = [];
        const oldMessages: AgentMessage[] = [];

        const recentCount = 6;
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemMessages.push(msg);
            } else {
                oldMessages.push(msg);
            }
        }

        while (oldMessages.length > recentCount) {
            recentMessages.unshift(oldMessages.pop()!);
        }

        if (oldMessages.length === 0) {
            return messages;
        }

        const oldTokens = this.estimateMessages(oldMessages);
        if (oldTokens <= 200) {
            return messages;
        }

        try {
            const summary = await this.summarizer.summarize(oldMessages);
            if (!summary?.trim()) {
                return this.pruneHistory(messages);
            }

            const summaryMessage: AgentMessage = {
                id: `compact-${Date.now()}`,
                role: 'system',
                content: `[Context Summary — compressed ${oldMessages.length} messages]\n${summary}`,
                createdAt: Date.now()
            };

            const compacted = [...systemMessages, summaryMessage, ...recentMessages];
            if (this.estimateMessages(compacted) <= this.budget.maxHistoryTokens) {
                return compacted;
            }

            return this.pruneHistory(compacted);
        } catch {
            return this.pruneHistory(messages);
        }
    }

    pruneHistory(messages: AgentMessage[]): AgentMessage[] {
        if (this.estimateMessages(messages) <= this.budget.maxHistoryTokens) {
            return messages;
        }

        let pruned = messages.map(msg => {
            if (msg.role === 'tool' && msg.content.length > this.budget.maxToolResults) {
                return { ...msg, content: msg.content.slice(0, this.budget.maxToolResults) + '...[truncated]' };
            }
            return msg;
        });

        if (this.estimateMessages(pruned) <= this.budget.maxHistoryTokens) {
            return pruned;
        }

        const droppedToolIds = new Set<string>();
        const assistantToolCallIds = new Set<string>();
        const recentThreshold = Math.max(pruned.length - 20, 0);
        for (let i = 0; i < recentThreshold; i++) {
            const msgMeta = pruned[i].metadata;
            if (pruned[i].role === 'assistant' && msgMeta?.toolCalls) {
                const toolCalls: Array<{ id: string }> = msgMeta.toolCalls as any;
                for (const tc of toolCalls) {
                    assistantToolCallIds.add(tc.id);
                }
            }
        }
        for (let i = 0; i < recentThreshold; i++) {
            const toolCallId = pruned[i].toolCallId;
            if (pruned[i].role === 'tool' && toolCallId && assistantToolCallIds.has(toolCallId)) {
                droppedToolIds.add(toolCallId);
            }
        }

        const kept: AgentMessage[] = [];
        for (let i = 0; i < pruned.length; i++) {
            if (i >= recentThreshold) {
                kept.push(pruned[i]);
                continue;
            }
            if (pruned[i].role === 'system' || pruned[i].role === 'user') {
                kept.push(pruned[i]);
                continue;
            }
            if (pruned[i].role === 'assistant' && pruned[i].metadata?.toolCalls) {
                continue;
            }
            const tcId = pruned[i].toolCallId;
            if (pruned[i].role === 'tool' && tcId && droppedToolIds.has(tcId)) {
                continue;
            }
            if (pruned[i].role === 'assistant') {
                kept.push(pruned[i]);
                continue;
            }
        }

        if (kept.length < 4) {
            return messages.slice(-Math.min(10, messages.length));
        }

        if (this.estimateMessages(kept) <= this.budget.maxHistoryTokens) {
            return kept;
        }

        return kept.slice(-Math.max(10, Math.floor(this.budget.maxHistoryTokens / 100)));
    }

    trimMemory<T extends { value?: string }>(records: T[]): T[] {
        if (records.length <= this.budget.maxMemoryRecords) return records;
        return records.slice(-this.budget.maxMemoryRecords);
    }
}
