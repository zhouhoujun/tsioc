import { Token, InjectToken, IContainer, LoadType, Factory } from '@ts-ioc/core';
import { AppConfigure } from './AppConfigure';
import { IModuleBuilder, MdInstance, ModuleEnv, ModuleConfig } from '../modules';
import { ContainerPool } from '../utils';

/**
 * custom define module.
 */
export type CustomRegister<T> = (container: IContainer, config?: AppConfigure, builder?: IApplicationBuilder<T>) => Token<T>[] | Promise<Token<T>[]>;


/**
 * use module extends application.
 *
 * @export
 * @interface IApplicationExtends
 */
export interface IApplicationExtends {
    /**
     * use custom configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfigure): this;

    /**
     * use module
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    use(...modules: LoadType[]): this;

    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @returns {this}
     * @memberof IContainer
     */
    provider(provide: Token<any>, provider: Token<any> | Factory<any>): this;

}


/**
 * application builder.
 *
 * @export
 * @interface IApplicationBuilder
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IApplicationBuilder<T> extends IModuleBuilder<T>, IApplicationExtends {

    // /**
    //  * get container of the module.
    //  *
    //  * @param {(Token<T> | ModuleConfigure)} token module type or module configuration.
    //  * @param {ModuleEnv} [defaults] set loadedModule will return loaded container; set default container or not. not set will create new container.
    //  * @param {IContainer} [parent] set the container parent, default will set root default container.
    //  * @returns {IContainer}
    //  * @memberof IModuleBuilder
    //  */
    // getContainer(token: Token<T> | ModuleConfigure, defaults?: ModuleEnv, parent?: IContainer): IContainer;

    // /**
    //  * create new container.
    //  *
    //  * @returns {IContainer}
    //  * @memberof IModuleBuilder
    //  */
    // createContainer(): IContainer;

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
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [defaultContainer]
     * @returns {Promise<MdInstance<T>>}
     * @memberof IModuleBuilder
     */
    build<T>(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv): Promise<MdInstance<T>>;

}
