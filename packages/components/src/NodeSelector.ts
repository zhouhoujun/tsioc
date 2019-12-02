import { Express, isFunction, isBoolean, Abstract } from '@tsdi/ioc';


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
@Abstract()
export abstract class NodeSelector<T = any> {
    constructor(protected node: T) {

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


    protected eachChildren<Tc extends T>(node: T, express: Express<Tc, void | boolean>) {
        this.getChildren(node).some(item => express(item as Tc) === false);
    }

    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    routeUp(node: T, express: Express<T, void | boolean>) {
        if (express(node) === false) {
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
    trans(node: T, express: Express<T, void | boolean>) {
        if (express(node) === false) {
            return false;
        }
        let children = this.getChildren(node);

        if (children.some(r => this.trans(r, express) === false)) {
            return false;
        }

        return true;
    }

    transAfter(node: T, express: Express<T, void | boolean>) {
        let children = this.getChildren(node);
        if (children.some(r => this.transAfter(r, express) === false)) {
            return false;
        }
        if (express(node) === false) {
            return false;
        }
        return true;
    }

    protected abstract getParent(node: T): T;

    protected abstract getChildren(node: T): T[];
}


export class NullSelector<T = any> extends NodeSelector<T> {
    protected getParent(node: T): T {
        return null
    }

    protected getChildren(node: T): T[] {
        return [];
    }
}

