import { ObjectMap, Type, ProvidersMetadata, LoadType } from '@tsdi/ioc';

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
 * boot configure.
 *
 * @export
 * @interface Configure
 * @extends {ProvidersMetadata}
 */
export interface Configure extends ProvidersMetadata {
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
     * @memberof Configure
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
    models?: (string | Type)[];

    /**
     * repositories of orm.
     */
    repositories?: (string | Type)[];
}

/**
 * boot configure.
 * @deprecated use Configure instead.
 */
export type RunnableConfigure = Configure;
