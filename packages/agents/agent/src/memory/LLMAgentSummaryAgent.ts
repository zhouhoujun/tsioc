import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ModelAdapter } from '../model/ModelAdapter';
import { ModelRequest } from '../model/ModelRequest';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentSessionSummary, AgentSummaryAgent } from './AgentSummaryAgent';
import { DeterministicAgentSummaryAgent } from './DeterministicAgentSummaryAgent';

/**
 * LLM-backed session display metadata generator. Produces a concise title and
 * a one-line summary for the session listing through the injected model
 * adapter with a fixed temperature of 0 (deterministic output).
 *
 * When no model adapter is available, the model call fails, or the model
 * response cannot be parsed, it falls back to the deterministic generator so
 * session listings always receive a title/summary. Echo/placeholder adapters
 * (provider === 'echo') are skipped entirely in favor of the fallback to keep
 * test output deterministic.
 */
@Injectable()
export class LLMAgentSummaryAgent extends AgentSummaryAgent {
    private readonly fallback: DeterministicAgentSummaryAgent;

    constructor(
        @Optional() @Inject(ModelAdapter)
        private modelAdapter?: ModelAdapter | null,
        private readonly options?: {
            /** Optional model profile to route the summary request through. */
            profile?: string;
            /** Max title length applied by the deterministic fallback. */
            titleMaxLength?: number;
            /** Max summary length applied by the deterministic fallback. */
            summaryMaxLength?: number;
        }
    ) {
        super();
        this.fallback = new DeterministicAgentSummaryAgent(
            this.options?.titleMaxLength ?? 60,
            this.options?.summaryMaxLength ?? 160
        );
    }

    async generate(messages: AgentMessage[]): Promise<AgentSessionSummary> {
        const substantive = messages.some(message => message.role !== 'system' && String(message.content || '').trim());
        if (!this.modelAdapter || !substantive || this.modelAdapter.provider === 'echo') {
            return this.fallback.generate(messages);
        }

        try {
            const conversationText = this.formatMessagesForSummary(messages);
            const request: ModelRequest = {
                sessionId: 'summary-agent',
                messages: [
                    {
                        id: 'summary-sys',
                        role: 'system',
                        content: SUMMARY_SYSTEM_PROMPT,
                        createdAt: 0
                    },
                    {
                        id: 'summary-user',
                        role: 'user',
                        content: `Summarize this conversation:\n\n${conversationText}`,
                        createdAt: 0
                    }
                ],
                tools: [],
                memory: [],
                summary: undefined,
                temperature: 0,
                profile: this.options?.profile
            };
            const response = await this.modelAdapter.complete(request);
            const parsed = this.parseSummaryResponse(response.message ?? '');
            if (parsed.title || parsed.summary) {
                return parsed;
            }
            return this.fallback.generate(messages);
        } catch {
            return this.fallback.generate(messages);
        }
    }

    private formatMessagesForSummary(messages: AgentMessage[]): string {
        const parts: string[] = [];
        let totalChars = 0;
        const maxChars = 6000;
        for (const message of messages) {
            if (message.role === 'system') {
                continue;
            }
            const prefix = message.role === 'user' ? 'Human' : message.role === 'assistant' ? 'Assistant' : 'Tool';
            let content = String(message.content || '').trim();
            if (message.role === 'tool' && message.name) {
                content = `[${message.name}] ${content}`;
            }
            if (!content) {
                continue;
            }
            content = content.slice(0, 800);
            const line = `${prefix}: ${content}`;
            if (totalChars + line.length > maxChars) {
                break;
            }
            parts.push(line);
            totalChars += line.length;
        }
        return parts.join('\n');
    }

    private parseSummaryResponse(raw: string): AgentSessionSummary {
        const text = String(raw || '').replace(/\r/g, '');
        const titleMatch = /^(?:title|标题)\s*:\s*(.+)$/im.exec(text);
        const summaryMatch = /^(?:summary|摘要)\s*:\s*(.+)$/im.exec(text);
        const result: AgentSessionSummary = {};
        if (titleMatch && titleMatch[1].trim()) {
            result.title = this.cleanLine(titleMatch[1]);
        }
        if (summaryMatch && summaryMatch[1].trim()) {
            result.summary = this.cleanLine(summaryMatch[1]);
        }
        return result;
    }

    private cleanLine(value: string): string {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }
}

const SUMMARY_SYSTEM_PROMPT = 'You are a session metadata assistant for a coding agent. Given a conversation transcript, produce exactly two labeled lines:\nTitle: <concise session title, under 60 chars, capturing the user goal>\nSummary: <one-line summary, under 160 chars, capturing current task state>\nUse concise factual phrases. Do not infer information not present in the conversation. If the conversation has no substantive user content, output only "Title: New session".';
