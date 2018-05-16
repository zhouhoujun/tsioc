import { ObjectMap, Token, symbols, Registration, InjectToken } from '@ts-ioc/core';

/**
 * AppConfiguration token.
 */
export const AppConfigurationToken = new InjectToken<AppConfiguration>('__IOC_AppConfiguration');

/**
 * app configuration.
 *
 * @export
 * @interface AppConfiguration
 * @extends {ObjectMap<any>}
 */
export interface AppConfiguration extends ObjectMap<any> {
    /**
     * system file root directory.
     */
    rootdir?: string;

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

/**
 * default app configuration.
 */
export const defaultAppConfig: AppConfiguration = <AppConfiguration>{
    rootdir: '.',
    connections: {},
    setting: {}
}

