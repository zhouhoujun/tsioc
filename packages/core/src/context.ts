import {
    ProviderType, LoadType, Injector, Abstract, Type, InvokeOption,
    ModuleLoader, Destroyable, Modules, DestroyCallback
} from '@tsdi/ioc';
import { LoggerManager } from '@tsdi/logs';
import { Configuration, ConfigureManager } from './configure/config';
import { Request, RequestInit, RequestOption } from './middlewares/request';
import { Response } from './middlewares/response';
import { Context } from './middlewares/context';
import { MessageQueue } from './middlewares/queue';
import { Runnable, RunnableSet, RunnableFactory } from './runnable';
import { ServiceSet } from './service';
import { ClientSet } from './client';
import { ServerSet } from './server';
import { ModuleOption } from './module.factory';
import { ModuleRef } from './module.ref';
import { ApplicationArguments } from './args';


/**
 * bootstrap option for {@link Runnable}.
 */
export interface BootstrapOption extends InvokeOption {
    /**
     * injector
     */
    injector?: Injector;
    /**
     * providers.
     */
    providers?: ProviderType[];
    /**
     * args.
     */
    args?: string[];
}

/**
 * application context for global.
 * implements {@link Destroyable}, {@link Disposable}
 */
@Abstract()
export abstract class ApplicationContext implements Destroyable {
    /**
     * application root module injector.
     */
    abstract get injector(): ModuleRef;
    /**
     * module instance.
     */
    abstract get instance(): any;
    /**
     * bootstrap type
     * @param type bootstrap type.
     * @param opts bootstrap option.
     */
    abstract bootstrap<C>(type: Type<C> | RunnableFactory<C>, opts?: BootstrapOption): any;
    /**
     * get message queue.
     */
    abstract getMessager(): MessageQueue;
    /**
     * send message
     *
     * @param {Context} context request context
     * @returns {Promise<Response>}
     */
    abstract send(context: Context): Promise<Response>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {RequestInit} request request options data.
     * @returns {Promise<Response>}
     */
    abstract send(url: string, request: RequestInit, ...providers: ProviderType[]): Promise<Response>;
    /**
     * send message
     *
     * @param {Request} request request
     * @param {() => Promise<void>} [next]
     * @returns {Promise<Response>}
     */
    abstract send(request: Request, ...providers: ProviderType[]): Promise<Response>;
    /**
     * send message
     *
     * @param {RequestOption} request request option
     * @param {() => Promise<void>} [next]
     * @returns {Promise<Response>}
     */
    abstract send(request: RequestOption, ...providers: ProviderType[]): Promise<Response>;
    /**
     * get log manager.
     */
    abstract getLogManager(): LoggerManager;
    /**
     * boot base url.
     *
     * @type {string}
     */
    abstract get baseURL(): string;
    /**
     * application args of type {@link ApplicationArguments}.
     *
     * @type {ApplicationArguments}
     */
    abstract get args(): ApplicationArguments;

    /**
     * get application global configuration of type {@link Configuration}.
     */
    abstract getConfiguration(): Configuration;

    /**
     * get configure manager of type {@link ConfigureManager}.
     *
     * @returns {ConfigureManager}
     */
    abstract getConfigureManager(): ConfigureManager;
    /**
     * application global servers.
     *
     * type of {@link ServerSet}
     */
    abstract get servers(): ServerSet;
    /**
     * application global clients.
     *
     * type of {@link ClientSet}
     */
    abstract get clients(): ClientSet;
    /**
     * application global services.
     *
     * type of {@link ServiceSet}
     */
    abstract get services(): ServiceSet;
    /**
     * application global runnables.
     *
     * type of {@link RunnableSet}
     */
    abstract get runnables(): RunnableSet;
    /**
     * application global bootstraps.
     */
    abstract get bootstraps(): Runnable[];
    /**
     * destroyed or not.
     */
    abstract get destroyed(): boolean;
    /**
     * Destroys the component instance and all of the data structures associated with it.
     */
    abstract destroy(): void | Promise<void>;
    /**
     * A lifecycle hook that provides additional developer-defined cleanup
     * functionality for the component.
     * @param callback A handler function that cleans up developer-defined data
     * associated with this component. Called when the `destroy()` method is invoked.
     */
    abstract onDestroy(callback: DestroyCallback): void;
}

/**
 * boot context.
 */
export const BootContext = ApplicationContext;


/**
 * application option.
 */
export interface ApplicationOption<T = any> extends ModuleOption {
    /**
     * boot base url.
     *
     * @type {string}
     */
    baseURL?: string;
    /**
     * boot run env args.
     *
     * @type {string[]}
     */
    args?: string[];
    /**
     * injector.
     */
    injector?: Injector;
    /**
     * target module type.
     *
     * @type {ClassType}
     */
    type: Type<T>;
    /**
     * module loader
     *
     * @type {ModuleLoader}
     */
    loader?: ModuleLoader;
    /**
     * custom configures
     *
     * @type {((string | Configuration)[])}
     */
    configures?: (string | Configuration)[];
    /**
     * application dependencies.
     *
     * @type {LoadType[]}
     */
    loads?: LoadType[];
    /**
     * application deps.
     */
    platformDeps?: Modules[];
    /**
     * application providers.
     */
    platformProviders?: ProviderType[];
}

/**
 * application context factory, to create instance of {@link ApplicationContext}.
 */
@Abstract()
export abstract class ApplicationFactory {
    /**
     * create application context instance.
     * @param root main module.
     * @param option application option.
     * @returns instance of {@link ApplicationContext}
     */
    abstract create<T>(root: ModuleRef<T>, option?: ApplicationOption<T>): ApplicationContext;
}
