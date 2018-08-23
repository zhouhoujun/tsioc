import { Token, IContainer, Registration, Type } from '@ts-ioc/core';
import { ModuleConfig } from './ModuleConfigure';

/**
 * injected module.
 *
 * @export
 * @class InjectedModule
 * @template T
 */
export class InjectedModule<T> {
    constructor(
        public token: Token<T>,
        public config: ModuleConfig<T>,
        public container: IContainer
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
