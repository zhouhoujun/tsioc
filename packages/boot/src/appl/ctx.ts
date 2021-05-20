import { Token, ProviderType, IInjector, Type, isFunction } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { BOOT_TYPES, CONFIGURATION, PROCESS_ROOT } from '../tk';
import { Configure } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootContext, BootFactory, BootstrapOption, ModuleFactory, ModuleInjector } from '../Context';
import { MessageContext, MessageQueue, RequestOption, ROOT_QUEUE } from '../middlewares';
import { DIModuleMetadata } from '../decorators';
import { AnnotationReflect } from '../reflect';


/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext<T = any> extends ApplicationContext<T> {

    readonly destroyed = false;
    private _dsryCbs: (() => void)[] = [];
    readonly bootstraps: BootContext[] = [];
    readonly args: string[] = [];
    readonly startups: Token[] = [];

    constructor(readonly injector: ModuleInjector<T>) {
        super();
        injector.setValue(ApplicationContext, this);
    }

    get boots() {
        return this.injector.getInstance(BOOT_TYPES);
    }

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    bootstrap<T>(type: Type<T>| AnnotationReflect<T>, opts?: BootstrapOption): any {
        return this.injector.resolve({ token: BootFactory, target: type }).create(type, { injector: this.injector, ...opts });
    }

    get instance(): T {
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
        return this.injector.getInstance(PROCESS_ROOT);
    }

    getAnnoation<T extends DIModuleMetadata>(): T {
        return this.injector.reflect?.annotation as T;
    }

    /**
     * configuration merge metadata config and all application config.
     */
    getConfiguration(): Configure {
        return this.injector.getInstance(CONFIGURATION);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<Configure>}
     */
    getConfigureManager(): ConfigureManager<Configure> {
        return this.injector.get(ConfigureManager);
    }

    /**
    * destory this.
    */
    destroy(): void {
        if (!this.destroyed) {
            (this as {destroyed:boolean}).destroyed = true;
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
        if (this._dsryCbs) {
            this._dsryCbs.push(callback);
        }
    }

    protected destroying() {
        this.injector.destroy();
    }

}



export class DefaultApplicationFactory extends ApplicationFactory {

    create<T>(type: ApplicationOption<T>): ApplicationContext<T>;
    create<T>(type: ModuleInjector<T>, option?: ApplicationOption<T>): ApplicationContext<T>;
    create<T>(type: Type<T>, parent?: IInjector): ApplicationContext<T>;
    create<T>(arg1: any, arg2?: any): ApplicationContext<T> {
        let ctx: ApplicationContext<T>;
        if (isFunction(arg1)) {
            const parent = arg2 as IInjector;
            return this.createInstance(parent.getInstance(ModuleFactory).create(arg1));
        } else {
            let option: ApplicationOption<T>;
            if (arg1 instanceof ModuleInjector) {
                ctx = this.createInstance(arg1);
                option = arg2;
            } else {
                option = arg1;
                const parent: IInjector = option.injector || arg2;
                ctx = this.createInstance(parent.getInstance(ModuleFactory).create(option, parent));
            }
            this.initOption(ctx, option);
            return ctx;
        }
    }

    initOption<T>(ctx: ApplicationContext<T>, option: ApplicationOption<T>) {
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

