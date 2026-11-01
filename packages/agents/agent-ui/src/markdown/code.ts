import { CommonSyntaxState, tokenizeCommonCodeLine } from '@tsdi/components/common';
import { AgentConsoleMarkdownLine, AgentConsoleMarkdownToken, AgentConsoleMarkdownTone } from './model';

/**
 * Fenced code blocks. Language profiles live in `@tsdi/components/common`; this
 * module only maps shared token kinds onto transcript tones and draws the fence
 * frame, so the DOM and TUI renderers share one highlight result.
 */

const SYNTAX_TONES: Record<string, AgentConsoleMarkdownTone> = {
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
};

export function renderCodeFenceHeader(language: string): AgentConsoleMarkdownLine {
    const label = String(language || '').trim();
    const tokens: AgentConsoleMarkdownToken[] = [{ text: '╭─', tone: 'muted' }];
    if (label) {
        tokens.push({ text: ` ${label} `, tone: 'accent' });
    }
    return { rawText: `\`\`\`${label}`, tokens, tone: 'muted' };
}

export function renderCodeFenceFooter(): AgentConsoleMarkdownLine {
    return { rawText: '```', tokens: [{ text: '╰─', tone: 'muted' }], tone: 'muted' };
}

export function renderCodeLineTokens(
    line: string,
    language: string,
    state: CommonSyntaxState
): AgentConsoleMarkdownToken[] {
    const tokens = tokenizeCommonCodeLine(line, language, state);
    return tokens.map(token => ({
        text: token.text,
        tone: token.kind === 'plain' ? 'code' : SYNTAX_TONES[token.kind]
    }));
}

/** Block comments span lines, so each fence starts from a clean tokenizer state. */
export function resetCommonSyntaxState(state: CommonSyntaxState): void {
    state.blockComment = false;
}
