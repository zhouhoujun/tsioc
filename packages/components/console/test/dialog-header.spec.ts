import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TuiTerminalSurface } from '../src';

const strip = (line: string) => line.replace(/\x1b\[[0-9;]*m/g, '');

@Suite('console dialog layout')
export class ConsoleDialogLayoutTest {
    @Test('a dialog taller than the space above the composer never overwrites the header')
    async keepsHeaderVisible() {
        const dialog = ['╭dialog────────────╮', ...Array.from({ length: 6 }, (_value, index) => `d${index + 1}`), '╰──────────────────╯'];
        const lines = ['tabbar', 't1', 't2', ...dialog, 'status', 'input a', 'input b', 'meta'];
        const regions = [
            { id: 'header', startRow: 0, endRow: 1 },
            { id: 'transcript', startRow: 1, endRow: 3 },
            { id: 'dialog', startRow: 3, endRow: 3 + dialog.length },
            { id: 'footer', startRow: 3 + dialog.length, endRow: lines.length }
        ];
        const surface = new TuiTerminalSurface({
            renderer: { renderToTuiLayout: () => ({ lines, regions, cursorTargets: [], clickTargets: [] }) } as any,
            root: { addEventListener() { }, removeEventListener() { } } as any,
            width: 40,
            height: 12,
            nativeScrollback: false,
            scrollViewport: true,
            output: { write: () => undefined },
            scheduler: task => task()
        });
        try {
            surface.render();
            const rendered = surface.lastRenderedLines.map(strip);
            expect(rendered.length).toEqual(12);
            // The header keeps its own row; the dialog starts below it and never
            // overwrites the header columns.
            expect(rendered[0]).toEqual('tabbar');
            const dialogRow = rendered.findIndex(line => line.includes('╭dialog'));
            expect(dialogRow).toBeGreaterThanOrEqual(1);
        } finally {
            surface.destroy();
        }
    }
}
