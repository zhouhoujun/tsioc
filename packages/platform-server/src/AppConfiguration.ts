import { ObjectMap, Token, symbols, Registration, InjectToken } from '@ts-ioc/core';
import { Type } from 'typescript';

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


    /**
     * aspect service path. default: './aop'
     *
     * @type {(string | string[])}
     * @memberof AppConfiguration
     */
    aop?: string | string[];

    /**
     * used aop aspect.
     *
     * @type {Token<any>[]}
     * @memberof AppConfiguration
     */
    usedAops?: Token<any>[];

}

/**
 * default app configuration.
 */
export const defaultAppConfig: AppConfiguration = <AppConfiguration>{
    rootdir: '',
    debug: false,
    aop: './aop',
    usedAops: [],
    connections: {},
    setting: {}
}

