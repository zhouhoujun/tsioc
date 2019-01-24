import { SymbolType, Type, Token, Factory, InstanceFactory } from '../types';
import { IContainer, ResoveWay } from '../IContainer';
import { ResolverType } from './ResolverType';
import { Container } from '../Container';
import { InjectToken } from '../InjectToken';
import { IResolver } from '../IResolver';
import { ParamProviders, ProviderMap, isProviderMap } from '../providers';
import { isString, isNumber, isNull } from '../utils';
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
export class ResolverChain implements IResolver {
    /**
     * resolvers
     *
     * @protected
     * @type {ResolverType[]}
     * @memberof ResolverChain
     */
    protected resolvers: ResolverType[];

    constructor(protected container: IContainer) {
        this.resolvers = [];
    }

    /**
     * reigister next resolver.
     *
     * @param {ResolverType} resolver
     * @memberof ResolverChain
     */
    next(resolver: ResolverType) {
        if (!this.hasResolver(resolver)) {
            this.resolvers.push(resolver);
        }
    }

    /**
     * resolver chain to array.
     *
     * @returns {ResolverType[]}
     * @memberof ResolverChain
     */
    toArray(): ResolverType[] {
        return [<ResolverType>this.container].concat(this.resolvers);
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
            this.resolvers.forEach(r => {
                r.forEach(callbackfn);
            });
        }
        if (this.container.parent && (resway & ResoveWay.bubble)) {
            this.container.parent.iterator(callbackfn, resway);
        }
    }

    /**
     * has resolver or not.
     *
     * @param {ResolverType} resolver
     * @returns
     * @memberof ResolverChain
     */
    hasResolver(resolver: ResolverType) {
        if (resolver instanceof Container) {
            return this.resolvers.indexOf(resolver) >= 0;
        } else {
            return this.resolvers.some(a => {
                if (a instanceof Container) {
                    return false;
                } else {
                    if (!a.type || !resolver.type) {
                        return false;
                    }
                    return a.type === resolver.type;
                }
            });
        }
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
        if (providerMap && providerMap.has(key)) {
            return providerMap.resolve(key, providerMap);
        }
        let val: T;
        if ((way & ResoveWay.current)) {
            val = this.container.resolveValue(key, providerMap);
        }
        if (isNull(val) && (way & ResoveWay.traverse)) {
            this.resolvers.some(r => {
                val = r.resolve(key, ResoveWay.traverse, providerMap);
                return !isNull(val);
            });
        }
        if ((way & ResoveWay.bubble) && this.container.parent) {
            val = this.container.parent.resolve(key, ResoveWay.bubble | ResoveWay.current, providerMap);
        }

        return val;
    }

    /**
     * unregister token in registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @memberof ResolverChain
     */
    unregister<T>(token: SymbolType<T>) {
        let resolver = this.toArray().find(r => this.hasToken(r, token));
        if (resolver) {
            if (resolver instanceof Container) {
                resolver.unregister(token, false);
            } else {
                let idx = this.resolvers.indexOf(resolver);
                if (idx >= 0 && idx < this.resolvers.length) {
                    this.resolvers.splice(idx, 1);
                }
            }
        } else if (this.container.parent) {
            this.container.parent.unregister(token);
        }
    }

    /**
     * get token implements class in the registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @returns {Type<T>}
     * @memberof ResolverChain
     */
    getTokenImpl<T>(token: SymbolType<T>): Type<T> {
        let resolver = this.toArray().find(r => this.hasToken(r, token));
        if (resolver) {
            if (resolver instanceof Container) {
                return resolver.getTokenImpl(token, false);
            } else {
                return resolver.container.getTokenImpl(token, false);
            }
        } else if (this.container.parent) {
            return this.container.parent.getTokenImpl(token);
        } else {
            return null;
        }
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
        if ((resway & ResoveWay.traverse) && this.resolvers.some(r => r.has(key, resway))) {
            return true;
        }
        if ((resway & ResoveWay.bubble) && this.container.parent) {
            return this.container.parent.has(token);
        }
        return false;
    }
}
