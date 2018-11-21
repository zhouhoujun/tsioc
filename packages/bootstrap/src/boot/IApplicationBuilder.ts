import { InjectToken } from '@ts-ioc/core';
import { AppConfigure } from './AppConfigure';
import { IEvents } from '../utils';
import { IRunnableExtends, IRunnableBuilder } from './IRunnableBuilder';

/**
 * use module extends application.
 *
 * @export
 * @interface IApplicationExtends
 */
export interface IApplicationExtends extends IRunnableExtends {
    /**
     * use custom configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfigure): this;
}


/**
 * application builder.
 *
 * @export
 * @interface IApplicationBuilder
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IApplicationBuilder<T> extends IRunnableBuilder<T>, IApplicationExtends, IEvents {

}


/**
 *  application builder token.
 */
export const ApplicationBuilderToken = new InjectToken<AnyApplicationBuilder>('DI_AppBuilder');

/**
 * application builder. objected generics to any
 *
 * @export
 * @interface AnyApplicationBuilder
 * @extends {IApplicationBuilder<any>}
 * @template T
 */
export interface AnyApplicationBuilder extends IApplicationBuilder<any> {

}
