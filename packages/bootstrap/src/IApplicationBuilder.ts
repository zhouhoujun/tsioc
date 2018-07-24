import { Token, Type, LoadType, InjectToken } from '@ts-ioc/core';
import { AppConfiguration } from './AppConfiguration';
import { IModuleBuilder } from './IModuleBuilder';


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
export interface IApplicationBuilder<T> extends IModuleBuilder<T> {

    // /**
    //  * get ioc caontainer in this application.
    //  *
    //  * @returns {IContainer}
    //  * @memberof IApplicationBuilder
    //  */
    // getContainer(): IContainer;

    // /**
    //  * use an exist container for platform.
    //  *
    //  * @param {IContainer} container
    //  * @returns {this}
    //  * @memberof IApplicationBuilder
    //  */
    // setContainer(container: IContainer): this;


    // /**
    //  * get container builder in application.
    //  *
    //  * @returns {IContainerBuilder}
    //  * @memberof IApplicationBuilder
    //  */
    // getContainerBuilder(): IContainerBuilder;

    // /**
    //  * use container builder
    //  *
    //  * @param {IContainerBuilder} builder
    //  * @returns
    //  * @memberof IApplicationBuilder
    //  */
    // setContainerBuilder(builder: IContainerBuilder);

    // /**
    //  * get module builer.
    //  *
    //  * @returns {IModuleBuilder<T>}
    //  * @memberof IApplicationBuilder
    //  */
    // getModuleBuilder(): IModuleBuilder<T>;

    // /**
    //  * set module builder.
    //  *
    //  * @param {IModuleBuilder<T>} builder
    //  * @returns {this}
    //  * @memberof IApplicationBuilder
    //  */
    // setModuleBuilder(builder: IModuleBuilder<T>): this;

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
