import {
    Token, Registration, Type,
    ParamProviders, Factory, isToken,
    IResolver, isString, isNumber, IResolverContainer
} from '@ts-ioc/ioc';
import { ModuleConfig } from './ModuleConfigure';
import { IContainer } from '@ts-ioc/core';


/**
 * injected module.
 *
 * @export
 * @class InjectedModule
 * @template T
 */
export class InjectedModule<T> implements IExports {

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

    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let way: ResoveWay;
        if (isNumber(resway)) {
            way = resway;
        } else {
            way = ResoveWay.all;
            if (resway) {
                providers.unshift(resway);
            }
        }
        let pdr = this.getProviderMap();
        if (pdr && (way & ResoveWay.current) && pdr.has(token)) {
            return pdr.resolve(token, ResoveWay.current, ...providers);
        }

        if (pdr !== this.container && (way & ResoveWay.traverse)) {
            return this.container.resolve(token, ResoveWay.traverse, ...providers);
        }
        return null;
    }

    has<T>(token: Token<T>, aliasOrway?: string | ResoveWay): boolean {
        let key = this.container.getTokenKey(token, isString(aliasOrway) ? aliasOrway : null);
        let pdr = this.getProviderMap();
        let resway = isNumber(aliasOrway) ? aliasOrway : ResoveWay.all;
        if (pdr && (resway & ResoveWay.current) && pdr.has(key)) {
            return true
        }
        if (pdr !== this.container && (resway & ResoveWay.traverse)) {
            return this.container.has(key, ResoveWay.traverse);
        }
        return false;
    }

    getTokenImpl<T>(token: Token<T>, resway?: ResoveWay): Type<T> {
        return this.container.getTokenImpl(token, resway || ResoveWay.nodes);
    }

    unregister<T>(token: Token<T>, resway?: ResoveWay): this {
        let key = this.container.getTokenKey(token);
        let pdr = this.getProviderMap();
        resway = isNumber(resway) ? resway : ResoveWay.nodes;
        if (pdr && (resway & ResoveWay.current)) {
            pdr.unregister(key, ResoveWay.current);
        }
        if (resway & ResoveWay.traverse) {
            this.container.unregister(key, ResoveWay.nodes);
        }
        return this;
    }

    forEach(callbackfn: (tk: Token<any>, fac: Factory<any>, resolvor?: IResolver) => void | boolean): void | boolean {
        let pdr = this.getProviderMap();
        if (pdr) {
            if (pdr.forEach((fac, tk) => {
                if (isToken(tk)) {
                    return callbackfn(tk, fac, pdr);
                }
            }) === false) {
                return false;
            }
        }
        return this.container.forEach((tk, fac) => {
            return callbackfn(tk, fac, this.container);
        });
    }
}


/**
 * Injected Module Token.
 *
 * @export
 * @class InjectModuleMetaConfigToken
 * @extends {Registration<Type<T>>}
 * @template T
 */
export class InjectedModuleToken<T> extends Registration<InjectedModule<T>> {
    constructor(type: Type<T>) {
        super(type, 'InjectedModule')
    }
}
