import { Token, Factory, SymbolType } from './types';
import { IInjector } from './IInjector';
import { IIocContainer, ContainerFactory } from './IIocContainer';
import { BaseInjector } from './BaseInjector';
import { ProviderTypes } from './providers/types';

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

    constructor(private factory: ContainerFactory) {
        super();
    }

    getFactory<T extends IIocContainer>(): ContainerFactory<T> {
        return this.factory as ContainerFactory<T>;
    }

    getContainer<T extends IIocContainer>(): T {
        return this.factory() as T;
    }

    protected tryGetInRoot<T>(key: SymbolType<T>, providers: ProviderTypes[]): T {
        return this.getContainer().getInstance(key, ...providers);
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

}

export const ProviderMap = Injector;


