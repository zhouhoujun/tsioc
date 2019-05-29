import { AnnoationContext, AnnoationOption, createAnnoationContext, ComponentManager } from './core';
import { RunnableConfigure, ConfigureManager } from './annotations';
import { IModuleLoader } from '@tsdi/core';
import { ProviderTypes, LoadType, InjectToken, Type, Injectable, Inject, ContainerFactory } from '@tsdi/ioc';
import { Runnable } from './runnable';
import { IComponentContext } from './builder';



/**
 *  application boot context token.
 */
export const BootContextToken = new InjectToken<BootContext>('__boot_context');
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
     * @memberof BootOptions
     */
    baseURL?: string;

    /**
     * module loader
     *
     * @type {IModuleLoader}
     * @memberof BootOptions
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

    /**
     * target module instace.
     *
     * @type {*}
     * @memberof BootOptions
     */
    target?: any;

    /**
     * bootstrap instance.
     *
     * @type {T}
     * @memberof BootOptions
     */
    bootstrap?: any;

    /**
     * component scope.
     *
     * @type {*}
     * @memberof BootOption
     */
    scope?: any;
    /**
     * bind template
     *
     * @type {*}
     * @memberof BootOption
     */
    template?: any;

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
     * @memberof BootOptions
     */
    data?: any;

    /**
     * bootstrap reference runable service.
     *
     * @type {Runnable<any>}
     * @memberof BootOptions
     */
    runnable?: Runnable<any>;

    /**
     * auto run runnable or not.
     *
     * @type {boolean}
     * @memberof BootOptions
     */
    autorun?: boolean;

    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     * @memberof BootOptions
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
     * container getter.
     *
     * @type {ContainerFactory}
     * @memberof BootOption
     */
    raiseContainerGetter?: ContainerFactory;
}

export const BootTargetToken = new InjectToken('module_type');
/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
@Injectable
export class BootContext extends AnnoationContext implements IComponentContext {

    constructor(@Inject(BootTargetToken) type: Type<any>) {
        super(type);
    }

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
     * component scope.
     *
     * @type {*}
     * @memberof BootOption
     */
    scope?: any;

    get scopes() {
        if (this.scope) {
            return this.getRaiseContainer().get(ComponentManager).getScopes(this.scope);
        }
        return [];
    }

    /**
     * the template data to binding property.
     *
     * @type {*}
     * @memberof BootOption
     */
    template?: any;

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
     *  custom boot input data
     *
     * @type {*}
     * @memberof RunnableOptions
     */
    data?: any;

    /**
     * auto run runnable or not.
     *
     * @type {boolean}
     * @memberof BootContext
     */
    autorun?: boolean;

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
     * get boot target.
     *
     * @returns {*}
     * @memberof BootContext
     */
    getBootTarget(): any {
        let mgr = this.getRaiseContainer().get(ComponentManager);
        if (this.bootstrap && mgr.hasContent(this.bootstrap)) {
            return mgr.getLeaf(this.bootstrap);
        }
        if (this.target && mgr.hasContent(this.target)) {
            return mgr.getLeaf(this.target);
        }
        return this.bootstrap || this.target;
    }

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

    static parse(target: Type<any> | BootOption, raiseContainer?: ContainerFactory): BootContext {
        return createAnnoationContext(BootContext, target, raiseContainer);
    }
}
