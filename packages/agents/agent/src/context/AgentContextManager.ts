import { Injectable } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { SessionSummarizer } from '../memory/SessionSummarizer';
import { summarizeToolDisplayText } from '../tools/ToolSummary';

export interface ContextBudget {
    maxHistoryTokens: number;
    maxMemoryRecords: number;
    maxToolResults: number;
    recentMessageWindow: number;
    compactionMinTokens: number;
    /** Enable adaptive budget tuning based on observed session token growth patterns */
    adaptiveBudget?: boolean;
    /** Lower bound for compactionMinTokens when adaptive (default: 200) */
    adaptiveCompactionMin?: number;
    /** Upper bound for recentMessageWindow when adaptive (default: 20) */
    adaptiveRecentWindowMax?: number;
}

export type CompactionLevel = 'light' | 'medium' | 'deep';

export interface StashedContext {
    messages: AgentMessage[];
    timestamp: number;
    level: CompactionLevel;
}

export interface ContextPreparationReport {
    strategy: 'unchanged' | 'pruned' | 'compacted';
    compactionTriggered: boolean;
    /** Progressive compaction level selected based on token pressure */
    level: CompactionLevel;
    summaryInserted: boolean;
    beforeMessageCount: number;
    afterMessageCount: number;
    beforeTokens: number;
    afterTokens: number;
    compactedMessageCount: number;
    preservedAnchorCount: number;
    recentMessageCount: number;
    prunedMessageCount: number;
    toolMessagesCompacted: number;
    /** Percentage of tokens saved: Math.round((1 - after/before) * 100) */
    compressionRatio: number;
    /** Cumulative tokens saved across all prepareHistory calls */
    cumulativeTokenSavings: number;
}

/**
 * A pattern extracted from one or more sessions during cross-session experience synthesis.
 */
export interface ExtractedPattern {
    /** The semantic kind of pattern. */
    type: 'goal' | 'error' | 'tool_pattern' | 'preference' | 'workflow';
    /** Human-readable description of the pattern. */
    content: string;
    /** Session IDs where this pattern was observed. */
    sourceSessionIds: string[];
    /** Confidence score 0-1 based on frequency and consistency. */
    confidence: number;
    /** Timestamp of first observation. */
    firstObserved: number;
    /** Timestamp of last observation. */
    lastObserved: number;
}

/**
 * Options for the {@link AgentContextManager.synthesizeExperiences} call.
 */
export interface SynthesisOptions {
    /** Restrict synthesis to specific session IDs (default: all compacted sessions). */
    sessionIds?: string[];
    /** Maximum number of patterns to retain after deduplication (default: 50). */
    maxPatterns?: number;
}

/**
 * Outcome report from a cross-session experience synthesis pass.
 */
export interface SynthesisReport {
    /** Number of sessions examined. */
    totalSessions: number;
    /** Number of sessions that yielded one or more patterns. */
    processedSessions: number;
    /** Deduplicated and merged patterns. */
    patterns: ExtractedPattern[];
    /** Non-fatal errors encountered during synthesis. */
    errors: string[];
}

const DEFAULT_BUDGET: ContextBudget = {
    maxHistoryTokens: 32000,
    maxMemoryRecords: 50,
    maxToolResults: 8000,
    recentMessageWindow: 6,
    compactionMinTokens: 1200,
    adaptiveBudget: false,
    adaptiveCompactionMin: 200,
    adaptiveRecentWindowMax: 20
};
const FOLLOW_UP_ONLY_MESSAGE_RE = /^(?:继续|继续吧|继续下去|接着|接着说|接着来|然后呢|再来|下一步|下一部分|后面呢|展开|详细点|详细一点|再详细点|补充一下|继续输出|继续生成|more|continue|go on|keep going|carry on|next|proceed)(?:[\s.!?~。！？、]*)$/i;

@Injectable()
export class AgentContextManager {
    private budget: ContextBudget = { ...DEFAULT_BUDGET };
    private summarizer?: SessionSummarizer;
    private compactionThreshold = 0;
    private cumulativeTokenSavings = 0;
    private originalMessageStore = new Map<string, StashedContext>();

    // Adaptive budget tracking
    private adaptiveEnabled = false;
    private tokenGrowthHistory: Array<{ timestamp: number; beforeTokens: number; messageCount: number }> = [];
    private dynamicCompactionMinTokens = DEFAULT_BUDGET.compactionMinTokens;
    private dynamicRecentWindow = DEFAULT_BUDGET.recentMessageWindow;

    configure(budget?: Partial<ContextBudget>): this {
        this.budget = {
            ...DEFAULT_BUDGET,
            ...(budget ?? {}),
            recentMessageWindow: Math.max(1, Math.floor(Number(budget?.recentMessageWindow ?? DEFAULT_BUDGET.recentMessageWindow) || DEFAULT_BUDGET.recentMessageWindow))
        };
        this.adaptiveEnabled = !!this.budget.adaptiveBudget;
        this.dynamicCompactionMinTokens = this.budget.compactionMinTokens;
        this.dynamicRecentWindow = this.budget.recentMessageWindow;
        this.tokenGrowthHistory = [];
        return this;
    }

    setSummarizer(summarizer: SessionSummarizer, compactionThreshold?: number): this {
        this.summarizer = summarizer;
        this.compactionThreshold = compactionThreshold ?? 0;
        return this;
    }

    estimateTokens(text: string): number {
        if (!text) {
            return 0;
        }
        let cjkCount = 0;
        let asciiCount = 0;
        for (const char of text) {
            const code = char.codePointAt(0) || 0;
            if ((code >= 0x4E00 && code <= 0x9FFF) ||
                (code >= 0x3400 && code <= 0x4DBF) ||
                (code >= 0x20000 && code <= 0x2FFFF) ||
                (code >= 0x3000 && code <= 0x303F) ||   // CJK punctuation
                (code >= 0xFF00 && code <= 0xFFEF) ||   // Fullwidth forms
                (code >= 0x3040 && code <= 0x309F) ||   // Hiragana
                (code >= 0x30A0 && code <= 0x30FF)) {   // Katakana
                cjkCount++;
            } else {
                asciiCount++;
            }
        }
        // Most modern tokenizers handle CJK at ~1-2 chars/token, ASCII at ~4 chars/token
        const overhead = text.length <= 4 ? 0 : Math.min(2, Math.ceil(text.length / 40));
        return Math.max(1, Math.ceil(cjkCount / 1.8) + Math.ceil(asciiCount / 4) + overhead);
    }

    estimateMessages(messages: AgentMessage[]): number {
        return messages.reduce((sum, m) => sum + this.estimateTokens(m.content) + 10, 0);
    }

    shouldCompact(messages: AgentMessage[]): boolean {
        if (this.compactionThreshold <= 0 || messages.length < this.compactionThreshold) {
            return false;
        }

        const estimatedTokens = this.estimateMessages(messages);
        if (estimatedTokens >= this.budget.maxHistoryTokens) {
            return true;
        }

        const tokenThreshold = Math.min(this.effectiveCompactionMinTokens, this.budget.maxHistoryTokens);
        return estimatedTokens >= tokenThreshold;
    }

    /**
     * Stash a snapshot of original messages before compaction so detail recovery
     * can retrieve them later when a user query references compacted content.
     */
    private stashOriginalMessages(sessionId: string, messages: AgentMessage[], level: CompactionLevel): void {
        this.originalMessageStore.set(sessionId, {
            messages: messages.map(m => ({ ...m, content: m.content })),
            timestamp: Date.now(),
            level
        });
        // Bound the store to the last 20 sessions to prevent memory leak
        if (this.originalMessageStore.size > 20) {
            const oldest = [...this.originalMessageStore.entries()]
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) {
                this.originalMessageStore.delete(oldest[0]);
            }
        }
    }

    /**
     * Whether the given session has stashed original messages available for recovery.
     */
    hasCompactedContent(sessionId: string): boolean {
        return this.originalMessageStore.has(sessionId);
    }

    /**
     * Recover original messages from the stashed context that are relevant to
     * the user's current query. Uses keyword overlap between query terms and
     * original message content.
     */
    recoverDetail(sessionId: string, userQuery: string): AgentMessage[] | undefined {
        const record = this.originalMessageStore.get(sessionId);
        if (!record) {
            return undefined;
        }

        const queryTerms = userQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        if (queryTerms.length === 0) {
            return undefined;
        }

        const relevant: AgentMessage[] = [];
        const seenIds = new Set<string>();
        for (const msg of record.messages) {
            const content = (msg.content || '').toLowerCase();
            if (queryTerms.some(term => content.includes(term)) && !seenIds.has(msg.id)) {
                seenIds.add(msg.id);
                relevant.push(msg);
            }
        }

        return relevant.length > 0 ? relevant : undefined;
    }

    /**
     * Clear the stashed original messages for a session.
     */
    clearCompactedContent(sessionId: string): void {
        this.originalMessageStore.delete(sessionId);
    }

    private selectCompactionLevel(estimatedTokens: number): CompactionLevel {
        const maxTokens = this.budget.maxHistoryTokens;
        if (estimatedTokens >= maxTokens * 1.5) {
            return 'deep';
        }
        if (estimatedTokens >= maxTokens * 0.6) {
            return 'medium';
        }
        return 'light';
    }

    /**
     * Record token and message counts for adaptive budget tracking.
     */
    private recordTokenGrowth(beforeTokens: number, messageCount: number): void {
        this.tokenGrowthHistory.push({ timestamp: Date.now(), beforeTokens, messageCount });
        // Keep only the last 20 entries to bound memory
        if (this.tokenGrowthHistory.length > 20) {
            this.tokenGrowthHistory = this.tokenGrowthHistory.slice(-20);
        }
    }

    /**
     * Adjust dynamic budget thresholds based on observed token growth patterns.
     * Called after each prepareHistory when adaptiveBudget is enabled.
     *
     * - High token growth rate (>5000/turn avg over last 5 turns): lower compactionMinTokens
     *   to trigger compaction earlier, preventing sudden pressure spikes.
     * - Rapid follow-up pattern (>60% follow-ups): increase recentMessageWindow
     *   to preserve more conversational context.
     */
    private adjustBudget(): void {
        const history = this.tokenGrowthHistory;
        if (history.length < 3) {
            return;
        }

        // Use last 5 entries max to keep the response snappy
        const window = history.slice(-5);

        // Average token growth per turn
        let totalGrowth = 0;
        let followUpCount = 0;
        for (let i = 1; i < window.length; i++) {
            totalGrowth += Math.max(0, window[i].beforeTokens - window[i - 1].beforeTokens);
        }
        const avgGrowthPerTurn = window.length > 1 ? totalGrowth / (window.length - 1) : 0;

        // Count turns where message count barely grew (follow-up pattern)
        for (let i = 1; i < window.length; i++) {
            if (window[i].messageCount - window[i - 1].messageCount <= 2) {
                followUpCount++;
            }
        }
        const followUpRatio = window.length > 1 ? followUpCount / (window.length - 1) : 0;

        // Adjust compactionMinTokens: high growth → compact earlier
        const baseMin = this.budget.compactionMinTokens;
        const adaptiveMin = this.budget.adaptiveCompactionMin ?? 200;
        if (avgGrowthPerTurn > 10000) {
            // Very fast growth: halve the threshold
            this.dynamicCompactionMinTokens = Math.max(adaptiveMin, Math.round(baseMin * 0.5));
        } else if (avgGrowthPerTurn > 5000) {
            // Moderate-fast growth: reduce by 30%
            this.dynamicCompactionMinTokens = Math.max(adaptiveMin, Math.round(baseMin * 0.7));
        } else {
            // Normal growth: restore baseline
            this.dynamicCompactionMinTokens = baseMin;
        }

        // Adjust recentMessageWindow: many follow-ups → wider window
        const baseWindow = this.budget.recentMessageWindow;
        const adaptiveWindowMax = this.budget.adaptiveRecentWindowMax ?? 20;
        if (followUpRatio > 0.6) {
            this.dynamicRecentWindow = Math.min(adaptiveWindowMax, Math.round(baseWindow * 1.5));
        } else {
            this.dynamicRecentWindow = baseWindow;
        }
    }

    /** Effective compactionMinTokens considering adaptive tuning */
    private get effectiveCompactionMinTokens(): number {
        return this.adaptiveEnabled ? this.dynamicCompactionMinTokens : this.budget.compactionMinTokens;
    }

    /** Effective recentMessageWindow considering adaptive tuning */
    private get effectiveRecentWindow(): number {
        return this.adaptiveEnabled ? this.dynamicRecentWindow : this.budget.recentMessageWindow;
    }

    async prepareHistory(messages: AgentMessage[], sessionId?: string): Promise<{ messages: AgentMessage[]; report: ContextPreparationReport }> {
        const beforeMessageCount = messages.length;
        const beforeTokens = this.estimateMessages(messages);
        const compactionTriggered = this.shouldCompact(messages);
        const level: CompactionLevel = compactionTriggered
            ? this.selectCompactionLevel(beforeTokens)
            : 'light';

        // compact tool message outputs across all levels (pre-level check)
        const toolPrepared = this.compactToolMessagesForContext(messages);
        const workingMessages = toolPrepared.messages;

        // Record token growth for adaptive budget (affects next call)
        if (this.adaptiveEnabled) {
            this.recordTokenGrowth(beforeTokens, beforeMessageCount);
            this.adjustBudget();
        }

        if (level === 'light') {
            // Even at light level, use the summarizer if configured and compaction is needed.
            // This preserves the pre-existing behavior where any compaction trigger with a
            // summarizer would go through compactHistoryWithReport.
            if (this.summarizer && compactionTriggered) {
                const prepared = await this.compactHistoryWithReport(workingMessages, beforeMessageCount, beforeTokens, toolPrepared.compactedCount, toolPrepared.recentMessageCount, level);
                if (sessionId) {
                    this.stashOriginalMessages(sessionId, messages, level);
                }
                return prepared;
            }
            const prepared = this.pruneHistory(workingMessages);
            const afterTokens = this.estimateMessages(prepared);
            const savings = beforeTokens - afterTokens;
            this.cumulativeTokenSavings += Math.max(0, savings);
            const compressionRatio = afterTokens > 0
                ? Math.round((1 - afterTokens / beforeTokens) * 100)
                : 0;

            // Stash originals when pruning actually removed or compacted content
            if (sessionId && (prepared !== messages || toolPrepared.compactedCount > 0)) {
                this.stashOriginalMessages(sessionId, messages, level);
            }

            return {
                messages: prepared,
                report: this.createPreparationReport({
                    strategy: prepared === messages && toolPrepared.compactedCount === 0 ? 'unchanged' : 'pruned',
                    compactionTriggered,
                    level,
                    summaryInserted: false,
                    beforeMessageCount,
                    afterMessageCount: prepared.length,
                    beforeTokens,
                    afterTokens,
                    compactedMessageCount: 0,
                    preservedAnchorCount: 0,
                    recentMessageCount: toolPrepared.recentMessageCount,
                    toolMessagesCompacted: toolPrepared.compactedCount,
                    compressionRatio,
                    cumulativeTokenSavings: this.cumulativeTokenSavings
                })
            };
        }

        // Stash originals before medium/deep compaction for detail recovery
        if (sessionId) {
            this.stashOriginalMessages(sessionId, messages, level);
        }

        return this.compactHistoryWithReport(workingMessages, beforeMessageCount, beforeTokens, toolPrepared.compactedCount, toolPrepared.recentMessageCount, level);
    }

    async compactHistory(messages: AgentMessage[]): Promise<AgentMessage[]> {
        const prepared = await this.prepareHistory(messages);
        return prepared.messages;
    }

    private splitMessagesForCompaction(messages: AgentMessage[]): {
        systemMessages: AgentMessage[];
        oldMessages: AgentMessage[];
        recentMessages: AgentMessage[];
    } {
        const systemMessages: AgentMessage[] = [];
        const conversation: AgentMessage[] = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemMessages.push(msg);
                continue;
            }
            conversation.push(msg);
        }

        if (conversation.length === 0) {
            return { systemMessages, oldMessages: [], recentMessages: [] };
        }

        const recentCount = Math.max(1, this.effectiveRecentWindow);
        let startIndex = Math.max(conversation.length - recentCount, 0);
        for (let cursor = conversation.length - 1; cursor >= startIndex; cursor--) {
            const message = conversation[cursor];
            if (message.role !== 'tool' || !message.toolCallId) {
                continue;
            }

            const assistantIndex = this.findAssistantForToolCall(conversation, cursor - 1, message.toolCallId);
            if (assistantIndex >= 0 && assistantIndex < startIndex) {
                startIndex = assistantIndex;
            }
        }

        return {
            systemMessages,
            oldMessages: conversation.slice(0, startIndex),
            recentMessages: conversation.slice(startIndex)
        };
    }

    private async compactHistoryWithReport(messages: AgentMessage[], beforeMessageCount: number, beforeTokens: number, toolMessagesCompacted: number, preparedRecentMessageCount: number, level: CompactionLevel): Promise<{ messages: AgentMessage[]; report: ContextPreparationReport }> {
        const buildReport = (overrides: Partial<ContextPreparationReport> & { afterTokens: number; strategy: ContextPreparationReport['strategy']; compactedMessageCount: number; preservedAnchorCount: number; afterMessageCount: number }): ContextPreparationReport => {
            const afterTokens = overrides.afterTokens;
            const savings = beforeTokens - afterTokens;
            this.cumulativeTokenSavings += Math.max(0, savings);
            const compressionRatio = beforeTokens > 0
                ? Math.round((1 - Math.min(afterTokens, beforeTokens) / beforeTokens) * 100)
                : 0;
            return this.createPreparationReport({
                strategy: overrides.strategy,
                compactionTriggered: true,
                level,
                summaryInserted: overrides.summaryInserted ?? false,
                beforeMessageCount,
                afterMessageCount: overrides.afterMessageCount,
                beforeTokens,
                afterTokens,
                compactedMessageCount: overrides.compactedMessageCount,
                preservedAnchorCount: overrides.preservedAnchorCount,
                recentMessageCount: preparedRecentMessageCount,
                toolMessagesCompacted,
                compressionRatio,
                cumulativeTokenSavings: this.cumulativeTokenSavings
            });
        };

        if (!this.summarizer) {
            return {
                messages,
                report: buildReport({
                    strategy: 'unchanged',
                    afterMessageCount: messages.length,
                    afterTokens: beforeTokens,
                    compactedMessageCount: 0,
                    preservedAnchorCount: 0,
                    summaryInserted: false
                })
            };
        }

        const { systemMessages, oldMessages, recentMessages } = this.splitMessagesForCompaction(messages);
        if (oldMessages.length === 0) {
            return {
                messages,
                report: buildReport({
                    strategy: 'unchanged',
                    afterMessageCount: messages.length,
                    afterTokens: beforeTokens,
                    compactedMessageCount: 0,
                    preservedAnchorCount: 0,
                    summaryInserted: false
                })
            };
        }

        const oldTokens = this.estimateMessages(oldMessages);
        const minOldSectionTokens = Math.min(200, Math.max(60, Math.floor(this.budget.compactionMinTokens / 2)));
        if (oldTokens <= minOldSectionTokens) {
            return {
                messages,
                report: buildReport({
                    strategy: 'unchanged',
                    afterMessageCount: messages.length,
                    afterTokens: beforeTokens,
                    compactedMessageCount: oldMessages.length,
                    preservedAnchorCount: 0,
                    summaryInserted: false
                })
            };
        }

        try {
            const minimalAnchors = level === 'deep';
            const preservedAnchors = this.resolveCompactionAnchors(oldMessages, recentMessages, minimalAnchors);
            const summary = await this.summarizer.summarize(oldMessages);
            if (!summary?.trim()) {
                const prepared = this.pruneHistory(messages);
                return {
                    messages: prepared,
                    report: buildReport({
                        strategy: prepared === messages ? 'unchanged' : 'pruned',
                        afterMessageCount: prepared.length,
                        afterTokens: this.estimateMessages(prepared),
                        compactedMessageCount: oldMessages.length,
                        preservedAnchorCount: preservedAnchors.length,
                        summaryInserted: false
                    })
                };
            }

            const summaryMessage: AgentMessage = {
                id: `compact-${Date.now()}`,
                role: 'system',
                content: `[Context Summary — compressed ${oldMessages.length} messages]\n${summary}`,
                createdAt: Date.now()
            };

            const compacted = [...systemMessages, summaryMessage, ...preservedAnchors, ...recentMessages];
            // For deep level, apply additional pruning if still over budget
            const afterCompactTokens = this.estimateMessages(compacted);
            const prepared = afterCompactTokens <= this.budget.maxHistoryTokens
                ? compacted
                : level === 'deep'
                    ? this.aggressivePrune(compacted)
                    : this.pruneHistory(compacted);
            return {
                messages: prepared,
                report: buildReport({
                    strategy: 'compacted',
                    afterMessageCount: prepared.length,
                    afterTokens: this.estimateMessages(prepared),
                    compactedMessageCount: oldMessages.length,
                    preservedAnchorCount: preservedAnchors.length,
                    summaryInserted: true
                })
            };
        } catch {
            const prepared = this.pruneHistory(messages);
            return {
                messages: prepared,
                report: buildReport({
                    strategy: prepared === messages ? 'unchanged' : 'pruned',
                    afterMessageCount: prepared.length,
                    afterTokens: this.estimateMessages(prepared),
                    compactedMessageCount: oldMessages.length,
                    preservedAnchorCount: 0,
                    summaryInserted: false
                })
            };
        }
    }

    pruneHistory(messages: AgentMessage[]): AgentMessage[] {
        if (this.estimateMessages(messages) <= this.budget.maxHistoryTokens) {
            return messages;
        }

        let pruned = messages.map(msg => {
            if (msg.role === 'tool' && msg.content.length > this.budget.maxToolResults) {
                return { ...msg, content: this.buildCompactedToolContent(msg) };
            }
            return msg;
        });

        if (this.estimateMessages(pruned) <= this.budget.maxHistoryTokens) {
            return pruned;
        }

        // compute a budget-aware recent window instead of a fixed 20-message tail
        const recentTargetMessages = Math.max(4, Math.floor(this.budget.maxHistoryTokens / 200));
        const recentThreshold = Math.max(pruned.length - recentTargetMessages, 0);
        const assistantToolCallIds = new Set<string>();
        for (let i = 0; i < recentThreshold; i++) {
            const msgMeta = pruned[i].metadata;
            if (pruned[i].role === 'assistant' && msgMeta?.toolCalls) {
                const toolCalls: Array<{ id: string }> = msgMeta.toolCalls as any;
                for (const tc of toolCalls) {
                    assistantToolCallIds.add(tc.id);
                }
            }
        }
        const droppedToolIds = new Set<string>();
        for (let i = 0; i < recentThreshold; i++) {
            const toolCallId = pruned[i].toolCallId;
            if (pruned[i].role === 'tool' && toolCallId && assistantToolCallIds.has(toolCallId)) {
                droppedToolIds.add(toolCallId);
            }
        }
        const retainedToolCallIds = new Set<string>();
        for (let i = 0; i < pruned.length; i++) {
            const toolCallId = pruned[i].toolCallId;
            if (pruned[i].role !== 'tool' || !toolCallId) {
                continue;
            }
            if (i >= recentThreshold || !droppedToolIds.has(toolCallId)) {
                retainedToolCallIds.add(toolCallId);
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
            const tcId = pruned[i].toolCallId;
            if (pruned[i].role === 'tool' && tcId && droppedToolIds.has(tcId)) {
                continue;
            }
            if (pruned[i].role === 'assistant' && pruned[i].metadata?.toolCalls) {
                const toolCalls = (pruned[i].metadata?.toolCalls ?? []) as Array<{ id: string }>;
                if (toolCalls.some(toolCall => retainedToolCallIds.has(toolCall.id))) {
                    kept.push(pruned[i]);
                }
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

        return kept.slice(-Math.max(8, Math.floor(this.budget.maxHistoryTokens / 100)));
    }

    /**
     * Aggressive pruning for deep compaction level — reduces message count more
     * aggressively by keeping only the absolute minimum: system messages, the
     * most recent messages, and critical anchors.
     */
    private aggressivePrune(messages: AgentMessage[]): AgentMessage[] {
        const { systemMessages, oldMessages, recentMessages } = this.splitMessagesForCompaction(messages);
        if (oldMessages.length === 0) {
            return messages;
        }
        // For deep level, keep only system + first substantive user anchor + recent
        const anchors = this.resolveCompactionAnchors(oldMessages, recentMessages, true);
        const minimal = [...systemMessages, ...anchors, ...recentMessages];
        if (this.estimateMessages(minimal) <= this.budget.maxHistoryTokens) {
            return minimal;
        }
        // If still over budget, fall back to prune with a tighter limit
        return recentMessages.slice(-Math.max(4, Math.floor(this.budget.maxHistoryTokens / 200)));
    }

    trimMemory<T extends { value?: string }>(records: T[]): T[] {
        if (records.length <= this.budget.maxMemoryRecords) return records;
        return records.slice(-this.budget.maxMemoryRecords);
    }

    private resolveCompactionAnchors(oldMessages: AgentMessage[], recentMessages: AgentMessage[], minimal = false): AgentMessage[] {
        const recentIds = new Set(recentMessages.map(message => message.id));
        const pinnedIds = new Set<string>();
        const anchors: AgentMessage[] = [];

        const firstSubstantiveUser = this.findFirstSubstantiveUserMessage(oldMessages);
        if (firstSubstantiveUser && !recentIds.has(firstSubstantiveUser.id)) {
            pinnedIds.add(firstSubstantiveUser.id);
            anchors.push(firstSubstantiveUser);
        }

        if (!minimal) {
            const latestSubstantiveUser = this.findLatestSubstantiveUserMessage(oldMessages);
            if (latestSubstantiveUser && !recentIds.has(latestSubstantiveUser.id) && !pinnedIds.has(latestSubstantiveUser.id)) {
                pinnedIds.add(latestSubstantiveUser.id);
                anchors.push(latestSubstantiveUser);
            }
        }

        const latestErrorContext = this.findLatestErrorContextMessage(oldMessages, pinnedIds);
        if (latestErrorContext && !recentIds.has(latestErrorContext.id) && !pinnedIds.has(latestErrorContext.id)) {
            pinnedIds.add(latestErrorContext.id);
            anchors.push(latestErrorContext);
        }

        if (!minimal) {
            const latestToolState = this.findLatestToolStateMessage(oldMessages, pinnedIds);
            if (latestToolState && !recentIds.has(latestToolState.id) && !pinnedIds.has(latestToolState.id)) {
                pinnedIds.add(latestToolState.id);
                anchors.push(latestToolState);
            }
        }

        return oldMessages.filter(message => pinnedIds.has(message.id));
    }

    private findFirstSubstantiveUserMessage(messages: AgentMessage[]): AgentMessage | undefined {
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            if (message.role !== 'user') {
                continue;
            }
            if (this.isSubstantiveUserMessage(message.content)) {
                return message;
            }
        }
        return undefined;
    }

    private findLatestSubstantiveUserMessage(messages: AgentMessage[]): AgentMessage | undefined {
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message.role !== 'user') {
                continue;
            }
            if (this.isSubstantiveUserMessage(message.content)) {
                return message;
            }
        }
        return undefined;
    }

    private findLatestErrorContextMessage(messages: AgentMessage[], excludedIds?: Set<string>): AgentMessage | undefined {
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (excludedIds?.has(message.id)) {
                continue;
            }
            if (this.isErrorContextMessage(message)) {
                return message;
            }
        }
        return undefined;
    }

    private isSubstantiveUserMessage(content: string | undefined): boolean {
        const text = String(content || '').trim();
        if (!text) {
            return false;
        }
        if (text.startsWith('/')) {
            return false;
        }
        return !FOLLOW_UP_ONLY_MESSAGE_RE.test(text);
    }

    private isErrorContextMessage(message: AgentMessage): boolean {
        const error = String(message.metadata?.error || message.metadata?.receipt?.error || '').trim();
        const receiptStatus = String(message.metadata?.receipt?.status || '').trim().toLowerCase();
        const content = String(message.content || '').trim();

        if (error) {
            return true;
        }
        if (receiptStatus === 'error') {
            return true;
        }
        if (message.role === 'tool' && /"error"\s*:/.test(content)) {
            return true;
        }
        if (message.role === 'assistant' && /^(?:Error|Failed|Error:|Failed:)/.test(content)) {
            return true;
        }
        if (message.role === 'user' && /(?:遇到了?错误|发生了?错误|出错|报错|failed|error)/i.test(content)) {
            return true;
        }
        return false;
    }

    private findLatestToolStateMessage(messages: AgentMessage[], excludedIds?: Set<string>): AgentMessage | undefined {
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (excludedIds?.has(message.id)) {
                continue;
            }
            if (message.role !== 'tool') {
                continue;
            }
            if (this.isStatefulToolMessage(message)) {
                return message;
            }
        }
        return undefined;
    }

    private isStatefulToolMessage(message: AgentMessage): boolean {
        const receiptSummary = String(message.metadata?.receipt?.outputSummary || '').trim();
        const receiptError = String(message.metadata?.receipt?.error || '').trim();
        const metadataError = String(message.metadata?.error || '').trim();
        if (receiptSummary || receiptError || metadataError) {
            return true;
        }

        const summarized = summarizeToolDisplayText(message.name || 'tool', message.content, 'output');
        if (!summarized) {
            return false;
        }

        const content = String(message.content || '').trim();
        return summarized !== content;
    }

    private buildCompactedToolContent(message: AgentMessage): string {
        const toolName = String(message.name || 'tool').trim() || 'tool';
        const receiptSummary = String(message.metadata?.receipt?.outputSummary || '').trim();
        const metadataError = String(message.metadata?.error || message.metadata?.receipt?.error || '').trim();
        const summarized = summarizeToolDisplayText(toolName, message.content, 'output');

        if (metadataError) {
            return JSON.stringify({ error: metadataError });
        }
        if (receiptSummary) {
            return `[summary] ${receiptSummary}`;
        }
        if (summarized && summarized !== message.content) {
            return `[summary] ${summarized}`;
        }
        return message.content.slice(0, this.budget.maxToolResults) + '...[truncated]';
    }

    private compactToolMessagesForContext(messages: AgentMessage[]): {
        messages: AgentMessage[];
        compactedCount: number;
        recentMessageCount: number;
    } {
        const { systemMessages, oldMessages, recentMessages } = this.splitMessagesForCompaction(messages);
        // Protect stateful/error tool messages in the old section from content compaction,
        // so resolveCompactionAnchors can still detect them as anchors during summarization.
        // Only protect messages where statefulness is content-derived (no receipt/error metadata),
        // because metadata-based statefulness survives content compaction.
        const protectedIds = new Set<string>();
        for (const msg of oldMessages) {
            const hasMetadataIndicator = !!(msg.metadata?.receipt?.outputSummary || msg.metadata?.receipt?.error || msg.metadata?.error);
            if (!hasMetadataIndicator && (this.isStatefulToolMessage(msg) || this.isErrorContextMessage(msg))) {
                protectedIds.add(msg.id);
            }
        }
        const oldPrepared = this.compactToolMessages(oldMessages, 'summary-preferred', protectedIds);
        const recentPrepared = this.compactToolMessages(recentMessages, 'oversized-only');

        const compactedCount = oldPrepared.compactedCount + recentPrepared.compactedCount;
        if (!compactedCount) {
            return {
                messages,
                compactedCount: 0,
                recentMessageCount: recentMessages.length
            };
        }

        return {
            messages: [...systemMessages, ...oldPrepared.messages, ...recentPrepared.messages],
            compactedCount,
            recentMessageCount: recentPrepared.messages.length
        };
    }

    private compactToolMessages(messages: AgentMessage[], mode: 'summary-preferred' | 'oversized-only' | 'recent-light', protectedIds?: Set<string>): {
        messages: AgentMessage[];
        compactedCount: number;
    } {
        let compactedCount = 0;
        const prepared = messages.map(message => {
            const compacted = this.compactToolMessage(message, mode, protectedIds);
            if (compacted !== message) {
                compactedCount++;
            }
            return compacted;
        });

        return { messages: compactedCount ? prepared : messages, compactedCount };
    }

    private compactToolMessage(message: AgentMessage, mode: 'summary-preferred' | 'oversized-only' | 'recent-light', protectedIds?: Set<string>): AgentMessage {
        if (message.role !== 'tool') {
            return message;
        }

        if (protectedIds?.has(message.id)) {
            return message;
        }

        const content = String(message.content || '');
        if (!content) {
            return message;
        }

        const compactedContent = this.buildCompactedToolContent(message);
        if (!compactedContent || compactedContent === content) {
            return message;
        }

        const contentLength = content.length;
        const compactedLength = compactedContent.length;
        const hasReceiptSummary = !!String(message.metadata?.receipt?.outputSummary || '').trim();
        const hasStructuredSummary = compactedContent.startsWith('[summary]') || compactedContent.startsWith('{');
        const sizableReduction = compactedLength + 24 < contentLength;

        const shouldCompact = mode === 'oversized-only'
            ? contentLength > this.budget.maxToolResults
            : mode === 'recent-light'
                ? contentLength > this.budget.maxToolResults || ((hasReceiptSummary || hasStructuredSummary) && contentLength > Math.max(400, Math.floor(this.budget.maxToolResults / 4)) && sizableReduction)
                : contentLength > 180 || ((hasReceiptSummary || hasStructuredSummary) && sizableReduction);

        if (!shouldCompact) {
            return message;
        }

        return {
            ...message,
            content: compactedContent
        };
    }

    private findAssistantForToolCall(messages: AgentMessage[], fromIndex: number, toolCallId: string): number {
        for (let i = fromIndex; i >= 0; i--) {
            const message = messages[i];
            if (message.role !== 'assistant' || !message.metadata?.toolCalls) {
                continue;
            }

            const toolCalls: Array<{ id?: string }> = message.metadata.toolCalls as any;
            if (toolCalls.some(toolCall => toolCall.id === toolCallId)) {
                return i;
            }
        }

        return -1;
    }

    // ── Cross-session experience synthesis ──────────────────────────────────

    /**
     * Returns session IDs that have stashed original content available for
     * cross-session pattern extraction.
     */
    listCompactedSessions(): string[] {
        return [...this.originalMessageStore.keys()];
    }

    /**
     * Extract patterns from a single session's stashed messages.
     * Returns an array of {@link ExtractedPattern} for goals, tool usages,
     * error contexts, and preferences found in the session log.
     */
    extractSessionPatterns(sessionId: string): ExtractedPattern[] {
        const record = this.originalMessageStore.get(sessionId);
        if (!record) {
            return [];
        }

        const patterns: ExtractedPattern[] = [];
        const now = record.timestamp;

        // ── Session goal: first substantive user message (not follow-up) ──
        const firstUserMsg = record.messages.find(
            m => m.role === 'user' && !FOLLOW_UP_ONLY_MESSAGE_RE.test((m.content || '').trim())
        );
        if (firstUserMsg) {
            const goalText = firstUserMsg.content.slice(0, 200).replace(/\s+/g, ' ').trim();
            if (goalText) {
                patterns.push({
                    type: 'goal',
                    content: goalText,
                    sourceSessionIds: [sessionId],
                    confidence: 0.7,
                    firstObserved: firstUserMsg.createdAt || now,
                    lastObserved: firstUserMsg.createdAt || now,
                });
            }
        }

        // ── Error patterns: assistant messages that report failures ──
        const errorTerms = ['error', 'fail', 'unable', 'cannot', 'timeout', 'rejected', 'denied', 'not found', 'invalid'];
        for (const msg of record.messages) {
            if (msg.role === 'assistant' || msg.role === 'tool') {
                const lower = (msg.content || '').toLowerCase();
                const matchedTerms = errorTerms.filter(t => lower.includes(t));
                if (matchedTerms.length >= 2 && lower.length < 500) {
                    const excerpt = msg.content.slice(0, 200).replace(/\s+/g, ' ').trim();
                    if (excerpt) {
                        patterns.push({
                            type: 'error',
                            content: excerpt,
                            sourceSessionIds: [sessionId],
                            confidence: 0.5 + matchedTerms.length * 0.1,
                            firstObserved: msg.createdAt || now,
                            lastObserved: msg.createdAt || now,
                        });
                    }
                }
            }
        }

        // ── Tool usage patterns ──
        const toolCallNames = new Map<string, number>();
        for (const msg of record.messages) {
            if (msg.role === 'assistant' && msg.metadata?.toolCalls) {
                const calls: Array<{ name?: string }> = msg.metadata.toolCalls as any;
                for (const call of calls) {
                    if (call.name) {
                        toolCallNames.set(call.name, (toolCallNames.get(call.name) || 0) + 1);
                    }
                }
            }
        }
        for (const [toolName, count] of toolCallNames) {
            if (count >= 2) {
                patterns.push({
                    type: 'tool_pattern',
                    content: `Tool "${toolName}" used ${count} times in session`,
                    sourceSessionIds: [sessionId],
                    confidence: Math.min(0.9, 0.4 + count * 0.15),
                    firstObserved: now,
                    lastObserved: now,
                });
            }
        }

        // ── Preferences: reuse same heuristic as DeterministicExperienceDistiller ──
        for (const msg of record.messages) {
            if (msg.role === 'user') {
                const normalized = (msg.content || '').trim().replace(/\s+/g, ' ');
                const prefMatch = normalized.match(/^i\s+prefer\s+(.+)$/i);
                if (prefMatch) {
                    const value = prefMatch[1].replace(/[.。!！?？]+$/u, '').replace(/\s+/g, ' ').trim();
                    if (value && value.length <= 120) {
                        patterns.push({
                            type: 'preference',
                            content: value,
                            sourceSessionIds: [sessionId],
                            confidence: 0.6,
                            firstObserved: msg.createdAt || now,
                            lastObserved: msg.createdAt || now,
                        });
                    }
                }
            }
        }

        return patterns;
    }

    /**
     * Synthesize cross-session patterns from stashed compaction history.
     *
     * Scans all (or specified) sessions in the stash, extracts goals, errors,
     * tool patterns, and preferences, then deduplicates and merges patterns
     * that share the same normalized content.
     */
    synthesizeExperiences(options?: SynthesisOptions): SynthesisReport {
        const report: SynthesisReport = {
            totalSessions: 0,
            processedSessions: 0,
            patterns: [],
            errors: [],
        };

        const sessionIds = options?.sessionIds ?? this.listCompactedSessions();
        report.totalSessions = sessionIds.length;

        const rawPatterns: ExtractedPattern[] = [];

        for (const sid of sessionIds) {
            try {
                const sessionPatterns = this.extractSessionPatterns(sid);
                if (sessionPatterns.length > 0) {
                    report.processedSessions++;
                }
                rawPatterns.push(...sessionPatterns);
            } catch (e: any) {
                report.errors.push(`Session ${sid}: ${e.message || e}`);
            }
        }

        // ── Deduplicate by normalised content ──
        const merged = new Map<string, ExtractedPattern>();
        for (const p of rawPatterns) {
            const normKey = p.type + '::' + p.content
                .toLowerCase()
                .replace(/[^\p{L}\p{N} ]/gu, '')
                .trim()
                .slice(0, 80);

            const existing = merged.get(normKey);
            if (existing) {
                // Merge source sessions
                for (const sid of p.sourceSessionIds) {
                    if (!existing.sourceSessionIds.includes(sid)) {
                        existing.sourceSessionIds.push(sid);
                    }
                }
                // Boost confidence based on multi-session observation
                if (existing.sourceSessionIds.length >= 2) {
                    existing.confidence = Math.min(1.0, existing.confidence + 0.1);
                }
                existing.lastObserved = Math.max(existing.lastObserved, p.lastObserved);
                existing.firstObserved = Math.min(existing.firstObserved, p.firstObserved);
            } else {
                merged.set(normKey, { ...p, sourceSessionIds: [...p.sourceSessionIds] });
            }
        }

        // Sort: confidence desc, then multi-session first, then newest first
        const sorted = [...merged.values()].sort((a, b) => {
            if (b.confidence !== a.confidence) return b.confidence - a.confidence;
            if (b.sourceSessionIds.length !== a.sourceSessionIds.length) return b.sourceSessionIds.length - a.sourceSessionIds.length;
            return b.lastObserved - a.lastObserved;
        });

        const maxPatterns = options?.maxPatterns ?? 50;
        report.patterns = sorted.slice(0, maxPatterns);

        return report;
    }

    private createPreparationReport(report: Omit<ContextPreparationReport, 'prunedMessageCount'>): ContextPreparationReport {
        return {
            ...report,
            prunedMessageCount: Math.max(0, report.beforeMessageCount - report.afterMessageCount)
        };
    }
}
