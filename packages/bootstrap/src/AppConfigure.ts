import { ModuleConfigure } from './ModuleConfigure';
import { ObjectMap, InjectToken } from '@ts-ioc/core';


/**
 * application configuration token.
 */
export const AppConfigureToken = new InjectToken<AppConfigure>('DI_APP_Configuration');

/**
 * application default configuration token.
 */
export const DefaultConfigureToken = new InjectToken<AppConfigure>('DI_Default_Configuration');

/**
 * app configuration.
 *
 * @export
 * @interface AppConfigure
 * @extends {ObjectMap<any>}
 */
export interface AppConfigure extends ModuleConfigure {
    /**
     * application name.
     *
     * @type {string}
     * @memberof AppConfigure
     */
    name?: string;

    /**
     * app base uri.
     */
    baseURL?: string;

    /**
     * set enable debug log or not.
     *
     * @type {boolean}
     * @memberof AppConfigure
     */
    debug?: boolean;

    /**
     * log config.
     *
     * @type {*}
     * @memberof AppConfigure
     */
    logConfig?: any;

    /**
     * custom config key value setting.
     *
     * @type {IMap<any>}
     * @memberOf AppConfigure
     */
    setting?: ObjectMap<any>;

    /**
     * custom config connections.
     *
     * @type {ObjectMap<any>}
     * @memberof AppConfigure
     */
    connections?: ObjectMap<any>;

}

/**
 * app configure loader.
 *
 * @export
 * @interface IAppConfigureLoader
 */
export interface IAppConfigureLoader {
    /**
     * load config.
     *
     * @param {string} [uri]
     * @returns {Promise<AppConfigure>}
     * @memberof AppConfigureLoader
     */
    load(uri?: string): Promise<AppConfigure>;
}

/**
 *  app configure loader token.
 */
export const AppConfigureLoaderToken = new InjectToken<IAppConfigureLoader>('DI_Configure_Loader');

/**
 * configure merger
 *
 * @export
 * @interface IConfigureMerger
 */
export interface IConfigureMerger {
    /**
     * merge configuration.
     *
     * @param {AppConfigure} config
     * @param {ModuleConfigure} moduleMetadata
     * @returns {AppConfigure}
     * @memberof IConfigureMerger
     */
    merge(config: AppConfigure, moduleMetadata: ModuleConfigure): AppConfigure;
}
