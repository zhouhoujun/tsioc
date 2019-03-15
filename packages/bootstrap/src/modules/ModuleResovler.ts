import {
    Token, Type, ParamProviders, isToken,
    IResolver, IResolverContainer, InstanceFactory, IocActionContext,
    ResovleActionContext, SymbolType
} from '@ts-ioc/ioc';
import { ModuleConfig } from './ModuleConfigure';
import { IContainer } from '@ts-ioc/core';
import { DIModuleExports } from '../services';


/**
 * injected module.
 *
 * @export
 * @class InjectedModule
 * @template T
 */
export class ModuleResovler<T> implements IResolverContainer {

    constructor(
        public token: Token<T>,
        public config: ModuleConfig<T>,
        public container: IContainer,
        public type?: Type<any>,
        public exports?: IResolverContainer
    ) {

    }

    getProviderMap(): IResolverContainer {
        if (!this.exports) {
            this.exports = this.container;
        }
        return this.exports;
    }

    get size(): number {
        return this.getProviderMap().size;
    }

    bindActionContext<T extends IocActionContext>(ctx: T): T {
        this.getProviderMap().bindActionContext(ctx);
        return ctx;
    }

    contextResolve<T extends ResovleActionContext>(ctx: T): T {
        this.bindActionContext(ctx);
        let resolver = this.getProviderMap();
        resolver.contextResolve(ctx);
        if (!ctx.instance) {
            this.container.resolveToken(DIModuleExports).contextResolve(ctx);
        }
        return ctx;
    }

    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        return this.container.getTokenKey(token, alias);
    }

    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let pdr = this.getProviderMap();
        if (pdr && pdr.has(token)) {
            return pdr.resolve(token, ...providers);
        } else {
            this.container.resolveToken(DIModuleExports).resolve(token, ...providers);
        }
        return null;
    }

    has<T>(token: Token<T>, alias?: string): boolean {
        let key = this.container.getTokenKey(token, alias);
        let pdr = this.getProviderMap();
        if (pdr && pdr.has(key)) {
            return true
        }
        return false;
    }

    getTokenProvider<T>(token: Token<T>): Type<T> {
        return this.container.getTokenProvider(token);
    }

    iterator(callbackfn: (fac: InstanceFactory<any>, tk: Token<any>, resolvor?: IResolver) => boolean | void): boolean | void {
        let pdr = this.getProviderMap();

        if (pdr.iterator((fac, tk) => {
            if (isToken(tk)) {
                return callbackfn(fac, fac, pdr);
            }
        }) === false) {
            return false;
        }
    }

    unregister<T>(token: Token<T>): this {
        this.getProviderMap().unregister(token);
        this.container.unregister(token);
        return this;
    }
}
