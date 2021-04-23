import { Modules, Type } from '@tsdi/ioc';
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
     */
    baseURL?: string;
    /**
     * module name.
     *
     * @type {string}
     */
    name?: string;
    /**
     * bootstrap.
     *
     * @type {Type<T>}
     */
    bootstrap?: Type<T>;
    /**
     * imports dependens modules
     *
     * @type {Modules[]}
     */
    imports?: Modules[];
    /**
     * exports modules
     *
     * @type {Modules[]}
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
