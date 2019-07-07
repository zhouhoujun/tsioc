import { CompositeNode, Mode } from './CompositeNode';

/**
 * virtual node.
 *
 * @export
 * @class VirtualNode
 * @extends {CompositeNode}
 */
export class VirtualNode extends CompositeNode {

    constructor(public component: any, selector?: string) {
        super(selector);
    }

    getContentNode(): CompositeNode[] {
        return this.getSelector().map(it => {
            return it.getSelector().find(n => !(n instanceof VirtualNode));
        }, Mode.children)
    }
}
