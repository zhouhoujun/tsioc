import { Token, LoadType, Providers, IContainer } from '@ts-ioc/core';
import { IModuleBuilder } from './IModuleBuilder';
import { IBootBuilder } from './IBootBuilder';


/**
 * module configuration.
 *
 * @export
 * @interface ModuleConfig
 * @extends {ObjectMap<any>}
 */
export interface ModuleConfig<T> {

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
     * DI module Loader builder
     *
     * @type {(Token<IModuleBuilder<any>> | IModuleBuilder<any>)}
     * @memberof ModuleConfiguration
     */
    builder?: Token<IModuleBuilder<any>> | IModuleBuilder<any>;

    /**
     * module builder.
     *
     * @type {(Token<IBootBuilder<T>> | IBootBuilder<T>)}
     * @memberof ModuleConfiguration
     */
    moduleBuilder?: Token<IBootBuilder<T>> | IBootBuilder<T>;

    /**
     * ioc container, the module defined in.
     *
     * @type {IContainer}
     * @memberof ModuleConfiguration
     */
    container?: IContainer;

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
     * @type {(Token<IBootBuilder<T>> | IBootBuilder<T>)}
     * @memberof ModuleConfiguration
     */
    bootstrapBuilder?: Token<IBootBuilder<T>> | IBootBuilder<T>;

}

/**
 * module configure, with any bootstrap.
 *
 * @export
 * @interface ModuleConfigure
 * @extends {ModuleConfig<any>}
 */
export interface ModuleConfigure extends ModuleConfig<any> {

}

