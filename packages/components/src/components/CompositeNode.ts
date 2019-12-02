import { isString } from '@tsdi/ioc';
import { ElementNode } from './ElementNode';


/**
 * composite for component layout.
 *
 * @export
 * @class Composite
 * @template T
 */
export class CompositeNode extends ElementNode {
    /**
     * parent node.
     *
     * @type {CompositeNode}
     * @memberof CompositeNode
     */
    $parent: CompositeNode;
    /**
     * children nodes
     *
     * @type {ElementNode[]}
     * @memberof ElementNode
     */
    children: ElementNode[];

    constructor(selector?: string) {
        super()
        this.selector = selector;
        this.children = [];
    }

    /**
     * add composite.
     *
     * @param {...CompositeNode[]} nodes
     * @returns {this}
     * @memberof CompositeNode
     */
    add(...nodes: CompositeNode[]): this {
        nodes.forEach(node => {
            node.$parent = this;
            this.children.push(node);
        });
        return this;
    }

    /**
     * remove composite.
     *
     * @param {(...(string | ElementNode)[])} nodes
     * @returns {this}
     * @memberof ElementNode
     */
    remove(...nodes: (string | ElementNode)[]): this {
        let components: ElementNode[];
        if (nodes.length) {
            components = this.getSelector().filter(cmp => nodes.some(node => isString(node) ? cmp.selector === node : cmp.equals(node)));
        } else {
            components = [this];
        }
        components.forEach(component => {
            if (component instanceof CompositeNode) {
                if (!component.$parent) {
                    return this;
                } else if (this.equals(component.$parent)) {
                    this.children.splice(this.children.indexOf(component), 1);
                    component.$parent = null;
                } else {
                    component.$parent.remove(component);
                }
            } else if (this.children.indexOf(component) >= 0) {
                this.children.splice(this.children.indexOf(component), 1);
            }
        });
        return this;
    }

    /**
     * get selector of current element.
     *
     * @returns {CompositeSelector}
     * @memberof CompositeNode
     */
    getSelector(): CompositeSelector {
        return new CompositeSelector(this);
    }

}

/**
 * composite node selector.
 *
 * @export
 * @class CompositeSelector
 */
export class CompositeSelector extends NodeSelector<ElementNode> {
    protected getParent(node: CompositeNode): CompositeNode {
        return node.$parent;
    }

    protected getChildren(node: CompositeNode): ElementNode[] {
        return node.children || [];
    }
}

