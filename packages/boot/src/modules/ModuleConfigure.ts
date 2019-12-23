import { Token, Modules, Type, ClassMetadata, RegInMetadata } from '@tsdi/ioc';

/**
 * annotation metadata.
 *
 * @export
 * @interface IAnnotationMetadata
 * @extends {ClassMetadata}
 * @template T
 */
export interface IAnnotationMetadata<T = any> extends ClassMetadata, RegInMetadata {
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
 * @extends {IAnnotationMetadata<T>}
 */
export interface IModuleMetadata<T = any> extends IAnnotationMetadata<T> {
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
     * components the module providers.
     */
    components?: Modules[];
}

/**
 * module configure, with any bootstrap.
 *
 * @export
 * @interface ModuleConfigure
 * @extends {IModuleMetadata}
 */
export interface ModuleConfigure extends IModuleMetadata {
    debug?: boolean;
}
