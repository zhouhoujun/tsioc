import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { lockDocumentScroll } from '../src/overlay-scroll-lock';

@Suite('common overlay scroll lock')
export class OverlayScrollLockTest {
    @Test('reference counts document locks and restores body styles')
    async referenceCount() {
        const { JSDOM } = require('jsdom');
        const doc = new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
        doc.body.style.overflow = 'auto';
        doc.body.style.paddingRight = '4px';

        const releaseFirst = lockDocumentScroll(doc);
        expect(doc.body.style.overflow).toEqual('hidden');
        const releaseSecond = lockDocumentScroll(doc);
        expect(doc.body.style.overflow).toEqual('hidden');

        releaseFirst();
        expect(doc.body.style.overflow).toEqual('hidden');
        releaseFirst();
        expect(doc.body.style.overflow).toEqual('hidden');
        releaseSecond();
        expect(doc.body.style.overflow).toEqual('auto');
        expect(doc.body.style.paddingRight).toEqual('4px');
    }

    @Test('is inert for terminal documents without a window')
    async terminalNoop() {
        const body = { style: { overflow: 'visible', paddingRight: '0px' } };
        const release = lockDocumentScroll({ body } as any);
        expect(body.style.overflow).toEqual('visible');
        release();
        expect(body.style.overflow).toEqual('visible');
        expect(() => lockDocumentScroll(undefined)()).not.toThrow();
    }
}
