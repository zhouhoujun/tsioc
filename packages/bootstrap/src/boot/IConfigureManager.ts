import { InjectToken } from '@ts-ioc/core';
import { ModuleConfigure } from '../modules';
import { CustomRegister, IRunnableBuilder } from './IRunnableBuilder';

/**
 * configure manager token.
 */
export const ConfigureMgrToken = new InjectToken<IConfigureManager<ModuleConfigure>>('config-mgr');

/**
 * application default configuration token.
 */
export const DefaultConfigureToken = new InjectToken<ModuleConfigure>('DI_Default_Configuration');


/**
 * configure loader.
 *
 * @export
 * @interface IConfigureLoader
 */
export interface IConfigureLoader<T extends ModuleConfigure> {
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
export const ConfigureLoaderToken = new InjectToken<IConfigureLoader<ModuleConfigure>>('DI_Configure_Loader');

/**
 * configure manager.
 *
 * @export
 * @interface IConfigureManager
 * @template T
 */
export interface IConfigureManager<T extends ModuleConfigure> {
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} this configure manager.
     * @memberof IConfigureManager
     */
    useConfiguration(config?: string | T): this;

    /**
     * bind runnable builder.
     *
     * @param {IRunnableBuilder<any>} builder
     * @param {...CustomRegister<any>[]} regs
     * @memberof IConfigureManager
     */
     bindBuilder(builder: IRunnableBuilder<any>, ...regs: CustomRegister<any>[]): Promise<void>;

     /**
      * get config.
      *
      * @returns {Promise<T>}
      * @memberof IConfigureManager
      */
     getConfig(): Promise<T>;
}
