import { Type } from './types';
import { lang, isClassType, isMetadataObject, isArray, isClass, isObject } from './utils/lang';
import { Token, Factory, SymbolType, Provider, InstanceFactory, isToken } from './tokens';
import { IInjector, IProvider, InjectorProxy } from './IInjector';
import { IIocContainer } from './IIocContainer';
import { BaseInjector } from './BaseInjector';
// use core-js in browser.

/**
 * Provider Map.
 *
 * note: object map provider can not resolve token.
 *
 * @export
 * @class Providers
 */
export class Injector extends BaseInjector implements IInjector {

    constructor(protected proxy: InjectorProxy<IIocContainer>) {
        super();
    }

    getContainer(): IIocContainer {
        return this.proxy();
    }

    /**
     * get token provider class type.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof BaseInjector
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        let tokenKey = this.getTokenKey(token);
        return this.getTknPdr(tokenKey) ?? this.getTknPdrInRoot(tokenKey) ?? (isClassType(tokenKey) ? tokenKey as Type<T> : null);
    }

    getTokenFactory<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.getFcty(key) ?? this.getFctyInRoot(key);
    }

    hasSingleton<T>(key: SymbolType<T>): boolean {
        return this.singletons.has(key) || this.hasSgltnRoot(key);
    }

    protected hasSgltnRoot<T>(key: SymbolType<T>) {
        return this.getContainer().hasSingleton(key)
    }

    getSingleton<T>(key: SymbolType<T>): T {
        return this.singletons.get(key) ?? this.getSgltnRoot(key);
    }

    protected getSgltnRoot<T>(key: SymbolType<T>) {
        return this.getContainer().getSingleton(key)
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param { Factory<T>} fac
     * @returns {this}
     * @memberof ProviderMap
     */
    register<T>(provide: Token<T>, fac?: Factory<T>): this {
        this.getContainer().registerFactory(this, provide, fac);
        return this;
    }

    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        this.getContainer().registerIn(this, type, provide, singleton);
        return this;
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param { Factory<T>} fac
     * @returns {this}
     * @memberof ProviderMap
     */
    registerSingleton<T>(provide: Token<T>, fac?: Factory<T>): this {
        this.getContainer().registerFactory(this, provide, fac, true);
        return this;
    }

    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean {
        if (super.iterator(callbackfn) === false) {
            return false;
        }
        if (deep) {
            return this.getContainer().iterator(callbackfn);
        }
    }

    protected parse(...providers: Provider[]): IInjector {
        return new (lang.getClass(this))(this.proxy).inject(...providers);
    }

    protected hasInRoot(key: SymbolType): boolean {
        return this.getContainer().hasTokenKey(key);
    }

    protected getFcty<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.factories.get(key) ?? null;
    }

    protected getFctyInRoot<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.getContainer().getTokenFactory(key);
    }

    protected getTknPdr<T>(tokenKey: SymbolType<T>): Type<T> {
        return this.provideTypes.get(tokenKey);
    }

    protected getTknPdrInRoot<T>(tokenKey: SymbolType<T>): Type<T> {
        return this.getContainer().getTokenProvider(tokenKey);
    }

}

/**
 * context provider.
 *
 * @export
 * @class ContextProvider
 * @extends {Injector}
 */
export class ContextProvider extends Injector implements IProvider {
    protected initReg() {
    }
}

/**
 * is provider or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Provider}
 */
export function isProvider(target: any): target is Provider {
    return target instanceof ContextProvider
        || (isMetadataObject(target, 'provide') && isToken(target.provide))
        || (isArray(target) && target.some(it => isClass(it) || (isObject(it) && Object.values(it).some(s => isClass(it)))));
}


/**
 * invoked provider
 */
export class InvokedProvider extends Injector implements IProvider {
    protected initReg() {
    }
}

