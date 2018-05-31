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
     * use module, custom register module.
     *
     * @param {...(LoadType | CustomRegister<T>)[]} modules
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useModules(...modules: (LoadType | CustomRegister<T>)[]): this;

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
     * bootstrap app via main module.
     *
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} bootModule bootstrap module.
     * @returns {Promise<any>}
     * @memberof IApplicationBuilder
     */
    bootstrap(bootModule: Token<T> | Type<any> | AppConfiguration<T>): Promise<T>;

}
