import { Token, Type, LoadType, InjectToken, IContainer } from '@ts-ioc/core';
import { AppConfiguration } from './AppConfiguration';
import { IModuleBuilder, IGModuleBuilder } from './IModuleBuilder';
import { DIModuleType, MdlInstance } from './ModuleType';
import { ModuleConfigure } from './ModuleConfiguration';

/**
 * custom define module.
 */
export type CustomRegister = (container: IContainer, config?: AppConfiguration, builder?: IApplicationBuilder) => Token<any>[] | Promise<Token<any>[]>;

export const ApplicationBuilderToken = new InjectToken<IApplicationBuilder>('DI_AppBuilder');


export interface IGApplicationBuilder<T> extends IGModuleBuilder<T> {
     /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration)} [config]
     * @param {IContainer} [container]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfiguration, container?: IContainer): this;

    /**
     * use module
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    use(...modules: LoadType[]): this;
}

/**
 * application builder.
 *
 * @export
 * @interface IApplicationBuilder
 * @extends {IModuleBuilder}
 * @template T
 */
export interface IApplicationBuilder extends IGApplicationBuilder<any> {
    /**
     * build module as ioc container.
     *
     * @param {(DIModuleType<TM> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof IModuleBuilder
     */
    build<TM>(token: DIModuleType<TM> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<TM>>;

    /**
     * bootstrap module.
     *
     * @param {(DIModuleType<TM> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<TM>>}
     * @memberof IModuleBuilder
     */
    bootstrap<TM>(token: DIModuleType<TM> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<TM>>;
}
