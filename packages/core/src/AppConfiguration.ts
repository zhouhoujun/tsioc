import { ModuleConfiguration } from './ModuleConfiguration';
import { InjectToken } from './InjectToken';
import { ObjectMap, Token } from './types';

/**
 * App configuration token.
 */
export const AppConfigurationToken = new InjectToken<AppConfiguration<any>>('__IOC_AppConfiguration');

/**
 * app configuration.
 *
 * @export
 * @interface AppConfiguration
 * @extends {ObjectMap<any>}
 */
export interface AppConfiguration<T> extends ModuleConfiguration<T> {
    /**
     * app base uri.
     */
    baseURL?: string;

    /**
     * debug log.
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
