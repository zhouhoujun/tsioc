import { Type, LoadType, ProvidersMetadata, Abstract, Injector, tokenId, Token } from '@tsdi/ioc';
import { LogConfigure } from '@tsdi/logs';
import { ConnectionOptions } from '@tsdi/repository';
import { SecureContextOptions } from 'node:tls';


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
    logConfig?: LogConfigure;
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
     * boot services.
     */
    boot: BootServiceOptions | BootServiceOptions[];

}

/**
 * config token.
 */
export const CONFIGURATION = tokenId<ApplicationConfiguration>('CONFIGURATION');

/**
 * default configuration token.
 */
export const DEFAULT_CONFIG: Token<ApplicationConfiguration> = tokenId<ApplicationConfiguration>('DEFAULT_CONFIG');


/**
 * application settings.
 */
@Abstract()
export abstract class Settings implements Record<string, any> {

}

/**
 * boot service options.
 */
export interface BootServiceOptions extends SecureContextOptions, Record<string, any> {
    /**
     * boot service type.
     */
    serviceType: 'http2' | 'http1' | 'tcp' | 'amqp' | 'grpc' | 'mqtt' | 'modbus' | 'kafka' | 'nats' | 'redis' | 'ws' | Type;
    /**
     * service controllers.
     * default  ['./controllers/**\/*.(ts|js)'],
     */
    controllers?: Array<string | Type>;
    /**
     * service port
     */
    port?: number;
    /**
     * service hostname
     */
    hostname?: string;
    /**
     * subdomain offset.
     */
    subdomainOffset?: number;
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
