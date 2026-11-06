/**
 * Keep a native text selection alive while the transcript re-renders.
 *
 * Streaming replies replace text nodes; the browser drops the selection when
 * its anchor node disappears, which reads as the highlight jumping around.
 * Snapshot the selection as character offsets inside the transcript and
 * restore it after mutations as long as the user is not starting a new drag.
 */
export interface TranscriptSelectionSnapshot {
    start: number;
    end: number;
}

export function captureTranscriptSelection(
    root: ParentNode,
    selection: Selection | null | undefined
): TranscriptSelectionSnapshot | null {
    if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return null;
    }
    const range = selection.getRangeAt(0);
    if (!contains(root, range.startContainer) || !contains(root, range.endContainer)) {
        return null;
    }
    const start = offsetWithin(root, range.startContainer, range.startOffset);
    const end = offsetWithin(root, range.endContainer, range.endOffset);
    if (start == null || end == null) {
        return null;
    }
    return start <= end ? { start, end } : { start: end, end: start };
}

export function restoreTranscriptSelection(
    root: ParentNode,
    selection: Selection | null | undefined,
    snapshot: TranscriptSelectionSnapshot
): boolean {
    if (!root || !selection || !snapshot) {
        return false;
    }
    const document = (root as unknown as Node).ownerDocument;
    if (!document) {
        return false;
    }
    const start = locateOffset(root, document, snapshot.start);
    const end = locateOffset(root, document, snapshot.end);
    if (!start || !end) {
        return false;
    }
    const view = document.defaultView;
    const SelectionCtor = view?.Selection;
    if (SelectionCtor && selection instanceof SelectionCtor && typeof selection.setBaseAndExtent === 'function') {
        selection.setBaseAndExtent(start.node, start.offset, end.node, end.offset);
        return true;
    }
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
}

export interface TranscriptSelectionKeeper {
    dispose(): void;
}

export function keepTranscriptSelection(root: HTMLElement, doc: Document): TranscriptSelectionKeeper {
    const view = doc.defaultView;
    const selection = view?.getSelection?.();
    if (!root || !view || !selection) {
        return { dispose: () => undefined };
    }
    const MutationObserverCtor = view.MutationObserver;
    let snapshot: TranscriptSelectionSnapshot | null = null;
    let pointerDown = false;
    let disposed = false;
    let scheduled = false;
    // Renderer-driven mutations can move/collapse the live selection before
    // the browser reports selectionchange; keep the pre-mutation snapshot and
    // ignore those transient reports.
    let mutatingUntil = 0;

    const current = () => captureTranscriptSelection(root, view.getSelection?.());

    const onSelectionChange = (): void => {
        if (disposed || Date.now() < mutatingUntil) {
            return;
        }
        const next = current();
        if (next) {
            snapshot = next;
        }
    };

    const restore = (): void => {
        if (disposed || pointerDown || !snapshot) {
            return;
        }
        const live = current();
        if (live && live.start === snapshot.start && live.end === snapshot.end) {
            return;
        }
        if (restoreTranscriptSelection(root, view.getSelection?.(), snapshot)) {
            mutatingUntil = Date.now() + 60;
        }
    };

    const scheduleRestore = (): void => {
        if (disposed || scheduled || pointerDown || !snapshot) {
            return;
        }
        scheduled = true;
        const run = (): void => {
            scheduled = false;
            restore();
        };
        if (typeof view.queueMicrotask === 'function') {
            view.queueMicrotask(run);
        } else {
            Promise.resolve().then(run);
        }
    };

    const onPointerDown = (): void => {
        pointerDown = true;
        mutatingUntil = 0;
        snapshot = null;
    };
    const onPointerUp = (): void => {
        pointerDown = false;
        scheduleRestore();
    };

    doc.addEventListener('selectionchange', onSelectionChange);
    root.addEventListener('pointerdown', onPointerDown);
    doc.addEventListener('pointerup', onPointerUp);
    const observer = MutationObserverCtor
        ? new MutationObserverCtor(() => {
            mutatingUntil = Date.now() + 120;
            scheduleRestore();
        })
        : null;
    observer?.observe(root, { childList: true, subtree: true, characterData: true });

    return {
        dispose(): void {
            disposed = true;
            doc.removeEventListener('selectionchange', onSelectionChange);
            root.removeEventListener('pointerdown', onPointerDown);
            doc.removeEventListener('pointerup', onPointerUp);
            observer?.disconnect();
        }
    };
}

function contains(root: ParentNode, node: Node | null | undefined): boolean {
    if (!node) {
        return false;
    }
    return root === node || (typeof root.contains === 'function' && root.contains(node));
}

function offsetWithin(root: ParentNode, node: Node, offset: number): number | null {
    const document = node.ownerDocument;
    if (!document || !contains(root, node)) {
        return null;
    }
    const range = document.createRange();
    range.selectNodeContents(root as Node);
    try {
        range.setEnd(node, offset);
    } catch {
        return null;
    }
    return range.toString().length;
}

function locateOffset(
    root: ParentNode,
    document: Document,
    offset: number
): { node: Text; offset: number } | null {
    const view = document.defaultView;
    const showText = view?.NodeFilter?.SHOW_TEXT ?? 4;
    const walker = document.createTreeWalker(root as Node, showText);
    let remaining = Math.max(0, offset);
    let last: Text | null = null;
    while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const length = node.data.length;
        if (remaining <= length) {
            return { node, offset: remaining };
        }
        remaining -= length;
        last = node;
    }
    return last ? { node: last, offset: last.data.length } : null;
}
