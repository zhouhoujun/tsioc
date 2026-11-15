import expect = require('expect');
import { JSDOM } from 'jsdom';
import { Suite, Test } from '@tsdi/unit';
import { DomOverlayAnchors } from '../src/overlay-anchors';

@Suite('dom overlay anchors')
export class DomOverlayAnchorsTest {
    @Test('measures the footer and anchors the indicator to the composer top-right')
    anchors() {
        const dom = new JSDOM('<!DOCTYPE html><body><div id="c"></div><div id="f"></div><div id="k"></div><button id="i"></button></body>');
        const doc = dom.window.document;
        const container = doc.getElementById('c') as HTMLElement;
        const footer = doc.getElementById('f') as HTMLElement;
        const composer = doc.getElementById('k') as HTMLElement;
        const indicator = doc.getElementById('i') as HTMLElement;
        Object.defineProperty(footer, 'getBoundingClientRect', { value: () => ({ height: 84, top: 700, bottom: 784, left: 0, right: 1000, width: 1000 }) });
        Object.defineProperty(composer, 'getBoundingClientRect', { value: () => ({ height: 84, top: 700, bottom: 784, left: 20, right: 980, width: 960 }) });
        Object.defineProperty(doc.documentElement, 'clientWidth', { value: 1000, configurable: true });
        Object.defineProperty(doc.documentElement, 'clientHeight', { value: 800, configurable: true });

        const anchors = new DomOverlayAnchors({
            document: doc,
            container,
            footer,
            composer,
            indicator,
            footerVariable: '--test-footer'
        });
        anchors.attach();
        expect(container.style.getPropertyValue('--test-footer')).toEqual('84px');
        expect(indicator.style.right).toEqual('20px');
        // composer.top 700 => 800 - 700 + 8
        expect(indicator.style.bottom).toEqual('108px');
        anchors.dispose();
    }
}
