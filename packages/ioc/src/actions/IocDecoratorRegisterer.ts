import { isString, isClass, lang, isFunction } from '../utils';
import { IIocContainer } from '../IIocContainer';
import { IocAction, IocActionType } from './Action';

/**
 * decorator action registerer.
 *
 * @export
 * @class IocDecoratorRegisterer
 * @extends {IocCoreService}
 */
export abstract class DecoratorRegisterer<T> {
    protected actionMap: Map<string, T[]>;
    protected funcs: Map<string, Function[]>;
    constructor() {
        this.actionMap = new Map();
        this.funcs = new Map();
    }

    get size(): number {
        return this.actionMap.size;
    }

    getActions(): Map<string, T[]> {
        return this.actionMap;
    }

    getDecorators(): string[] {
        return Array.from(this.actionMap.keys());
    }

    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...T[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, ...actions: T[]): this {
        let dec = this.getKey(decorator);
        this.funcs.delete(dec);
        if (this.actionMap.has(dec)) {
            this.actionMap.get(dec).concat(actions);
        } else {
            this.actionMap.set(dec, actions);
        }
        return this;
    }

    has(decorator: string | Function, action?: T): boolean {
        let dec = this.getKey(decorator);
        let has = this.actionMap.has(dec);
        if (has && action) {
            return this.actionMap.get(dec).indexOf(action) >= 0;
        }
        return has;
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    get(decorator: string | Function): T[] {
        let dec = this.getKey(decorator);
        if (this.actionMap.has(dec)) {
            return this.actionMap.get(dec);
        }
        return [];
    }


    getFuncs(container: IIocContainer, decorator: string | Function) {
        let dec = this.getKey(decorator);
        if (!this.funcs.has(dec)) {
            this.funcs.set(dec, this.get(dec).map(a => this.toFunc(container, a)).filter(c => c));
        }
        return this.funcs.get(dec) || [];
    }

    abstract toFunc(container: IIocContainer, action: T): Function;

}

export class IocSyncDecoratorRegisterer<T> extends DecoratorRegisterer<T> {

    getFuncs(container: IIocContainer, decorator: string | Function): lang.IAction<any>[] {
        return super.getFuncs(container, decorator) as lang.IAction<any>[];
    }

    toFunc(container: IIocContainer, ac: T): Function {
        if (isClass(ac)) {
            let action = container.getActionRegisterer().get(ac);
            return action instanceof IocAction ? action.toAction() : null;
        } if (ac instanceof IocAction) {
            return ac.toAction()
        }
        return isFunction(ac) ? ac : null;
    }
}

/**
 * ioc decorator registerer.
 *
 * @export
 * @class IocDecoratorRegisterer
 * @extends {DecoratorRegisterer<IocActionType>}
 */
export class IocDecoratorRegisterer extends IocSyncDecoratorRegisterer<IocActionType> {

}
