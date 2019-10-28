import { ProviderTypes, LoadType, InjectToken, Type, Injectable, Inject, ContainerFactory, ProviderMap, Token, ProviderParser } from '@tsdi/ioc';
import { IModuleLoader, IContainer } from '@tsdi/core';
import { ILoggerManager, ConfigureLoggerManger } from '@tsdi/logs';
import { Startup } from './runnable';
import { IComponentContext } from './builder';
import { StartupServices } from './services';
import { AnnoationContext, AnnoationOption, createAnnoationContext } from './core';
import { RunnableConfigure, ConfigureManager } from './annotations';



/**
 *  current application boot context token.
 */
export const ApplicationContextToken = new InjectToken<BootContext>('app__context');
export const ApplicationBootContextToken = ApplicationContextToken;

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
     * @type {RunnableConfigure}
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
     * render host container.
     *
     * @type {*}
     * @memberof BootOption
     */
    renderHost?: any;
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
     * @type {Startup}
     * @memberof BootOptions
     */
    runnable?: Startup;

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
    * providers for global boot application..
    *
    * @type {ProviderTypes[]}
    * @memberof BootOptions
    */
    providers?: ProviderTypes[];

    /**
     * providers for contexts.
     *
     * @type {(ProviderTypes[] | ProviderMap)}
     * @memberof BootOption
     */
    contexts?: ProviderTypes[] | ProviderMap;

    /**
     * the raise container factory for appplication boot.
     *
     * @type {ContainerFactory}
     * @memberof BootOption
     */
    raiseContainer?: ContainerFactory<IContainer>;
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

    /**
     * context providers of boot.
     *
     * @type {ProviderMap}
     * @memberof BootContext
     */
    contexts: ProviderMap;

    constructor(@Inject(BootTargetToken) type: Type) {
        super(type);
    }

    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     * @memberof BootContext
     */
    getContext<T>(token: Token<T>): T {
        if (this.contexts) {
            return this.contexts.resolve<T>(token);
        }
        return null;
    }
    /**
     * set context provider of boot application.
     *
     * @param {...ProviderTypes[]} providers
     * @memberof BootContext
     */
    setContext(...providers: ProviderTypes[]) {
        let pr = this.getRaiseContainer().getInstance(ProviderParser);
        if (this.contexts) {
            pr.parseTo(this.contexts, ...providers);
        } else {
            this.contexts = pr.parse(...providers);
        }
    }

    getLogManager(): ILoggerManager {
        return this.raiseContainer().resolve(ConfigureLoggerManger);
    }

    renderHost?: any;

    /**
     * boot base url.
     *
     * @type {string}
     * @memberof BootContext
     */
    baseURL: string;
    /**
     * module loader
     *
     * @type {IModuleLoader}
     * @memberof BootContext
     */
    loader?: IModuleLoader;
    /**
     * configuration merge metadata config and all application config.
     *
     * @type {RunnableConfigure}
     * @memberof BootContext
     */
    configuration: RunnableConfigure;
    /**
     * annoation metadata config.
     *
     * @type {RunnableConfigure}
     * @memberof AnnoationContext
     */
    annoation: RunnableConfigure;
    /**
     * component scope.
     *
     * @type {*}
     * @memberof BootOption
     */
    scope?: any;
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
     * configure bootstrap instance.
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
     * @type {IStartup}
     * @memberof BootContext
     */
    runnable?: Startup;
    /**
     * startup services
     *
     * @type {Token[]}
     * @memberof BootContext
     */
    get starupServices(): StartupServices {
        return this.getRaiseContainer().resolve(StartupServices);
    }

    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     * @memberof BootContext
     */
    deps?: LoadType[];

    /**
     * providers for global boot application.
     *
     * @type {ProviderTypes[]}
     * @memberof BootContext
     */
    providers?: ProviderTypes[];
    /**
     * get boot target.
     *
     * @returns {*}
     * @memberof BootContext
     */
    getBootTarget(): any {
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

    setOptions(options: BootOption) {
        if (options) {
            if (options.contexts) {
                if (options.contexts instanceof ProviderMap) {
                    this.contexts = options.contexts;
                } else {
                    this.setContext(...options.contexts);
                }
                delete options.contexts;
            }
            Object.assign(this, options);
        }
    }
    static parse(target: Type | BootOption, raiseContainer?: ContainerFactory<IContainer>): BootContext {
        return createAnnoationContext(BootContext, target, raiseContainer);
    }
}
