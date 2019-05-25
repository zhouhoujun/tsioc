import { Token, Modules, ComponentMetadata, Type } from '@tsdi/ioc';
import { Runnable } from '../../runnable';
import { RegFor } from './RegScope';

/**
 * annotation metadata.
 *
 * @export
 * @interface IAnnotationMetadata
 * @extends {ClassMetadata}
 * @template T
 */
export interface IAnnotationMetadata<T> extends ComponentMetadata {
    /**
     * selector for binding property.
     *
     * @type {string}
     * @memberof ActivityConfigure
     */
    selector?: string;

    /**
     * template data for target to binding property.
     */
    template?: any;

    /**
     * annotation for the type.
     *
     * @type {Token<T>}
     * @memberof AnnotationConfigure
     */
    token?: Token<T>;
    /**
     * Annotation class Type.
     *
     * @type {Type<T>}
     * @memberof IAnnotationMetadata
     */
    type?: Type<T>;

}

/**
 * module metadata.
 *
 * @export
 * @interface ModuleConfig
 * @extends {ObjectMap<any>}
 */
export interface IModuleMetadata<T> extends IAnnotationMetadata<T> {

    /**
     * module base url.
     *
     * @type {string}
     * @memberof ModuleConfig
     */
    baseURL?: string;

    /**
     * set where this module to register. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regFor?: RegFor;

    /**
     * module name.
     *
     * @type {string}
     * @memberof AppConfiguration
     */
    name?: string;

    /**
     * bootstrap.
     *
     * @type {Token<T>}
     * @memberof IAnnotationMetadata
     */
    bootstrap?: Token<T>;

    /**
     * imports dependens modules
     *
     * @type {Modules[]}
     * @memberof ModuleConfiguration
     */
    imports?: Modules[];
    /**
     * exports modules
     *
     * @type {Modules[]}
     * @memberof ModuleConfiguration
     */
    exports?: Modules[];

    /**
     * default runnerable.
     *
     * @type {Token<Runnable<T>>}
     * @memberof IModuleMetadata
     */
    defaultRunnable?: Token<Runnable<T>>

}

/**
 * module configure, with any bootstrap.
 *
 * @export
 * @interface ModuleConfigure
 * @extends {IModuleMetadata<any>}
 */
export interface ModuleConfigure extends IModuleMetadata<any> {

}
