import { Token, ProviderType, IInjector, Type, IProvider, ROOT_INJECTOR, refl, isFunction } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { CONFIGURATION, CTX_ARGS, PROCESS_ROOT } from '../tk';
import { Configure } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootContext, BootFactory, BootstrapOption, IModuleExports, ModuleContext, ModuleRegistered } from '../Context';
import { MessageContext, MessageQueue, RequestOption, ROOT_QUEUE } from '../middlewares';
import { DIModuleMetadata } from '../decorators';
import { mdInjStrategy } from '../modules/ctx';
import { ModuleStrategy } from '../modules/strategy';
import { ModuleReflect } from '../reflect';


/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext<T = any> extends ApplicationContext<T> {

    imports: ModuleContext[] = [];
    readonly reflect: ModuleReflect<T>;
    readonly startups: Token[] = [];
    readonly boots: Type[] = [];
    args: string[];
    private _instance: T;
    readonly regIn = 'root';

    readonly bootstraps: BootContext[] = [];

    constructor(readonly type: Type<T>, parent?: IInjector, strategy: ModuleStrategy = mdInjStrategy) {
        super(parent, strategy)
        this.reflect = refl.get(type);
    }


    get exports() {
        return this as IModuleExports;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.resolve({ token: this.type, regify: true });
        }
        return this._instance;
    }


    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    bootstrap(type: Type, opts?: BootstrapOption): any {
        return this.getService({ token: BootFactory, target: type }).create(type, { injector: this, ...opts });
    }

    getInstance<T>(key: Token<T>, providers?: IProvider): T {
        if (key === ApplicationContext || key === ROOT_INJECTOR) return this as any;
        return super.getInstance(key, providers);
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
        return this.parent.get(ConfigureLoggerManager);
    }

    get baseURL(): string {
        return this.getInstance(PROCESS_ROOT);
    }

    getAnnoation<T extends DIModuleMetadata>(): T {
        return this.reflect?.annotation as T;
    }

    /**
     * configuration merge metadata config and all application config.
     */
    getConfiguration(): Configure {
        return this.getInstance(CONFIGURATION);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager<Configure>}
     */
    getConfigureManager(): ConfigureManager<Configure> {
        return this.get(ConfigureManager);
    }
}



export class DefaultApplicationFactory extends ApplicationFactory {

    constructor() {
        super();
    }

    async create<T>(type: Type<T> | ApplicationOption<T>, parent?: IInjector): Promise<ApplicationContext<T>> {
        let ctx: ApplicationContext<T>;
        if (isFunction(type)) {
            ctx = this.createInstance(type, parent);
        } else {
            ctx = await this.createByOption(type, parent);
        }
        this.regModule(ctx);
        return ctx;
    }

    protected regModule(ctx: ApplicationContext) {
        const state = ctx.state();
        if (ctx.reflect.imports) {
            ctx.register(ctx.reflect.imports);
            ctx.reflect.imports.forEach(ty => {
                const importRef = state.getRegistered<ModuleRegistered>(ty)?.moduleRef;
                if (importRef) {
                    ctx.imports.unshift(importRef);
                }
            })
        }
        if (ctx.reflect.components) ctx.register(ctx.reflect.components);
        if (ctx.reflect.annotation.providers) {
            ctx.parse(ctx.reflect.annotation.providers);
        }
    }


    protected async createByOption<T>(option: ApplicationOption<T>, parent?: IInjector) {
        parent = parent || option.injector;
        const ctx = this.createInstance(option.type, option.regIn === 'root' ? (parent.getInstance(ROOT_INJECTOR) ?? parent) : parent);
        if (option.deps) {
            await ctx.load(option.deps);
        }
        if (option.providers) {
            ctx.parse(option.providers);
        }
        if (option.args) {
            ctx.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            ctx.setValue(PROCESS_ROOT, option.baseURL);
        }
        ctx.args = option.args;
        if (option.startups) {
            ctx.startups.push(...option.startups);
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
        return ctx;
    }

    protected createInstance(type: Type, parent: IInjector) {
        return new DefaultApplicationContext(type, parent);
    }
}

