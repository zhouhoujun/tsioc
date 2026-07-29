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
}

export interface ContextPreparationReport {
    strategy: 'unchanged' | 'pruned' | 'compacted';
    compactionTriggered: boolean;
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
}

const DEFAULT_BUDGET: ContextBudget = {
    maxHistoryTokens: 32000,
    maxMemoryRecords: 50,
    maxToolResults: 8000,
    recentMessageWindow: 6,
    compactionMinTokens: 1200
};
const FOLLOW_UP_ONLY_MESSAGE_RE = /^(?:继续|继续吧|继续下去|接着|接着说|接着来|然后呢|再来|下一步|下一部分|后面呢|展开|详细点|详细一点|再详细点|补充一下|继续输出|继续生成|more|continue|go on|keep going|carry on|next|proceed)(?:[\s.!?~。！？、]*)$/i;

@Injectable()
export class AgentContextManager {
    private budget: ContextBudget = { ...DEFAULT_BUDGET };
    private summarizer?: SessionSummarizer;
    private compactionThreshold = 0;

    configure(budget?: Partial<ContextBudget>): this {
        this.budget = {
            ...DEFAULT_BUDGET,
            ...(budget ?? {}),
            recentMessageWindow: Math.max(1, Math.floor(Number(budget?.recentMessageWindow ?? DEFAULT_BUDGET.recentMessageWindow) || DEFAULT_BUDGET.recentMessageWindow))
        };
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
        if (this.compactionThreshold <= 0 || messages.length < this.compactionThreshold) {
            return false;
        }

        const estimatedTokens = this.estimateMessages(messages);
        if (estimatedTokens >= this.budget.maxHistoryTokens) {
            return true;
        }

        const tokenThreshold = Math.min(this.budget.compactionMinTokens, this.budget.maxHistoryTokens);
        return estimatedTokens >= tokenThreshold;
    }

    async prepareHistory(messages: AgentMessage[]): Promise<{ messages: AgentMessage[]; report: ContextPreparationReport }> {
        const beforeMessageCount = messages.length;
        const beforeTokens = this.estimateMessages(messages);
        const compactionTriggered = this.shouldCompact(messages);
        const toolPrepared = this.compactToolMessagesForContext(messages, compactionTriggered);
        const workingMessages = toolPrepared.messages;

        if (!compactionTriggered) {
            const prepared = this.pruneHistory(workingMessages);
            return {
                messages: prepared,
                report: this.createPreparationReport({
                    strategy: prepared === messages && toolPrepared.compactedCount === 0 ? 'unchanged' : 'pruned',
                    compactionTriggered: false,
                    summaryInserted: false,
                    beforeMessageCount,
                    afterMessageCount: prepared.length,
                    beforeTokens,
                    afterTokens: this.estimateMessages(prepared),
                    compactedMessageCount: 0,
                    preservedAnchorCount: 0,
                    recentMessageCount: toolPrepared.recentMessageCount,
                    toolMessagesCompacted: toolPrepared.compactedCount
                })
            };
        }

        return this.compactHistoryWithReport(workingMessages, beforeMessageCount, beforeTokens, toolPrepared.compactedCount, toolPrepared.recentMessageCount);
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

        const recentCount = Math.max(1, this.budget.recentMessageWindow);
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

    private async compactHistoryWithReport(messages: AgentMessage[], beforeMessageCount: number, beforeTokens: number, toolMessagesCompacted: number, preparedRecentMessageCount: number): Promise<{ messages: AgentMessage[]; report: ContextPreparationReport }> {
        if (!this.summarizer) {
            return {
                messages,
                report: this.createPreparationReport({
                    strategy: 'unchanged',
                    compactionTriggered: true,
                    summaryInserted: false,
                    beforeMessageCount,
                    afterMessageCount: messages.length,
                    beforeTokens,
                    afterTokens: beforeTokens,
                    compactedMessageCount: 0,
                    preservedAnchorCount: 0,
                    recentMessageCount: preparedRecentMessageCount,
                    toolMessagesCompacted
                })
            };
        }

        const { systemMessages, oldMessages, recentMessages } = this.splitMessagesForCompaction(messages);
        if (oldMessages.length === 0) {
            return {
                messages,
                report: this.createPreparationReport({
                    strategy: 'unchanged',
                    compactionTriggered: true,
                    summaryInserted: false,
                    beforeMessageCount,
                    afterMessageCount: messages.length,
                    beforeTokens,
                    afterTokens: beforeTokens,
                    compactedMessageCount: 0,
                    preservedAnchorCount: 0,
                    recentMessageCount: recentMessages.length,
                    toolMessagesCompacted
                })
            };
        }

        const oldTokens = this.estimateMessages(oldMessages);
        const minOldSectionTokens = Math.min(200, Math.max(60, Math.floor(this.budget.compactionMinTokens / 2)));
        if (oldTokens <= minOldSectionTokens) {
            return {
                messages,
                report: this.createPreparationReport({
                    strategy: 'unchanged',
                    compactionTriggered: true,
                    summaryInserted: false,
                    beforeMessageCount,
                    afterMessageCount: messages.length,
                    beforeTokens,
                    afterTokens: beforeTokens,
                    compactedMessageCount: oldMessages.length,
                    preservedAnchorCount: 0,
                    recentMessageCount: recentMessages.length,
                    toolMessagesCompacted
                })
            };
        }

        try {
            const preservedAnchors = this.resolveCompactionAnchors(oldMessages, recentMessages);
            const summary = await this.summarizer.summarize(oldMessages);
            if (!summary?.trim()) {
                const prepared = this.pruneHistory(messages);
                return {
                    messages: prepared,
                    report: this.createPreparationReport({
                        strategy: prepared === messages ? 'unchanged' : 'pruned',
                        compactionTriggered: true,
                        summaryInserted: false,
                        beforeMessageCount,
                        afterMessageCount: prepared.length,
                        beforeTokens,
                        afterTokens: this.estimateMessages(prepared),
                        compactedMessageCount: oldMessages.length,
                        preservedAnchorCount: preservedAnchors.length,
                        recentMessageCount: recentMessages.length,
                        toolMessagesCompacted
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
            const prepared = this.estimateMessages(compacted) <= this.budget.maxHistoryTokens
                ? compacted
                : this.pruneHistory(compacted);
            return {
                messages: prepared,
                report: this.createPreparationReport({
                    strategy: 'compacted',
                    compactionTriggered: true,
                    summaryInserted: true,
                    beforeMessageCount,
                    afterMessageCount: prepared.length,
                    beforeTokens,
                    afterTokens: this.estimateMessages(prepared),
                    compactedMessageCount: oldMessages.length,
                    preservedAnchorCount: preservedAnchors.length,
                    recentMessageCount: recentMessages.length,
                    toolMessagesCompacted
                })
            };
        } catch {
            const prepared = this.pruneHistory(messages);
            return {
                messages: prepared,
                report: this.createPreparationReport({
                    strategy: prepared === messages ? 'unchanged' : 'pruned',
                    compactionTriggered: true,
                    summaryInserted: false,
                    beforeMessageCount,
                    afterMessageCount: prepared.length,
                    beforeTokens,
                    afterTokens: this.estimateMessages(prepared),
                    compactedMessageCount: oldMessages.length,
                    preservedAnchorCount: 0,
                    recentMessageCount: recentMessages.length,
                    toolMessagesCompacted
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

        return kept.slice(-Math.max(10, Math.floor(this.budget.maxHistoryTokens / 100)));
    }

    trimMemory<T extends { value?: string }>(records: T[]): T[] {
        if (records.length <= this.budget.maxMemoryRecords) return records;
        return records.slice(-this.budget.maxMemoryRecords);
    }

    private resolveCompactionAnchors(oldMessages: AgentMessage[], recentMessages: AgentMessage[]): AgentMessage[] {
        const recentIds = new Set(recentMessages.map(message => message.id));
        const pinnedIds = new Set<string>();
        const anchors: AgentMessage[] = [];

        const firstSubstantiveUser = this.findFirstSubstantiveUserMessage(oldMessages);
        if (firstSubstantiveUser && !recentIds.has(firstSubstantiveUser.id)) {
            pinnedIds.add(firstSubstantiveUser.id);
            anchors.push(firstSubstantiveUser);
        }

        const latestSubstantiveUser = this.findLatestSubstantiveUserMessage(oldMessages);
        if (latestSubstantiveUser && !recentIds.has(latestSubstantiveUser.id) && !pinnedIds.has(latestSubstantiveUser.id)) {
            pinnedIds.add(latestSubstantiveUser.id);
            anchors.push(latestSubstantiveUser);
        }

        const latestErrorContext = this.findLatestErrorContextMessage(oldMessages, pinnedIds);
        if (latestErrorContext && !recentIds.has(latestErrorContext.id) && !pinnedIds.has(latestErrorContext.id)) {
            pinnedIds.add(latestErrorContext.id);
            anchors.push(latestErrorContext);
        }

        const latestToolState = this.findLatestToolStateMessage(oldMessages, pinnedIds);
        if (latestToolState && !recentIds.has(latestToolState.id) && !pinnedIds.has(latestToolState.id)) {
            pinnedIds.add(latestToolState.id);
            anchors.push(latestToolState);
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
        if (message.role !== 'user' && /\bfailed\b|\berror\b/i.test(content)) {
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

    private compactToolMessagesForContext(messages: AgentMessage[], compactionTriggered: boolean): {
        messages: AgentMessage[];
        compactedCount: number;
        recentMessageCount: number;
    } {
        const { systemMessages, oldMessages, recentMessages } = this.splitMessagesForCompaction(messages);
        const protectedIds = compactionTriggered
            ? new Set(this.resolveCompactionAnchors(oldMessages, recentMessages).map(message => message.id))
            : new Set<string>();
        const oldPrepared = this.compactToolMessages(oldMessages, 'summary-preferred', protectedIds);
        const recentPrepared = this.compactToolMessages(recentMessages, compactionTriggered ? 'oversized-only' : 'recent-light');

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

    private createPreparationReport(report: Omit<ContextPreparationReport, 'prunedMessageCount'>): ContextPreparationReport {
        return {
            ...report,
            prunedMessageCount: Math.max(0, report.beforeMessageCount - report.afterMessageCount)
        };
    }
}
