import { Injectable, Token, LoadType, ProviderType, IInjector, Type, lang, IProvider, isPlainObject, ClassType, refl } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { BOOTCONTEXT, CONFIGURATION, CTX_OPTIONS, MODULE_STARTUPS, PROCESS_ROOT } from '../tk';
import { Configure } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { AnnoationContext } from '../annotations/ctx';
import { ModuleReflect } from '../modules/reflect';
import { BootOption, BootstrapOption, IBootContext } from '../Context';
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


    setInjector(injector: IInjector) {
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
        return this.parent.get(ConfigureLoggerManager);
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
                this.parent.setValue(PROCESS_ROOT, url);
            }
        }
        return url;
    }

    set baseURL(baseURL: string) {
        this.parent.setValue(PROCESS_ROOT, baseURL);
    }

    getAnnoation<T extends DIModuleMetadata>(): T {
        return this.reflect?.annotation as T;
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
        return this.parent.get(ConfigureManager);
    }

    get args(): string[] {
        return this.options.args;
    }

    get data(): any {
        return this.options.data;
    }

    get bootToken(): Type {
        return this.options.bootstrap ?? this.getAnnoation().bootstrap;
    }

    get deps(): LoadType[] {
        return this.options.deps;
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
    bootstrap(type: Type, opts?: BootstrapOption): any {
        const injector = opts?.injector ?? this.injector;
        if (!injector.state().isRegistered(type)) {
            injector.register(type);
        }
        return this.createBoot(injector, type, this, this.providers);
    }

    protected createBoot(injector: IInjector, type: Type, ctx: IBootContext, providers: IProvider) {
        const boot = injector.resolve(type, providers, { provide: BOOTCONTEXT, useValue: ctx }, { provide: lang.getClass(ctx), useValue: ctx });
        let startup: IRunnable;
        if (boot instanceof Runnable) {
            startup = boot;
        } else {
            startup = injector.getService(
                { tokens: [Runnable], target: boot },
                { provide: BOOTCONTEXT, useValue: ctx },
                { provide: lang.getClass(ctx), useValue: ctx }

            );
        }
        if (startup) {
            ctx.onDestroy(() => startup.destroy());
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
            this.baseURL = options.baseURL;
        }
        return super.setOptions(options);
    }
}

/**
 * create boot context.
 * @param root 
 * @param target 
 * @param args 
 * @returns 
 */
export function createContext<T extends IBootContext>(root: IInjector, target: ClassType | BootOption, args?: string[]): T {
    let md: Type;
    let injector: IInjector;
    let options: BootOption;
    if (isPlainObject<BootOption>(target)) {
        md = target.type || target.bootstrap;
        injector = target.injector;
        if (isModuleType(md)) {
            options = { ...target, args, type: md };
        } else {
            options = { ...target, args, bootstrap: md };
            options.type = undefined;
        }
    } else {
        md = target as Type;
        if (isModuleType(md)) {
            options = { type: md, args };
        } else {
            options = { bootstrap: md, args };
        }
    }
    if (!injector) {
        const state = root.state();
        injector = state.isRegistered(md) ? state.getInjector(md) || root : root;
    }
    return injector.getService<T>({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
}


export function isModuleType(target: ClassType) {
    return refl.get<ModuleReflect>(target)?.annoType === 'module';
}

