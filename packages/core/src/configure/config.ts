import { Type, LoadType, ProvidersMetadata, Abstract } from '@tsdi/ioc';

/**
 * connection options
 */
export interface ConnectionOptions extends Record<string, any> {
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
 * connection options
 */
export type IConnectionOptions = ConnectionOptions;

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
     * @type {Record<string, any>}
     */
    setting?: Record<string, any>;
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
 */
@Abstract()
export abstract class ConfigureLoader {
    /**
     * load config.
     *
     * @param {string} [uri]
     * @returns {Promise<T>}
     */
    abstract load<T extends Configuration>(uri?: string): Promise<T>;
}


/**
 * configure merge provider
 */
@Abstract()
export abstract class ConfigureMerger {
    /**
     * merge configure
     * @param config1 config 1
     * @param config2 coniig 2
     * @returns merged config.
     */
    abstract merge(config1: Configuration, config2: Configuration): Configuration;
}

/**
 * configure manager.
 */
@Abstract()
export abstract class ConfigureManager {
    /**
     * use configuration.
     *abstract 
     * @param {(string | Configuration)} [config]
     * @returns {this} this configure manager.
     */
    abstract useConfiguration(config?: string | Configuration): this;

    /**
     * get config.
     *
     * @returns {Promise<T>}
     */
    abstract getConfig<T extends Configuration>(): Promise<T>;
}
