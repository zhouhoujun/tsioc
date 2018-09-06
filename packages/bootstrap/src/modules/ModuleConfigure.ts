import { Token, LoadType, Providers, IContainer } from '@ts-ioc/core';
import { IModuleBuilder } from './IModuleBuilder';
import { AnnotationConfigure, IAnnotationBuilder } from '../annotations';


/**
 * module configuration.
 *
 * @export
 * @interface ModuleConfig
 * @extends {ObjectMap<any>}
 */
export interface ModuleConfig<T> extends AnnotationConfigure<T> {

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
     * ioc container, the module defined in.
     *
     * @type {IContainer}
     * @memberof ModuleConfiguration
     */
    container?: IContainer;

    /**
     * boot annotation builder.
     *
     * @type {(Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>)}
     * @memberof AnnotationConfigure
     */
    bootAnnotationBuilder?: Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>;

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
