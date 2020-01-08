import { Express, isFunction, isBoolean, isArray } from '@tsdi/ioc';
import { NodeRef } from './ComponentRef';


/**
 * iterate way.
 *
 * @export
 * @enum {number}
 */
export enum Mode {
    /**
     * route up. iterate in parents.
     */
    route = 1,
    /**
     * iterate in children.
     */
    children,
    /**
     * iterate as tree map. node first
     */
    traverse,
    /**
     * iterate as tree map. node last
     */
    traverseLast
}

/**
 * node selector.
 *
 * @export
 * @abstract
 * @class NodeSelector
 * @template T
 */
export class NodeSelector<T = any> {

    constructor(protected node: NodeRef<T>) {

    }

    find<Tc extends T>(express: Tc | Express<Tc, boolean>, mode?: Mode): Tc {
        let component: Tc;
        this.each<Tc>(item => {
            if (component) {
                return false;
            }
            let isFinded = isFunction(express) ? express(item) : item === express;
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return component as Tc;
    }

    filter<Tc extends T>(express: Express<Tc, boolean | void>, mode?: Mode): Tc[] {
        let nodes: T[] = [];
        this.each<Tc>(item => {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes as Tc[];
    }

    map<Tc extends T, TR>(express: Express<Tc, TR | boolean>, mode?: Mode): TR[] {
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

    each<Tc extends T>(express: Express<Tc, boolean | void>, mode?: Mode) {
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


    protected eachChildren<Tc extends T>(node: NodeRef<T>, express: Express<Tc, void | boolean>) {
        this.getChildren(node).some(item => this.currNode(item, express) === false);
    }

    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    routeUp(node: NodeRef<T>, express: Express<T, void | boolean>) {
        if (this.currNode(node, express) === false) {
            return false;
        }
        let parentNode = this.getParent(node);
        if (parentNode) {
            return this.routeUp(parentNode, express);
        }
    }

    /**
     *translate all sub context to do express work.
     *
     *@param {Express<IComponent, void | boolean>} express
     *
     *@memberOf IComponent
     */
    trans(node: NodeRef<T>, express: Express<T, void | boolean>) {
        if (this.currNode(node, express) === false) {
            return false;
        }
        let children = this.getChildren(node);

        if (children.some(r => this.trans(r, express) === false)) {
            return false;
        }

        return true;
    }

    transAfter(node: NodeRef<T>, express: Express<T, void | boolean>) {
        let children = this.getChildren(node);
        if (children.some(r => this.transAfter(r, express) === false)) {
            return false;
        }

        if (this.currNode(node, express) === false) {
            return false;
        }
        return true;
    }

    protected currNode(node: NodeRef<T>, express: Express<T, void | boolean>): boolean {
        let roots = node.rootNodes;
        if (roots.some(n => {
            if (n instanceof NodeRef) {
                return this.currNode(n, express);
            } else if (isArray(n)) {
                return n.some(l => express(l) === false);
            }
            return express(n as T) === false
        })) {
            return false;
        }
    }

    protected getParent(node: NodeRef<T>): NodeRef<T> {

        let parent = node.context.getParent();
        if (parent && parent.has(NodeRef)) {
            return parent.get(NodeRef) as NodeRef<T>;
        }

        return null;
    }

    protected getChildren(node: NodeRef<T>): NodeRef<T>[] {
        let ctx = node.context
        if (ctx.hasChildren()) {
            return ctx.getChildren().map(c => c.get(NodeRef) as NodeRef<T>);
        }

        return [];
    }
}


export class NullSelector<T = any> extends NodeSelector<T> {
    protected getParent(node: NodeRef<T>): NodeRef<T> {
        return null
    }

    protected getChildren(node: NodeRef<T>): NodeRef<T>[] {
        return [];
    }
}

