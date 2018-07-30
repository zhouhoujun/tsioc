import { Token, Type, LoadType, Providers, IContainer } from '@ts-ioc/core';
import { IModuleBuilder } from './IModuleBuilder';
import { IBootstrapBuilder } from './IBootstrapBuilder';


/**
 * module configuration.
 *
 * @export
 * @interface ModuleConfiguration
 * @extends {ObjectMap<any>}
 */
export interface ModuleConfiguration<T> {

    /**
     * module name.
     *
     * @type {string}
     * @memberof AppConfiguration
     */
    name?: string;

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
     * @type {Token<any>[]}
     * @memberof ModuleConfiguration
     */
    exports?: Token<any>[];

    /**
     * ioc container, the module defined in.
     *
     * @type {IContainer}
     * @memberof ModuleConfiguration
     */
    container?: IContainer;

    /**
     * bind module builder.
     *
     * @type {(Token<IModuleBuilder<T>> | IModuleBuilder<T>)}
     * @memberof ITaskConfigure
     */
    builder?: Token<IModuleBuilder<T>> | IModuleBuilder<T>;

    /**
     * set this DI module bootstrap start with.
     *
     * @type {Token<T>}
     * @memberof ModuleConfiguration
     */
    bootstrap?: Token<T>;

    /**
     * set bootstrap builder.
     *
     * @type {(Token<IBootstrapBuilder<T>> | IBootstrapBuilder<T>)}
     * @memberof ModuleConfiguration
     */
    bootBuilder?: Token<IBootstrapBuilder<T>> | IBootstrapBuilder<T>;

}

