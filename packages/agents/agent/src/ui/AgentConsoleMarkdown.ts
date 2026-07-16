export type AgentConsoleMarkdownTone =
    | 'default'
    | 'muted'
    | 'accent'
    | 'strong'
    | 'code'
    | 'heading'
    | 'quote';

export interface AgentConsoleMarkdownToken {
    text: string;
    tone?: AgentConsoleMarkdownTone;
}

export interface AgentConsoleMarkdownLine {
    rawText: string;
    prefix?: string;
    prefixTone?: AgentConsoleMarkdownTone;
    tokens: AgentConsoleMarkdownToken[];
    tone?: AgentConsoleMarkdownTone;
    code?: boolean;
}

export interface AgentConsoleMarkdownRenderOptions {
    compactBlankLines?: boolean;
    preserveFenceMarkers?: boolean;
}

const INLINE_MARKDOWN_RE = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|_([^_]+)_/g;

export function renderAgentConsoleMarkdownLines(
    content: string,
    options: AgentConsoleMarkdownRenderOptions = {}
): AgentConsoleMarkdownLine[] {
    const sourceLines = String(content || '').replace(/\r/g, '').split('\n');
    const rendered: AgentConsoleMarkdownLine[] = [];
    let inFence = false;

    sourceLines.forEach(sourceLine => {
        const trimmed = sourceLine.trim();
        if (trimmed.startsWith('```')) {
            if (options.preserveFenceMarkers) {
                rendered.push({
                    rawText: sourceLine,
                    tokens: sourceLine ? [{ text: sourceLine, tone: 'muted' }] : [],
                    tone: 'muted'
                });
            }
            inFence = !inFence;
            return;
        }

        if (inFence) {
            rendered.push({
                rawText: sourceLine,
                tokens: sourceLine ? [{ text: sourceLine, tone: 'code' }] : [],
                tone: 'code',
                code: true
            });
            return;
        }

        rendered.push(renderAgentConsoleMarkdownTextLine(sourceLine));
    });

    return options.compactBlankLines ? compactMarkdownLines(rendered) : rendered;
}

export function flattenAgentConsoleMarkdownLine(line?: AgentConsoleMarkdownLine | null): string {
    if (!line) {
        return '';
    }
    return `${line.prefix || ''}${line.tokens.map(token => token.text).join('')}`;
}

function renderAgentConsoleMarkdownTextLine(sourceLine: string): AgentConsoleMarkdownLine {
    const original = String(sourceLine || '');
    let line = original;
    let prefix = '';
    let prefixTone: AgentConsoleMarkdownTone | undefined;
    let tone: AgentConsoleMarkdownTone | undefined;

    const headingMatch = /^(\s*)(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
        prefix = headingMatch[1];
        prefixTone = 'heading';
        tone = 'heading';
        line = headingMatch[3];
    } else {
        const quoteMatch = /^(\s*)>\s?(.*)$/.exec(line);
        if (quoteMatch) {
            prefix = `${quoteMatch[1]}| `;
            prefixTone = 'quote';
            tone = 'quote';
            line = quoteMatch[2];
        } else {
            const taskMatch = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line);
            if (taskMatch) {
                prefix = `${taskMatch[1]}[${taskMatch[2].toLowerCase() === 'x' ? 'x' : ' '}] `;
                line = taskMatch[3];
            } else {
                const orderedMatch = /^(\s*\d+\.)\s+(.*)$/.exec(line);
                if (orderedMatch) {
                    prefix = `${orderedMatch[1]} `;
                    line = orderedMatch[2];
                } else {
                    const bulletMatch = /^(\s*)[-*+]\s+(.*)$/.exec(line);
                    if (bulletMatch) {
                        prefix = `${bulletMatch[1]}- `;
                        line = bulletMatch[2];
                    }
                }
            }
        }
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(original)) {
        return {
            rawText: original,
            tokens: [{ text: '--------------------------------', tone: 'muted' }],
            tone: 'muted'
        };
    }

    return {
        rawText: original,
        prefix,
        prefixTone,
        tokens: tokenizeMarkdownInline(line, tone),
        tone
    };
}

function tokenizeMarkdownInline(value: string, baseTone?: AgentConsoleMarkdownTone): AgentConsoleMarkdownToken[] {
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
                tone: 'accent'
            });
        } else if (match[5] !== undefined || match[6] !== undefined) {
            tokens.push({
                text: match[5] || match[6] || '',
                tone: 'strong'
            });
        } else if (match[7] !== undefined) {
            tokens.push({
                text: match[7],
                tone: 'muted'
            });
        } else if (match[8] !== undefined) {
            tokens.push({
                text: match[8],
                tone: 'code'
            });
        } else if (match[9] !== undefined || match[10] !== undefined) {
            tokens.push({
                text: match[9] || match[10] || '',
                tone: baseTone === 'quote' ? 'quote' : 'accent'
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

function compactMarkdownLines(lines: AgentConsoleMarkdownLine[]): AgentConsoleMarkdownLine[] {
    const normalized: AgentConsoleMarkdownLine[] = [];
    lines.forEach(line => {
        const text = flattenAgentConsoleMarkdownLine(line).trim();
        if (!text && (!normalized.length || !flattenAgentConsoleMarkdownLine(normalized[normalized.length - 1]).trim())) {
            return;
        }
        normalized.push(line);
    });
    while (normalized.length && !flattenAgentConsoleMarkdownLine(normalized[0]).trim()) {
        normalized.shift();
    }
    while (normalized.length && !flattenAgentConsoleMarkdownLine(normalized[normalized.length - 1]).trim()) {
        normalized.pop();
    }
    return normalized;
}
