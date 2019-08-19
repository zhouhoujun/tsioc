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
    $scope: any;
    @Input() id: string;
    @Input() selector: string;
    @Input() name: string;
}
