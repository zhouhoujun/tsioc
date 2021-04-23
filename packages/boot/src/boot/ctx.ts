import { Injectable, Token, LoadType, ProviderType, IInjector, Type, lang } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { BOOTCONTEXT, CONFIGURATION, MODULE_STARTUPS, PROCESS_ROOT } from '../tk';
import { Configure } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { AnnoationContext } from '../annotations/ctx';
import { ModuleReflect } from '../modules/reflect';
import { BootOption, IBootContext } from '../Context';
import { MessageContext, MessageQueue, RequestOption, ROOT_QUEUE } from '../middlewares';
import { DIModuleMetadata } from '../decorators';
import { IRunnable, Runnable } from '../runnable/Runnable';


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
                this.root.setValue(PROCESS_ROOT, url);
                this.setValue(PROCESS_ROOT, url);
            }
        }
        return url;
    }

    set baseURL(baseURL: string) {
        this.setValue(PROCESS_ROOT, baseURL);
        this.root.setValue(PROCESS_ROOT, baseURL);
    }

    getAnnoation<T extends DIModuleMetadata>(): T {
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

    get bootToken(): Type {
        return this.options.bootstrap;
    }

    get deps(): LoadType[] {
        return this.options.deps;
    }

    private _startup: IRunnable;
    /**
     * get boot startup instance.
     *
     * @type {IStartup}
     */
    getStartup(): IRunnable {
        return this._startup;
    }

    /**
     * target.
     */
    target: any;
    /**
     * boot instance.
     */
    boot: any;

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    async bootstrap(type: Type, opts?: any): Promise<any> {
        if (!this.root.state().isRegistered(type)){
            this.root.register(type);
        }
        const boot = this.boot = this.root.resolve({ token: type, providers: [this.providers, { provide: BOOTCONTEXT, useValue: this }, { provide: lang.getClass(this), useValue: this }] });
        let startup: IRunnable;
        if (boot instanceof Runnable) {
            startup = boot;
        } else {
            startup = this.root.getService(
                { tokens: [Runnable], target: boot },
                { provide: BOOTCONTEXT, useValue: this },
                { provide: lang.getClass(this), useValue: this }

            );
        }

        if (startup) {
            this._startup = startup;
            this.onDestroy(() => startup.destroy());
            await startup.configureService(this);
        }
        return startup;
    }


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
