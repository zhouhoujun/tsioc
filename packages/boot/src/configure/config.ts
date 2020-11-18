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
     */
    baseURL?: string;
    /**
     * deps.
     *
     * @type {LoadType[]}
     */
    deps?: LoadType[];
    /**
     * application name.
     *
     * @type {string}
     */
    name?: string;
    /**
     * set enable debug log or not.
     *
     * @type {boolean}
     */
    debug?: boolean;

    /**
     * log config.
     *
     * @type {*}
     */
    logConfig?: any;

    /**
     * custom config key value setting.
     *
     * @type {ObjectMap}
     */
    setting?: ObjectMap;

    /**
     * custom config connections.
     *
     * @type {any}
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


/**
 * configure loader.
 *
 * @export
 * @interface IConfigureLoader
 */
export interface IConfigureLoader<T extends Configure = Configure> {
    /**
     * load config.
     *
     * @param {string} [uri]
     * @returns {Promise<T>}
     */
    load(uri?: string): Promise<T>;
}


/**
 * configure merge provider
 */
export interface IConfigureMerger {
    /**
     * merge configure
     * @param config1 config 1
     * @param config2 coniig 2
     * @returns merged config.
     */
    merge(config1: Configure, config2: Configure): Configure;
}

/**
 * configure manager.
 *
 * @export
 * @interface IConfigureManager
 * @template T
 */
export interface IConfigureManager<T extends Configure = Configure> {
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} this configure manager.
     */
    useConfiguration(config?: string | T): this;

    /**
     * get config.
     *
     * @returns {Promise<T>}
     */
    getConfig(): Promise<T>;
}
