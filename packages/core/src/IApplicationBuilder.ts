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
     * @param {(IContainer | Promise<IContainer>)} container
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useContainer(container: IContainer | Promise<IContainer>): this;

    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof IApplicationBuilder
     */
    useContainerBuilder(builder: IContainerBuilder);

    /**
     * use custom configuration.
     *
     * @param {(string | T)} [config]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | T): this;

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
     * @param {IContainer} container ioc container.
     * @returns {IModuleBuilder<T>}
     * @memberof IApplicationBuilder
     */
    getModuleBuilder(container: IContainer): IModuleBuilder<T>;
}
