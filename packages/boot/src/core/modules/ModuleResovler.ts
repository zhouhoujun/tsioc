import {
    Token, Type, ParamProviders, isToken,
    IResolver, IResolverContainer, InstanceFactory, SymbolType
} from '@ts-ioc/ioc';
import { IModuleMetadata } from './ModuleConfigure';
import { IContainer, isContainer } from '@ts-ioc/core';
import { DIModuleExports } from '../services';
import { IModuleResolver } from './IModuleResovler';


/**
 * injected module.
 *
 * @export
 * @class InjectedModule
 * @template T
 */
export class ModuleResovler<T> implements IModuleResolver {

    constructor(
        public token: Token<T>,
        public config: IModuleMetadata<T>,
        container: IContainer,
        public type?: Type<any>,
        providers?: IResolverContainer
    ) {
        if (isContainer(container)) {
            this.containerGetter = () => container;
        }
        if (providers) {
            this.providersGetter = () => providers;
        }
    }
    private containerGetter: () => IContainer;

    getContainer(): IContainer {
        return this.containerGetter();
    }

    private providersGetter: () => IResolverContainer;
    getProviders(): IResolverContainer {
        if (this.providersGetter) {
            return this.providersGetter();
        }
        return this.containerGetter();
    }

    get size(): number {
        return this.getProviders().size;
    }

    // bindActionContext<T extends IocActionContext>(ctx: T): T {
    //     this.getProviderMap().bindActionContext(ctx);
    //     return ctx;
    // }

    // resolveContext<T extends ResovleActionContext>(ctx: T): T {
    //     this.bindActionContext(ctx);
    //     let resolver = this.getProviderMap();
    //     resolver.resolveContext(ctx);
    //     return ctx;
    // }

    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        return this.getContainer().getTokenKey(token, alias);
    }

    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let pdr = this.getProviders();
        if (pdr && pdr.has(token)) {
            return pdr.resolve(token, ...providers);
        } else {
            this.getContainer().get(DIModuleExports).resolve(token, ...providers);
        }
        return null;
    }

    has<T>(token: Token<T>, alias?: string): boolean {
        let key = this.getContainer().getTokenKey(token, alias);
        let pdr = this.getProviders();
        if (pdr && pdr.has(key)) {
            return true
        }
        return false;
    }

    getTokenProvider<T>(token: Token<T>): Type<T> {
        return this.getContainer().getTokenProvider(token);
    }

    iterator(callbackfn: (fac: InstanceFactory<any>, tk: Token<any>, resolvor?: IResolver) => boolean | void): boolean | void {
        let pdr = this.getProviders();

        if (pdr.iterator((fac, tk) => {
            if (isToken(tk)) {
                return callbackfn(fac, fac, pdr);
            }
        }) === false) {
            return false;
        }
    }

    unregister<T>(token: Token<T>): this {
        this.getProviders().unregister(token);
        this.getContainer().unregister(token);
        return this;
    }
}
