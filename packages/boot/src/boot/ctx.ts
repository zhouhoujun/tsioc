import { Token } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { IStartup } from '../runnable/Startup';
import {
    CONFIGURATION, MODULE_STARTUP, ProcessRunRootToken
} from '../tk';
import { Configure } from '../configure/Configure';
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
        return this.options.startups;
    }

    /**
     * boot base url.
     *
     * @type {string}
     * @memberof BootContext
     */
    get baseURL(): string {
        let url = this.getValue(ProcessRunRootToken);
        if (!url) {
            url = this.getAnnoation()?.baseURL;
            if (url) {
                this.getContainer().setValue(ProcessRunRootToken, url);
                this.setValue(ProcessRunRootToken, url);
            }
        }
        return url;
    }

    getAnnoation<T extends BootstrapMetadata>(): T {
        return this.reflect.moduleMetadata as T;
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

    /**
     * get boot startup instance.
     *
     * @type {IStartup}
     * @memberof BootContext
     */
    getStartup(): IStartup {
        return this.getValue(MODULE_STARTUP);
    }


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
            this.setValue(ProcessRunRootToken, options.baseURL);
        }
        return super.setOptions(options);
    }
}
