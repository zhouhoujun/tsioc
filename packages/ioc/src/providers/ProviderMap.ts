import { isToken, isFunction, isUndefined, isObject } from '../utils';
import { Token, InstanceFactory, SymbolType, Factory, Type } from '../types';
import { IIocContainer, ContainerFactory } from '../IIocContainer';
import { IResolver, IResolverContainer } from '../IResolver';
import { ProviderTypes } from './types';
import { IocCoreService } from '../IocCoreService';

// use core-js in browser.

/**
 * Provider Map.
 *
 * note: object map provider can not resolve token.
 *
 * @export
 * @class Providers
 */
export class ProviderMap extends IocCoreService implements IResolverContainer {

    private containerFac: ContainerFactory;

    protected map: Map<Token, InstanceFactory>;
    constructor(container: IIocContainer | ContainerFactory) {
        super()
        this.setContainer(container);
        this.map = new Map();
    }

    get size(): number {
        return this.map.size;
    }

    getFactory<T extends IIocContainer>(): ContainerFactory<T> {
        return this.containerFac as ContainerFactory<T>;
    }

    getContainer(): IIocContainer {
        return this.containerFac();
    }

    hasContainer(): boolean {
        return isFunction(this.containerFac);
    }

    setContainer(container: IIocContainer | ContainerFactory) {
        if (!container) {
            return;
        }
        this.containerFac = isFunction(container) ? container : container.getFactory();
    }

    keys(): Token[] {
        return Array.from(this.map.keys());
    }

    values(): InstanceFactory[] {
        return Array.from(this.map.values());
    }

    /**
     * has provide or not.
     *
     * @param {Token} provide
     * @returns {boolean}
     * @memberof ProviderMap
     */
    has(provide: Token): boolean {
        return this.map.has(this.getTokenKey(provide));
    }

    provides(): Token[] {
        return this.keys()
    }

    /**
     * get token key.
     *
     * @param {Token} token
     * @returns {SymbolType)}
     * @memberof ProviderMap
     */
    getTokenKey(token: Token): SymbolType {
        return this.getContainer().getTokenKey(token);
    }

    /**
     * get token factory.
     *
     * @template T
     * @param {Token<T>} provide
     * @returns {InstanceFactory<T>}
     * @memberof ProviderMap
     */
    get<T>(provide: Token<T>): InstanceFactory<T> {
        return this.map.get(this.getTokenKey(provide));
    }

    /**
     * get token provider.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof ProviderMap
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        return this.getContainer().getTokenProvider(token);
    }

    /**
     * unregister.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof ProviderMap
     */
    unregister<T>(token: Token<T>): this {
        let key = this.getTokenKey(token);
        if (this.map.has(key)) {
            this.map.delete(key);
        }
        return this;
    }

    /**
     * add and bind token provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {(Token<T> | Factory<T>)} provider
     * @returns {this}
     * @memberof ProviderMap
     */
    add<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this {
        this.map.set(this.getTokenKey(provide), () => provider);
        return this;
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {(Token<T> | Factory<T>)} provider
     * @returns {this}
     * @memberof ProviderMap
     */
    register<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this {
        let key = this.getTokenKey(provide);
        if (isUndefined(key)) {
            return this;
        }
        let factory;
        if (isToken(provider) && this.getContainer().has(provider)) {
            factory = (...providers: ProviderTypes[]) => {
                return this.getContainer().resolve(provider, ...providers);
            };
        } else {
            if (isFunction(provider)) {
                factory = provider;
            } else {
                factory = () => {
                    return provider;
                };
            }
        }
        if (factory) {
            this.map.set(key, factory);
        }
        return this;
    }

    /**
     * resolve instance via provide token.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof ProviderMap
     */
    resolve<T>(provide: Token<T>, ...providers: ProviderTypes[]): T {
        let key = this.getTokenKey(provide);
        if (this.has(key)) {
            let provider = this.get(key);
            return isFunction(provider) ? provider(...providers) : null;
        }
        return null;
    }

    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IResolver) => void | boolean): void | boolean {
        return !this.keys().some(tk => {
            if (isToken(tk)) {
                return callbackfn(this.get(tk), tk, this) === false;
            }
            return false;
        });
    }

    /**
     * copy provider map.
     *
     * @param {ProviderMap} map
     * @returns
     * @memberof ProviderMap
     */
    copy(map: ProviderMap): this {
        if (!map) {
            return this;
        }
        map.iterator((fac, key) => {
            this.map.set(key, fac);
        });
        return this;
    }

    clone() {
        let newpdr = new ProviderMap(this.getContainer());
        this.map.forEach((fac, key) => {
            newpdr.map.set(key, fac);
        });
        return newpdr;
    }
}



/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is ProviderMap}
 */
export function isProviderMap(target: object): target is ProviderMap {
    if (!isObject(target)) {
        return false;
    }
    return target instanceof ProviderMap;
}
