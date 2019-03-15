import { InjectToken } from '@ts-ioc/ioc';
import { RunnableConfigure } from './AppConfigure';

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
