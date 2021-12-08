import { Token, ProviderType, Type, isFunction, ModuleMetadata, DestroyCallback } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { CONFIGURATION, PROCESS_ROOT } from './metadata/tk';
import { Configuration, ConfigureManager } from './configure/config';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootstrapOption } from './context';
import { Runner, RunnableFactory, RunnableFactoryResolver, RunnableSet } from './runnable';
import { Response, Request, Context, MessageQueue, RequestInit, RequestOption, ROOT_QUEUE } from './middlewares';
import { ModuleRef } from './module.ref';
import { ApplicationArguments } from './shutdown';
import { ServerSet } from './server';
import { ClientSet } from './client';
import { ServiceSet } from './service';




/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext extends ApplicationContext {

    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();
    readonly bootstraps: Runner[] = [];
    readonly startups: Token[] = [];

    exit = true;

    constructor(readonly injector: ModuleRef) {
        super();
        injector.setValue(ApplicationContext, this);
    }

    get args() {
        return this.injector.get(ApplicationArguments)
    }

    get services() {
        return this.injector.get(ServiceSet);
    }

    get runnables() {
        return this.injector.get(RunnableSet);
    }

    get servers() {
        return this.injector.get(ServerSet);
    }

    get clients() {
        return this.injector.get(ClientSet);
    }

    get destroyed() {
        return this._destroyed;
    }

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    bootstrap<C>(type: Type<C> | RunnableFactory<C>, opts?: BootstrapOption): any {
        const factory = isFunction(type) ? this.injector.resolve({ token: RunnableFactoryResolver, target: type }).resolve(type) : type;
        return factory.create({ injector: this.injector, ...opts }, this).run();
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

    async dispose(): Promise<void> {
        const modules = Array.from(this.injector.platform().modules).reverse();
        await Promise.all(modules.map(m => (m as ModuleRef)?.dispose()));
        this.destroy();
    }

    /**
    * destory this.
    */
    destroy() {
        if (this._destroyed) return;
        if (!this.injector.destroyed && !this.injector.shutdownHandlers.disposed) {
            return this.dispose();
        } else {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.destroy());
            } finally {
                this._dsryCbs.clear();
                const parent = this.injector.parent;
                this.injector.destroy();
                if (parent) parent.destroy();
            }
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: DestroyCallback): void {
        this._dsryCbs.add(callback);
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

