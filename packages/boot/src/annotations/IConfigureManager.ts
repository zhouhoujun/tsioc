import { tokenId, TokenId } from '@tsdi/ioc';
import { RunnableConfigure } from './RunnableConfigure';

/**
 * configure manager token.
 */
export const ConfigureMgrToken: TokenId<IConfigureManager> = tokenId<IConfigureManager>('CONFIG-MGR');

/**
 * default configuration token.
 */
export const DefaultConfigureToken: TokenId<RunnableConfigure> = tokenId<RunnableConfigure>('BOOT_DEFAULT_CONFIG');


/**
 * configure loader.
 *
 * @export
 * @interface IConfigureLoader
 */
export interface IConfigureLoader<T extends RunnableConfigure = RunnableConfigure> {
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
export const ConfigureLoaderToken: TokenId<IConfigureLoader> = tokenId<IConfigureLoader>('BOOT_Configure_Loader');

/**
 * configure merge provider
 */
export interface IConfigureMerger {
    /**
     * merge configure
     * @param config1 config 1
     * @param config2 coniig 2
     * @returns merged config.
     */
    merge(config1: RunnableConfigure, config2: RunnableConfigure): RunnableConfigure;
}

/**
 * configure merger token.
 */
export const ConfigureMergerToken = tokenId<IConfigureMerger>('BOOT_Configure_Loader');

/**
 * configure manager.
 *
 * @export
 * @interface IConfigureManager
 * @template T
 */
export interface IConfigureManager<T extends RunnableConfigure = RunnableConfigure> {
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
