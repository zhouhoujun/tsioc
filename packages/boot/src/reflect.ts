import { ClassMetadata, RegInMetadata, Token, ClassType, TypeReflect, ProvidersMetadata, Type, Modules } from '@tsdi/ioc';


/**
 * annotation metadata.
 *
 * @export
 * @interface IAnnotationMetadata
 * @extends {ClassMetadata}
 * @template T
 */
export interface AnnotationMetadata<T = any> extends ClassMetadata, ProvidersMetadata, RegInMetadata {
    /**
     * annotation for the type.
     *
     * @type {Token<T>}
     */
    token?: Token<T>;
    /**
     * Annotation class Type.
     *
     * @type {Type<T>}
     */
    type?: ClassType<T>;

}

/**
 * annotation type.
 */
export type AnnotationTypes = 'module' | 'component' | 'decorator' | 'directive' | 'pipe' | 'boot' | 'suite';

/**
 * AnnotationReflect
 */
export interface AnnotationReflect<T = any> extends TypeReflect {
    /**
     * class type.
     */
    readonly type: Type<T>;
    /**
     * the type of annoation.
     */
    annoType?: AnnotationTypes;
    /**
     * annoation decorator.
     */
    annoDecor?: string;
    /**
     * annotation metadata.
     */
    annotation?: AnnotationMetadata<T>;

}

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
    bootstrap?: Type;
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
export interface ModuleConfigure<T = any> extends IModuleMetadata<T> {
    debug?: boolean;
}


/**
 * di module relfect.
 */
 export interface ModuleReflect<T = any> extends AnnotationReflect<T> {

    imports: Type[];
    exports: Type[];
    /**
     *  components of current module.
     */
    components?: Type[];
    /**
     * dectors of components.
     */
    componentDectors?: string[];
    /**
     * module decorator.
     */
    annoDecor?: string;
    /**
     * module metadata.
     */
    annotation?: ModuleConfigure<T>;

}


