import {
    ProviderType, LoadType, Injector, Abstract, Type, InvokeOption, InvokeArguments,
    ModuleLoader, Destroyable, Modules, DestroyCallback, InvocationContext
} from '@tsdi/ioc';
import { RunnableRef, RunnableSet, RunnableFactory, ApplicationRunners } from './runnable';
import { ModuleOption } from './module.factory';
import { ModuleRef } from './module.ref';
import { ApplicationArguments } from './args';
import { ILogger } from './logger';
import { Startup } from './startup';
import { ConfigureService } from './service';


/**
 * bootstrap option for {@link Runnable}.
 */
export interface BootstrapOption extends InvokeOption {
    invokeMethod?: string;
}

/**
 * Class to be extended by all application events. Abstract as it
 * doesn't make sense for generic events to be published directly.
 */
@Abstract()
export abstract class ApplicationEvent {
    private _timestamp: number;
    constructor(private _source: Object) {
        this._timestamp = Date.now() / 1000;
    }
    /**
     * event source target.
     */
    getSource(): Object {
        return this._source;
    }
    /**
     * get the time in milliseconds when the event occurred.
     */
    getTimestamp(): number {
        return this._timestamp;
    }
}

/**
 * Interface that encapsulates event publication functionality.
 *
 * <p>Serves as a super-interface for {@link ApplicationContext}.
 */
export interface ApplicationEventPublisher {
    /**
     * Notify all <strong>matching</strong> listeners registered with this
     * application of an application event. Events may be framework events
     * (such as ContextRefreshedEvent) or application-specific events.
     * <p>Such an event publication step is effectively a hand-off to the
     * multicaster and does not imply synchronous/asynchronous execution
     * or even immediate execution at all. Event listeners are encouraged
     * to be as efficient as possible, individually using asynchronous
     * execution for longer-running and potentially blocking operations.
     * @param event the event to publish
     */
    publishEvent(event: ApplicationEvent | Object): void;

}

/**
 * application context for global.
 * implements {@link Destroyable}.
 */
@Abstract()
export abstract class ApplicationContext extends InvocationContext implements ApplicationEventPublisher, Destroyable {
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
     * get logger.
     * @param name 
     */
    abstract getLogger(name?: string): ILogger;
    /**
     * Notify all <strong>matching</strong> listeners registered with this
     * application of an application event. Events may be framework events
     * (such as ContextRefreshedEvent) or application-specific events.
     * <p>Such an event publication step is effectively a hand-off to the
     * multicaster and does not imply synchronous/asynchronous execution
     * or even immediate execution at all. Event listeners are encouraged
     * to be as efficient as possible, individually using asynchronous
     * execution for longer-running and potentially blocking operations.
     * @param event the event to publish
     */
    abstract publishEvent(event: ApplicationEvent | Object): void;
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
     * application runners.
     *
     * type of {@link ApplicationRunners}
     */
    abstract get runners(): ApplicationRunners;
    /**
     * application bootstraps.
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
