import { Token, InjectToken, IContainer, LoadType } from '@ts-ioc/core';
import { AppConfigure } from './AppConfigure';
import { IModuleBuilder } from './IModuleBuilder';
import { MdInstance, LoadedModule } from './ModuleType';
import { ModuleConfig } from './ModuleConfigure';

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
     * @param {IContainer} [container]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfigure, container?: IContainer): this;

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
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IApplicationBuilder<T> extends IModuleBuilder<T>, IApplicationExtends {

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
     * @param {(Token<TM> | ModuleConfig<TM>)} token
     * @param {(IContainer | LoadedModule)} [defaultContainer]
     * @returns {Promise<MdInstance<T>>}
     * @memberof IModuleBuilder
     */
    build<TM>(token: Token<TM> | ModuleConfig<TM>, defaults?: IContainer | LoadedModule): Promise<MdInstance<TM>>;

}
