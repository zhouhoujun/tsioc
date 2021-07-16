import { Token, ProviderType, Type, isFunction } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { DIModuleMetadata } from '../metadata/meta';
import { BOOT_TYPES, CONFIGURATION, PROCESS_ROOT } from '../metadata/tk';
import { Configuration } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { ApplicationContext, ApplicationFactory, ApplicationOption, Runner, ServiceFactory, BootstrapOption, ModuleInjector, ServiceFactoryResolver } from '../Context';
import { MessageContext, MessageQueue, RequestOption, ROOT_QUEUE } from '../middlewares';


/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext extends ApplicationContext {

    readonly destroyed = false;
    private _dsryCbs: (() => void)[] = [];
    readonly bootstraps: Runner[] = [];
    readonly args: string[] = [];
    readonly startups: Token[] = [];

    constructor(readonly injector: ModuleInjector) {
        super();
        injector.setValue(ApplicationContext, this);
    }

    get boots() {
        return this.injector.get(BOOT_TYPES);
    }

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    bootstrap<C>(type: Type<C> | ServiceFactory<C>, opts?: BootstrapOption): Runner<C> | Promise<Runner<C>> {
        const factory = isFunction(type) ? this.injector.resolve({ token: ServiceFactoryResolver, target: type }).resolve(type) : type;
        return factory.create({ injector: this.injector, ...opts })?.run(this);
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
        return this.injector.get(ConfigureLoggerManager);
    }

    get baseURL(): string {
        return this.injector.get(PROCESS_ROOT);
    }

    getAnnoation<TM extends DIModuleMetadata>(): TM {
        return this.injector.reflect?.annotation as TM;
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
     * @returns {ConfigureManager<Configuration>}
     */
    getConfigureManager(): ConfigureManager<Configuration> {
        return this.injector.get(ConfigureManager);
    }

    /**
    * destory this.
    */
    destroy(): void {
        if (!this.destroyed) {
            (this as { destroyed: boolean }).destroyed = true;
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs = null;
            this.destroying();
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this._dsryCbs?.unshift(callback);
    }

    protected destroying() {
        this.injector.destroy();
    }

}



export class DefaultApplicationFactory extends ApplicationFactory {

    create<T>(root: ModuleInjector<T>, option?: ApplicationOption<T>): ApplicationContext {
        if (root.reflect.annotation?.baseURL) {
            root.setValue(PROCESS_ROOT, root.reflect.annotation.baseURL);
        }
        const ctx = this.createInstance(root);
        this.initOption(ctx, option);
        return ctx;
    }

    initOption<T>(ctx: ApplicationContext, option: ApplicationOption<T>) {
        if (!option) return;

        if (option.args) ctx.args.push(...option.args);
        if (option.startups) ctx.startups.push(...option.startups);
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

    protected createInstance(inj: ModuleInjector) {
        return new DefaultApplicationContext(inj);
    }
}

