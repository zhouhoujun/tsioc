import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TuiRenderer } from '../src';

const strip = (line: string) => line.replace(/\x1b\[[0-9;]*m/g, '');

@Suite('console text alignment')
export class ConsoleTextAlignmentTest {
    @Test('centre-aligned labels pad both sides of the viewport')
    centersLabels() {
        const renderer = new TuiRenderer();
        const root = renderer.createElement('div');
        const label = renderer.createElement('label');
        label.setAttribute('style', 'text-align: center');
        renderer.appendChild(label, renderer.createText('中心'));
        renderer.appendChild(root, label);
        const lines = renderer.renderToTuiLines(root, { width: 20 }).map(strip);
        expect(lines[0]).toEqual('        中心');
    }

    @Test('the brand stylesheet centres welcome lines')
    centersBrandLines() {
        const renderer = new TuiRenderer();
        const root = renderer.createElement('div');
        const panel = renderer.createElement('div');
        panel.setAttribute('class', 'console-panel console-brand-panel');
        const label = renderer.createElement('label');
        label.setAttribute('class', 'brand-line');
        renderer.appendChild(label, renderer.createText('中心'));
        renderer.appendChild(panel, label);
        renderer.appendChild(root, panel);
        const lines = renderer.renderToTuiLines(root, { width: 20 }).map(strip);
        const inner = lines.find(line => line.includes('中心'))!;
        const plain = strip(inner);
        const index = plain.indexOf('中心');
        const left = index - 1;
        const right = plain.length - 1 - (index + 4);
        expect(plain.startsWith('│')).toEqual(true);
        expect(Math.abs(left - right)).toBeLessThanOrEqual(2);
    }
}
