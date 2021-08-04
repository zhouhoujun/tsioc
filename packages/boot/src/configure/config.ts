import { ObjectMap, Type, LoadType, ProvidersMetadata } from '@tsdi/ioc';

/**
 * connection
 */
export interface ConnectionOptions extends ObjectMap<any> {
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
 * application Configuration.
 *
 * @export
 * @interface Configuration
 * @extends {ProvidersMetadata}
 */
export interface Configuration extends ProvidersMetadata {
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
    connections?: ConnectionOptions | ConnectionOptions[];
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
 * configure loader.
 *
 * @export
 * @interface IConfigureLoader
 */
export interface IConfigureLoader<T extends Configuration = Configuration> {
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
    merge(config1: Configuration, config2: Configuration): Configuration;
}

/**
 * configure manager.
 *
 * @export
 * @interface IConfigureManager
 * @template T
 */
export interface IConfigureManager<T extends Configuration = Configuration> {
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
