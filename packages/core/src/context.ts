import {
    ProviderType, LoadType, Injector, Abstract, Type, InvokeOption, InvokeArguments,
    ModuleLoader, Destroyable, Modules, DestroyCallback, InvocationContext
} from '@tsdi/ioc';
import { LoggerManager } from '@tsdi/logs';
import { Observable } from 'rxjs';
import { ApplicationConfiguration, ConfigureManager } from './configure/config';
import { RunnableRef, RunnableSet, RunnableFactory } from './runnable';
import { ServiceSet } from './service';
import { StartupSet } from './startup';
import { ModuleOption } from './module.factory';
import { ModuleRef } from './module.ref';
import { ApplicationArguments } from './args';
import { Pattern, TransportResponse } from './transport/packet';


/**
 * bootstrap option for {@link Runnable}.
 */
export interface BootstrapOption extends InvokeOption {

}

/**
 * application context for global.
 * implements {@link Destroyable}.
 */
@Abstract()
export abstract class ApplicationContext extends InvocationContext implements Destroyable {

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
     * @param option bootstrap option.
     */
    abstract bootstrap<C>(type: Type<C> | RunnableFactory<C>, option?: BootstrapOption): any;
    /**
     * send message.
     * @param pattern message pattern. type of {@link Pattern}.
     * @param data send data.
     * @returns instance of {@link WritePacket}.
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
    abstract get arguments(): ApplicationArguments;

    /**
     * get application global configuration of type {@link Configuration}.
     */
    abstract getConfiguration(): ApplicationConfiguration;

    /**
     * get configure manager of type {@link ConfigureManager}.
     *
     * @returns {ConfigureManager}
     */
    abstract getConfigureManager(): ConfigureManager;
    /**
     * application global startups.
     *
     * type of {@link StartupSet}
     */
    abstract get startups(): StartupSet;
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
    abstract get bootstraps(): RunnableRef[];
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
 * Environment option.
 */
export interface EnvironmentOption extends ModuleOption, InvokeArguments {
    /**
     * boot base url.
     *
     * @type {string}
     */
    baseURL?: string;
    /**
     * injector.
     */
    injector?: Injector;
    /**
     * module loader
     *
     * @type {ModuleLoader}
     */
    loader?: ModuleLoader;
    /**
     * custom configures
     *
     * @type {((string | ApplicationConfiguration)[])}
     */
    configures?: (string | ApplicationConfiguration)[];
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
 * ApplicationOption option.
 */
export interface ApplicationOption<T = any> extends EnvironmentOption {
    /**
     * target module type.
     *
     * @type {ClassType}
     */
    type: Type<T>;
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
     * @returns instance of {@link EnvironmentOption}
     */
    abstract create<T>(root: ModuleRef<T>, option?: EnvironmentOption): ApplicationContext;
}
