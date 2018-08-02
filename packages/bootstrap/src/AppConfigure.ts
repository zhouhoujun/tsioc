import { ModuleConfig, ModuleConfigure } from './ModuleConfigure';
import { ObjectMap, InjectToken } from '@ts-ioc/core';


/**
 * application configuration token.
 */
export const AppConfigurationToken = new InjectToken<AppConfigure>('DI_APP_Configuration');

/**
 * app configuration.
 *
 * @export
 * @interface AppConfiguration
 * @extends {ObjectMap<any>}
 */
export interface AppConfigure extends ModuleConfigure {
    /**
     * application name.
     *
     * @type {string}
     * @memberof AppConfiguration
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
     * @memberof AppConfiguration
     */
    debug?: boolean;

    /**
     * log config.
     *
     * @type {*}
     * @memberof AppConfiguration
     */
    logConfig?: any;

    /**
     * custom config key value setting.
     *
     * @type {IMap<any>}
     * @memberOf AppConfiguration
     */
    setting?: ObjectMap<any>;

    /**
     * custom config connections.
     *
     * @type {ObjectMap<any>}
     * @memberof AppConfiguration
     */
    connections?: ObjectMap<any>;

}
