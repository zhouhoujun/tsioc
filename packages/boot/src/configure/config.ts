import { Type, LoadType, Abstract, Injector, tokenId, Token, ProviderType } from '@tsdi/ioc';
import { LogConfigure } from '@tsdi/logs';
import { ConnectionOptions } from '@tsdi/repository';
import { SecureContextOptions } from 'node:tls';


/**
 * application Configuration.
 *
 */
export abstract class ApplicationConfiguration implements Record<string, any> {
    /**
     * record
     */
    [x: string]: any;
    /**
     * module base url.
     *
     * @type {string}
     */
    abstract baseURL?: string;
    /**
     * deps.
     *
     * @type {LoadType[]}
     */
    abstract deps?: LoadType[];
    /**
     * provider services of the class.
     *
     * @type {KeyValue<Token, Token>}
     */
    abstract providers?: ProviderType[];
    /**
     * application name.
     *
     * @type {string}
     */
    abstract name?: string;
    /**
     * set enable debug log or not.
     *
     * @type {boolean}
     */
    abstract debug?: boolean;
    /**
     * log config.
     *
     * @type {*}
     */
    abstract logConfig?: LogConfigure;
    /**
     * custom config key value setting.
     *
     * @type {Record<string, any>}
     */
    abstract setting?: Record<string, any>;
    /**
     * custom config connections.
     *
     * @type {any}
     */
    abstract connections?: ConnectionOptions | ConnectionOptions[];
    /**
     * boot services.
     */
    abstract boot: BootServiceOptions | BootServiceOptions[];

}

/**
 * config token.
 */
export const CONFIGURATION = ApplicationConfiguration;

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
