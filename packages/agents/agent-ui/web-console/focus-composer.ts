/**
 * Focus the composer after the console tree is attached.
 *
 * The `[focused]` directive runs while the tree is still detached from the
 * mount point, so its focus() is lost on attach. Desktop pointers expect
 * immediate typing (`?dialog=` deep links included); coarse pointers must keep
 * focus off the textarea so the on-screen keyboard stays closed.
 */
export function focusWebConsoleComposer(doc: Document, root: Element | undefined | null): void {
    const view = doc.defaultView as (Window & typeof globalThis) | null | undefined;
    if (view?.matchMedia?.('(pointer: fine)')?.matches === false) {
        return;
    }
    (root?.querySelector?.('textarea.agent-input') as HTMLTextAreaElement | null)?.focus?.();
}
