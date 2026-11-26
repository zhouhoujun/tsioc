/**
 * Reference-counted document scroll lock for overlays.
 *
 * Browsers lock the page while a modal is open; terminal documents have no
 * `defaultView` and are ignored, so the same component code stays renderer-
 * neutral. Nested overlays share one lock and restore the original styles only
 * when the last one releases.
 */
interface ScrollLockState {
    count: number;
    overflow: string;
    paddingRight: string;
}

const locks = new WeakMap<Document, ScrollLockState>();

export function lockDocumentScroll(doc?: Document | null): () => void {
    const body = doc?.body;
    if (!doc?.defaultView || !body) {
        return () => undefined;
    }
    let state = locks.get(doc);
    if (!state) {
        // Compensate for the disappearing scrollbar so the layout does not jump.
        const view = doc.defaultView as Window;
        const scrollbar = Math.max(0, view.innerWidth - (doc.documentElement?.clientWidth || view.innerWidth));
        state = {
            count: 0,
            overflow: body.style.overflow,
            paddingRight: body.style.paddingRight
        };
        if (scrollbar > 0) {
            body.style.paddingRight = `${scrollbar}px`;
        }
        body.style.overflow = 'hidden';
        locks.set(doc, state);
    }
    state.count += 1;
    let released = false;
    return () => {
        if (released) {
            return;
        }
        released = true;
        const current = locks.get(doc);
        if (!current) {
            return;
        }
        current.count -= 1;
        if (current.count > 0) {
            return;
        }
        body.style.overflow = current.overflow;
        body.style.paddingRight = current.paddingRight;
        locks.delete(doc);
    };
}
