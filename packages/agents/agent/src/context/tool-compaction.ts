import { AgentMessage } from '../runtime/AgentMessage';
import { summarizeToolDisplayText } from '../tools/ToolSummary';

/**
 * Bounded head of the real tool payload kept behind a compaction label.
 *
 * A label such as `src/cli.ts (truncated)` carries no payload of its own, so
 * replacing the content with it alone makes the model re-read what the turn
 * already paid for. The excerpt is capped by `budget.maxToolResults`, so a
 * smaller tool-result budget still tightens it.
 */
export const COMPACTED_TOOL_EXCERPT_CHARS = 2000;

export interface ToolCompactionBudget {
    maxToolResults: number;
}

/**
 * Compact a tool message's content for history preparation.
 *
 * Error results keep their actionable `{ error }` shape. Otherwise the display
 * summary (receipt or derived) becomes the label, and payloads materially larger
 * than the excerpt budget keep a bounded head of the real content behind it.
 */
export function buildCompactedToolContent(message: AgentMessage, budget: ToolCompactionBudget): string {
    const toolName = String(message.name || 'tool').trim() || 'tool';
    const receiptSummary = String(message.metadata?.receipt?.outputSummary || '').trim();
    const metadataError = String(message.metadata?.error || message.metadata?.receipt?.error || '').trim();
    const summarized = summarizeToolDisplayText(toolName, message.content, 'output');

    if (metadataError) {
        return JSON.stringify({ error: metadataError });
    }
    if (receiptSummary) {
        return compactedToolContent(`[summary] ${receiptSummary}`, message.content, budget);
    }
    if (summarized && summarized !== message.content) {
        return compactedToolContent(`[summary] ${summarized}`, message.content, budget);
    }
    return message.content.slice(0, budget.maxToolResults) + '...[truncated]';
}

/**
 * Keep the compaction label, plus a bounded head of the real content when the
 * payload is large enough for the excerpt to pay for itself. Payloads that
 * already fit the excerpt budget keep the label-only form, and the result is
 * never longer than the original, so this step can only shrink history.
 */
export function compactedToolContent(label: string, content: string, budget: ToolCompactionBudget): string {
    const raw = String(content || '');
    const excerptLimit = Math.min(COMPACTED_TOOL_EXCERPT_CHARS, budget.maxToolResults);
    if (raw.length <= excerptLimit) {
        return label;
    }
    const excerpt = raw.slice(0, excerptLimit);
    const candidate = `${label}\n[excerpt]\n${excerpt}\n...[truncated ${raw.length - excerptLimit} chars]`;
    return candidate.length < raw.length ? candidate : raw;
}
