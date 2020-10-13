import { Token, Modules } from '@tsdi/ioc';
import { AnnotationMetadata } from '../annotations/reflect';


/**
 * module metadata.
 *
 * @export
 * @interface ModuleConfig
 * @extends {AnnotationMetadata<T>}
 */
export interface IModuleMetadata<T = any> extends AnnotationMetadata<T> {
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
