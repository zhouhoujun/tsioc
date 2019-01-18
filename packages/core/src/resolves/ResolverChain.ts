import { SymbolType, Type, Token, Factory } from '../types';
import { IContainer } from '../IContainer';
import { ResolverType } from './ResolverType';
import { Container } from '../Container';
import { InjectToken } from '../InjectToken';
import { IResolver } from '../IResolver';
import { ParamProviders } from '../providers';
import { isFunction } from '../utils';

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

    forEach(callbackfn: (tk: Token<any>, fac: Factory<any>, resolvor?: IResolver) => void): void {
        this.toArray().forEach(r => r.forEach(callbackfn));
        if (this.container.parent) {
            this.container.parent.forEach(callbackfn);
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
     * has token or not.
     *
     * @template T
     * @param {ResolverType} resolver
     * @param {SymbolType<T>} token
     * @returns {boolean}
     * @memberof ResolverChain
     */
    hasToken<T>(resolver: ResolverType, token: Token<T>): boolean {
        if (!token) {
            return false;
        }
        if (resolver instanceof Container) {
            return resolver.hasRegister(token);
        } else {
            if (resolver.type === token || this.container.getTokenKey(resolver.token) === token) {
                return true;
            }
            return resolver.hasRegister(token);
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
    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let resolver = this.toArray().find(r => this.hasToken(r, token));
        if (!resolver && !this.container.parent) {
            return null;
        }
        if (resolver) {
            if (resolver instanceof Container) {
                return resolver.resolveValue(token, ...providers);
            } else {
                return resolver.resolve(token, ...providers);
            }
        } else {
            return this.container.parent.resolve(token, ...providers);
        }
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
     * has register in the registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @returns {boolean}
     * @memberof ResolverChain
     */
    hasRegister<T>(token: SymbolType<T>): boolean {
        if (this.container.hasRegister(token)) {
            return true;
        }
        if (this.resolvers.length) {
            return this.resolvers.some(r => this.hasToken(r, token));
        }
        return false;
    }

    /**
     * has token or not in the registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @returns {boolean}
     * @memberof ResolverChain
     */
    has<T>(token: SymbolType<T>): boolean {
        if (this.hasRegister(token)) {
            return true;
        }
        if (this.container.parent) {
            return this.container.parent.has(token);
        }
        return false;
    }
}
