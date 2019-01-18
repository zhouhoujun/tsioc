import { Token, IContainer, Registration, Type, IExports, ParamProviders, InjectReference, ProviderMap, Factory, isToken, IResolver } from '@ts-ioc/core';
import { ModuleConfig } from './ModuleConfigure';


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
        public exports?: Token<any>[]
    ) {

    }

    private _map;
    getProviderMap(): ProviderMap {
        if (!this._map) {
            this._map = this.container.resolveValue(new InjectReference(ProviderMap, this.type || this.token));
        }
        return this._map;
    }

    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let pdr = this.getProviderMap();
        if (pdr && pdr.hasRegister(token)) {
            return pdr.resolve(token, ...providers);
        } else {
            return this.container.resolveValue(token, ...providers);
        }
    }

    hasRegister<T>(key: Token<T>): boolean {
        let pdr = this.getProviderMap();
        if (pdr && pdr.hasRegister(key)) {
            return true
        } else {
            return this.container.hasRegister(key);
        }
    }

    forEach(callbackfn: (tk: Token<any>, fac: Factory<any>, resolvor?: IResolver) => void): void {
        let pdr = this.getProviderMap();
        if (pdr) {
            pdr.forEach((fac, tk) => {
                isToken(tk) && callbackfn(tk, fac, pdr);
            });
        }
        this.container.forEach((fac, tk) => {
            callbackfn(tk, fac, this.container);
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
