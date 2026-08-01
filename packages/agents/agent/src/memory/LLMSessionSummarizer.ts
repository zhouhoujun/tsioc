import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ModelAdapter } from '../model/ModelAdapter';
import { SessionSummarizer } from './SessionSummarizer';
import { AgentMessage } from '../runtime/AgentMessage';
import { ModelRequest } from '../model/ModelRequest';
import { summarizeToolDisplayText } from '../tools/ToolSummary';

const COMPACTION_SYSTEM_PROMPT = 'You are a context compression assistant for a coding agent. Compress the conversation while preserving: 1) user goals and requirements, 2) decisions made and rationale, 3) files created/modified/deleted with paths (modified), and files merely mentioned or read (mentioned), 4) errors encountered and how they were resolved, 5) current task state and next steps. Output exactly five labeled lines: Goal:, Decisions:, Files:, Errors:, Open state:. In the Files: line list paths as "modified: a, b | mentioned: c, d" to distinguish edited files from merely referenced ones. Use concise factual phrases. Do not infer or add information not present in the conversation.';
const SUMMARY_LABELS = ['Goal', 'Decisions', 'Files', 'Errors', 'Open state'] as const;
type SummaryLabel = typeof SUMMARY_LABELS[number];
const FOLLOW_UP_ONLY_MESSAGE_RE = /^(?:继续|继续吧|继续下去|接着|接着说|接着来|然后呢|再来|下一步|下一部分|后面呢|展开|详细点|详细一点|再详细点|补充一下|继续输出|继续生成|more|continue|go on|keep going|carry on|next|proceed)(?:[\s.!?~。！？、]*)$/i;
// Strong-signal tool names that mutate files on disk; matched against tool message names and
// assistant toolCall metadata so write operations are separated from mere references.
const WRITE_TOOL_NAME_RE = /\b(?:write|write_file|edit|edit_file|apply_patch|create_file|delete_file|rename_file|move_file|update_file|save_file|remove_file|add_file|touch|mkdir|rm)\b/i;
// Past-tense verbs in assistant/tool text that report an actual file mutation.
const WRITE_VERB_RE = /\b(?:created|modified|updated|deleted|wrote|edited|fixed|patched|added|removed|renamed|moved|saved)\b/i;

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
                return this.normalizeStructuredSummary(response.message, messages);
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
                const receiptSummary = String(msg.metadata?.receipt?.outputSummary || '').trim();
                const errorSummary = String(msg.metadata?.error || msg.metadata?.receipt?.error || '').trim();
                const summarized = summarizeToolDisplayText(msg.name, content, 'output');
                const toolContent = errorSummary || receiptSummary || summarized || content;
                content = `[${msg.name}] ${toolContent}`;
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
        const relevant = messages.filter(message => message.role !== 'system');
        return this.composeStructuredSummary({
            Goal: this.resolveGoal(relevant),
            Decisions: this.resolveDecisions(relevant),
            Files: this.resolveFiles(relevant),
            Errors: this.resolveErrors(relevant),
            'Open state': this.resolveOpenState(relevant)
        });
    }

    private resolveGoal(messages: AgentMessage[]): string {
        const substantiveUsers = messages.filter(message => message.role === 'user' && this.isSubstantiveUserMessage(message.content));
        if (!substantiveUsers.length) {
            const fallbackUser = [...messages].reverse().find(message => message.role === 'user' && String(message.content || '').trim());
            return fallbackUser ? this.truncate(fallbackUser.content, 280) : '';
        }

        const root = substantiveUsers[0];
        const current = substantiveUsers[substantiveUsers.length - 1];
        if (!root || !current || root.id === current.id) {
            return this.truncate(current?.content ?? root?.content ?? '', 280);
        }
        return this.truncate(`Root: ${root.content} | Current: ${current.content}`, 280);
    }

    private resolveDecisions(messages: AgentMessage[]): string {
        return messages
            .filter(message => message.role === 'assistant' && !message.metadata?.toolCalls && message.content.trim())
            .slice(-2)
            .map(message => this.truncate(message.content, 180))
            .join(' | ');
    }

    private resolveFiles(messages: AgentMessage[]): string {
        const { modified, mentioned } = this.resolveFileChanges(messages);
        const parts: string[] = [];
        if (modified.length) {
            parts.push(`modified: ${modified.join(', ')}`);
        }
        if (mentioned.length) {
            parts.push(`mentioned: ${mentioned.join(', ')}`);
        }
        return parts.join(' | ');
    }

    private resolveFileChanges(messages: AgentMessage[]): { modified: string[]; mentioned: string[] } {
        const modified = new Set<string>();
        const mentioned = new Set<string>();
        const fileRe = /(?:@[A-Za-z0-9_-]+\/)?[A-Za-z0-9_./\\-]+\.(?:[jt]sx?|[cm]js|json|ya?ml|css|html|md|vue|svelte|py|java|go|rs|swift|kt|dart)/g;
        const addFile = (set: Set<string>, path: string): void => {
            const normalized = path.replace(/\\/g, '/');
            if (modified.has(normalized) || mentioned.has(normalized)) {
                return;
            }
            if (modified.size + mentioned.size >= 6) {
                return;
            }
            set.add(normalized);
        };

        for (const message of messages) {
            if (message.role === 'system') {
                continue;
            }
            const target = this.isWriteOperation(message) ? modified : mentioned;
            const matches = String(message.content || '').match(fileRe) || [];
            for (const match of matches) {
                addFile(target, match);
            }
        }

        return { modified: [...modified], mentioned: [...mentioned] };
    }

    private isWriteOperation(message: AgentMessage): boolean {
        if (message.role === 'tool') {
            return !!message.name && WRITE_TOOL_NAME_RE.test(message.name);
        }
        if (message.role === 'assistant') {
            const toolNames = (message.metadata?.toolCalls || []).map((tc: any) => String(tc?.name || ''));
            if (toolNames.some((name: string) => WRITE_TOOL_NAME_RE.test(name))) {
                return true;
            }
            return WRITE_VERB_RE.test(message.content);
        }
        return false;
    }

    private resolveErrors(messages: AgentMessage[]): string {
        const errorMessages = messages
            .filter(message => this.isErrorMessage(message))
            .slice(-2)
            .map(message => this.truncate(String(message.metadata?.error || message.metadata?.receipt?.error || message.content), 180));
        return errorMessages.join(' | ');
    }

    private resolveOpenState(messages: AgentMessage[]): string {
        const tail = messages
            .slice(-3)
            .map(message => `${message.role}: ${this.truncate(message.content, 120)}`)
            .join(' | ');
        return tail;
    }

    private isErrorMessage(message: AgentMessage): boolean {
        const metadataError = String(message.metadata?.error || message.metadata?.receipt?.error || '').trim();
        if (metadataError) {
            return true;
        }
        if (message.role === 'tool' && /"error"\s*:/.test(message.content)) {
            return true;
        }
        return /\bfailed\b|\berror\b/i.test(message.content);
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

    private truncate(content: string, maxLength: number): string {
        const text = String(content || '').replace(/\s+/g, ' ').trim();
        if (text.length <= maxLength) {
            return text;
        }
        // prefer breaking at sentence or clause boundaries
        const boundary = text.lastIndexOf('.', maxLength - 3);
        if (boundary > Math.floor(maxLength / 2)) {
            return `${text.slice(0, boundary + 1)}..`;
        }
        const clauseBoundary = text.lastIndexOf(';', maxLength - 3);
        if (clauseBoundary > Math.floor(maxLength / 2)) {
            return `${text.slice(0, clauseBoundary + 1)}..`;
        }
        return `${text.slice(0, maxLength - 3)}...`;
    }

    private normalizeStructuredSummary(rawSummary: string, messages: AgentMessage[]): string {
        const relevant = messages.filter(message => message.role !== 'system');
        const fallback = {
            Goal: this.resolveGoal(relevant),
            Decisions: this.resolveDecisions(relevant),
            Files: this.resolveFiles(relevant),
            Errors: this.resolveErrors(relevant),
            'Open state': this.resolveOpenState(relevant)
        } satisfies Record<SummaryLabel, string>;
        const parsed = this.parseStructuredSummary(rawSummary);
        const rawText = this.truncate(String(rawSummary || '').replace(/\s+/g, ' ').trim(), 280);

        if (!parsed.Goal && rawText) {
            parsed.Goal = fallback.Goal || rawText;
        }
        if (!parsed.Decisions && rawText) {
            parsed.Decisions = rawText;
        }
        if (!parsed['Open state'] && rawText) {
            parsed['Open state'] = rawText;
        }

        return this.composeStructuredSummary({
            Goal: parsed.Goal || fallback.Goal,
            Decisions: parsed.Decisions || fallback.Decisions,
            Files: parsed.Files || fallback.Files,
            Errors: parsed.Errors || fallback.Errors,
            'Open state': parsed['Open state'] || fallback['Open state']
        });
    }

    private parseStructuredSummary(summary: string): Partial<Record<SummaryLabel, string>> {
        const result: Partial<Record<SummaryLabel, string>> = {};
        const lines = String(summary || '').replace(/\r/g, '').split('\n');
        let activeLabel: SummaryLabel | undefined;

        for (const line of lines) {
            const match = /^\s*(Goal|Decisions|Files|Errors|Open state)\s*:\s*(.*)\s*$/i.exec(line);
            if (match) {
                const label = this.normalizeSummaryLabel(match[1]);
                if (!label) {
                    activeLabel = undefined;
                    continue;
                }
                activeLabel = label;
                result[label] = this.truncate(match[2], label === 'Files' ? 220 : 280);
                continue;
            }

            const trimmed = line.trim();
            if (!trimmed || !activeLabel) {
                continue;
            }

            result[activeLabel] = this.mergeSummaryLine(result[activeLabel], trimmed, activeLabel);
        }

        return result;
    }

    private normalizeSummaryLabel(label: string): SummaryLabel | undefined {
        const normalized = String(label || '').trim().toLowerCase();
        switch (normalized) {
            case 'goal':
                return 'Goal';
            case 'decisions':
                return 'Decisions';
            case 'files':
                return 'Files';
            case 'errors':
                return 'Errors';
            case 'open state':
                return 'Open state';
            default:
                return undefined;
        }
    }

    private composeStructuredSummary(fields: Record<SummaryLabel, string>): string {
        const defaults: Record<SummaryLabel, string> = {
            Goal: 'No clear goal captured.',
            Decisions: 'No major decisions recorded.',
            Files: 'No file paths mentioned.',
            Errors: 'No errors recorded.',
            'Open state': 'Continue from the latest conversation state.'
        };

        return SUMMARY_LABELS
            .map(label => `${label}: ${this.truncate(fields[label] || defaults[label], label === 'Files' ? 220 : 280) || defaults[label]}`)
            .join('\n')
            .slice(0, 2000);
    }

    private mergeSummaryLine(existing: string | undefined, addition: string, label: SummaryLabel): string {
        const combined = existing ? `${existing} ${addition}` : addition;
        return this.truncate(combined, label === 'Files' ? 220 : 280);
    }
}
