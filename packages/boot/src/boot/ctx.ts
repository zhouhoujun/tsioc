import { Injectable, Token, LoadType, ProviderType, IInjector } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { CONFIGURATION, MODULE_RUNNABLE, MODULE_STARTUPS, PROCESS_ROOT } from '../tk';
import { Configure } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { AnnoationContext } from '../annotations/ctx';
import { ModuleReflect } from '../modules/reflect';
import { BootstrapMetadata } from '../decorators';
import { BootOption, IBootContext, Template } from '../Context';
import { MessageContext, MessageQueue, RequestOption, ROOT_QUEUE } from '../middlewares';


/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
@Injectable()
export class BootContext<T extends BootOption = BootOption> extends AnnoationContext<T, ModuleReflect> implements IBootContext<T> {


    setRoot(injector: IInjector) {
        this.parent.offDestory(this.destCb);
        (this as any).parent = injector;
        this.parent.onDestroy(this.destCb);
    }
    
    getMessager(): MessageQueue {
        return this.get(ROOT_QUEUE);
    }

    /**
     * send message
     *
     * @param {RequestOption} request request option
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     */
    send(request: RequestOption, ...providers: ProviderType[]): Promise<MessageContext>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {RequestOption} request request options data.
     * @returns {Promise<MessageContext>}
     */
    send(url: string, request: RequestOption, ...providers: ProviderType[]): Promise<MessageContext>;
    async send(url: any, request?: any, ...providers: ProviderType[]): Promise<MessageContext> {
        return this.getMessager().send(url, request, ...providers);
    }

    /**
     * get log manager.
     */
    getLogManager(): ILoggerManager {
        return this.get(ConfigureLoggerManager);
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
                // this.getContainer().setValue(PROCESS_ROOT, url);
                this.root.setValue(PROCESS_ROOT, url);
                this.setValue(PROCESS_ROOT, url);
            }
        }
        return url;
    }

    set baseURL(baseURL: string) {
        this.setValue(PROCESS_ROOT, baseURL);
        this.root.setValue(PROCESS_ROOT, baseURL);
        // this.getContainer().setValue(PROCESS_ROOT, baseURL);
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
        return this.root.resolve(ConfigureManager);
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
