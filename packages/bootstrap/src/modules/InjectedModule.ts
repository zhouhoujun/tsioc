import { Token, IContainer, Registration, Type, IExports } from '@ts-ioc/core';
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
        public exports?: Token<any>[],
        public providers?: Token<any>[]
    ) {

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
