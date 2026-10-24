import { resolveTimelineToolCategory, resolveToolEventTarget, TimelineToolCategory } from './AgentConsoleTimelineEventPresenter';

const MAX_APPROVAL_INPUT_DISPLAY_CHARS = 160;

/**
 * Turn an approval request's serialized tool input into the one human-readable
 * value the user is actually being asked to allow.
 *
 * `ToolApprovalManager` stores `inputSummary` as `JSON.stringify(input)`, so the
 * panel used to render `$ {"command":"npm test"}`. Reusing the timeline
 * presenter's category-aware field extraction keeps the approval row and the
 * tool row describing the same object in the same words.
 */
export function formatAgentConsoleApprovalInput(toolName: string | undefined, inputSummary: unknown): string {
    const raw = normalizeInputSummary(inputSummary);
    if (!raw) return '';
    const category = resolveTimelineToolCategory(String(toolName || ''));
    const extracted = parseInputObject(raw) ? resolveToolEventTarget(raw, category) : '';
    const text = truncate(collapseWhitespace(extracted || raw), MAX_APPROVAL_INPUT_DISPLAY_CHARS);
    if (!text) return '';
    // A `$` marks a command to be executed; paths, patterns and free-form
    // payloads read better as themselves.
    return isCommandCategory(category) ? `$ ${text}` : text;
}

function isCommandCategory(category: TimelineToolCategory): boolean {
    return category === 'shell';
}

function normalizeInputSummary(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (value == null) return '';
    try {
        const serialized = JSON.stringify(value);
        return typeof serialized === 'string' ? serialized : '';
    } catch {
        return '';
    }
}

function parseInputObject(raw: string): Record<string, unknown> | undefined {
    if (!raw.startsWith('{')) return undefined;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : undefined;
    } catch {
        return undefined;
    }
}

function collapseWhitespace(value: string): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}
