import { LoadType, InjectToken, Type, Injectable, createRaiseContext, Token, isToken, isDefined, CTX_CURR_SCOPE, isTypeObject, IInjector } from '@tsdi/ioc';
import { IModuleLoader } from '@tsdi/core';
import { ILoggerManager, ConfigureLoggerManger } from '@tsdi/logs';
import { Startup } from './runnable/Startup';
import { StartupServices } from './services/StartupServices';
import { CTX_APP_CONFIGURE, CTX_DATA, CTX_APP_ENVARGS } from './context-tokens';
import { RunnableConfigure, ProcessRunRootToken } from './annotations/RunnableConfigure';
import { IComponentContext } from './builder/ComponentContext';
import { ConfigureManager } from './annotations/ConfigureManager';
import { AnnoationOption, AnnoationContext } from './AnnoationContext';



/**
 *  current application boot context token.
 */
export const ApplicationContextToken = new InjectToken<BootContext>('APP__CONTEXT');

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
    injector?: IInjector;
}

/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
@Injectable
export class BootContext<T extends BootOption = BootOption, CFG extends RunnableConfigure = RunnableConfigure>
    extends AnnoationContext<T, CFG>
    implements IComponentContext {


    getLogManager(): ILoggerManager {
        return this.getContainer().resolve(ConfigureLoggerManger);
    }

    /**
     * boot base url.
     *
     * @type {string}
     * @memberof BootContext
     */
    get baseURL(): string {
        let url = this.get(ProcessRunRootToken)
        if (!url) {
            url = this.getOptions().baseURL || (this.annoation ? this.annoation.baseURL : '');
            if (url) {
                this.getContainer().registerValue(ProcessRunRootToken, url);
            }
        }
        return url;
    }

    /**
     * configuration merge metadata config and all application config.
     *
     * @type {CFG}
     * @memberof BootContext
     */
    get configuration(): CFG {
        return this.get(CTX_APP_CONFIGURE) as CFG;
    }

    get args(): string[] {
        return this.get(CTX_APP_ENVARGS) || [];
    }

    get data(): any {
        return this.get(CTX_DATA);
    }

    get scope(): any {
        return this.get(CTX_CURR_SCOPE);
    }

    /**
     * target module instace.
     *
     * @type {*}
     * @memberof BootContext
     */
    target?: any;

    /**
     * configure bootstrap instance.
     *
     * @type {T}
     * @memberof RunnableOptions
     */
    bootstrap?: any;

    /**
     * bootstrap runnable service.
     *
     * @type {IStartup}
     * @memberof BootContext
     */
    runnable?: Startup;

    /**
     * get template.
     */
    get template(): any {
        return this.getOptions().template;
    }
    /**
     * startup services
     *
     * @type {Token[]}
     * @memberof BootContext
     */
    get starupServices(): StartupServices {
        return this.getContainer().resolve(StartupServices);
    }

    getContext<T>(token: Token<T>): T {
        return this.get(token);
    }

    setContext(token: Token, provider: any): void {
        this.set(token, provider);
    }

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
     * @returns {ConfigureManager<CFG>}
     * @memberof BootContext
     */
    getConfigureManager(): ConfigureManager<CFG> {
        return this.getContainer().resolve(ConfigureManager) as ConfigureManager<CFG>;
    }

    static parse(injector: IInjector, target: Type | BootOption): BootContext {
        return createRaiseContext(injector, BootContext, isToken(target) ? { module: target } : target);
    }

    setOptions(options: T) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.scope) {
            this.set(CTX_CURR_SCOPE, options.scope);
        }
        if (isTypeObject(options.target)) {
            this.target = options.target;
        }
        if (isDefined(options.data)) {
            this.set(CTX_DATA, options.data);
        }
    }
}
