import { Injectable, Token, LoadType } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { CONFIGURATION, MODULE_RUNNABLE, MODULE_STARTUPS, PROCESS_ROOT } from '../tk';
import { Configure } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { AnnoationContext } from '../annotations/ctx';
import { ModuleReflect } from '../modules/reflect';
import { BootstrapMetadata } from '../decorators';
import { BootOption, IBootContext, Template } from '../Context';
import { MessageQueue, ROOT_QUEUE } from '../middlewares';


/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
@Injectable()
export class BootContext<T extends BootOption = BootOption> extends AnnoationContext<T, ModuleReflect> implements IBootContext<T> {

    getMessager(): MessageQueue {
        return this.injector.get(ROOT_QUEUE);
    }
    /**
     * get log manager.
     */
    getLogManager(): ILoggerManager {
        return this.injector.get(ConfigureLoggerManager);
    }

    /**
     * get service in application context.
     * @param token
     */
    getService<T>(token: Token<T>): T {
        return this.providers.get(token) ?? this.injector.get(token);
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

    set baseURL(baseURL: string) {
        this.setValue(PROCESS_ROOT, baseURL);
    }

    getAnnoation<T extends BootstrapMetadata>(): T {
        return this.reflect.annotation as T;
    }

    /**
     * configuration merge metadata config and all application config.
     */
    getConfiguration(): Configure {
        return this.getValue(CONFIGURATION);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<Configure>}
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
