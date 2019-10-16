import { isString, lang } from '../utils';
import { IocDecoratorRegisterer, DecoratorRegisterer } from './IocDecoratorRegisterer';
import { Registration } from '../Registration';
import { IIocContainer } from '../IIocContainer';
import { IocActionType, IocAction } from './Action';
import { IocCoreService } from '../IocCoreService';
import { Token, ClassType } from '../types';
import { TypeReflects } from '../services/TypeReflects';


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
export abstract class DecoratorScopeRegisterer<T = IocAction, TAction = lang.IAction> extends IocCoreService {
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
 * @extends {DecoratorScopeRegisterer}
 */
export class DesignRegisterer extends DecoratorScopeRegisterer {
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
 * @extends {DecoratorScopeRegisterer}
 */
export class RuntimeRegisterer extends DecoratorScopeRegisterer {
    protected createRegister(): DecoratorRegisterer {
        return new IocDecoratorRegisterer() as DecoratorRegisterer;
    }
}
export const RuntimeDecoratorRegisterer = RuntimeRegisterer;

/**
 * type decorators.
 *
 * @export
 * @abstract
 * @class TypeDecorators
 */
export abstract class TypeDecorators {
    constructor(protected type: ClassType, protected reflects: TypeReflects, protected register: DecoratorScopeRegisterer) {
    }

    private _clsDecors: any[];
    get classDecors(): string[] {
        if (!this._clsDecors) {
            this._clsDecors = this.register.getRegisterer(DecoratorScopes.Class)
                .getDecorators()
                .filter(d => this.reflects.hasMetadata(d, this.type))
        }
        return this._clsDecors;
    }

    private _prsDecors: any[];
    get propsDecors(): string[] {
        if (!this._prsDecors) {
            this._prsDecors = this.register.getRegisterer(DecoratorScopes.Property)
                .getDecorators()
                .filter(d => this.reflects.hasPropertyMetadata(d, this.type))
        }
        return this._prsDecors;
    }

    private _mthDecors: any[];
    get methodDecors(): string[] {
        if (!this._mthDecors) {
            this._mthDecors = this.register.getRegisterer(DecoratorScopes.Method)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type))
        }
        return this._mthDecors;
    }
}
