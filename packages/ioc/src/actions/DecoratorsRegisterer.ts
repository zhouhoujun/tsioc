import { isString, lang } from '../utils/lang';
import { Registration } from '../Registration';
import { IocCoreService } from '../IocCoreService';
import { IIocContainer } from '../IIocContainer';
import { Action } from './Action';
import { Token, Type } from '../types';
import { ActionRegisterer } from './ActionRegisterer';
import { IocDecoratorRegisterer, DecoratorRegisterer } from './DecoratorRegisterer';

/**
 * decorator scopes.
 *
 * @export
 * @enum {number}
 */
export enum DecoratorScopes {
    Class = 'Class',
    Parameter = 'Parameter',
    Property = 'Property',
    Method = 'Method',
    BeforeConstructor = 'BeforeConstructor',
    AfterConstructor = 'AfterConstructor',
    /**
     *  for design injector.
     */
    Injector = 'Injector'
}

/**
 * decorator register.
 *
 * @export
 * @class DecoratorRegisterer
 */
export abstract class DecoratorsRegisterer<TAction extends Function = lang.Action> extends IocCoreService {
    protected map: Map<Token, any>;
    constructor(protected registerer: ActionRegisterer) {
        super()
        this.map = new Map();
    }

    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...T[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, scope: string | DecoratorScopes, ...actions: Type<Action>[]): this {
        this.getRegisterer(scope)
            .register(decorator, ...actions);
        return this;
    }

    has(decorator: string | Function, scope: string | DecoratorScopes, action?: Type<Action>): boolean {
        return this.getRegisterer(scope).has(decorator, action);
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    get<T extends Action>(decorator: string | Function, scope: string | DecoratorScopes): Type<T>[] {
        return this.getRegisterer(scope).get<T>(decorator) || [];
    }

    getFuncs(register: ActionRegisterer, decorator: string | Function, scope: string | DecoratorScopes): TAction[] {
        return this.getRegisterer(scope).getFuncs(register, decorator);
    }

    setRegisterer(scope: string | DecoratorScopes, registerer: DecoratorRegisterer<TAction>) {
        let rg = this.getRegistration(scope);
        this.map.set(rg, registerer);
    }

    getRegisterer(scope: string | DecoratorScopes): DecoratorRegisterer<TAction> {
        let rg = this.getRegistration(scope);
        if (!this.map.has(rg)) {
            this.map.set(rg, this.createRegister());
        }
        return this.map.get(rg);
    }

    protected abstract createRegister(): DecoratorRegisterer<TAction>;

    protected getRegistration(scope: string | DecoratorScopes): string {
        return new Registration(DecoratorRegisterer, this.getScopeKey(scope)).toString();
    }

    protected getScopeKey(scope: string | DecoratorScopes): string {
        return scope.toString();
    }

}

/**
 * design decorator register.
 *
 * @export
 * @class DesignRegisterer
 * @extends {DecoratorsRegisterer}
 */
export class DesignRegisterer extends DecoratorsRegisterer {
    protected createRegister(): DecoratorRegisterer {
        return new IocDecoratorRegisterer() as DecoratorRegisterer;
    }
}

export const DesignDecoratorRegisterer = DesignRegisterer;

/**
 * runtiem decorator registerer.
 *
 * @export
 * @class RuntimeRegisterer
 * @extends {DecoratorsRegisterer}
 */
export class RuntimeRegisterer extends DecoratorsRegisterer {
    protected createRegister(): DecoratorRegisterer {
        return new IocDecoratorRegisterer() as DecoratorRegisterer;
    }
}
export const RuntimeDecoratorRegisterer = RuntimeRegisterer;

