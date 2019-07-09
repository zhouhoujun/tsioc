import { isString, Express, isFunction, isBoolean } from '@tsdi/ioc';
import { Mode } from '../ComponentManager';



/**
 * composite for component layout.
 *
 * @export
 * @class Composite
 * @template T
 */
export class CompositeNode {

    parentNode: CompositeNode;
    children: CompositeNode[];

    constructor(public selector?: string) {
        this.children = [];
    }

    add(...nodes: CompositeNode[]): this {
        nodes.forEach(node => {
            node.parentNode = this;
            this.children.push(node);
        });
        return this;

    }

    remove(...nodes: (string | CompositeNode)[]): this {
        let components: CompositeNode[];
        if (nodes.length) {
            components = this.getSelector().filter(cmp => nodes.some(node => isString(node) ? cmp.selector === node : cmp.equals(node)));
        } else {
            components = [this];
        }
        components.forEach(component => {
            if (!component.parentNode) {
                return this;
            } else if (this.equals(component.parentNode)) {
                this.children.splice(this.children.indexOf(component), 1);
                component.parentNode = null;
            } else {
                component.parentNode.remove(component);
            }
        });
        return this;
    }

    equals(node: CompositeNode, node2?: CompositeNode): boolean {
        return node === (node2 || this);
    }

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
export class CompositeSelector {

    constructor(private node: CompositeNode) {

    }

    find<Tc extends CompositeNode>(express: Tc | Express<Tc, boolean>, mode?: Mode): Tc {
        let component: Tc;
        this.each<Tc>(item => {
            if (component) {
                return false;
            }
            let isFinded = isFunction(express) ? express(item) : item.equals(express);
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return component as Tc;
    }

    filter<Tc extends CompositeNode>(express: Express<Tc, boolean | void>, mode?: Mode): Tc[] {
        let nodes: CompositeNode[] = [];
        this.each<Tc>(item => {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes as Tc[];
    }

    map<Tc extends CompositeNode, TR>(express: Express<Tc, TR | boolean>, mode?: Mode): TR[] {
        let nodes: TR[] = [];
        this.each<Tc>(item => {
            let r = express(item)
            if (isBoolean(r)) {
                return r;
            } else if (r) {
                nodes.push(r);
            }
        }, mode);
        return nodes;
    }

    each<Tc extends CompositeNode>(express: Express<Tc, boolean | void>, mode?: Mode) {
        mode = mode || Mode.traverse;
        let r;
        switch (mode) {
            case Mode.route:
                r = this.routeUp(this.node, express);
                break;
            case Mode.children:
                r = this.eachChildren(this.node, express);
                break;
            case Mode.traverseLast:
                r = this.transAfter(this.node, express);
                break;

            case Mode.traverse:
            default:
                r = this.trans(this.node, express);
                break;
        }
        return r;
    }

    protected eachChildren<Tc extends CompositeNode>(node: CompositeNode, express: Express<Tc, void | boolean>) {
        node.children.some(item => {
            return express(item as Tc) === false;
        });
    }

    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    routeUp(node: CompositeNode, express: Express<CompositeNode, void | boolean>) {
        if (express(node) === false) {
            return false;
        };
        if (node.parentNode) {
            node = node.parentNode;
            return this.routeUp(node, express);
        }
    }

    /**
     *translate all sub context to do express work.
     *
     *@param {Express<IComponent, void | boolean>} express
     *
     *@memberOf IComponent
     */
    trans(node: CompositeNode, express: Express<CompositeNode, void | boolean>) {
        if (express(node) === false) {
            return false;
        }
        let children = node.children || [];
        for (let i = 0; i < children.length; i++) {
            let result = this.trans(children[i], express);
            if (result === false) {
                return result;
            }
        }
        return true;
    }

    transAfter(node: CompositeNode, express: Express<CompositeNode, void | boolean>) {
        let children = node.children;
        for (let i = 0; i < children.length; i++) {
            let result = this.transAfter(children[i], express);
            if (result === false) {
                return false;
            }
        }

        if (express(node) === false) {
            return false;
        }
        return true;
    }

}

