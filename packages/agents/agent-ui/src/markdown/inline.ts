import { AgentConsoleMarkdownToken, AgentConsoleMarkdownTone } from './model';

/**
 * Inline Markdown: images, links, strong, strikethrough, code spans, emphasis.
 *
 * Order matters — the alternation is intentionally greedy from the most
 * specific construct to the least, and `_` emphasis is guarded so snake_case
 * identifiers survive inside prose and CJK sentences.
 */
const INLINE_MARKDOWN_RE = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|(?<![A-Za-z0-9\u4e00-\u9fff])__([^_]+)__(?![A-Za-z0-9\u4e00-\u9fff])|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|(?<![A-Za-z0-9\u4e00-\u9fff])_([^_]+)_(?![A-Za-z0-9\u4e00-\u9fff])/g;

export function tokenizeMarkdownInline(
    value: string,
    baseTone?: AgentConsoleMarkdownTone
): AgentConsoleMarkdownToken[] {
    const input = String(value || '');
    if (!input) {
        return [];
    }
    const tokens: AgentConsoleMarkdownToken[] = [];
    let lastIndex = 0;
    INLINE_MARKDOWN_RE.lastIndex = 0;
    let match = INLINE_MARKDOWN_RE.exec(input);
    while (match) {
        if (match.index > lastIndex) {
            tokens.push({
                text: input.slice(lastIndex, match.index),
                tone: baseTone
            });
        }
        if (match[1] !== undefined) {
            const alt = match[1] || 'image';
            const url = match[2] || '';
            tokens.push({
                text: url ? `${alt} (${url})` : alt,
                tone: 'accent'
            });
        } else if (match[3] !== undefined) {
            tokens.push({
                text: match[3] || match[4] || '',
                tone: 'link'
            });
        } else if (match[5] !== undefined || match[6] !== undefined) {
            tokens.push({
                text: match[5] || match[6] || '',
                tone: 'strong'
            });
        } else if (match[7] !== undefined) {
            tokens.push({
                text: match[7],
                tone: 'strike'
            });
        } else if (match[8] !== undefined) {
            tokens.push({
                text: match[8],
                tone: 'inline-code'
            });
        } else if (match[9] !== undefined || match[10] !== undefined) {
            tokens.push({
                text: match[9] || match[10] || '',
                tone: baseTone === 'quote' ? 'quote' : 'emphasis'
            });
        }
        lastIndex = match.index + match[0].length;
        match = INLINE_MARKDOWN_RE.exec(input);
    }
    if (lastIndex < input.length) {
        tokens.push({
            text: input.slice(lastIndex),
            tone: baseTone
        });
    }
    return tokens.length ? tokens : [{ text: input, tone: baseTone }];
}
