import { Token, InjectToken, LoadType, Factory, IResolver } from '@ts-ioc/ioc';
import { AppConfigure } from './AppConfigure';
import { IModuleBuilder, ModuleConfig, ModuleResovler, BootOptions } from '../modules';
import { IConfigureManager } from './IConfigureManager';
import { IContainer } from '@ts-ioc/core';

/**
 *  process run root.
 */
export const ProcessRunRootToken = new InjectToken<string>('ioc_processRunRoot');

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
     * use module as the runner global depdences module.
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

    /**
     * get provider.
     *
     * @param {Token<any>} provide
     * @param {boolean} [beforeInit]
     * @returns {(Token<any> | Factory<any>)}
     * @memberof IRunnableExtends
     */
    getProvider(provide: Token<any>, beforeInit?: boolean): Token<any> | Factory<any>;
}

/**
 * runable boot options.
 *
 * @export
 * @interface RunOptions
 * @extends {BootOptions<T>}
 * @template T
 */
export interface RunOptions<T> extends BootOptions<T> {

    /**
     * runnable Builder
     *
     * @type {IRunnableBuilder<T>}
     * @memberof RunOptions
     */
    bootBuilder?: IRunnableBuilder<T>;

    /**
     * config manager.
     *
     * @type {IConfigureManager<any>}
     * @memberof RunOptions
     */
    configManager?: IConfigureManager<any>;
}

/**
 * runnable builder.
 *
 * @export
 * @interface IRunnableBuilder
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IRunnableBuilder<T> extends IModuleBuilder<T>, IRunnableExtends {

    /**
     * get run root.
     *
     * @param {IResolver} [resolver]
     * @returns {string}
     * @memberof IRunnableBuilder
     */
    getRunRoot(resolver?: IResolver): string;

    /**
     * init container pools.
     *
     * @returns {Promise<void>}
     * @memberof IRunnableBuilder
     */
    initContainerPools(): Promise<void>;

    /**
     * get builder by token, config and env.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {RunOptions<T>} [options]
     * @returns {Promise<IModuleBuilder<T>>}
     * @memberof IRunnableBuilder
     */
    getBuilderByConfig(token: Token<T> | ModuleConfig<T>, options?: RunOptions<T>): Promise<IModuleBuilder<T>>;
    /**
     * get module builder
     *
     * @param {ModuleResovler<T>} injmdl
     * @returns {IModuleBuilder<T>}
     * @memberof IModuleBuilder
     */
    getBuilder(injmdl: ModuleResovler<T>): IModuleBuilder<T>;
    /**
     * get config manager.
     *
     * @returns {IConfigureManager<ModuleConfig<T>>}
     * @memberof IRunnableBuilder
     */
    getConfigManager(): IConfigureManager<ModuleConfig<T>>;
}


/**
 * current runable builder token.
 */
export const CurrentRunnableBuilderToken = new InjectToken<IRunnableBuilder<any>>('Current_DI_RunnableBuilder');
