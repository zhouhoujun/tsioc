import { isToken, isFunction, isUndefined, isObject, isNumber, MapBase } from '../utils';
import { Token, InstanceFactory, SymbolType, Factory, Type } from '../types';
import { IContainer, ResoveWay } from '../IContainer';
import { InjectToken } from '../InjectToken';
import { IResolver, IResolverContainer } from '../IResolver';
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
export class ProviderMap extends MapBase<Token<any> | number, InstanceFactory<any>> implements IResolverContainer {

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
    has(provide: Token<any> | number): boolean {
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

    getTokenImpl<T>(token: Token<T>, resway?: ResoveWay): Type<T> {
        return this.container.getTokenImpl(token, resway);
    }

    unregister<T>(token: Token<T>, resway?: ResoveWay): this {
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
    resolve<T>(provide: Token<T> | number, resway?: ResoveWay | ParamProviders, ...providers: ParamProviders[]): T {
        let key = this.getTokenKey(provide);
        let way: ResoveWay;
        if (isNumber(resway)) {
            way = resway;
        } else {
            if (resway) {
                providers.unshift(resway);
            }
            way = ResoveWay.current;
        }
        if ((way & ResoveWay.current) && this.map.has(key)) {
            let provider = this.map.get(key);
            return isFunction(provider) ? provider(...providers) : null;
        }
        return null;
    }

    forEach(callbackfn: (tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void): void {
        this.map.forEach((fac, key) => {
            !isNumber(key) && callbackfn(key, fac, this);
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
        this.map.forEach((fac, key) => {
            this.map.set(key, fac);
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
