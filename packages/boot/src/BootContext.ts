import { AnnoationContext } from './core';
import { RunnableConfigure } from './annotations';
import { IModuleLoader } from '@ts-ioc/core';
import { ProviderTypes, LoadType } from '@ts-ioc/ioc';
import { Runnable } from './runnable';

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
    deps: LoadType[];

     /**
     * providers.
     *
     * @type {ProviderTypes[]}
     * @memberof BootOptions
     */
    providers?: ProviderTypes[];
}
