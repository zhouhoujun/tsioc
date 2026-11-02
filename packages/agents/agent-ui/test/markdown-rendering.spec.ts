import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { renderAgentConsoleMarkdownLines } from '../src/AgentConsoleMarkdown';
import { getDisplayWidth } from '../src/AgentConsoleTextWidth';
import { renderAgentConsoleMessageItems } from '../src/AgentConsoleMessageRenderers';
import { resolveAgentConsoleMarkdownToneStyle } from '../src/AgentConsoleMarkdownStyles';
import { defaultAgentConsoleTheme } from '../src/AgentConsoleTheme';

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
        // Renderer-neutral metadata lets the DOM skin use a code/table surface
        // while the terminal keeps the same grid rows.
        expect(lines.some(line => line.table === true)).toEqual(true);
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

    @Test('renders syntax-highlighted code without an ASCII frame')
    rendersSyntaxHighlightedCodeFence() {
        const lines = renderAgentConsoleMarkdownLines([
            '```python',
            'def run(value):',
            '    return "ok"  # done',
            '```'
        ].join('\n'), { compactBlankLines: true, tableWidth: 60 });
        const bodies = lines.filter(line => line.code);
        const bodyTokens = bodies.flatMap(line => line.tokens);
        expect(bodyTokens.some(token => token.tone === 'syntax-keyword' && token.text === 'def')).toEqual(true);
        expect(bodyTokens.some(token => token.tone === 'syntax-string' && token.text.includes('"ok"'))).toEqual(true);
        expect(bodyTokens.some(token => token.tone === 'syntax-comment' && token.text.includes('# done'))).toEqual(true);
        // opencode renders code blocks as plain syntax lines: no fence/rail.
        expect(bodies.every(line => !line.prefix)).toEqual(true);
        expect(lines.some(line => plain(line.rawText).includes('python'))).toEqual(false);
        expect(lines.some(line => flatten(line).includes('╭') || flatten(line).includes('╰'))).toEqual(false);
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

    @Test('message markdown gets block rhythm while compact timeline rows stay single-spaced')
    messageMarkdownRhythmOnly() {
        // No authored blank lines: the renderer must add the rhythm itself.
        const content = [
            '## Heading',
            'Paragraph body.',
            '```ts',
            'const value = 1;',
            '```',
            '| col | value |',
            '| --- | --- |',
            '| a | 1 |'
        ].join('\n');
        const messageLines = renderAgentConsoleMarkdownLines(content);
        const compactLines = renderAgentConsoleMarkdownLines(content, { compactBlankLines: true });
        const blankMarkerRows = (lines: Array<{ tokens: Array<{ text: string }> }>): number =>
            lines.filter(line => line.tokens.map(token => token.text).join('').replace(/\u200b/g, '').trim() === '').length;
        expect(blankMarkerRows(messageLines)).toBeGreaterThan(0);
        expect(messageLines.length).toBeGreaterThan(compactLines.length);
        // Timeline event rows pass compactBlankLines: no rhythm rows leak there.
        expect(blankMarkerRows(compactLines)).toEqual(0);
    }

    @Test('list and quote lines expose a continuation indent for wrapped rows')
    continuationIndent() {
        const lines = renderAgentConsoleMarkdownLines([
            '- one',
            '  - two',
            '1. three',
            '> quote'
        ].join('\n'), { compactBlankLines: true });
        const nested = lines.find(line => String(line.prefix || '').includes('◦'));
        const ordered = lines.find(line => String(line.prefix || '').includes('1.'));
        const quote = lines.find(line => String(line.prefix || '').includes('│'));
        expect(lines.find(line => String(line.prefix || '').includes('•'))?.continuationIndent).toEqual(2);
        expect(nested?.continuationIndent).toEqual(4);
        expect(ordered?.continuationIndent).toEqual(3);
        expect(quote?.continuationIndent).toEqual(2);
    }

    @Test('assistant list rows carry the DOM hanging indent')
    listRowsHang() {
        const items = renderAgentConsoleMessageItems([{
            id: 'a1',
            role: 'assistant',
            content: `- ${'很长的列表内容'.repeat(12)}`,
            createdAt: 1
        }] as any, { markdownContentWidth: 40 });
        const row = items[0].lines.find(line => String(line.prefix || '').includes('•'));
        expect(row?.continuationIndent).toEqual(6);
        expect(row?.itemStyle?.['padding-left']).toEqual('6ch');
        expect(row?.itemStyle?.['text-indent']).toEqual('-6ch');
    }

    @Test('heading hierarchy keeps h1/h2 accent and drops h3+ to body weight')
    headingHierarchy() {
        const lines = renderAgentConsoleMarkdownLines('# Section\n\n### Detail', { compactBlankLines: true });
        const h1 = lines.find(line => line.prefixTone === 'heading' && line.tokens.some(token => token.text === 'Section'));
        const h3 = lines.find(line => line.prefixTone === 'heading' && line.tokens.some(token => token.text === 'Detail'));
        expect(h1?.tone).toEqual('heading');
        expect(h3?.tone).toEqual('strong');
    }

    @Test('code body stays unboxed and quotes render italic')
    tonePalette() {
        const code = resolveAgentConsoleMarkdownToneStyle('code', defaultAgentConsoleTheme);
        const quote = resolveAgentConsoleMarkdownToneStyle('quote', defaultAgentConsoleTheme);
        const strong = resolveAgentConsoleMarkdownToneStyle('strong', defaultAgentConsoleTheme);
        expect(code.background).toBeFalsy();
        expect(code['background-color']).toBeFalsy();
        expect(quote['font-style']).toEqual('italic');
        expect(strong['font-weight']).toEqual('bold');
    }

    @Test('blank rhythm rows carry no padding, meta, or ARIA content')
    blankRhythmRowsAreNotContent() {
        const items = renderAgentConsoleMessageItems([{
            id: 'a1',
            role: 'assistant',
            content: '## Heading\n\nParagraph body.',
            createdAt: 1
        }] as any);
        const blank = items[0].lines.filter(line => String(line.content || '').replace(/\u200b/g, '').trim() === '');
        expect(blank.length).toBeGreaterThan(0);
        blank.forEach(line => {
            expect(line.itemStyle?.padding).toEqual('0');
            expect(line.itemStyle?.margin).toEqual('0');
            expect(line.ariaLabel).toEqual('');
        });
    }
}
