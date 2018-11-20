import { Token, InjectToken, IContainer, LoadType, Factory } from '@ts-ioc/core';
import { AppConfigure } from './AppConfigure';
import { IModuleBuilder, ModuleEnv, ModuleConfig, InjectedModule } from '../modules';
import { Events, IEvents } from '../utils';
import { ConfigureManager } from './ConfigureManager';

/**
 * custom define module.
 */
export type CustomRegister<T> = (container: IContainer, config?: AppConfigure, builder?: IRunnableBuilder<T>) => Token<T>[] | Promise<Token<T>[]>;


/**
 * runnable extends.
 *
 * @export
 * @interface IRunnableExtends
 */
export interface IRunnableExtends {

    /**
     * use module
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof IRunnableBuilder
     */
    use(...modules: LoadType[]): this;

    /**
     * bind provider
     *
     * @param {Token<any>} provide
     * @param {(Token<any> | Factory<any>)} provider
     * @param {boolean} [beforRootInit]
     * @returns {this}
     * @memberof IRunnableExtends
     */
    provider(provide: Token<any>, provider: Token<any> | Factory<any>, beforRootInit?: boolean): this;

}


/**
 * runnable builder.
 *
 * @export
 * @interface IRunnableBuilder
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IRunnableBuilder<T> extends IModuleBuilder<T>, IRunnableExtends, IEvents {
    /**
     * events mgr.
     *
     * @type {Events}
     * @memberof IRunnableBuilder
     */
    events?: Events;

    /**
     * get builder by token, config and env.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @returns {Promise<IModuleBuilder<T>>}
     * @memberof IRunnableBuilder
     */
    getBuilderByConfig(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv): Promise<IModuleBuilder<T>>;

    /**
     * get module builder
     *
     * @param {InjectedModule<T>} injmdl
     * @returns {IModuleBuilder<T>}
     * @memberof IModuleBuilder
     */
    getBuilder(injmdl: InjectedModule<T>): IModuleBuilder<T>;

    /**
     * get config manager.
     *
     * @returns {ConfigureManager<ModuleConfig<T>>}
     * @memberof IRunnableBuilder
     */
    getConfigManager(): ConfigureManager<ModuleConfig<T>>;

}



export const RunnableBuilderToken = new InjectToken<AnyRunnableBuilder>('DI_RunnableBuilder');

/**
 * runnable builder. objected generics to any
 *
 * @export
 * @interface AnyRunnableBuilder
 * @extends {IRunnableBuilder<any>}
 * @template T
 */
export interface AnyRunnableBuilder extends IRunnableBuilder<any> {
}
