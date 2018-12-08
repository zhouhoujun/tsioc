import { Token, IContainer, Registration, Type, IExports, ProviderTypes, InjectReference, ProviderMap } from '@ts-ioc/core';
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

    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T {
        let pdr = this.getProviderMap();
        if (pdr && pdr.has(token)) {
            return pdr.resolve(token, ...providers);
        } else {
            return this.container.resolveValue(token, ...providers);
        }
    }

    hasRegister<T>(key: Token<T>): boolean {
        if (this.container.hasRegister(key)) {
            return true;
        } else {
            let pdr = this.getProviderMap();
            return pdr && pdr.has(key);
        }
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
