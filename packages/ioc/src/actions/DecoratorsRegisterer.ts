import { isString, lang, isArray } from '../utils/lang';
import { Registration } from '../Registration';
import { IocCoreService } from '../IocCoreService';
import { Action, IActionInjector } from './Action';
import { Token, Type } from '../types';
import { IocDecoratorRegisterer, DecoratorRegisterer } from './DecoratorRegisterer';

/**
 * decorator scopes.
 *
 * @export
 * @enum {number}
 */
export enum DecoratorScopes {
    BeforeAnnoation = 'BeforeAnnoation',
    Class = 'Class',
    Parameter = 'Parameter',
    Property = 'Property',
    Method = 'Method',
    BeforeConstructor = 'BeforeConstructor',
    AfterConstructor = 'AfterConstructor',
    /**
     * annoation actions for design time.
     */
    Annoation = 'Annoation',
    /**
     * after annoation actions for design time.
     */
    AfterAnnoation = 'AfterAnnoation',

    Inject = 'Inject'
}

export interface IScopeAction {
    scope: string | DecoratorScopes,
    action: Type<Action> | Type<Action>[]
}

/**
 * decorator register.
 *
 * @export
 * @class DecoratorRegisterer
 */
export abstract class DecoratorsRegisterer<TAction extends Function = lang.Action> extends IocCoreService {
    protected map: Map<Token, any>;
    constructor(protected registerer: IActionInjector) {
        super()
        this.map = new Map();
    }

    register(decorator: string | Function, ...actions: IScopeAction[]): this;
    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...T[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, scope: string | DecoratorScopes, ...actions: Type<Action>[]): this;
    register(decorator: string | Function, scope?: any, ...actions): this {
        if (isString(scope)) {
            this.getRegisterer(scope)
                .register(decorator, ...actions);
        } else {
            actions.unshift(scope);
            let scopes: IScopeAction[] = actions as IScopeAction[];
            scopes.forEach(s => {
                this.getRegisterer(s.scope)
                    .register(decorator, ...(isArray(s.action) ? s.action : [s.action]));
            });
        }
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

    getFuncs(register: IActionInjector, decorator: string | Function, scope: string | DecoratorScopes): TAction[] {
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

