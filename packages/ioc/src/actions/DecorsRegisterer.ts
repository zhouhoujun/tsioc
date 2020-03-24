import { isString, isArray, Handler } from '../utils/lang';
import { Registration } from '../Registration';
import { IocCoreService } from '../IocCoreService';
import { Action, IActionInjector } from './Action';
import { Token, Type, DecoratorScope } from '../types';
import { IocDecorRegisterer, DecorRegisterer } from './DecorRegisterer';



export interface IScopeAction<TAction extends Function = Handler> {
    scope: DecoratorScope;
    action: TAction | Type<Action> | (TAction | Type<Action>)[];
}

/**
 * decorator register.
 *
 * @export
 * @class DecoratorRegisterer
 */
export abstract class DecorsRegisterer<TAction extends Function = Handler> extends IocCoreService {
    protected map: Map<Token, any>;
    constructor(protected registerer: IActionInjector) {
        super()
        this.map = new Map();
    }

    register(decorator: string | Function, ...actions: IScopeAction<TAction>[]): this;
    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...T[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, scope: DecoratorScope, ...actions: (TAction | Type<Action>)[]): this;
    register(decorator: string | Function, scope?: any, ...actions): this {
        if (isString(scope)) {
            this.getRegisterer(scope as DecoratorScope)
                .register(decorator, ...actions);
        } else {
            actions.unshift(scope);
            let scopes: IScopeAction<TAction>[] = actions as IScopeAction<TAction>[];
            scopes.forEach(s => {
                this.getRegisterer(s.scope)
                    .register(decorator, ...(isArray(s.action) ? s.action : [s.action]));
            });
        }
        return this;
    }


    has(decorator: string | Function, scope: DecoratorScope, action?: TAction | Type<Action>): boolean {
        return this.getRegisterer(scope).has(decorator, action);
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    get<T extends Action>(decorator: string | Function, scope: DecoratorScope): Type<T>[] {
        return this.getRegisterer(scope).get<T>(decorator) || [];
    }

    getFuncs(register: IActionInjector, decorator: string | Function, scope: DecoratorScope): TAction[] {
        return this.getRegisterer(scope).getFuncs(register, decorator);
    }

    setRegisterer(scope: DecoratorScope, registerer: DecorRegisterer<TAction>) {
        let rg = this.getRegistration(scope);
        this.map.set(rg, registerer);
    }

    getRegisterer(scope: DecoratorScope): DecorRegisterer<TAction> {
        let rg = this.getRegistration(scope);
        if (!this.map.has(rg)) {
            this.map.set(rg, this.createRegister());
        }
        return this.map.get(rg);
    }

    protected abstract createRegister(): DecorRegisterer<TAction>;

    protected getRegistration(scope: DecoratorScope): string {
        return new Registration(DecorRegisterer, this.getScopeKey(scope)).toString();
    }

    protected getScopeKey(scope: DecoratorScope): string {
        return scope.toString();
    }

}

/**
 * design decorator register.
 *
 * @export
 * @class DesignRegisterer
 * @extends {DecorsRegisterer}
 */
export class DesignRegisterer extends DecorsRegisterer {
    protected createRegister(): DecorRegisterer {
        return new IocDecorRegisterer() as DecorRegisterer;
    }
}

/**
 * runtiem decorator registerer.
 *
 * @export
 * @class RuntimeRegisterer
 * @extends {DecorsRegisterer}
 */
export class RuntimeRegisterer extends DecorsRegisterer {
    protected createRegister(): DecorRegisterer {
        return new IocDecorRegisterer() as DecorRegisterer;
    }
}

