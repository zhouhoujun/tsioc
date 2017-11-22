import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { DecoratorType } from '../decorators/DecoratorType';
import { Mode, Express } from '../types';
import { NullAction } from './NullAction';
import { ActionComponent } from './ActionComponent';
import { Metadate } from '../metadatas/index';
import { IContainer } from '../IContainer';
import { isString } from 'util';
import { isFunction } from '../utils';


export class ActionComposite implements ActionComponent {

    public decorName: string;
    public decorType: DecoratorType;

    parent: ActionComponent;
    protected children: ActionComponent[];
    constructor(public name: string, decorName?: string, decorType?: DecoratorType) {
        this.decorName = decorName;
        this.decorType = decorType;
        this.children = [];
    }

    protected working(container: IContainer, data: ActionData<Metadate>) {
        // do nothing.
    }

    execute(container: IContainer, data: ActionData<Metadate>, name?: string | ActionType) {
        if (name) {
            this.find(it => it.name === (isString(name) ? name : (<ActionType>name).toString()))
                .execute(container, data);
        } else {
            this.trans(action => {
                if (action instanceof ActionComposite) {
                    action.working(container, data);
                }
            });
        }
    }

    add(action: ActionComponent): ActionComponent {
        action.decorName = this.decorName;
        action.decorType = this.decorType;
        action.parent = this;
        this.children.push(action);
        return this;

    }
    remove(action: string | ActionComponent): ActionComponent {
        return this;
    }

    find<T extends ActionComponent>(express: T | Express<T, boolean>, mode?: Mode): T {
        let component: ActionComponent;
        this.each<T>(item => {
            if (component) {
                return false;
            }
            let isFinded = isFunction(express) ? express(item) : (<ActionComponent>express) === item;
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return (component || NullAction) as T;
    }
    filter<T extends ActionComponent>(express: Express<T, boolean | void>, mode?: Mode): T[] {
        let actions: ActionComponent[] = [];
        this.each<T>(item => {
            if (express(item)) {
                actions.push(item);
            }
        }, mode);
        return actions as T[];
    }
    each<T extends ActionComponent>(express: Express<T, boolean | void>, mode?: Mode) {
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

    eachChildren(express: Express<ActionComponent, void | boolean>) {
        (this.children || []).forEach(item => {
            return express(item);
        });
    }

    /**
     *do express work in routing.
     *
     *@param {Express<ActionComponent, void | boolean>} express
     *
     *@memberOf ActionComponent
     */
    route(express: Express<ActionComponent, void | boolean>) {
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
     *@param {Express<ActionComponent, void | boolean>} express
     *
     *@memberOf ActionComponent
     */
    trans(express: Express<ActionComponent, void | boolean>) {
        if (express(this) === false) {
            return false;
        }
        (this.children || []).forEach(item => {
            return item.trans(express);
        });
        return true;
    }


}
