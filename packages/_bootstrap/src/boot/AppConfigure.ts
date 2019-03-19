import { ObjectMap, InjectToken } from '@ts-ioc/ioc';
import { ModuleConfigure } from '../modules';


/**
 * application configuration token.
 */
export const AppConfigureToken = new InjectToken<AppConfigure>('DI_APP_Configuration');

/**
 * runnable configure.
 *
 * @export
 * @interface RunnableConfigure
 * @extends {ModuleConfigure}
 */
export interface RunnableConfigure extends ModuleConfigure {
    /**
     * application name.
     *
     * @type {string}
     * @memberof AppConfigure
     */
    name?: string;

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

}

/**
 * app configuration.
 *
 * @export
 * @interface AppConfigure
 * @extends {ObjectMap<any>}
 */
export interface AppConfigure extends RunnableConfigure {

    /**
     * custom config connections.
     *
     * @type {ObjectMap<any>}
     * @memberof AppConfigure
     */
    connections?: ObjectMap<any>;

}
