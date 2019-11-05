import {
    Token, Type, ParamProviders, isToken,
    IResolver, IResolverContainer, InstanceFactory, SymbolType
} from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { IModuleResolver } from '../modules';
import { DIModuleExports } from './DIModuleExports';


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
        private container: IContainer,
        public type?: Type,
        private providers?: IResolverContainer
    ) {

    }

    getContainer(): IContainer {
        return this.container;
    }

    getProviders(): IResolverContainer {
        return this.providers || this.container;
    }

    get size(): number {
        return this.getProviders().size;
    }

    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        return this.getContainer().getTokenKey(token, alias);
    }

    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let pdr = this.getProviders();
        if (pdr && pdr.has(token)) {
            return pdr.resolve(token, ...providers);
        } else {
            return this.getContainer().get(DIModuleExports).resolve(token, ...providers);
        }
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

    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IResolver) => boolean | void): boolean | void {
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
