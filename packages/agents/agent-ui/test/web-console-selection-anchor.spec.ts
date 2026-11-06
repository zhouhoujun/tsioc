import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    captureTranscriptSelection,
    keepTranscriptSelection,
    restoreTranscriptSelection
} from '../web-console/selection-anchor';

function createDocument(): { dom: any; doc: Document; root: HTMLElement } {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const doc = dom.window.document as Document;
    const root = doc.createElement('div');
    root.innerHTML = '<div id="a">alpha message</div><div id="b">beta message</div>';
    doc.body.appendChild(root);
    return { dom, doc, root };
}

function selectAcross(doc: Document, root: HTMLElement): void {
    const first = root.querySelector('#a')!.firstChild as Text;
    const second = root.querySelector('#b')!.firstChild as Text;
    const range = doc.createRange();
    range.setStart(first, 6);
    range.setEnd(second, 4);
    const selection = doc.defaultView!.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
}

@Suite('Web console transcript selection anchor')
export class WebConsoleSelectionAnchorTest {

    @Test('captures and restores a selection after the transcript re-renders')
    reusesSelectionAcrossRerender() {
        const { doc, root } = createDocument();
        selectAcross(doc, root);
        const selection = doc.defaultView!.getSelection()!;
        const before = selection.toString();
        const snapshot = captureTranscriptSelection(root, selection);
        expect(snapshot).not.toBeNull();

        // Simulate the renderer replacing the transcript nodes with the same text.
        root.innerHTML = '<div id="a">alpha message</div><div id="b">beta message</div>';
        expect(doc.defaultView!.getSelection()!.toString()).toEqual('');
        expect(restoreTranscriptSelection(root, doc.defaultView!.getSelection(), snapshot!)).toBe(true);
        expect(doc.defaultView!.getSelection()!.toString()).toEqual(before);
    }

    @Test('ignores selections outside the transcript root')
    outsideSelectionIsIgnored() {
        const { doc, root } = createDocument();
        const outside = doc.createElement('p');
        outside.textContent = 'outside text';
        doc.body.appendChild(outside);
        const range = doc.createRange();
        range.setStart(outside.firstChild as Text, 0);
        range.setEnd(outside.firstChild as Text, 7);
        const selection = doc.defaultView!.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        expect(captureTranscriptSelection(root, selection)).toBeNull();
    }

    @Test('keeper restores the selection after streaming mutations')
    async keeperRestoresAfterMutations() {
        const { doc, root } = createDocument();
        const keeper = keepTranscriptSelection(root, doc);
        try {
            selectAcross(doc, root);
            doc.dispatchEvent(new (doc.defaultView as any).Event('selectionchange'));
            const before = doc.defaultView!.getSelection()!.toString();
            expect(before).not.toEqual('');

            const target = root.querySelector('#b')!.firstChild as Text;
            target.data = 'beta message updated';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(doc.defaultView!.getSelection()!.toString()).toEqual(before);
        } finally {
            keeper.dispose();
        }
    }
}
