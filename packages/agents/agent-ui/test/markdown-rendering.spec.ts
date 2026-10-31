import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { renderAgentConsoleMarkdownLines } from '../src/AgentConsoleMarkdown';
import { getDisplayWidth } from '../src/AgentConsoleTextWidth';
import { renderAgentConsoleMessageItems } from '../src/AgentConsoleMessageRenderers';

const plain = (value: string): string => String(value || '').replace(/\x1b\[[0-9;]*m/g, '');
const flatten = (line: { prefix?: string; tokens: Array<{ text: string }> }): string =>
    `${line.prefix || ''}${line.tokens.map(token => token.text).join('')}`;

@Suite('agent console markdown rendering')
export class AgentConsoleMarkdownRenderingTest {
    @Test('renders grid tables with aligned CJK-aware columns')
    rendersGridTable() {
        const lines = renderAgentConsoleMarkdownLines([
            '| Name | Status | Notes |',
            '| :--- | :---: | ---: |',
            '| alpha | ok | `fast` |',
            '| 中文 | 完成 | long value |'
        ].join('\n'), { compactBlankLines: true, tableWidth: 60 });
        const text = lines.map(line => plain(line.rawText));
        expect(text[0].startsWith('┌')).toEqual(true);
        expect(text[0]).toContain('┬');
        expect(text[0]).toContain('┐');
        expect(text.some(line => line.includes('Name') && line.includes('Status'))).toEqual(true);
        expect(text.some(line => line.includes('中文') && line.includes('完成'))).toEqual(true);
        expect(text.some(line => line.includes('├') && line.includes('┼'))).toEqual(true);
        expect(text[text.length - 1].startsWith('└')).toEqual(true);

        const widths = new Set(lines.map(line => getDisplayWidth(plain(line.rawText))));
        expect(widths.size).toEqual(1);
        lines.forEach(line => expect(getDisplayWidth(plain(line.rawText))).toBeLessThanOrEqual(60));
        const header = lines.find(line => plain(line.rawText).includes('Name'));
        expect(header?.tokens.some(token => token.tone === 'heading' && token.text.includes('Name'))).toEqual(true);
    }

    @Test('wraps narrow table cells instead of overflowing the terminal')
    wrapsNarrowTable() {
        const lines = renderAgentConsoleMarkdownLines([
            '| key | description |',
            '| --- | --- |',
            '| alpha | a very long description that must wrap inside its column |'
        ].join('\n'), { compactBlankLines: true, tableWidth: 36 });
        const text = lines.map(line => plain(line.rawText));
        expect(text[0].startsWith('┌')).toEqual(true);
        expect(text.some(line => line.includes('that must wrap'))).toEqual(true);
        text.forEach(line => expect(getDisplayWidth(line)).toBeLessThanOrEqual(36));
    }

    @Test('falls back to readable columns when the grid cannot fit')
    fallsBackToColumns() {
        const lines = renderAgentConsoleMarkdownLines([
            '| a | b | c | d | e | f |',
            '| --- | --- | --- | --- | --- | --- |',
            '| 1 | 2 | 3 | 4 | 5 | 6 |'
        ].join('\n'), { compactBlankLines: true, tableWidth: 24 });
        const text = lines.map(line => plain(line.rawText));
        expect(text.some(line => line.includes('┌'))).toEqual(false);
        expect(text[0]).toContain('a');
        expect(text[0]).toContain('f');
    }

    @Test('renders a labelled code frame with shared syntax tokens')
    rendersSyntaxHighlightedCodeFence() {
        const lines = renderAgentConsoleMarkdownLines([
            '```python',
            'def run(value):',
            '    return "ok"  # done',
            '```'
        ].join('\n'), { compactBlankLines: true, tableWidth: 60 });
        const header = lines.find(line => plain(line.rawText).includes('python'));
        expect(header?.tokens.some(token => token.tone === 'accent')).toEqual(true);
        const bodies = lines.filter(line => line.prefix === '│ ');
        const bodyTokens = bodies.flatMap(line => line.tokens);
        expect(bodyTokens.some(token => token.tone === 'syntax-keyword' && token.text === 'def')).toEqual(true);
        expect(bodyTokens.some(token => token.tone === 'syntax-string' && token.text.includes('"ok"'))).toEqual(true);
        expect(bodyTokens.some(token => token.tone === 'syntax-comment' && token.text.includes('# done'))).toEqual(true);
        expect(flatten(lines[lines.length - 1]).startsWith('╰')).toEqual(true);
    }

    @Test('styles emphasis, strike, strong, code, and links distinctly')
    stylesInlineMarkdown() {
        const lines = renderAgentConsoleMarkdownLines(
            'a *em* ~~gone~~ **strong** `code` [label](https://example.com)',
            { compactBlankLines: true }
        );
        const tones = lines[0].tokens.map(token => token.tone);
        expect(tones).toContain('emphasis');
        expect(tones).toContain('strike');
        expect(tones).toContain('strong');
        expect(tones).toContain('inline-code');
        expect(tones).toContain('link');
        expect(lines[0].rawText).toContain('label');
        expect(lines[0].rawText).toContain('https://example.com');
    }

    @Test('uses quote rail, nested bullets, and task glyphs')
    stylesBlockMarkers() {
        const lines = renderAgentConsoleMarkdownLines([
            '> quoted',
            '',
            '- first',
            '  - nested',
            '',
            '- [x] done',
            '- [ ] todo'
        ].join('\n'), { compactBlankLines: true });
        const flat = lines.map(flatten);
        expect(flat).toContain('│ quoted');
        expect(flat).toContain('• first');
        expect(flat).toContain('  ◦ nested');
        expect(flat).toContain('☑ done');
        expect(flat).toContain('☐ todo');
    }

    @Test('routes the terminal column budget through the message renderer')
    usesMessageRenderContextWidth() {
        const content = [
            '| Name | Status | Notes |',
            '| --- | --- | --- |',
            '| alpha | ok | a fairly long note that keeps going |'
        ].join('\n');
        const items = renderAgentConsoleMessageItems([{
            id: 'a1',
            role: 'assistant',
            content,
            createdAt: 1
        }] as any, { markdownContentWidth: 44 });
        const text = items[0].lines.map(line => plain(line.content));
        expect(text.some(line => line.includes('┌'))).toEqual(true);
        text.forEach(line => expect(getDisplayWidth(line)).toBeLessThanOrEqual(44));
    }
}
