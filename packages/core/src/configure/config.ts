import { Type, LoadType, ProvidersMetadata, Abstract, Injector } from '@tsdi/ioc';

/**
 * application Configuration.
 *
 * @export
 * @interface Configuration
 * @extends {ProvidersMetadata}
 */
export interface ApplicationConfiguration extends ProvidersMetadata, Record<string, any> {
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
    logConfig?: Record<string, any>;
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
 * application settings.
 */
@Abstract()
export abstract class Settings implements Record<string, any> {

}

/**
 * connection options
 */
 @Abstract()
export abstract class ConnectionOptions implements Record<string, any> {
    asDefault?: boolean;
    name?: string;
    /**
     * db type.
     */
    abstract get type(): string;
    abstract get host(): string;
    abstract get database(): string;

    port?: number;
    username?: string;
    password?: string;
    /**
     * orm modles.
     */
    entities?: (string | Type)[];
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
    abstract load<T extends ApplicationConfiguration>(uri?: string): Promise<T>;
}


/**
 * configure merge provider
 */
@Abstract()
export abstract class ConfigureMerger {
    /**
     * merge source to target.
     * @param target target configure.
     * @param source source configure 
     * @returns merged target configure.
     */
    abstract merge(target: ApplicationConfiguration, source: ApplicationConfiguration): ApplicationConfiguration;
}

/**
 * configure manager.
 */
@Abstract()
export abstract class ConfigureManager {
    /**
     * configuration injctor.
     *
     * @readonly
     * @abstract
     * @type {Injector}
     * @memberof ConfigureManager
     */
    abstract get injector(): Injector;
    /**
     * use configuration.
     *
     * @param {(string | ApplicationConfiguration)} [config] use config src or configuration.
     * @returns {this} this configure manager.
     */
    abstract useConfiguration(config?: string | ApplicationConfiguration): this;

    /**
     * load used configuration.
     */
    abstract load(): Promise<void>;

    /**
     * get config.
     *
     * @returns {T}
     */
    abstract getConfig<T extends ApplicationConfiguration>(): T;
}
