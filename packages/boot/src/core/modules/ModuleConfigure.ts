import { Token, LoadType, Modules, ComponentMetadata, Type } from '@ts-ioc/ioc';
import { IMetaAccessor } from './IMetaAccessor';
import { IRunnable } from '../../runnable';


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
 * register module scope.
 *
 * @export
 * @enum {number}
 */
export enum ModuleScope {
    /**
     * register as child module.
     */
    child  = 1,
    /**
     * regiser as root module
     */
    root,
    /**
     * current boot module
     */
    booModule,
    /**
     * register all container in pools.
     */
    all
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
     * the way to register the module. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regScope?: ModuleScope;

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
     * default metadata accessor.
     *
     * @type {Token<MetaAccessor>}
     * @memberof AnnotationConfigure
     */
    metaAccessor?: Token<IMetaAccessor>;

    /**
     * default runnerable.
     *
     * @type {Token<IRunnable<T>>}
     * @memberof IModuleMetadata
     */
    defaultRunnable?: Token<IRunnable<T>>

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
