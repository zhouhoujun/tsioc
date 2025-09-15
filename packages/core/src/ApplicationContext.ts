import {
    Provider, Injector, Abstract, AbstractType, Destroyable, Modules, ModuleOption, ModuleRef,
    InvocationContext, ModuleMetadata, ModuleDef, Token, tokenId, ClassRef, Invocation, InvokeArguments, Type
} from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { Observable } from 'rxjs';
import { ApplicationRunners } from './ApplicationRunners';
import { ApplicationArguments } from './ApplicationArguments';
import { LoadType, ModuleLoader } from './ModuleLoader';
import { InvocationHandlerOptions } from './invocation';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { ApplicationEvent } from './ApplicationEvent';

/**
 * application context for global.
 * implements {@link Destroyable}.
 * 
 * 应用上下文环境
 */
@Abstract()
export abstract class ApplicationContext<T = object>
    extends InvocationContext implements ApplicationEventPublisher, Destroyable {
    /**
     * application root module injector.
     */
    abstract get injector(): ModuleRef<T>;
    /**
     * module instance.
     */
    abstract get instance(): T;
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
    abstract get request(): ApplicationArguments;
    /**
     * application runners.
     *
     * type of {@link ApplicationRunners}
     */
    abstract get runners(): ApplicationRunners;
    /**
     * Application Event Multicaster
     */
    abstract get eventMulticaster(): ApplicationEventMulticaster;
    /**
     * bootstrap type
     * @param type bootstrap type.
     * @param option bootstrap option.
     */
    abstract bootstrap<C, TArg>(type: AbstractType<C> | ClassRef<C>, option?: BootstrapOption): Promise<Invocation<C>>;
    /**
     * get logger.
     * @param name 
     */
    abstract getLogger(name?: string, adapter?: string | AbstractType): Logger;
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
    abstract publishEvent(event: ApplicationEvent | Object): Observable<any>;
    /**
     * refresh context.
     */
    abstract refresh(): Promise<void>;
    /**
     * close application.
     */
    abstract close(): Promise<void>;
    /**
     * destroy application
     */
    abstract destroy(): Promise<void>;

}

/**
 * bootstrap option for {@link RunnableRef}.
 */
export interface BootstrapOption extends InvocationHandlerOptions<any> {
}


/**
 * appliaction boot process root path.
 */
export const PROCESS_ROOT: Token<string> = tokenId<string>('PROCESS_ROOT');

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
     * application arguments.
     */
    request?: ApplicationArguments | null;
    /**
     * application deps.
     */
    platformDeps?: Modules[];
    /**
     * application providers.
     */
    platformProviders?: Provider[];
    /**
     * Application runners invocation options.
     */
    runnersOptions?: InvocationHandlerOptions;
    /**
     * Application events invocation options.
     */
    eventsOptions?: InvocationHandlerOptions;
}

/**
 * ApplicationOption option.
 */
export interface ApplicationOption<T = object> extends EnvironmentOption {
    /**
     * target module type.
     *
     * @type {Type}
     */
    module: Type<T> | ModuleDef<T> | ModuleMetadata;
}


/**
 * application context factory, to create instance of {@link ApplicationContext}.
 */
@Abstract()
export abstract class ApplicationContextFactory {
    /**
     * create application context instance.
     * @param root main module.
     * @param option application option.
     * @returns instance of {@link EnvironmentOption}
     */
    abstract create<T>(root: ModuleRef<T>, option?: EnvironmentOption): ApplicationContext<T>;
}
