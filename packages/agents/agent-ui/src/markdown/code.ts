import { CommonSyntaxState, tokenizeCommonCodeLine } from '@tsdi/components/common';
import type { AgentConsoleMarkdownLine, AgentConsoleMarkdownToken, AgentConsoleMarkdownTone } from './model';

/**
 * Fenced code blocks: fence frame plus shared syntax tokens from
 * `@tsdi/components/common`.
 */

const SYNTAX_TONES = {
    keyword: 'syntax-keyword',
    string: 'syntax-string',
    number: 'syntax-number',
    comment: 'syntax-comment',
    property: 'syntax-property',
    type: 'syntax-type',
    constant: 'syntax-constant',
    variable: 'syntax-variable',
    tag: 'syntax-tag',
    attribute: 'syntax-attribute',
    function: 'syntax-function'
} as const;

export function renderCodeFenceHeader(language: string, width = 96): AgentConsoleMarkdownLine {
    const label = String(language || '').trim();
    const tokens: AgentConsoleMarkdownToken[] = [{ text: '╭─', tone: 'muted' }];
    let used = 2;
    if (label) {
        tokens.push({ text: ` ${label} `, tone: 'accent' });
        used += label.length + 2;
    }
    // Fill the frame to the message width so code blocks read as one block.
    const rule = Math.max(0, Math.floor(width) - used);
    if (rule > 0) {
        tokens.push({ text: '─'.repeat(rule), tone: 'muted' });
    }
    return { rawText: `\`\`\`${label}`, tokens, tone: 'muted' };
}

export function renderCodeFenceFooter(width = 96): AgentConsoleMarkdownLine {
    const rule = Math.max(0, Math.floor(width) - 1);
    return { rawText: '```', tokens: [{ text: `╰${'─'.repeat(rule)}`, tone: 'muted' }], tone: 'muted' };
}

export function renderCodeLineTokens(line: string, language: string, state: CommonSyntaxState): AgentConsoleMarkdownToken[] {
    const tokens = tokenizeCommonCodeLine(line, language, state);
    return tokens.map(token => ({
        text: token.text,
        tone: token.kind === 'plain' ? 'code' : SYNTAX_TONES[token.kind]
    }));
}

export function resetCommonSyntaxState(state: CommonSyntaxState): void {
    state.blockComment = false;
}
