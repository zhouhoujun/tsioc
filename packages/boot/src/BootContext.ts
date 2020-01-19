import { LoadType, Type, Injectable, createRaiseContext, Token, isToken, isDefined, tokenId } from '@tsdi/ioc';
import { IModuleLoader, ICoreInjector } from '@tsdi/core';
import { ILoggerManager, ConfigureLoggerManger } from '@tsdi/logs';
import { Startup } from './runnable/Startup';
import { StartupServices } from './services/StartupServices';
import { CTX_APP_CONFIGURE, CTX_DATA, CTX_APP_ENVARGS, CTX_TEMPLATE, CTX_MODULE_BOOT_TOKEN, CTX_MODULE_BOOT, CTX_MODULE_INST, CTX_MODULE_STARTUP } from './context-tokens';
import { RunnableConfigure, ProcessRunRootToken } from './annotations/RunnableConfigure';
import { IComponentContext } from './builder/ComponentContext';
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
    IMeta extends RunnableConfigure = RunnableConfigure,
    TRefl extends IModuleReflect = IModuleReflect>
    extends AnnoationContext<T, IMeta, TRefl> implements IComponentContext {


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
        let url = this.getValue(ProcessRunRootToken)
        if (!url) {
            url = this.getOptions().baseURL || (this.annoation ? this.annoation.baseURL : '');
            if (url) {
                this.getContainer().registerValue(ProcessRunRootToken, url);
                this.context.registerValue(ProcessRunRootToken, url);
            }
        }
        return url;
    }

    /**
     * configuration merge metadata config and all application config.
     *
     * @type {IMeta}
     * @memberof BootContext
     */
    get configuration(): IMeta {
        return this.getValue(CTX_APP_CONFIGURE) as IMeta;
    }

    get args(): string[] {
        return this.getValue(CTX_APP_ENVARGS) || [];
    }

    get data(): any {
        return this.getValue(CTX_DATA);
    }

    /**
     * boot startup service instance.
     *
     * @type {IStartup}
     * @memberof BootContext
     */
    get startup(): Startup {
        return this.getValue(CTX_MODULE_STARTUP);
    }

    /**
     * get template.
     */
    get template(): any {
        return this.getValue(CTX_TEMPLATE);
    }

    get target() {
        return this.getValue(CTX_MODULE_INST);
    }

    /**
     * boot instance.
     */
    get boot(): any {
        return this.getValue(CTX_MODULE_BOOT);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<IMeta>}
     * @memberof BootContext
     */
    getConfigureManager(): ConfigureManager<IMeta> {
        return this.getContainer().resolve(ConfigureManager) as ConfigureManager<IMeta>;
    }

    static parse(injector: ICoreInjector, target: Type | BootOption): BootContext {
        return createRaiseContext(injector, BootContext, isToken(target) ? { module: target } : target);
    }

    setOptions(options: T) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.template) {
            this.set(CTX_TEMPLATE, options.template);
        }
        if (options.bootstrap) {
            this.set(CTX_MODULE_BOOT_TOKEN, options.bootstrap);
        }
        if (isDefined(options.data)) {
            this.set(CTX_DATA, options.data);
        }
    }
}
