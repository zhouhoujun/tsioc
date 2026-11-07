import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TuiTerminalSurface } from '../src';

const strip = (line: string) => line.replace(/\x1b\[[0-9;]*m/g, '');

@Suite('console toast overlay')
export class ConsoleToastOverlayTest {
    @Test('toast rows float over the transcript and never move the footer')
    async floatsAboveFooter() {
        const closeNode = { addEventListener() { }, removeEventListener() { } } as any;
        const transcript = ['t1', 't2', 't3', 't4', 't5'];
        const toastLine = `${' '.repeat(50)}Copied ✕`;
        const layout = {
            lines: [...transcript, toastLine, 'fixed footer'],
            regions: [
                { id: 'transcript', startRow: 0, endRow: 5 },
                { id: 'toast', startRow: 5, endRow: 6 },
                { id: 'footer', startRow: 6, endRow: 7 }
            ],
            cursorTargets: [],
            clickTargets: [{ node: closeNode, x: 57, y: 5, width: 2, height: 1, interactive: 'pointer' }]
        };
        const surface = new TuiTerminalSurface({
            renderer: { renderToTuiLayout: () => layout } as any,
            root: { addEventListener() { }, removeEventListener() { } } as any,
            width: 60,
            height: 5,
            nativeScrollback: false,
            scrollViewport: true,
            output: { write: () => undefined },
            scheduler: task => task()
        });
        try {
            surface.render();
            const lines = surface.lastRenderedLines.map(strip);
            // 5 viewport rows; the toast is painted over the last transcript row,
            // and the footer still sits on the final row (no extra footer row).
            expect(lines.length).toEqual(5);
            expect(lines[4]).toContain('fixed footer');
            const toastRow = lines.findIndex(line => line.includes('Copied'));
            expect(toastRow).toBeGreaterThanOrEqual(0);
            // Only the toast's columns are replaced: the transcript prefix stays.
            expect(lines[toastRow].startsWith('t')).toBe(true);
            const target = surface.clickTargets.find(item => item.node === closeNode);
            expect(target?.y).toEqual(toastRow);
            // The card is slid to the right edge (one column here).
            expect(target?.x).toEqual(58);
        } finally {
            surface.destroy();
        }
    }

    @Test('native scrollback keeps the toast in flow')
    async scrollbackKeepsFlow() {
        const layout = {
            lines: ['t1', 't2', 'Copied ✕', 'fixed footer'],
            regions: [
                { id: 'transcript', startRow: 0, endRow: 2 },
                { id: 'toast', startRow: 2, endRow: 3 },
                { id: 'footer', startRow: 3, endRow: 4 }
            ],
            cursorTargets: [],
            clickTargets: []
        };
        const surface = new TuiTerminalSurface({
            renderer: { renderToTuiLayout: () => layout } as any,
            root: { addEventListener() { }, removeEventListener() { } } as any,
            width: 40,
            height: 8,
            nativeScrollback: true,
            scrollViewport: false,
            output: { write: () => undefined },
            scheduler: task => task()
        });
        try {
            surface.render();
            const lines = surface.lastRenderedLines.map(strip);
            expect(lines).toEqual(['t1', 't2', 'Copied ✕', 'fixed footer']);
        } finally {
            surface.destroy();
        }
    }
}
