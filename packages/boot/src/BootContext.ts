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

/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
@Injectable
export class BootContext<T extends BootOption = BootOption,
    TMeta extends RunnableConfigure = RunnableConfigure,
    TRefl extends IModuleReflect = IModuleReflect>
    extends AnnoationContext<T, TMeta, TRefl> implements IBuildContext<T, TMeta, TRefl> {


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
            url = this.annoation?.baseURL;
            if (url) {
                this.getContainer().setValue(ProcessRunRootToken, url);
                this.context.setValue(ProcessRunRootToken, url);
            }
        }
        return url;
    }

    /**
     * configuration merge metadata config and all application config.
     *
     * @type {TMeta}
     * @memberof BootContext
     */
    get configuration(): TMeta {
        return this.context.getValue(CTX_APP_CONFIGURE) as TMeta;
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
    get startup(): Startup {
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
     * @returns {ConfigureManager<TMeta>}
     * @memberof BootContext
     */
    getConfigureManager(): ConfigureManager<TMeta> {
        return this.getContainer().resolve(ConfigureManager) as ConfigureManager<TMeta>;
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
