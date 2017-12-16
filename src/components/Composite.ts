
import { Mode, Express } from '../types';
import { NullComponent, NullNode } from './NullComponent';
import { IComponent } from './IComponent';
import { isString } from 'util';
import { isFunction } from '../utils';

/**
 * compoiste.
 *
 * @export
 * @class Composite
 * @implements {IComponent}
 */
export class Composite implements IComponent {

    parent: IComponent;
    protected children: IComponent[];
    constructor(public name: string) {
        this.children = [];
    }

    add(node: IComponent): IComponent {
        node.parent = this;
        this.children.push(node);
        return this;

    }
    remove(node?: string | IComponent): IComponent {
        let component: IComponent;
        if (isString(node)) {
            component = this.find(cmp => isString(node) ? cmp.name === node : cmp.equals(node));
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
            return component.parent;
        }
    }

    find<T extends IComponent>(express: T | Express<T, boolean>, mode?: Mode): T {
        let component: IComponent;
        this.each<T>(item => {
            if (component) {
                return false;
            }
            let isFinded = isFunction(express) ? express(item) : (<IComponent>express) === item;
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return (component || this.empty()) as T;
    }
    filter<T extends IComponent>(express: Express<T, boolean | void>, mode?: Mode): T[] {
        let nodes: IComponent[] = [];
        this.each<T>(item => {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes as T[];
    }
    each<T extends IComponent>(express: Express<T, boolean | void>, mode?: Mode) {
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

    eachChildren<T extends IComponent>(express: Express<T, void | boolean>) {
        (this.children || []).forEach(item => {
            return express(item as T);
        });
    }

    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    routeUp(express: Express<IComponent, void | boolean>) {
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
    trans(express: Express<IComponent, void | boolean>) {
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

    transAfter(express: Express<IComponent, void | boolean>) {
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

    equals(node: IComponent): boolean {
        return this === node;
    }

    empty() {
        return NullNode;
    }

    isEmpty(): boolean {
        return this.equals(this.empty());
    }
}
