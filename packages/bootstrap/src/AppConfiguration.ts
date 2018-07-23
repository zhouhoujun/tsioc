import { ModuleConfiguration } from './ModuleConfiguration';
import { ObjectMap } from '@ts-ioc/core';

/**
 * app configuration.
 *
 * @export
 * @interface AppConfiguration
 * @extends {ObjectMap<any>}
 */
export interface AppConfiguration<T> extends ModuleConfiguration<T> {
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
