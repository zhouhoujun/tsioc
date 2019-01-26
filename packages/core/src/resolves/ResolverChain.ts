import { Type, Token, InstanceFactory } from '../types';
import { IContainer, ResoveWay } from '../IContainer';
import { InjectToken } from '../InjectToken';
import { IResolver, IResolverContainer } from '../IResolver';
import { ParamProviders, ProviderMap, isProviderMap } from '../providers';
import { isString, isNumber, isFunction, isNullOrUndefined } from '../utils';

/**
 *  resolver chain token.
 */
export const ResolverChainToken = new InjectToken<ResolverChain>('di_ResolverChain');

/**
 * resover chain.
 *
 * resove by setp.
 *
 * @export
 * @class ResolverChain
 * @implements {IResolver}
 */
export class ResolverChain implements IResolverContainer {

    /**
     * resolvers
     *
     * @protected
     * @type {IResolver[]}
     * @memberof ResolverChain
     */
    protected resolvers: IResolver[];

    constructor(protected container: IContainer) {
        this.resolvers = [];
    }

    get size(): number {
        return this.resolvers.length + 1;
    }

    /**
     * reigister next resolver.
     *
     * @param {IResolver} resolver
     * @memberof ResolverChain
     */
    next(resolver: IResolver) {
        if (!this.hasResolver(resolver)) {
            this.resolvers.push(resolver);
        }
    }

    /**
     * resolver chain to array.
     *
     * @returns {IResolver[]}
     * @memberof ResolverChain
     */
    toArray(resway = ResoveWay.all): IResolver[] {
        if (resway & ResoveWay.nodes) {
            return [<IResolver>this.container].concat(this.resolvers);
        } else if (resway & ResoveWay.current) {
            return [this.container];
        } else if (resway & ResoveWay.traverse) {
            return this.resolvers;
        }
        return [];
    }

    /**
     * iterator all resolvers.
     *
     * @param {(tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void} callbackfn
     * @memberof ResolverChain
     */
    iterator(callbackfn: (tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void, resway = ResoveWay.all): void {
        if (resway & ResoveWay.current) {
            this.container.forEach(callbackfn);
        }
        if (resway & ResoveWay.traverse) {
            this.resolvers.forEach((r: IResolverContainer) => {
                if (isFunction(r.forEach)) {
                    r.forEach(callbackfn);
                }
            });
        }
        if (this.container.parent && (resway & ResoveWay.bubble)) {
            this.container.parent.iterator(callbackfn, resway);
        }
    }

    /**
     * has resolver or not.
     *
     * @param {IResolver} resolver
     * @returns
     * @memberof ResolverChain
     */
    hasResolver(resolver: IResolver) {
        if (resolver === this.container) {
            return true;
        }
        return this.resolvers.indexOf(resolver) >= 0;
    }

    /**
     * resove token via registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof ResolverChain
     */
    resolve<T>(token: Token<T>, resway?: ResoveWay | ParamProviders, ...providers: ParamProviders[]): T {
        let key = this.container.getTokenKey(token, isString(resway) ? resway : null);
        let way: ResoveWay;
        if (isNumber(resway)) {
            way = resway;
        } else {
            if (resway) {
                providers.unshift(resway);
            }
            way = ResoveWay.all;
        }
        let providerMap: ProviderMap;
        if (providers.length) {
            if (providers.length === 1 && isProviderMap(providers[0])) {
                providerMap = providers[0] as ProviderMap;
            } else {
                providerMap = this.container.getProviderParser().parse(...providers);
            }
        }
        if (providerMap && providerMap.has(token)) {
            return providerMap.resolve(token, providerMap);
        }

        if ((way & ResoveWay.current) && this.container.hasRegister(key)) {
            return this.container.resolveValue(key, providerMap);
        }
        if ((way & ResoveWay.traverse)) {
            let resolver = this.resolvers.find(r => r.has(key, ResoveWay.nodes));
            if (resolver) {
                return resolver.resolve(key, ResoveWay.nodes, providerMap);
            }
        }
        if (this.container.parent && (way & ResoveWay.bubble)) {
            return this.container.parent.resolve(key, ResoveWay.routeup, providerMap);
        }

        return null;
    }

    /**
     * unregister token in registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @memberof ResolverChain
     */
    unregister<T>(token: Token<T>, resway?: ResoveWay) {
        resway = resway || ResoveWay.all;
        let tokenKey = this.container.getTokenKey(token);
        if (resway & ResoveWay.current) {
            this.container.unregisterValue(tokenKey);
        }
        if (resway & ResoveWay.traverse) {
            this.resolvers.forEach((r: IResolverContainer) => {
                if (isFunction(r.unregister)) {
                    r.unregister(tokenKey, ResoveWay.nodes);
                }
            });
        }
        if ((resway & ResoveWay.bubble) && this.container.parent) {
            this.container.parent.unregister(token, ResoveWay.routeup);
        }
        return this;
    }

    /**
     * get token implements class in the registered resolver chain.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof ResolverChain
     */
    getTokenImpl<T>(token: Token<T>, resway?: ResoveWay): Type<T> {
        resway = resway || ResoveWay.nodes;
        let tokenKey = this.container.getTokenKey(token);
        let provider: Type<T>;
        if (resway & ResoveWay.current) {
            provider = this.container.getTokenProvider(tokenKey);
        }
        if (!provider && (resway & ResoveWay.traverse)) {
            this.resolvers.some((r: IResolverContainer) => {
                if (!isFunction(r.getTokenImpl)) {
                    return false;
                }
                provider = r.getTokenImpl(tokenKey, ResoveWay.nodes);
                return !!provider;
            });
        }
        if (!provider && (resway & ResoveWay.bubble) && this.container.parent) {
            provider = this.container.parent.getTokenImpl(token, ResoveWay.routeup);
        }

        return provider || null;
    }

    /**
     * has token or not in the registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @returns {boolean}
     * @memberof ResolverChain
     */
    has<T>(token: Token<T>, aliasOrway?: string | ResoveWay): boolean {
        let key = this.container.getTokenKey(token, isString(aliasOrway) ? aliasOrway : null);
        let resway = isNumber(aliasOrway) ? aliasOrway : ResoveWay.all;
        if ((resway & ResoveWay.current) && this.container.hasRegister(key)) {
            return true;
        }
        if ((resway & ResoveWay.traverse) && this.resolvers.some(r => r.has(key, ResoveWay.nodes))) {
            return true;
        }
        if ((resway & ResoveWay.bubble) && this.container.parent) {
            return this.container.parent.has(token, ResoveWay.routeup);
        }
        return false;
    }

    forEach(callbackfn: (tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void): void {
        this.container.forEach(callbackfn);
        this.resolvers.forEach((r: IResolverContainer) => {
            if (isFunction(r.forEach)) {
                r.forEach(callbackfn);
            }
        });
    }
}
