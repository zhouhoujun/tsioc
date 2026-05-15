import { Injectable } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';

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

/**
 * Manages conversation context window — history pruning, token estimation,
 * and budget enforcement to prevent context overflow.
 *
 * Reference: zeroclaw crates/zeroclaw-runtime/src/agent/history.rs
 */
@Injectable()
export class AgentContextManager {
    private budget: ContextBudget;

    constructor(budget?: Partial<ContextBudget>) {
        this.budget = { ...DEFAULT_BUDGET, ...(budget ?? {}) };
    }

    /** Rough token estimate (~4 chars per token) */
    estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    estimateMessages(messages: AgentMessage[]): number {
        return messages.reduce((sum, m) => sum + this.estimateTokens(m.content) + 10, 0);
    }

    /**
     * Prune history to fit within the token budget.
     * Keeps the most recent messages, drops old tool result pairs first.
     */
    pruneHistory(messages: AgentMessage[]): AgentMessage[] {
        if (this.estimateMessages(messages) <= this.budget.maxHistoryTokens) {
            return messages;
        }

        // Phase 1: truncate long tool result content
        let pruned = messages.map(msg => {
            if (msg.role === 'tool' && msg.content.length > this.budget.maxToolResults) {
                return { ...msg, content: msg.content.slice(0, this.budget.maxToolResults) + '...[truncated]' };
            }
            return msg;
        });

        if (this.estimateMessages(pruned) <= this.budget.maxHistoryTokens) {
            return pruned;
        }

        // Phase 2: remove oldest tool pairs (assistant+tool message pairs)
        const kept: AgentMessage[] = [];
        const recentThreshold = Math.max(pruned.length - 20, 0);
        for (let i = 0; i < pruned.length; i++) {
            if (i >= recentThreshold) {
                kept.push(pruned[i]);
                continue;
            }
            // Keep system messages and non-tool messages
            if (pruned[i].role === 'system' || pruned[i].role === 'user' || pruned[i].role === 'assistant') {
                kept.push(pruned[i]);
            }
            // Drop old tool pairs (assistant+tool)
        }

        if (kept.length < 4) {
            return messages.slice(-Math.min(10, messages.length));
        }

        if (this.estimateMessages(kept) <= this.budget.maxHistoryTokens) {
            return kept;
        }

        // Phase 3: emergency - keep only last N messages
        return kept.slice(-Math.max(10, Math.floor(this.budget.maxHistoryTokens / 100)));
    }

    /** Trim memory records to budget */
    trimMemory<T extends { value?: string }>(records: T[]): T[] {
        if (records.length <= this.budget.maxMemoryRecords) return records;
        return records.slice(-this.budget.maxMemoryRecords);
    }
}
