import { Token, Factory, SymbolType, Type, InstanceFactory } from './types';
import { IInjector, IProviders, INJECTOR } from './IInjector';
import { IIocContainer, ContainerProxy } from './IIocContainer';
import { BaseInjector } from './BaseInjector';
import { InjectTypes } from './providers/types';
import { lang } from './utils/lang';

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

    constructor(private proxy: ContainerProxy) {
        super();
    }

    protected parse(...providers: InjectTypes[]): IInjector {
        return new (lang.getClass(this))(this.proxy).inject(...providers);
    }

    getContainerProxy<T extends IIocContainer>(): ContainerProxy<T> {
        return this.proxy as ContainerProxy<T>;
    }

    getContainer<T extends IIocContainer>(): T {
        return this.proxy() as T;
    }

    protected hasInRoot(key: SymbolType): boolean {
        return this.getContainer().hasTokenKey(key);
    }

    protected hasSingletonInRoot(key: SymbolType): boolean {
        return this.getContainer().hasRegisterSingleton(key);
    }

    protected tryGetFactoryInRoot<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.getContainer().getTokenFactory(key);
    }

    protected tryGetSingletonInRoot<T>(key: SymbolType<T>): T {
        return this.getContainer().getSingleton(key);
    }

    protected tryGetTokenProviderInRoot<T>(tokenKey: SymbolType<T>): Type<T> {
        return this.getContainer().getTokenProvider(tokenKey);
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
}

/**
 * context injector.
 *
 * @export
 * @class ContextInjector
 * @extends {Injector}
 */
export class InjectorProvider extends Injector implements IProviders {
    protected init() {
    }
}

/**
 * invoked providers
 */
export class InvokedProviders extends Injector implements IProviders {
    protected init() {
    }
}

