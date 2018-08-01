import { Token, Type, LoadType, InjectToken, IContainer } from '@ts-ioc/core';
import { AppConfiguration } from './AppConfiguration';
import { IModuleBuilder } from './IModuleBuilder';
import { DIModuleType, MdlInstance, LoadedModule } from './ModuleType';
import { ModuleConfigure } from './ModuleConfiguration';

/**
 * custom define module.
 */
export type CustomRegister<T> = (container: IContainer, config?: AppConfiguration, builder?: IApplicationBuilder<T>) => Token<T>[] | Promise<Token<T>[]>;

/**
 * application builder.
 *
 * @export
 * @interface IApplicationBuilder
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IApplicationBuilder<T> extends IModuleBuilder<T> {
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
    /**
     * build module as ioc container.
     *
     * @param {(DIModuleType<TM> | ModuleConfigure)} token
     * @param {(IContainer | LoadedModule)} [defaultContainer]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof IModuleBuilder
     */
    build<TM>(token: DIModuleType<TM> | ModuleConfigure, defaults?: IContainer | LoadedModule): Promise<MdlInstance<TM>>;

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
