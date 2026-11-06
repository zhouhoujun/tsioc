import {
    SyntaxTokenKind,
    SyntaxState,
    normalizeCodeLanguage,
    tokenizeCodeLine
} from '@tsdi/components/common';

/**
 * Terminal palette for one tokenized source line.
 *
 * The tokenizer lives in `@tsdi/components/common` so the browser and terminal
 * renderers share exactly the same language profiles and multi-line state.
 */
export interface TerminalCodeTheme {
    keyword: string;
    string: string;
    number: string;
    comment: string;
    property: string;
    type: string;
    constant: string;
    variable: string;
    tag: string;
    attribute: string;
    function: string;
}

export interface TerminalCodeHighlightState {
    blockComment?: boolean;
}

const RESET = '\x1b[0m';

const THEME_KEYS: Record<Exclude<SyntaxTokenKind, 'plain'>, keyof TerminalCodeTheme> = {
    keyword: 'keyword',
    string: 'string',
    number: 'number',
    comment: 'comment',
    property: 'property',
    type: 'type',
    constant: 'constant',
    variable: 'variable',
    tag: 'tag',
    attribute: 'attribute',
    function: 'function'
};

export { normalizeCodeLanguage as normalizeTerminalCodeLanguage };

export function highlightTerminalCodeLine(
    line: string,
    language: string,
    theme: TerminalCodeTheme,
    state: TerminalCodeHighlightState = {}
): string {
    const tokens = tokenizeCodeLine(line, language, state as SyntaxState);
    return tokens.map(token => {
        if (token.kind === 'plain' || !token.text) {
            return token.text;
        }
        const color = theme[THEME_KEYS[token.kind]];
        return color ? `${color}${token.text}${RESET}` : token.text;
    }).join('');
}
