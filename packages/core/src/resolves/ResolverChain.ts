import { SymbolType, Providers, Type } from '../types';
import { IContainer } from '../IContainer';
import { ResolverType } from './ResolverType';
import { Container } from '../Container';
import { isClass } from '../utils';
import { InjectToken } from '../InjectToken';
import { IResolver } from '../IResolver';


export const ResolverChainToken = new InjectToken<ResolverChain>('di_ResolverChain');

export class ResolverChain implements IResolver {

    protected resolvers: ResolverType[];
    constructor(protected container: IContainer) {
        this.resolvers = [];
    }

    next(resolver: ResolverType) {
        if (!this.hasResolver(resolver)) {
            this.resolvers.push(resolver);
        }
    }

    toArray(): ResolverType[] {
        return [<ResolverType>this.container].concat(this.resolvers);
    }

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

    hasToken<T>(resolver: ResolverType, token: SymbolType<T>): boolean {
        if (!token) {
            return false;
        }
        if (resolver instanceof Container) {
            return resolver.hasRegister(token);
        } else {
            if (resolver.type === token || this.container.getTokenKey(resolver.token) === token) {
                return true;
            }
            let exps = resolver.exports || [];
            return exps.concat(resolver.providers || []).some(t => {
                if (this.container.getTokenKey(t) === token) {
                    return true;
                } else if (!isClass(token)) {
                    if (resolver.container.hasRegister(token)) {
                        let type = resolver.container.getTokenImpl(token);
                        return exps.indexOf(type) >= 0
                    }
                }
                return false;
            });
        }
    }

    resolve<T>(token: SymbolType<T>, ...providers: Providers[]): T {
        let resolver = this.toArray().find(r => this.hasToken(r, token));
        if (!resolver && !this.container.parent) {
            console.log('have not register', token);
            return null;
        }
        if (resolver) {
            if (resolver instanceof Container) {
                return resolver.resolveValue(token, ...providers);
            } else {
                return resolver.container.resolveValue(token, ...providers);
            }
        } else {
            // if (!this.hasContainerProvider(providers)) {
            //     providers.push({ provide: ContainerToken, useValue: this.container });
            // }
            return this.container.parent.resolve(token, ...providers);
        }
    }

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

    // getTypeProvides<T>(target: Type<T>): Token<T>[] {
    //     let tokens: Token<T>[] = [];
    //     this.toArray().forEach(r => {
    //         if (tokens && tokens.length) {
    //             return false;
    //         }
    //         if (r instanceof Container) {
    //             tokens = r.getTypeProvides(target, false);
    //         } else {
    //             tokens = r.container.getTypeProvides(target, false);
    //         }
    //         return true;
    //     });

    //     if (tokens && tokens.length) {
    //         return tokens;
    //     }
    //     if (this.container.parent) {
    //         return this.container.parent.getTypeProvides(target);
    //     }
    //     return tokens;
    // }

    hasRegister<T>(token: SymbolType<T>): boolean {
        if (this.container.hasRegister(token)) {
            return true;
        }
        if (this.resolvers.length) {
            return this.resolvers.some(r => this.hasToken(r, token));
        }
        return false;
    }

    has<T>(token: SymbolType<T>): boolean {
        if (this.hasRegister(token)) {
            return true;
        }
        if (this.container.parent) {
            return this.container.parent.has(token);
        }
        return false;
    }

    // protected hasContainerProvider(providers: Providers[]): boolean {
    //     return providers.some(p => {
    //         if (p instanceof ProviderMap) {
    //             return p.has(ContainerToken);
    //         } else if (isMetadataObject(p)) {
    //             let prd = p as IProvider;
    //             return prd.provide === ContainerToken;
    //         }
    //         return false;
    //     });
    // }
}
