import { Type, Injectable, Token, isToken, isDefined, IInjector } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { IStartup } from '../runnable/Startup';
import {
    CTX_APP_CONFIGURE, CTX_DATA, CTX_APP_ENVARGS, CTX_TEMPLATE, CTX_MODULE_BOOT_TOKEN,
    CTX_MODULE_BOOT, CTX_MODULE_INST, CTX_MODULE_STARTUP, CTX_APP_STARTUPS, ProcessRunRootToken
} from '../tk';
import { Configure } from '../configure/Configure';
import { ConfigureManager } from '../configure/manager';
import { AnnoationContext, createContext } from '../annotations/ctx';
import { IModuleReflect } from '../modules/reflect';
import { BootstrapMetadata } from '../decorators';
import { BootOption, IBootContext } from '../Context';


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
        return this.injector.resolve(ConfigureLoggerManager);
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
    getConfiguration(): Configure {
        return this.context.getValue(CTX_APP_CONFIGURE);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<Configure>}
     * @memberof BootContext
     */
    getConfigureManager(): ConfigureManager<Configure> {
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

    static parse(injector: IInjector, target: Type | BootOption): BootContext {
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
        if (options.startups) {
            this.setValue(CTX_APP_STARTUPS, options.startups)
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
