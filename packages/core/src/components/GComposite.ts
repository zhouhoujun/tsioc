import { Mode, Express } from '../types';
import { NullNode } from './NullComponent';
import { IComponent } from './IComponent';
import { isFunction, isString } from '../utils';
import { GComponent } from './GComponent';

/**
 * generics composite
 *
 * @export
 * @class GComposite
 * @implements {GComponent<T>}
 * @template T
 */
export class GComposite<T extends IComponent> implements GComponent<T> {
    parent: T;
    protected children: T[];
    constructor(public name: string) {
        this.children = [];
    }

    add(node: T): this {
        node.parent = this as IComponent;
        this.children.push(node);
        return this;

    }

    remove(node?: string | T): this {
        let component: IComponent;
        if (isString(node)) {
            component = this.find(cmp => isString(node) ? cmp.name === node : cmp.equals(node));
        } else if (node) {
            component = node;
        } else {
            component = this as IComponent;
        }

        if (!component.parent) {
            return this;
        } else if (this.equals(component.parent as T)) {
            this.children.splice(this.children.indexOf(component as T), 1);
            component.parent = null;
            return this;
        } else {
            component.parent.remove(component);
            return null;
        }
    }

    find(express: T | Express<T, boolean>, mode?: Mode): T {
        let component: any;
        this.each(item => {
            if (component) {
                return false;
            }
            let isFinded = isFunction(express) ? express(item) : express === (item);
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return (component || this.empty()) as T;
    }

    filter(express: Express<T, void | boolean>, mode?: Mode): T[] {
        let nodes: IComponent[] = [];
        this.each(item => {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes as T[];
    }

    each(iterate: Express<T, boolean | void>, mode?: Mode) {
        mode = mode || Mode.traverse;
        let r;
        switch (mode) {
            case Mode.route:
                r = this.routeUp(iterate);
                break;
            case Mode.children:
                r = this.eachChildren(iterate);
                break;

            case Mode.traverse:
                r = this.trans(iterate);
                break;
            case Mode.traverseLast:
                r = this.transAfter(iterate);
                break;
            default:
                r = this.trans(iterate);
                break;
        }
        return r;
    }

    eachChildren(iterate: Express<T, void | boolean>) {
        (this.children || []).forEach(item => {
            return iterate(item as T);
        });
    }

    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    routeUp(iterate: Express<T, void | boolean>) {
        let curr = this as IComponent;
        if (iterate(curr as T) === false) {
            return false;
        };
        if (this.parent && this.parent.routeUp) {
            return this.parent.routeUp(iterate);
        }
    }

    /**
     *translate all sub context to do express work.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    trans(express: Express<T, void | boolean>) {
        let curr = this as IComponent;
        if (express(curr as T) === false) {
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

    transAfter(express: Express<T, void | boolean>) {
        let children = this.children || []
        for (let i = 0; i < children.length; i++) {
            let result = children[i].transAfter(express);
            if (result === false) {
                return false;
            }
        }
        let curr = this as IComponent;
        if (express(curr as T) === false) {
            return false;
        }
        return true;
    }

    equals(node: T): boolean {
        return this === node as IComponent;
    }

    empty(): T {
        return NullNode as T;
    }

    isEmpty(): boolean {
        return this.equals(this.empty() as T);
    }
}
