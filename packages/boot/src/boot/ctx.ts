import { Injectable, Token } from '@tsdi/ioc';
import { LoadType } from '@tsdi/core';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { CONFIGURATION, MODULE_RUNNABLE, MODULE_STARTUPS, PROCESS_ROOT } from '../tk';
import { Configure } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { AnnoationContext } from '../annotations/ctx';
import { ModuleReflect } from '../modules/reflect';
import { BootstrapMetadata } from '../decorators';
import { BootOption, IBootContext, Template } from '../Context';


/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
@Injectable()
export class BootContext<T extends BootOption = BootOption> extends AnnoationContext<T, ModuleReflect> implements IBootContext<T> {

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
        return this.get(token) ?? this.injector.get(token);
    }

    /**
     * get statup service tokens.
     */
    getStarupTokens(): Token[] {
        return this.getValue(MODULE_STARTUPS);
    }

    /**
     * boot base url.
     *
     * @type {string}
     * @memberof BootContext
     */
    get baseURL(): string {
        let url = this.getValue(PROCESS_ROOT);
        if (!url) {
            url = this.getAnnoation()?.baseURL;
            if (url) {
                this.getContainer().setValue(PROCESS_ROOT, url);
                this.setValue(PROCESS_ROOT, url);
            }
        }
        return url;
    }

    getAnnoation<T extends BootstrapMetadata>(): T {
        return this.reflect.annotation as T;
    }

    /**
     * configuration merge metadata config and all application config.
     *
     * @memberof BootContext
     */
    getConfiguration(): Configure {
        return this.getValue(CONFIGURATION);
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

    /**
     * get template.
     */
    get template(): Template {
        return this.options.template;
    }

    get args(): string[] {
        return this.options.args;
    }

    get data(): any {
        return this.options.data;
    }

    get bootstrap(): Token {
        return this.options.bootstrap;
    }

    get deps(): LoadType[] {
        return this.options.deps;
    }

    /**
     * get boot startup instance.
     *
     * @type {IStartup}
     * @memberof BootContext
     */
    getStartup(): any {
        return this.getValue(MODULE_RUNNABLE);
    }

    /**
     * target.
     */
    target: any;
    /**
     * boot instance.
     */
    boot: any;


    protected setOptions(options: T) {
        if (!options) {
            return this;
        }
        if (!options.startups) {
            options.startups = [];
        }
        if (options.baseURL) {
            this.setValue(PROCESS_ROOT, options.baseURL);
        }
        return super.setOptions(options);
    }
}
