import { SyntaxState, tokenizeCodeLine } from '@tsdi/components/common';
import type { AgentConsoleMarkdownToken, AgentConsoleMarkdownTone } from './model';

/**
 * Fenced code blocks render as plain syntax-highlighted lines (no ASCII frame,
 * matching opencode's CodeRenderable); shared tokens come from
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

export function renderCodeLineTokens(line: string, language: string, state: SyntaxState): AgentConsoleMarkdownToken[] {
    const tokens = tokenizeCodeLine(line, language, state);
    return tokens.map(token => ({
        text: token.text,
        tone: token.kind === 'plain' ? 'code' : SYNTAX_TONES[token.kind]
    }));
}

export function resetSyntaxState(state: SyntaxState): void {
    state.blockComment = false;
}
