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
    private budget: ContextBudget = { ...DEFAULT_BUDGET };

    configure(budget?: Partial<ContextBudget>): this {
        this.budget = { ...DEFAULT_BUDGET, ...(budget ?? {}) };
        return this;
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
     * Keeps the most recent messages, drops old tool-call pairs (assistant + tool messages)
     * together to avoid orphaned references.
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

        // Phase 2: remove oldest assistant+tool pairs together to avoid orphaned references.
        // An assistant message that made tool calls is followed by one or more tool-role messages.
        // We collect IDs of tool-role messages that belong to tool-calling assistants,
        // then drop the entire pair from the old section.
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
        // Mark tool-role messages from old sections that belong to tool-calling assistants
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
            // Keep system/user messages
            if (pruned[i].role === 'system' || pruned[i].role === 'user') {
                kept.push(pruned[i]);
                continue;
            }
            // Drop assistant messages that had tool calls (their pairs are dropped too)
            if (pruned[i].role === 'assistant' && pruned[i].metadata?.toolCalls) {
                continue;
            }
            // Drop tool messages that are paired with dropped assistants
            const tcId = pruned[i].toolCallId;
            if (pruned[i].role === 'tool' && tcId && droppedToolIds.has(tcId)) {
                continue;
            }
            // Keep non-tool-calling assistant messages
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

        // Phase 3: emergency - keep only last N messages
        return kept.slice(-Math.max(10, Math.floor(this.budget.maxHistoryTokens / 100)));
    }

    /** Trim memory records to budget */
    trimMemory<T extends { value?: string }>(records: T[]): T[] {
        if (records.length <= this.budget.maxMemoryRecords) return records;
        return records.slice(-this.budget.maxMemoryRecords);
    }
}
