import { Token, LoadType, ProviderType, IInjector, Type, IProvider, ROOT_INJECTOR } from '@tsdi/ioc';
import { ILoggerManager, ConfigureLoggerManager } from '@tsdi/logs';
import { CONFIGURATION, PROCESS_ROOT } from '../tk';
import { Configure } from '../configure/config';
import { ConfigureManager } from '../configure/manager';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootFactory, BootstrapOption } from '../Context';
import { MessageContext, MessageQueue, RequestOption, ROOT_QUEUE } from '../middlewares';
import { DIModuleMetadata } from '../decorators';
import { DefaultModuleContext, DefaultModuleFactory } from '../modules/ctx';
import { ModuleStrategy } from '../modules/strategy';


/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext<T = any> extends DefaultModuleContext<T> implements ApplicationContext<T> {

    readonly startups: Token[] = [];
    readonly boots: Type[] = [];
    args: string[];
    deps: LoadType[];

    constructor(target: Type<T>, parent?: IInjector, strategy?: ModuleStrategy) {
        super(target, parent, '', strategy);
    }

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    bootstrap(type: Type, opts?: BootstrapOption): any {
        return this.getService({ token: BootFactory, target: type }).create({ type, injector: this, ...opts });
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
        return this.parent.get(ConfigureManager);
    }
}


export class DefaultApplicationFactory<CT extends ApplicationContext = ApplicationContext, OPT extends ApplicationOption = ApplicationOption> extends DefaultModuleFactory<CT, OPT> implements ApplicationFactory {

    constructor(ctor: Type = DefaultApplicationContext) {
        super(ctor)
    }

    protected initOption(ctx: CT, option: OPT) {
        super.initOption(ctx, option);
        const appctx = ctx as ApplicationContext as DefaultApplicationContext;
        appctx.args = option.args;
        appctx.deps = option.deps;
        if (option.startups) {
            appctx.startups.push(...option.startups);
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
}

// /**
//  * create boot context.
//  * @param root 
//  * @param target 
//  * @param args 
//  * @returns 
//  */
// export function createContext<T extends IBootContext>(root: IInjector, target: ClassType | BootOption, args?: string[]): T {
//     let md: Type;
//     let injector: IInjector;
//     let options: BootOption;
//     if (isPlainObject<BootOption>(target)) {
//         md = target.type || target.bootstrap;
//         injector = target.injector;
//         if (isModuleType(md)) {
//             options = { ...target, args, type: md };
//         } else {
//             options = { ...target, args, bootstrap: md };
//             options.type = undefined;
//         }
//     } else {
//         md = target as Type;
//         if (isModuleType(md)) {
//             options = { type: md, args };
//         } else {
//             options = { bootstrap: md, args };
//         }
//     }
//     if (!injector) {
//         const state = root.state();
//         injector = state.isRegistered(md) ? state.getInjector(md) || root : root;
//     }
//     return injector.getService<T>({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
// }


// export function isModuleType(target: ClassType) {
//     return refl.get<ModuleReflect>(target)?.annoType === 'module';
// }

