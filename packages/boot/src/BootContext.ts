import { LoadType, Type, Injectable, createRaiseContext, Token, isToken, isDefined, tokenId } from '@tsdi/ioc';
import { IModuleLoader, ICoreInjector } from '@tsdi/core';
import { ILoggerManager, ConfigureLoggerManger } from '@tsdi/logs';
import { Startup } from './runnable/Startup';
import { StartupServices } from './services/StartupServices';
import { CTX_APP_CONFIGURE, CTX_DATA, CTX_APP_ENVARGS, CTX_TEMPLATE, CTX_MODULE_BOOT_TOKEN, CTX_MODULE_BOOT, CTX_MODULE_INST, CTX_MODULE_STARTUP } from './context-tokens';
import { RunnableConfigure, ProcessRunRootToken } from './annotations/RunnableConfigure';
import { IBuildContext } from './builder/IBuildContext';
import { ConfigureManager } from './annotations/ConfigureManager';
import { AnnoationOption, AnnoationContext } from './AnnoationContext';
import { IModuleReflect } from './modules/IModuleReflect';
import { BootstrapMetadata } from './decorators/Bootstrap';


/**
 *  current application boot context token.
 */
export const ApplicationContextToken = tokenId<BootContext>('APP__CONTEXT');

/**
 * boot options
 *
 * @export
 * @interface BootOptions
 */
export interface BootOption<T = any> extends AnnoationOption<T> {
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
     * custom configures
     *
     * @type {((string | RunnableConfigure)[])}
     * @memberof BootOptions
     */
    configures?: (string | RunnableConfigure)[];
    /**
     * bootstrap instance.
     *
     * @memberof BootOptions
     */
    bootstrap?: Token;
    /**
     * render host container.
     *
     * @type {*}
     * @memberof BootOption
     */
    renderHost?: any;
    /**
     * bind template
     *
     * @type {*}
     * @memberof BootOption
     */
    template?: any;
    /**
     * boot run env args.
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
     * injector.
     */
    injector?: ICoreInjector;
}

export interface IBootContext<T extends BootOption = BootOption> extends IBuildContext<T> {

    getLogManager(): ILoggerManager;
    /**
     * startup services
     *
     * @type {Token[]}
     */
    readonly starupServices: StartupServices;

    /**
     * boot base url.
     *
     * @type {string}
     */
    readonly baseURL: string;

    /**
     * boot run env args.
     *
     * @type {string[]}
     * @memberof BootOptions
     */
    readonly args: string[];
    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     * @memberof BootOptions
     */
    readonly data: any;

    readonly target: any;

    readonly boot: any;

    getStartup(): Startup;

    /**
     * configuration merge metadata config and all application config.
     *
     * @type {T}
     * @memberof BootContext
     */
    getConfiguration<T extends RunnableConfigure>(): T;

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<T>}
     */
    getConfigureManager<T extends RunnableConfigure>(): ConfigureManager<T>;

    getTargetReflect<T extends IModuleReflect>(): T;

    /**
     * annoation metadata.
     */
    getAnnoation<T extends BootstrapMetadata>(): T;

}

/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
@Injectable
export class BootContext<T extends BootOption = BootOption> extends AnnoationContext<T> implements IBootContext<T> {


    getLogManager(): ILoggerManager {
        return this.getContainer().resolve(ConfigureLoggerManger);
    }

    /**
     * startup services
     *
     * @type {Token[]}
     * @memberof BootContext
     */
    get starupServices(): StartupServices {
        return this.get(StartupServices);
    }

    /**
     * boot base url.
     *
     * @type {string}
     * @memberof BootContext
     */
    get baseURL(): string {
        let url = this.context.getValue(ProcessRunRootToken)
        if (!url) {
            url = this.getAnnoation()?.baseURL;
            if (url) {
                this.getContainer().setValue(ProcessRunRootToken, url);
                this.context.setValue(ProcessRunRootToken, url);
            }
        }
        return url;
    }

    getAnnoation<T extends BootstrapMetadata>(): T {
        return super.getAnnoation() as T;
    }

    getTargetReflect<T extends IModuleReflect>(): T {
        return super.getTargetReflect() as T;
    }

    /**
     * configuration merge metadata config and all application config.
     *
     * @memberof BootContext
     */
    getConfiguration<T extends RunnableConfigure>(): T {
        return this.context.getValue(CTX_APP_CONFIGURE) as T;
    }

    get args(): string[] {
        return this.context.getValue(CTX_APP_ENVARGS) || [];
    }

    get data(): any {
        return this.context.getValue(CTX_DATA);
    }

    /**
     * boot startup service instance.
     *
     * @type {IStartup}
     * @memberof BootContext
     */
    getStartup(): Startup {
        return this.context.getValue(CTX_MODULE_STARTUP);
    }

    /**
     * get template.
     */
    getTemplate<T = any>(): T {
        return this.context.getValue(CTX_TEMPLATE);
    }

    get target() {
        return this.context.getValue(CTX_MODULE_INST);
    }

    /**
     * boot instance.
     */
    get boot(): any {
        return this.context.getValue(CTX_MODULE_BOOT);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<T>}
     * @memberof BootContext
     */
    getConfigureManager<T extends RunnableConfigure>(): ConfigureManager<T> {
        return this.getContainer().resolve(ConfigureManager) as ConfigureManager<T>;
    }

    static parse(injector: ICoreInjector, target: Type | BootOption): BootContext {
        return createRaiseContext(injector, BootContext, isToken(target) ? { module: target } : target);
    }

    setOptions(options: T) {
        if (!options) {
            return this;
        }
        if (options.template) {
            this.setValue(CTX_TEMPLATE, options.template);
        }
        if (options.bootstrap) {
            this.setValue(CTX_MODULE_BOOT_TOKEN, options.bootstrap);
        }
        if (isDefined(options.data)) {
            this.setValue(CTX_DATA, options.data);
        }
        if (options.baseURL) {
            this.setValue(ProcessRunRootToken, options.baseURL);
        }
        return super.setOptions(options);
    }
}


export function isBootContext( target: any): target is IBootContext {
    return target instanceof BootContext;
}
