import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { JSDOM } from 'jsdom';
import { measureDomConsoleColumns } from '../src/markdown-width-dom';

@Suite('dom markdown width')
export class DomMarkdownWidthTest {
    @Test('measures the console column grid from the element font metrics')
    measuresColumns() {
        const dom = new JSDOM('<!DOCTYPE html><body><div id="panel"></div></body>');
        const { window } = dom;
        const panel = window.document.getElementById('panel') as HTMLElement;
        Object.defineProperty(panel, 'clientWidth', { value: 1100, configurable: true });
        (window as any).getComputedStyle = () => ({
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: '400',
            letterSpacing: 'normal'
        });
        // The probe renders eight characters 64px wide => 8px per cell.
        Object.defineProperty(window.HTMLElement.prototype, 'getBoundingClientRect', {
            configurable: true,
            value() {
                return { width: 64, height: 13, top: 0, left: 0, right: 64, bottom: 13 };
            }
        });

        // 1100px / 8px per cell = 137 columns, minus the two 1ch row gutters.
        expect(measureDomConsoleColumns(panel)).toEqual(135);
    }

    @Test('ignores detached or unmeasured elements')
    ignoresUnmeasuredElements() {
        expect(measureDomConsoleColumns(null)).toEqual(0);
        expect(measureDomConsoleColumns(undefined)).toEqual(0);
    }
}
