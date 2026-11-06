import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { normalizeCodeLanguage, tokenizeCodeLine } from '../src';

@Suite('common syntax tokens')
export class SyntaxTokensTest {
    @Test('tokenizes keywords, strings, numbers, and comments across languages')
    tokenizesLanguages() {
        const python = tokenizeCodeLine('def run(value: int) -> str:  # note', 'python');
        expect(python.some(token => token.kind === 'keyword' && token.text === 'def')).toEqual(true);
        expect(python.some(token => token.kind === 'comment' && token.text.includes('# note'))).toEqual(true);

        const sql = tokenizeCodeLine('SELECT id FROM users WHERE active = true', 'sql');
        expect(sql.some(token => token.kind === 'keyword' && token.text === 'SELECT')).toEqual(true);
        expect(sql.some(token => token.kind === 'keyword' && token.text === 'WHERE')).toEqual(true);

        const yaml = tokenizeCodeLine('model: deepseek-flash', 'yaml');
        expect(yaml.some(token => token.kind === 'property' && token.text === 'model')).toEqual(true);
    }

    @Test('keeps block comments styled across lines')
    keepsBlockComments() {
        const state = { blockComment: false };
        tokenizeCodeLine('/* start', 'c', state);
        expect(state.blockComment).toEqual(true);
        const second = tokenizeCodeLine('still comment */ int x = 1;', 'c', state);
        expect(state.blockComment).toEqual(false);
        expect(second.some(token => token.kind === 'comment' && token.text.includes('still comment */'))).toEqual(true);
        expect(second.some(token => token.kind === 'keyword' && token.text === 'int')).toEqual(true);
    }

    @Test('highlights markup tags, attributes, and strings')
    tokenizesMarkup() {
        const tokens = tokenizeCodeLine('<section class="panel">', 'html');
        expect(tokens.some(token => token.kind === 'tag' && token.text === 'section')).toEqual(true);
        expect(tokens.some(token => token.kind === 'attribute' && token.text === 'class')).toEqual(true);
        expect(tokens.some(token => token.kind === 'string' && token.text === '"panel"')).toEqual(true);
    }

    @Test('normalizes language aliases once and falls back to javascript')
    normalizesAliases() {
        expect(normalizeCodeLanguage('tsx')).toEqual('typescript');
        expect(normalizeCodeLanguage('language-Python')).toEqual('python');
        expect(normalizeCodeLanguage('sh')).toEqual('shell');
        expect(normalizeCodeLanguage('')).toEqual('javascript');
    }
}
