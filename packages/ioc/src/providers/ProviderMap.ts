import { isToken, isFunction, isUndefined, isObject } from '../utils';
import { Token, InstanceFactory, SymbolType, Factory, Type } from '../types';
import { IIocContainer } from '../IIocContainer';
import { InjectToken } from '../InjectToken';
import { IResolverContainer, IResolver } from '../IResolver';
import { ProviderTypes, ParamProviders } from './types';

// use core-js in browser.

export const ProviderMapToken = new InjectToken<ProviderMap>('DI_ProviderMap');

/**
 * Provider Map.
 *
 * note: object map provider can not resolve token.
 *
 * @export
 * @class Providers
 */
export class ProviderMap extends Map<Token<any> | number, InstanceFactory<any>> implements IResolverContainer {

    constructor(private container: IIocContainer) {
        super();
    }

    /**
     * has provide or not.
     *
     * @param {(Token<any> | number)} provide
     * @returns {boolean}
     * @memberof ProviderMap
     */
    has(provide: Token<any> | number): boolean {
        return this.has(this.getTokenKey(provide));
    }

    provides(): Token<any>[] {
        return Array.from(this.keys()).filter(k => isToken(k)) as Token<any>[];
    }

    /**
     * get token key.
     *
     * @param {(Token<any> | number)} token
     * @returns {(SymbolType<any> | number)}
     * @memberof ProviderMap
     */
    getTokenKey(token: Token<any> | number): SymbolType<any> | number {
        if (isToken(token)) {
            return this.container.getTokenKey(token);
        }
        return token;
    }

    /**
     * get token factory.
     *
     * @template T
     * @param {(Token<T> | number)} provide
     * @returns {InstanceFactory<T>}
     * @memberof ProviderMap
     */
    get<T>(provide: Token<T> | number): InstanceFactory<T> {
        return this.get(this.getTokenKey(provide));
    }

    getTokenProvider<T>(token: Token<T>): Type<T> {
        return this.container.getTokenProvider(token);
    }

    unregister<T>(token: Token<T>): this {
        let key = this.getTokenKey(token);
        if (this.has(key)) {
            this.delete(key);
        }
        return this;
    }

    /**
     * add and bind token provider.
     *
     * @template T
     * @param {(Token<T> | number)} provide
     * @param {(Token<T> | Factory<T>)} provider
     * @returns {this}
     * @memberof ProviderMap
     */
    add<T>(provide: Token<T> | number, provider: Token<T> | Factory<T>): this {
        let key = this.getTokenKey(provide);
        if (isUndefined(key)) {
            return this;
        }
        let factory;
        if (isToken(provider) && this.container.has(provider)) {
            factory = (...providers: ProviderTypes[]) => {
                return this.container.resolve(provider, ...providers);
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
            this.set(key, factory);
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
    resolve<T>(provide: Token<T> | number, ...providers: ParamProviders[]): T {
        let key = this.getTokenKey(provide);
        if (this.has(key)) {
            let provider = this.get(key);
            return isFunction(provider) ? provider(...providers) : null;
        }
        return null;
    }

    iterator(callbackfn: (fac: InstanceFactory<any>, tk: Token<any>, resolvor?: IResolver) => void | boolean): void | boolean {
        return !Array.from(this.keys()).some(tk => {
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
        this.forEach((fac, key) => {
            this.set(key, fac);
        });
        return this;
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
