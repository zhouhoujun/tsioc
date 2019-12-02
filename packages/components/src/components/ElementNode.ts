import { Component, Input } from '../decorators';

/**
 * Element node.
 *
 * @export
 * @class ElementNode
 * @extends {CompositeNode}
 */
@Component()
export class ElementNode {
    /**
     * element id.
     *
     * @type {string}
     * @memberof ElementNode
     */
    @Input() id: string;
    /**
     * element selector.
     *
     * @type {string}
     * @memberof ElementNode
     */
    @Input() selector: string;
    /**
     * the name of element.
     *
     * @type {string}
     * @memberof ElementNode
     */
    @Input() name: string;


    /**
     * is equals or not.
     *
     * @param {ElementNode} node
     * @param {ElementNode} [node2]
     * @returns {boolean}
     * @memberof ElementNode
     */
    equals(node: ElementNode, node2?: ElementNode): boolean {
        return node === (node2 || this);
    }
}
