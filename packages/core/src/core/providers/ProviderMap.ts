import { MapSet, isToken, isNumber, isFunction, isUndefined, isObject } from '../../utils';
import { Token, Factory, ProviderTypes, ToInstance, Express2, SymbolType } from '../../types';
import { IContainer } from '../../IContainer';
import { InjectToken } from '../../InjectToken';

export const ProviderMapToken = new InjectToken<ProviderMap>('DI_ProviderMap');

/**
 * Provider Map.
 *
 * note: object map provider can not resolve token.
 *
 * @export
 * @class Providers
 */
export class ProviderMap {
    private maps: MapSet<Token<any> | number, Factory<any>>;
    constructor(private container: IContainer) {
        this.maps = new MapSet();
    }

    /**
     * provider map keys.
     *
     * @returns {Token<any>[]}
     * @memberof ProviderMap
     */
    keys(): Token<any>[] {
        return this.maps.keys() as Token<any>[];
    }

    /**
     * provider map values.
     *
     * @returns {Factory<any>[]}
     * @memberof ProviderMap
     */
    values(): Factory<any>[] {
        return this.maps.values();
    }

    /**
     * has provide or not.
     *
     * @param {(Token<any> | number)} provide
     * @returns {boolean}
     * @memberof ProviderMap
     */
    has(provide: Token<any> | number): boolean {
        return this.maps.has(this.getTokenKey(provide));
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
     * @returns {(Token<T> | Factory<T>)}
     * @memberof ProviderMap
     */
    get<T>(provide: Token<T> | number): Token<T> | Factory<T> {
        return this.maps.get(this.getTokenKey(provide));
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
        this.maps.set(key, factory);
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
        if (this.maps.has(key)) {
            this.maps.delete(key);
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
        if (this.maps.has(key)) {
            let provider = this.maps.get(key);
            return isToken(provider) ? this.container.resolve(provider, ...providers) : provider(...providers);
        } else {
            return (!isNumber(key) && this.container.has(key)) ? this.container.resolve(key, ...providers) : null;
        }
    }

    /**
     * iterator each provide and instance of provide.
     *
     * @param {(Express2<Factory<any>, Token<any> | number, void | boolean>)} express
     * @memberof ProviderMap
     */
    forEach(express: Express2<Factory<any>, Token<any> | number, void | boolean>) {
        this.maps.forEach(express);
    }

    /**
     * copy provider map.
     *
     * @param {ProviderMap} map
     * @returns
     * @memberof ProviderMap
     */
    copy(map: ProviderMap) {
        if (!map) {
            return;
        }
        map.forEach((val, token) => {
            this.maps.set(token, val);
        });
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
