import { AnnoationContext, AnnoationOption, createAnnoationContext } from './core';
import { RunnableConfigure, ConfigureManager } from './annotations';
import { IModuleLoader, IContainer } from '@tsdi/core';
import { ProviderTypes, LoadType, InjectToken, Type } from '@tsdi/ioc';
import { Runnable } from './runnable';


/**
 *  process run root.
 */
export const ProcessRunRootToken = new InjectToken<string>('__boot_process_root');

/**
 * boot options
 *
 * @export
 * @interface BootOptions
 */
export interface BootOption extends AnnoationOption {
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
     * annoation metadata config.
     *
     * @type {AnnotationConfigure<any>}
     * @memberof AnnoationContext
     */
    annoation?: RunnableConfigure;

    /**
     * custom configures
     *
     * @type {((string | RunnableConfigure)[])}
     * @memberof BootOptions
     */
    configures?: (string | RunnableConfigure)[];

    // /**
    //  * target module instace.
    //  *
    //  * @type {*}
    //  * @memberof BootContext
    //  */
    // target?: any;

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
     * annoation metadata config.
     *
     * @type {AnnotationConfigure<any>}
     * @memberof AnnoationContext
     */
    annoation?: RunnableConfigure;


    /**
     * custom configures
     *
     * @type {((string | RunnableConfigure)[])}
     * @memberof BootContext
     */
    configures?: (string | RunnableConfigure)[] = [];

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
     *  custom boot data
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
     * get configure manager.
     *
     * @template T
     * @returns {ConfigureManager<T>}
     * @memberof BootContext
     */
    getConfigureManager<T>(): ConfigureManager<T> {
        return this.getRaiseContainer().resolve(ConfigureManager) as ConfigureManager<T>;
    }

    static parse(target: Type<any> | BootOption, raiseContainer?: IContainer | (() => IContainer)): BootContext {
        return createAnnoationContext(BootContext, target, raiseContainer);
    }
}
