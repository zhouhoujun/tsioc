import { Token, Type, LoadType } from './types';
import { IContainer } from './IContainer';
import { ModuleConfiguration } from './ModuleConfiguration';
import { IContainerBuilder } from './IContainerBuilder';
import { IModuleBuilder } from './IModuleBuilder';
import { AppConfiguration } from './AppConfiguration';

/**
 * custom define module.
 */
export type CustomRegister<T> = (container: IContainer, config?: ModuleConfiguration<T>, builder?: IApplicationBuilder<T>) => any | Promise<any>;

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
     * use an exist container for platform.
     *
     * @param {IContainer} container
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useContainer(container: IContainer): this;

    /**
     * get ioc caontainer in this application.
     *
     * @returns {IContainer}
     * @memberof IApplicationBuilder
     */
    getContainer(): IContainer;

    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof IApplicationBuilder
     */
    useContainerBuilder(builder: IContainerBuilder);

    /**
     * get container builder in application.
     *
     * @returns {IContainerBuilder}
     * @memberof IApplicationBuilder
     */
    getContainerBuilder(): IContainerBuilder;

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfiguration<T>): this;

    /**
     * use module, custom module.
     *
     * @param {(...(LoadType | CustomRegister<T>)[])} modules
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useModules(...modules: (LoadType | CustomRegister<T>)[]): this;

    /**
     * bootstrap app via main module.
     *
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} bootModule bootstrap module.
     * @returns {Promise<any>}
     * @memberof IApplicationBuilder
     */
    bootstrap(bootModule: Token<T> | Type<any> | AppConfiguration<T>): Promise<T>;

    /**
     * get module builer.
     *
     * @returns {IModuleBuilder<T>}
     * @memberof IApplicationBuilder
     */
    getModuleBuilder(): IModuleBuilder<T>;
}
