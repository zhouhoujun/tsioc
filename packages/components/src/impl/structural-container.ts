import { NodeType, RNode, RElement } from '../renderer/Node';

/**
 * Whether a node is a structural-directive anchor (`v-container`).
 *
 * The `ElementContainer` flag is only assignable on virtual nodes; real DOM
 * elements keep their read-only `nodeType`, so the anchor's tag/attribute is
 * used as a fallback there.
 */
export function isStructuralContainer(node: RNode): boolean {
    if (node.nodeType & NodeType.ElementContainer) {
        return true;
    }
    const tagName = (node as RElement).tagName;
    if (typeof tagName === 'string' && tagName.toLowerCase() === 'v-container') {
        return true;
    }
    const getAttribute = (node as RElement).getAttribute;
    return typeof getAttribute === 'function' && getAttribute.call(node, 'data-v-container') !== null;
}
