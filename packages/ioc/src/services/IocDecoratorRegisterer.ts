import { IocCoreService } from './IocCoreService';
import { isString, isClass, lang, isFunction } from '../utils';
import { IocActionType, IocAction } from '../actions';
import { IIocContainer } from '../IIocContainer';

/**
 * decorator action registerer.
 *
 * @export
 * @class IocDecoratorRegisterer
 * @extends {IocCoreService}
 */
export abstract class DecoratorRegisterer<T> extends IocCoreService {
    protected actionMap: Map<string, T[]>;
    protected funcs: Map<string, Function[]>;
    constructor() {
        super();
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

    has(decorator: string | Function): boolean {
        let dec = this.getKey(decorator);
        return this.actionMap.has(dec);
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
            let action = container.get(ac);
            return action instanceof IocAction ?
                (ctx: T, next?: () => void) => action.execute(ctx, next) : null;
        } if (ac instanceof IocAction) {
            return (ctx: T, next?: () => void) => ac.execute(ctx, next);
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
