import {
    ProviderType, LoadType, Injector, Abstract, Type, InvokeOption,
    ModuleLoader, Destroyable, Modules, DestroyCallback
} from '@tsdi/ioc';
import { LoggerManager } from '@tsdi/logs';
import { Observable } from 'rxjs';
import { Configuration, ConfigureManager } from './configure/config';
import { Runnable, RunnableSet, RunnableFactory } from './runnable';
import { ServiceSet } from './service';
import { ClientSet } from './client';
import { ServerSet } from './server';
import { ModuleOption } from './module.factory';
import { ModuleRef } from './module.ref';
import { ApplicationArguments } from './args';
import { Pattern } from './transport/pattern';
import { TransportResponse } from './transport/packet';


/**
 * bootstrap option for {@link Runnable}.
 */
export interface BootstrapOption extends InvokeOption {
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
 * implements {@link Destroyable}.
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
     * send message.
     * @param pattern message pattern. type of {@link Pattern}.
     * @param data send data.
     * @returns instance of {@link TransportResponse}.
     */
    abstract send<TResult = TransportResponse, TInput = any>(pattern: Pattern, data: TInput): Observable<TResult>;
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
