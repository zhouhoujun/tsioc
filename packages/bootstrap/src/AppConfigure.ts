import { ModuleConfigure } from './ModuleConfigure';
import { ObjectMap, InjectToken } from '@ts-ioc/core';


/**
 * application configuration token.
 */
export const AppConfigureToken = new InjectToken<AppConfigure>('DI_APP_Configuration');

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
