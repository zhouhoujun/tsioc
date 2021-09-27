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

    /**
     * service port
     */
    port?: number;
    /**
     * service hostname
     */
    hostname?: string;

    subdomainOffset?: number;
    /**
     * server options
     * 
     * 
     * @param {string | Buffer | Array<string | Buffer>} cert
     * Cert chains in PEM format. One cert chain should be provided per
     *  private key. Each cert chain should consist of the PEM formatted
     *  certificate for a provided private key, followed by the PEM
     *  formatted intermediate certificates (if any), in order, and not
     *  including the root CA (the root CA must be pre-known to the peer,
     *  see ca). When providing multiple cert chains, they do not have to
     *  be in the same order as their private keys in key. If the
     *  intermediate certificates are not provided, the peer will not be
     *  able to validate the certificate, and the handshake will fail.
     * 
     * @param {string | Buffer | Array<Buffer | KeyObject>} key
     * Private keys in PEM format. PEM allows the option of private keys
     * being encrypted. Encrypted keys will be decrypted with
     * options.passphrase. Multiple keys using different algorithms can be
     * provided either as an array of unencrypted key strings or buffers,
     * or an array of objects in the form {pem: <string|buffer>[,
     * passphrase: <string>]}. The object form can only occur in an array.
     * object.passphrase is optional. Encrypted keys will be decrypted with
     * object.passphrase if provided, or options.passphrase if it is not.
     */
    serverOptions?: Record<string, any> | { key?: any, cert?: any };
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
