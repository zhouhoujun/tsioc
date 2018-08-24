import { Token, InjectToken, IContainer, LoadType, Factory } from '@ts-ioc/core';
import { AppConfigure } from './AppConfigure';
import { IModuleBuilder, MdInstance, ModuleEnv, ModuleConfig } from '../modules';
import { EventEmitter } from 'events';

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

    events: EventEmitter;

    /**
     * get module builder
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @returns {IModuleBuilder<T>}
     * @memberof IModuleBuilder
     */
    getBuilder(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv): IModuleBuilder<T>;

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
