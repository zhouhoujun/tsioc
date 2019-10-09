import { Component, Input } from '../decorators';
import { CompositeNode } from './CompositeNode';

/**
 * Element node.
 *
 * @export
 * @class ElementNode
 * @extends {CompositeNode}
 */
@Component()
export class ElementNode extends CompositeNode  {
    /**
     * scope of element.
     *
     * @type {*}
     * @memberof ElementNode
     */
    $scope: any;
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
}
