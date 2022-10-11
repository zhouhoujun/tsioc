import { IElement } from '../interfaces/dom';
import { TNode } from '../interfaces/node';
import { LView } from '../interfaces/view';
import { ElementRef } from '../refs/element';




/**
 * Creates an ElementRef from the most recent node.
 *
 * @returns The ElementRef instance to use
 */
export function injectElementRef(): ElementRef {
    return createElementRef(getCurrentTNode()!, getLView());
}

/**
 * Creates an ElementRef given a node.
 *
 * @param tNode The node for which you'd like an ElementRef
 * @param lView The view to which the node belongs
 * @returns The ElementRef instance to use
 */
export function createElementRef(tNode: TNode, lView: LView): ElementRef {
    return new ElementRef(getNativeByTNode(tNode, lView) as IElement);
}

/**
 * Unwraps `ElementRef` and return the `nativeElement`.
 *
 * @param value value to unwrap
 * @returns `nativeElement` if `ElementRef` otherwise returns value as is.
 */
export function unwrapElementRef<T, R>(value: T | ElementRef<R>): T | R {
    return value instanceof ElementRef ? value.nativeElement : value;
}
