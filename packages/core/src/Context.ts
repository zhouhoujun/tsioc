import {
    ProviderType, LoadType, Injector, Abstract, Type, InvokeOption,
    ModuleLoader, Destroyable, Modules, Resolver, DestroyCallback
} from '@tsdi/ioc';
import { ILoggerManager } from '@tsdi/logs';
import { Configuration, ConfigureManager } from './configure/config';
import { Request, RequestInit, RequestOption } from './middlewares/request';
import { Response } from './middlewares/response';
import { Context } from './middlewares/context';
import { MessageQueue } from './middlewares/queue';
import { Runnable, RunnableFactory } from './runnable';
import { Service } from './services/service';
import { Server } from './server/server';
import { ModuleOption } from './module.factory';
import { ModuleRef } from './module.ref';
import { ApplicationShutdownHandlers } from './shutdown';



/**
 * bootstrap option.
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
 * boot context.
 */
@Abstract()
export abstract class ApplicationContext implements Destroyable {
    /**
     * application root module injector.
     */
    abstract get injector(): ModuleRef;
    /**
     * exit application or not, when throw error.
     */
    abstract get exit(): boolean;
    /**
     * module instance.
     */
    abstract get instance(): any;
    /**
     * bootstrap type
     * @param type 
     * @param opts 
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
    abstract getLogManager(): ILoggerManager;
    /**
     * boot base url.
     *
     * @type {string}
     */
    abstract get baseURL(): string;
    /**
     * boot run env args.
     *
     * @type {string[]}
     * @memberof BootOptions
     */
    abstract get args(): string[];

    /**
     * configuration merge metadata config and all application config.
     *
     * @type {T}
     */
    abstract getConfiguration(): Configuration;

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager}
     */
    abstract getConfigureManager(): ConfigureManager;
    /**
     * application services.
     */
    abstract get services(): Resolver<Service>[];
    /**
     * application servers.
     */
    abstract get servers(): Resolver<Server>[]
    /**
     * application bootstraps.
     */
    abstract get bootstraps(): Runnable[];
    /**
     * destroyed or not.
     */
    abstract get destroyed(): boolean;
    /**
     * Destroys the component instance and all of the data structures associated with it.
     */
    abstract destroy(): void;
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


@Abstract()
export abstract class ApplicationExit {

    abstract get context(): ApplicationContext;

    abstract register(): void;

    abstract exit(error?: Error): void;
}

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
     * exit application or not, when throw error.
     */
    exit?: boolean;
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
 * application factory.
 */
@Abstract()
export abstract class ApplicationFactory {
    abstract create<T>(root: ModuleRef<T>, option?: ApplicationOption<T>): ApplicationContext;
}