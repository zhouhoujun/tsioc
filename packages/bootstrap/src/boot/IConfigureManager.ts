import { InjectToken, IContainer } from '@ts-ioc/core';
import { RunnableConfigure } from './AppConfigure';
import { IRunnableBuilder } from './IRunnableBuilder';

/**
 * configure manager token.
 */
export const ConfigureMgrToken = new InjectToken<IConfigureManager<RunnableConfigure>>('config-mgr');

/**
 * default configuration token.
 */
export const DefaultConfigureToken = new InjectToken<RunnableConfigure>('DI_Default_Configuration');


/**
 * configure loader.
 *
 * @export
 * @interface IConfigureLoader
 */
export interface IConfigureLoader<T extends RunnableConfigure> {
    /**
     * load config.
     *
     * @param {string} [uri]
     * @returns {Promise<T>}
     * @memberof AppConfigureLoader
     */
    load(uri?: string): Promise<T>;
}

/**
 * configure loader token.
 */
export const ConfigureLoaderToken = new InjectToken<IConfigureLoader<RunnableConfigure>>('DI_Configure_Loader');


/**
 * configure register.
 *
 * @export
 * @interface IConfigureRegister
 * @template T
 */
export interface IConfigureRegister<T extends RunnableConfigure> {
    /**
     * register config setting.
     *
     * @param {T} config
     * @param {IContainer} container
     * @param {IRunnableBuilder<any>} [runBuilder]
     * @returns {Promise<void>}
     * @memberof IConfigureRegister
     */
    register(config: T, container: IContainer, runBuilder?: IRunnableBuilder<any>): Promise<void>;
}

/**
 * configure register token.
 */
export const ConfigureRegisterToken = new  InjectToken<IConfigureRegister<RunnableConfigure>>('DI_Configure_Register');

/**
 * configure manager.
 *
 * @export
 * @interface IConfigureManager
 * @template T
 */
export interface IConfigureManager<T extends RunnableConfigure> {
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} this configure manager.
     * @memberof IConfigureManager
     */
    useConfiguration(config?: string | T): this;

    /**
     * get config.
     *
     * @returns {Promise<T>}
     * @memberof IConfigureManager
     */
    getConfig(): Promise<T>;
}
