import { IContainer } from './IContainer';
import { Token, Type, LoadType, Providers, ObjectMap, ModuleType } from './types';
import { InjectToken } from './InjectToken';

/**
 * AppConfiguration token.
 */
export const ModuleConfigurationToken = new InjectToken<ModuleConfiguration>('__IOC_ModuleConfiguration');


/**
 * module configuration.
 *
 * @export
 * @interface ModuleConfiguration
 * @extends {ObjectMap<any>}
 */
export interface ModuleConfiguration extends ObjectMap<any> {
    /**
     * system file root directory.
     */
    rootdir?: string;

    /**
     * providers
     *
     * @type {Providers[]}
     * @memberof ModuleConfiguration
     */
    providers?: Providers[];

    /**
     * imports dependens modules
     *
     * @type {LoadType[]}
     * @memberof ModuleConfiguration
     */
    imports?: LoadType[];

    /**
     * exports modules
     *
     * @type {Type<any>[]}
     * @memberof ModuleConfiguration
     */
    exports?: Type<any>[];
    /**
     * set this module bootstrap start with.
     *
     * @type {Token<any>}
     * @memberof ModuleConfiguration
     */
    bootstrap?: Token<any>;


    /**
     * debug log.
     *
     * @type {boolean}
     * @memberof AppConfiguration
     */
    debug?: boolean;

    /**
     * log config.
     *
     * @type {*}
     * @memberof AppConfiguration
     */
    logConfig?: any;

}

