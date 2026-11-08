import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TuiRenderer } from '../src';

const strip = (line: string) => line.replace(/\x1b\[[0-9;]*m/g, '');

@Suite('console inline visibility')
export class ConsoleInlineVisibilityTest {
    @Test('v-show display none hides inline spans inside a label')
    hidesInlineSpan() {
        const renderer = new TuiRenderer();
        const root = renderer.createElement('div');
        const label = renderer.createElement('label');
        const visible = renderer.createElement('span');
        renderer.appendChild(visible, renderer.createText('visible'));
        const hidden = renderer.createElement('span');
        hidden.setAttribute('style', 'display: none');
        renderer.appendChild(hidden, renderer.createText('hidden'));
        renderer.appendChild(label, visible);
        renderer.appendChild(label, hidden);
        renderer.appendChild(root, label);
        const lines = renderer.renderToTuiLines(root, { width: 40 }).map(strip);
        expect(lines[0]).toContain('visible');
        expect(lines[0]).not.toContain('hidden');
    }
}
