
import { Mode, Express } from '../types';
import { NullComponent, NullNode } from './NullComponent';
import { IComponent } from './IComponent';
import { isString } from 'util';
import { isFunction } from '../utils';


export class ActionComposite implements IComponent {


    parent: IComponent;
    protected children: IComponent[];
    constructor(public name: string) {
        this.children = [];
    }

    add(action: IComponent): IComponent {
        action.parent = this;
        this.children.push(action);
        return this;

    }
    remove(action: string | IComponent): IComponent {
        return this;
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
        return (component || NullNode) as T;
    }
    filter<T extends IComponent>(express: Express<T, boolean | void>, mode?: Mode): T[] {
        let actions: IComponent[] = [];
        this.each<T>(item => {
            if (express(item)) {
                actions.push(item);
            }
        }, mode);
        return actions as T[];
    }
    each<T extends IComponent>(express: Express<T, boolean | void>, mode?: Mode) {
        mode = mode || Mode.traverse;
        let r;
        switch (mode) {
            case Mode.route:
                r = this.route(express);
                break;
            case Mode.children:
                r = this.eachChildren(express);
                break;

            case Mode.traverse:
                r = this.trans(express);
                break;
            default:
                r = this.trans(express);
                break;
        }
        return r;
    }

    eachChildren(express: Express<IComponent, void | boolean>) {
        (this.children || []).forEach(item => {
            return express(item);
        });
    }

    /**
     *do express work in routing.
     *
     *@param {Express<IComponent, void | boolean>} express
     *
     *@memberOf IComponent
     */
    route(express: Express<IComponent, void | boolean>) {
        if (express(this) === false) {
            return false;
        };
        if (this.parent && this.parent.route) {
            return this.parent.route(express);
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
        (this.children || []).forEach(item => {
            return item.trans(express);
        });
        return true;
    }
}
