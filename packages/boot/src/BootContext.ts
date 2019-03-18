import { AnnoationContext } from './core';
import { RunnableConfigure } from './annotations';
import { IModuleLoader, IContainer } from '@ts-ioc/core';
import { ProviderTypes, LoadType, isBaseObject, Type } from '@ts-ioc/ioc';
import { Runnable } from './runnable';

/**
 * boot options
 *
 * @export
 * @interface BootOptions
 */
export interface BootOptions {
    /**
     * boot base url.
     *
     * @type {string}
     * @memberof BootContext
     */
    baseURL?: string;

    /**
     * module loader
     *
     * @type {IModuleLoader}
     * @memberof BootContext
     */
    loader?: IModuleLoader;

    /**
     * annoation config.
     *
     * @type {AnnotationConfigure<any>}
     * @memberof AnnoationContext
     */
    annoation?: RunnableConfigure;

    /**
     * the annoation module
     *
     * @type {IContainer}
     * @memberof AnnoationContext
     */
    moduleContainer?: IContainer;

    /**
     * target module instace.
     *
     * @type {*}
     * @memberof BootContext
     */
    target?: any;

    /**
     * bootstrap instance.
     *
     * @type {T}
     * @memberof RunnableOptions
     */
    bootstrap?: any;

    /**
     * boot run args.
     *
     * @type {string[]}
     * @memberof BootOptions
     */
    args?: string[];

    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     * @memberof RunnableOptions
     */
    data?: any;

    /**
     * bootstrap reference runable service.
     *
     * @type {Runnable<any>}
     * @memberof BootContext
     */
    runnable?: Runnable<any>;

    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     * @memberof BootContext
     */
    deps?: LoadType[];

    /**
    * providers.
    *
    * @type {ProviderTypes[]}
    * @memberof BootOptions
    */
    providers?: ProviderTypes[];
}

/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class BootContext extends AnnoationContext {
    /**
     * boot base url.
     *
     * @type {string}
     * @memberof BootContext
     */
    baseURL?: string;

    /**
     * module loader
     *
     * @type {IModuleLoader}
     * @memberof BootContext
     */
    loader?: IModuleLoader;

    /**
     * annoation config.
     *
     * @type {AnnotationConfigure<any>}
     * @memberof AnnoationContext
     */
    annoation?: RunnableConfigure;

    /**
     * target module instace.
     *
     * @type {*}
     * @memberof BootContext
     */
    target?: any;

    /**
     * boot run args.
     *
     * @type {string[]}
     * @memberof BootContext
     */
    args?: string[];

    /**
     * bootstrap instance.
     *
     * @type {T}
     * @memberof RunnableOptions
     */
    bootstrap?: any;

    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     * @memberof RunnableOptions
     */
    data?: any;

    /**
     * bootstrap runnable service.
     *
     * @type {Runnable<any>}
     * @memberof BootContext
     */
    runnable?: Runnable<any>;

    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     * @memberof BootContext
     */
    deps?: LoadType[];

    /**
    * providers.
    *
    * @type {ProviderTypes[]}
    * @memberof BootOptions
    */
    providers?: ProviderTypes[];

    /**
     * set option.
     *
     * @param {BootOptions} options
     * @memberof BootContext
     */
    setOptions(options: BootOptions) {
        if (isBaseObject(options)) {
            Object.assign(this, options);
        }
    }

    static create(type: Type<any>, options?: BootOptions): BootContext {
        let ctx = new BootContext(type);
        options && ctx.setOptions(options);
        return ctx;
    }
}
