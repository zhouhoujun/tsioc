import { ObjectMap, Type, ProvidersMetadata } from '@tsdi/ioc';
import { LoadType } from '@tsdi/core';

/**
 * connection
 */
export interface IConnectionOptions extends ObjectMap<any> {
    asDefault?: boolean;
    name?: string;
    /**
     * db type.
     */
    type: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    database: string;
    entities?: Type[];
    initDb?(connect: any): Promise<void>;
}

/**
 * runnable configure.
 *
 * @export
 * @interface RunnableConfigure
 * @extends {ModuleConfigure}
 */
export interface RunnableConfigure extends ProvidersMetadata {
    /**
     * module base url.
     *
     * @type {string}
     * @memberof ModuleConfig
     */
    baseURL?: string;
    /**
     * deps.
     *
     * @type {LoadType[]}
     * @memberof RunnableConfigure
     */
    deps?: LoadType[];
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
     * @type {ObjectMap}
     * @memberOf AppConfigure
     */
    setting?: ObjectMap;

    /**
     * custom config connections.
     *
     * @type {any}
     * @memberof AppConfigure
     */
    connections?: IConnectionOptions | IConnectionOptions[];

    /**
     * models of boot application.
     */
    models?: (string| Type)[];

    /**
     * repositories of orm.
     */
    repositories?: (string | Type)[];
}
