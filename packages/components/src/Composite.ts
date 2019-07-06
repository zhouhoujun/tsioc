import { isString, Express, isFunction } from '@tsdi/ioc';
import { ModuleConfigure } from '@tsdi/boot';

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
    traverseLast,

}

/**
 * composite for component layout.
 *
 * @export
 * @class Composite
 * @template T
 */
export class Composite<T = any> {

    parent: Composite<T>;
    children: Composite<T>[];

    constructor(public node: T, public annoation: ModuleConfigure, public selector?: string) {
        this.children = [];
    }

    add(node: Composite<T>): this {
        node.parent = this;
        this.children.push(node);
        return this;

    }

    remove(node?: string | Composite<T>): this {
        let component: Composite<T>;
        if (isString(node)) {
            component = this.find(cmp => isString(node) ? cmp.selector === node : cmp.equals(node));
        } else if (node) {
            component = node;
        } else {
            component = this;
        }

        if (!component.parent) {
            return this;
        } else if (this.equals(component.parent)) {
            this.children.splice(this.children.indexOf(component), 1);
            component.parent = null;
            return this;
        } else {
            component.parent.remove(component);
            return this;
        }
    }

    find<Tc extends Composite<T>>(express: Tc | Express<Tc, boolean>, mode?: Mode): Tc {
        let component: Tc;
        this.each<Tc>(item => {
            if (component) {
                return false;
            }
            let isFinded = isFunction(express) ? express(item) : this.equals(express, item);
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return component as Tc;
    }

    filter<Tc extends Composite<T>>(express: Express<Tc, boolean | void>, mode?: Mode): Tc[] {
        let nodes: Composite<T>[] = [];
        this.each<Tc>(item => {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes as Tc[];
    }

    each<Tc extends Composite<T>>(express: Express<Tc, boolean | void>, mode?: Mode) {
        mode = mode || Mode.traverse;
        let r;
        switch (mode) {
            case Mode.route:
                r = this.routeUp(express);
                break;
            case Mode.children:
                r = this.eachChildren(express);
                break;

            case Mode.traverse:
                r = this.trans(express);
                break;
            case Mode.traverseLast:
                r = this.transAfter(express);
                break;
            default:
                r = this.trans(express);
                break;
        }
        return r;
    }

    protected eachChildren<Tc extends Composite<T>>(express: Express<Tc, void | boolean>) {
        this.children.some(item => {
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
    routeUp(express: Express<Composite<T>, void | boolean>) {
        if (express(this) === false) {
            return false;
        };
        if (this.parent && this.parent.routeUp) {
            return this.parent.routeUp(express);
        }
    }
    /**
     *translate all sub context to do express work.
     *
     *@param {Express<IComponent, void | boolean>} express
     *
     *@memberOf IComponent
     */
    trans(express: Express<Composite<T>, void | boolean>) {
        if (express(this) === false) {
            return false;
        }
        let children = this.children || [];
        for (let i = 0; i < children.length; i++) {
            let result = children[i].trans(express);
            if (result === false) {
                return result;
            }
        }
        return true;
    }

    transAfter(express: Express<Composite<T>, void | boolean>) {
        let children = this.children || []
        for (let i = 0; i < children.length; i++) {
            let result = children[i].transAfter(express);
            if (result === false) {
                return false;
            }
        }

        if (express(this) === false) {
            return false;
        }
        return true;
    }

    equals(node: Composite<T>, node2?: Composite<T>): boolean {
        return node === (node2 || this);
    }

}

