import { isString, lang } from '../utils/lang';
import { IocDecoratorRegisterer, DecoratorRegisterer } from './DecoratorRegisterer';
import { Registration } from '../Registration';
import { IIocContainer } from '../IIocContainer';
import { IocActionType, IocAction } from './Action';
import { IocCoreService } from '../IocCoreService';
import { Token } from '../types';


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
export abstract class DecoratorsRegisterer<T = IocAction, TAction = lang.IAction> extends IocCoreService {
    protected map: Map<Token, any>;
    constructor(protected container: IIocContainer) {
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
    register<Type extends T>(decorator: string | Function, scope: string | DecoratorScopes, ...actions: IocActionType<Type, TAction>[]): this {
        this.getRegisterer(scope)
            .register(decorator, ...actions);
        return this;
    }

    has(decorator: string | Function, scope: string | DecoratorScopes, action?: IocActionType<T, TAction>): boolean {
        return this.getRegisterer(scope).has(decorator, action);
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    get<Type extends T>(decorator: string | Function, scope: string | DecoratorScopes): IocActionType<Type, TAction>[] {
        return this.getRegisterer(scope).get<Type>(decorator) || [];
    }

    getFuncs(container: IIocContainer, decorator: string | Function, scope: string | DecoratorScopes): TAction[] {
        return this.getRegisterer(scope).getFuncs(container, decorator);
    }

    setRegisterer(scope: string | DecoratorScopes, registerer: DecoratorRegisterer<T, TAction>) {
        let rg = this.getRegistration(scope);
        this.map.set(rg, registerer);
    }

    getRegisterer(scope: string | DecoratorScopes): DecoratorRegisterer<T, TAction> {
        let rg = this.getRegistration(scope);
        if (!this.map.has(rg)) {
            this.map.set(rg, this.createRegister());
        }
        return this.map.get(rg);
    }

    protected abstract createRegister(): DecoratorRegisterer<T, TAction>;

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

