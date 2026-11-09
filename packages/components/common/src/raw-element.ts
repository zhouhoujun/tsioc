import { noReact } from '@tsdi/components';

/**
 * DOM hosts and ElementRefs must not be wrapped by the reactive proxy: native
 * jsdom/DOM internals use private fields, and proxying them breaks
 * `querySelector`/`getBoundingClientRect`.
 */
export function markElementRefRaw(elementRef: any): void {
    if (!elementRef) {
        return;
    }
    try {
        elementRef[noReact] = true;
        if (elementRef.nativeElement) {
            elementRef.nativeElement[noReact] = true;
        }
    } catch {
        // Read-only DOM objects can reject the marker; callers still access
        // them through raw references captured in the constructor.
    }
}
