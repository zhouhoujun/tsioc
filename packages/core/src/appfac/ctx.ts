import { Token, ProviderType, Type, isFunction, isBoolean, ModuleRef, ModuleMetadata } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { SERVICES, CONFIGURATION, PROCESS_ROOT } from '../metadata/tk';
import { Configuration, ConfigureManager } from '../configure/config';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootstrapOption } from '../Context';
import { Runnable, RunnableFactory, RunnableFactoryResolver } from '../runnable';
import { Response, Request, Context, MessageQueue, RequestInit, RequestOption, ROOT_QUEUE } from '../middlewares';



/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext extends ApplicationContext {

    readonly destroyed = false;
    private _dsryCbs = new Set<() => void>();
    readonly bootstraps: Runnable[] = [];
    readonly args: string[] = [];
    readonly startups: Token[] = [];

    exit = true;

    constructor(readonly injector: ModuleRef) {
        super();
        injector.setValue(ApplicationContext, this);
    }

    get boots() {
        return this.injector.get(SERVICES);
    }

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    bootstrap<C>(type: Type<C> | RunnableFactory<C>, opts?: BootstrapOption): any {
        const factory = isFunction(type) ? this.injector.resolve({ token: RunnableFactoryResolver, target: type }).resolve(type) : type;
        return factory.create({ injector: this.injector, ...opts }, this).run(this);
    }

    get instance() {
        return this.injector.instance;
    }

    getMessager(): MessageQueue {
        return this.injector.get(ROOT_QUEUE);
    }

    /**
     * send message
     *
     * @param {Context} context request context
     * @returns {Promise<Response>}
     */
    send(context: Context): Promise<Response>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {RequestInit} request request options data.
     * @returns {Promise<Response>}
     */
    send(url: string, request: RequestInit, ...providers: ProviderType[]): Promise<Response>;
    /**
     * send message
     *
     * @param {Request} request request
     * @param {() => Promise<void>} [next]
     * @returns {Promise<Response>}
     */
    send(request: Request, ...providers: ProviderType[]): Promise<Response>;
    /**
     * send message
     *
     * @param {RequestOption} request request option
     * @param {() => Promise<void>} [next]
     * @returns {Promise<Response>}
     */
    send(request: RequestOption, ...providers: ProviderType[]): Promise<Response>;
    async send(url: any, request?: any, ...providers: ProviderType[]): Promise<Response> {
        return this.getMessager().send(url, request, ...providers);
    }

    /**
     * get log manager.
     */
    getLogManager(): ILoggerManager {
        return this.injector.get(ConfigureLoggerManager);
    }

    get baseURL(): string {
        return this.injector.get(PROCESS_ROOT);
    }

    getAnnoation<TM extends ModuleMetadata>(): TM {
        return this.injector.moduleReflect?.annotation as TM;
    }

    /**
     * configuration merge metadata config and all application config.
     */
    getConfiguration(): Configuration {
        return this.injector.get(CONFIGURATION);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager}
     */
    getConfigureManager(): ConfigureManager {
        return this.injector.get(ConfigureManager);
    }

    /**
    * destory this.
    */
    destroy(): void {
        if (!this.destroyed) {
            (this as { destroyed: boolean }).destroyed = true;
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs.clear();
            this.destroying();
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this._dsryCbs.add(callback);
    }

    protected destroying() {
        this.injector.destroy();
    }

}


/**
 * default application factory.
 */
export class DefaultApplicationFactory extends ApplicationFactory {

    create<T>(root: ModuleRef<T>, option?: ApplicationOption<T>): ApplicationContext {
        if (root.moduleReflect.annotation?.baseURL) {
            root.setValue(PROCESS_ROOT, root.moduleReflect.annotation.baseURL);
        }
        const ctx = this.createInstance(root);
        this.initOption(ctx, option);
        return ctx;
    }

    initOption<T>(ctx: ApplicationContext, option?: ApplicationOption<T>) {
        if (!option) return;

        if (option.args) ctx.args.push(...option.args);
        if (isBoolean(option.exit)) {
            (ctx as DefaultApplicationContext).exit = option.exit;
        }
        const mgr = ctx.getConfigureManager();
        if (option.configures && option.configures.length) {
            option.configures.forEach(cfg => {
                mgr.useConfiguration(cfg);
            });
        } else {
            // load default config.
            mgr.useConfiguration();
        }
    }

    protected createInstance(inj: ModuleRef) {
        return new DefaultApplicationContext(inj);
    }
}
