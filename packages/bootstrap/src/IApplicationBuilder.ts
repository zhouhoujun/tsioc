import { Token, Type, LoadType, IContainer, IContainerBuilder, InjectToken } from '@ts-ioc/core';
import { AppConfiguration } from './AppConfiguration';
import { ModuleConfiguration } from './ModuleConfiguration';
import { IModuleBuilder } from './IModuleBuilder';

/**
 * custom define module.
 */
export type CustomRegister<T> = (container: IContainer, config?: ModuleConfiguration<T>, builder?: IApplicationBuilder<T>) => any | Promise<any>;

export const ApplicationBuilderToken = new InjectToken<IApplicationBuilder<any>>('DI_AppBuilder');
export const ApplicationBuilderFactoryToken = new InjectToken<IApplicationBuilder<any>>('DI_AppBuilder_Factory');

/**
 * application builder.
 *
 * @export
 * @interface IApplicationBuilder
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IApplicationBuilder<T> {

    /**
     * get ioc caontainer in this application.
     *
     * @returns {IContainer}
     * @memberof IApplicationBuilder
     */
    getContainer(): IContainer;

    /**
     * use an exist container for platform.
     *
     * @param {IContainer} container
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    setContainer(container: IContainer): this;


    /**
     * get container builder in application.
     *
     * @returns {IContainerBuilder}
     * @memberof IApplicationBuilder
     */
    getContainerBuilder(): IContainerBuilder;

    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof IApplicationBuilder
     */
    setContainerBuilder(builder: IContainerBuilder);

    /**
     * get module builer.
     *
     * @returns {IModuleBuilder<T>}
     * @memberof IApplicationBuilder
     */
    getModuleBuilder(): IModuleBuilder<T>;

    /**
     * set module builder.
     *
     * @param {IModuleBuilder<T>} builder
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    setModuleBuilder(builder: IModuleBuilder<T>): this;

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfiguration<T>): this;

    /**
     * use module
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    use(...modules: LoadType[]): this;

    /**
     * custom register modules
     *
     * @param {...CustomRegister<T>[]} moduleRegs
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    registerModules(...moduleRegs: CustomRegister<T>[]): this;

    /**
     * build application.
     *
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token
     * @returns {Promise<any>}
     * @memberof IApplicationBuilder
     */
    build(token: Token<T> | Type<any> | AppConfiguration<T>): Promise<any>;

    /**
     * bootstrap app via main module.
     *
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token bootstrap module.
     * @returns {Promise<any>}
     * @memberof IApplicationBuilder
     */
    bootstrap(token: Token<T> | Type<any> | AppConfiguration<T>): Promise<any>;

}
