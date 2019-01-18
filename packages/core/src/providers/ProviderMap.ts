import { isToken, isFunction, isUndefined, isObject, MapSet } from '../utils';
import { Token, InstanceFactory, SymbolType, Factory, ToInstance } from '../types';
import { IContainer } from '../IContainer';
import { InjectToken } from '../InjectToken';
import { IResolver } from '../IResolver';
import { ProviderTypes } from './types';

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
export class ProviderMap extends MapSet<Token<any> | number, InstanceFactory<any>> implements IResolver {

    constructor(private container: IContainer) {
        super();
    }

    /**
     * has provide or not.
     *
     * @param {(Token<any> | number)} provide
     * @returns {boolean}
     * @memberof ProviderMap
     */
    hasRegister(provide: Token<any> | number): boolean {
        return this.map.has(this.getTokenKey(provide));
    }

    provides(): Token<any>[] {
        return this.keys().filter(k => isToken(k)) as Token<any>[];
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
        return this.map.get(this.getTokenKey(provide));
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
                factory = (...providers: ProviderTypes[]) => {
                    return (<ToInstance<any>>provider)(this.container, ...providers);
                };
            } else {
                factory = () => {
                    return provider;
                };
            }
        }
        this.map.set(key, factory);
        return this;
    }

    /**
     * remove provide token.
     *
     * @template T
     * @param {(Token<T> | number)} provide
     * @returns {this}
     * @memberof ProviderMap
     */
    remove<T>(provide: Token<T> | number): this {
        let key = this.getTokenKey(provide);
        if (this.map.has(key)) {
            this.map.delete(key);
        }
        return this;
    }

    /**
     * resolve instance via provide token.
     *
     * @template T
     * @param {(Token<T> | number)} provide
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof ProviderMap
     */
    resolve<T>(provide: Token<T> | number, ...providers: ProviderTypes[]): T {
        let key = this.getTokenKey(provide);
        if (this.map.has(key)) {
            let provider = this.map.get(key);
            return isFunction(provider) ? provider(...providers) : null;
        }
        return null;
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
        map.forEach((val, token) => {
            this.map.set(token, val);
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
