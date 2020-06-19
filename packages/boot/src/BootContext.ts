import { Type, Injectable, createContext, Token, isToken, isDefined, tokenId, TokenId } from '@tsdi/ioc';
import { LoadType, IModuleLoader, ICoreInjector } from '@tsdi/core';
import { ILoggerManager, ConfigureLoggerManger } from '@tsdi/logs';
import { IStartup } from './runnable/Startup';
import {
    CTX_APP_CONFIGURE, CTX_DATA, CTX_APP_ENVARGS, CTX_TEMPLATE, CTX_MODULE_BOOT_TOKEN,
    CTX_MODULE_BOOT, CTX_MODULE_INST, CTX_MODULE_STARTUP, CTX_APP_STARTUPS
} from './context-tokens';
import { RunnableConfigure, ProcessRunRootToken } from './annotations/RunnableConfigure';
import { IBuildContext } from './builder/IBuildContext';
import { ConfigureManager } from './annotations/ConfigureManager';
import { AnnoationOption, AnnoationContext } from './AnnoationContext';
import { IModuleReflect } from './modules/IModuleReflect';
import { BootstrapMetadata } from './decorators/Bootstrap';


/**
 *  current application boot context token.
 */
export const ApplicationContextToken: TokenId<IBootContext> = tokenId<IBootContext>('APP__CONTEXT');

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
    * auto statupe or not. default true.
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

    /**
     * get log manager.
     */
    getLogManager(): ILoggerManager;
    /**
     * get service in context.
     * @param token
     */
    getService<T>(token: Token<T>): T;
    /**
     * get statup service tokens.
     */
    getStarupTokens(): Token[];

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

    /**
     * get boot statup.
     */
    getStartup(): IStartup;

    /**
     * configuration merge metadata config and all application config.
     *
     * @type {T}
     * @memberof BootContext
     */
    getConfiguration(): RunnableConfigure;

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<RunnableConfigure>}
     */
    getConfigureManager(): ConfigureManager<RunnableConfigure>;

    /**
     * get target reflect.
     */
    getTargetReflect(): IModuleReflect;

    /**
     * annoation metadata.
     */
    getAnnoation(): BootstrapMetadata;

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

    /**
     * get log manager.
     */
    getLogManager(): ILoggerManager {
        return this.injector.resolve(ConfigureLoggerManger);
    }

    /**
     * get service in application context.
     * @param token
     */
    getService<T>(token: Token<T>): T {
        return this.context.get(token) ?? this.injector.get(token);
    }

    /**
     * get statup service tokens.
     */
    getStarupTokens(): Token[] {
        return this.getValue(CTX_APP_STARTUPS);
    }

    /**
     * boot base url.
     *
     * @type {string}
     * @memberof BootContext
     */
    get baseURL(): string {
        let url = this.context.getValue(ProcessRunRootToken);
        if (!url) {
            url = this.getAnnoation()?.baseURL;
            if (url) {
                this.getContainer().setValue(ProcessRunRootToken, url);
                this.context.setValue(ProcessRunRootToken, url);
            }
        }
        return url;
    }

    getAnnoation(): BootstrapMetadata {
        return super.getAnnoation();
    }

    getTargetReflect(): IModuleReflect {
        return super.getTargetReflect();
    }

    /**
     * configuration merge metadata config and all application config.
     *
     * @memberof BootContext
     */
    getConfiguration(): RunnableConfigure {
        return this.context.getValue(CTX_APP_CONFIGURE);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<RunnableConfigure>}
     * @memberof BootContext
     */
    getConfigureManager(): ConfigureManager<RunnableConfigure> {
        return this.injector.resolve(ConfigureManager);
    }

    get args(): string[] {
        return this.context.getValue(CTX_APP_ENVARGS) || [];
    }

    get data(): any {
        return this.context.getValue(CTX_DATA);
    }

    /**
     * get boot startup instance.
     *
     * @type {IStartup}
     * @memberof BootContext
     */
    getStartup(): IStartup {
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

    static parse(injector: ICoreInjector, target: Type | BootOption): BootContext {
        return createContext(injector, BootContext, isToken(target) ? { module: target } : target);
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


export function isBootContext(target: any): target is IBootContext {
    return target instanceof BootContext;
}
