import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TuiRenderer, TuiTerminalSurface } from '../src';

const strip = (line: string) => line.replace(/\x1b\[[0-9;]*m/g, '');

@Suite('console dialog layout')
export class ConsoleDialogLayoutTest {
    @Test('the close affordance moves into the dialog frame instead of owning a row')
    closeFoldsIntoFrame() {
        const renderer = new TuiRenderer();
        const root = renderer.createElement('div');
        const panel = renderer.createElement('div');
        panel.setAttribute('class', 'console-panel dialog-panel dialog-w-40');
        panel.setAttribute('renderRegion', 'dialog');
        const close = renderer.createElement('label');
        close.setAttribute('class', 'dialog-close');
        close.setAttribute('data-cell-width', '2');
        close.addEventListener('click', () => undefined);
        renderer.appendChild(close, renderer.createText('✕'));
        renderer.appendChild(panel, close);
        for (const [className, text] of [
            ['dialog-title', '状态 7 行 · 1-7'],
            ['dialog-line', '会话：chat6b2d869765b3f817e3688da581c169ec'],
            ['dialog-hint', 'esc 关闭 · ↑↓ 滚动']
        ]) {
            const label = renderer.createElement('label');
            label.setAttribute('class', className);
            renderer.appendChild(label, renderer.createText(text));
            renderer.appendChild(panel, label);
        }
        renderer.appendChild(root, panel);
        const surface = new TuiTerminalSurface({ renderer, root, width: 70, height: 20, output: { write() { } } });
        try {
            surface.render();
            const rendered = surface.lastRenderedLines.map(strip);
            const frameRow = rendered.findIndex(line => line.includes('╭'));
            expect(frameRow).toBeGreaterThanOrEqual(0);
            // The ✕ sits in the top border; content starts on the next row.
            expect(rendered[frameRow]).toContain('✕');
            expect(rendered[frameRow + 1]).toContain('状态 7 行');
            expect(rendered.filter(line => line.includes('✕')).length).toEqual(1);
            const target = surface.clickTargets.find((item: any) => item.node === close);
            expect(target?.y).toEqual(frameRow);
            expect(target?.width).toEqual(2);
        } finally {
            surface.destroy();
        }
    }

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
