import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { highlightTerminalCodeLine, renderTerminalMarkdownLines } from '../src/terminal';

const strip = (value: string): string => String(value || '').replace(/\x1b\[[0-9;]*m/g, '');

@Suite('terminal markdown tables and syntax')
export class TerminalMarkdownSyntaxTest {
    @Test('renders a grid table with aligned CJK-aware columns')
    rendersTable() {
        const lines = renderTerminalMarkdownLines([
            '| Name | Status | Notes |',
            '| :--- | :---: | ---: |',
            '| alpha | ok | `fast` |',
            '| 中文 | 完成 | long value |'
        ].join('\n'), 60);
        const plain = lines.map(strip);
        expect(plain[0]).toContain('┌');
        expect(plain[0]).toContain('┬');
        expect(plain[0]).toContain('┐');
        expect(plain.some(line => line.includes('Name') && line.includes('Status'))).toEqual(true);
        expect(plain.some(line => line.includes('中文') && line.includes('完成'))).toEqual(true);
        expect(plain.some(line => line.includes('├') && line.includes('┼'))).toEqual(true);
        expect(plain[plain.length - 1]).toContain('└');
        expect(lines.some(line => /\x1b\[[0-9;]*m/.test(line))).toEqual(true);
        lines.forEach(line => {
            expect(line.length).toBeGreaterThan(0);
            expect(strip(line).trimEnd().length).toBeLessThanOrEqual(60);
        });
    }

    @Test('wraps narrow table cells instead of overflowing the terminal')
    wrapsNarrowTable() {
        const lines = renderTerminalMarkdownLines([
            '| key | description |',
            '| --- | --- |',
            '| alpha | a very long description that must wrap inside its column |'
        ].join('\n'), 36);
        const plain = lines.map(strip);
        expect(plain[0]).toContain('┌');
        expect(plain.some(line => line.includes('description'))).toEqual(true);
        expect(plain.some(line => line.includes('that must wrap'))).toEqual(true);
        expect(plain.length).toBeGreaterThan(5);
        plain.forEach(line => expect(line.trimEnd().length).toBeLessThanOrEqual(36));
    }

    @Test('renders fenced code in a labeled box and styles quotes/lists')
    rendersCodeAndChrome() {
        const lines = renderTerminalMarkdownLines([
            '> quoted',
            '',
            '- bullet',
            '  - nested',
            '',
            '```python',
            'def run():',
            '    return 1',
            '```'
        ].join('\n'), 50);
        const plain = lines.map(strip);
        expect(plain.some(line => line.includes('│ quoted'))).toEqual(true);
        expect(plain.some(line => line.includes('• bullet'))).toEqual(true);
        expect(plain.some(line => line.includes('◦ nested'))).toEqual(true);
        expect(plain.some(line => line.startsWith('╭─ python '))).toEqual(true);
        expect(plain.some(line => line.includes('def run():'))).toEqual(true);
        expect(plain[plain.length - 1]).toContain('╰');
    }

    @Test('highlights common languages beyond JavaScript and shell')
    highlightsLanguages() {
        const cases: Array<[string, string, string]> = [
            ['python', 'def run(value):', 'def'],
            ['go', 'func main() {}', 'func'],
            ['rust', 'fn main() {}', 'fn'],
            ['java', 'public class Main {}', 'public'],
            ['csharp', 'public void Run() {}', 'public'],
            ['ruby', 'def run', 'def'],
            ['php', 'function run($value) {', 'function'],
            ['sql', 'SELECT id FROM users WHERE active = true', 'SELECT'],
            ['yaml', 'model: deepseek-flash', 'model'],
            ['toml', 'model = "deepseek"', 'model'],
            ['dockerfile', 'FROM node:22', 'FROM'],
            ['html', '<section class="panel">', 'section'],
            ['css', '.panel { color: red; }', 'color'],
            ['lua', 'local function run()', 'local'],
            ['dart', 'class Main {}', 'class']
        ];
        cases.forEach(([language, line, token]) => {
            const painted = highlightTerminalCodeLine(line, language);
            expect(painted).toContain('\x1b[');
            expect(strip(painted)).toContain(token);
        });
    }

    @Test('keeps block comments styled across lines')
    keepsBlockComments() {
        const state = { blockComment: false };
        const first = highlightTerminalCodeLine('/* start', 'c', state);
        const second = highlightTerminalCodeLine('still comment */ int x = 1;', 'c', state);
        expect(state.blockComment).toEqual(false);
        expect(first).toContain('\x1b[');
        expect(second).toContain('int');
        expect(strip(second)).toContain('still comment');
    }
}
