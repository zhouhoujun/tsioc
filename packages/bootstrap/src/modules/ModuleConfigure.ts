import { Token, LoadType, Modules } from '@ts-ioc/core';
import { IModuleBuilder } from './IModuleBuilder';
import { AnnotationConfigure } from '../annotations';


/**
 * module configuration.
 *
 * @export
 * @interface ModuleConfig
 * @extends {ObjectMap<any>}
 */
export interface ModuleConfig<T> extends AnnotationConfigure<T> {

    /**
     * module base url.
     *
     * @type {string}
     * @memberof ModuleConfig
     */
    baseURL?: string;

    /**
     * module name.
     *
     * @type {string}
     * @memberof AppConfiguration
     */
    name?: string;

    /**
     * module bootstrap token.
     *
     * @type {Token<T>}
     * @memberof AnnotationConfigure
     */
    bootstrap?: Token<T>;

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
     * @type {Modules[]}
     * @memberof ModuleConfiguration
     */
    exports?: Modules[];

    /**
     * DI module Loader builder
     *
     * @type {(Token<IModuleBuilder<any>> | IModuleBuilder<any>)}
     * @memberof ModuleConfiguration
     */
    builder?: Token<IModuleBuilder<any>> | IModuleBuilder<any>;

    /**
     * DI module default Loader builder
     *
     * @type {Token<IModuleBuilder<any>>}
     * @memberof ModuleConfig
     */
    defaultBuilder?: Token<IModuleBuilder<any>>;

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
