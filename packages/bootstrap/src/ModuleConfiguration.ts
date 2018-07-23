import { Token, Type, LoadType, Providers } from '@ts-ioc/core';
import { IModuleBuilder } from './IModuleBuilder';


/**
 * module configuration.
 *
 * @export
 * @interface ModuleConfiguration
 * @extends {ObjectMap<any>}
 */
export interface ModuleConfiguration<T> {

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
     * @type {Token<T>}
     * @memberof ModuleConfiguration
     */
    bootstrap?: Token<T>;

    /**
     * bind module builder.
     *
     * @type {(Token<IModuleBuilder<T>> | IModuleBuilder<T>)}
     * @memberof ITaskConfigure
     */
    builder?: Token<IModuleBuilder<T>> | IModuleBuilder<T>;

}

