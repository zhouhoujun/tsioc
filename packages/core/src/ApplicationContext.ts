import {
    ProviderType, Injector, Abstract, Type, Destroyable, Modules, ModuleOption, ModuleRef,
    InvocationContext, ModuleMetadata, ModuleDef, Token, tokenId, Class, ReflectiveRef
} from '@tsdi/ioc';
import { Logger } from '@tsdi/logs';
import { Observable } from 'rxjs';
import { ApplicationRunners } from './ApplicationRunners';
import { ApplicationArguments } from './ApplicationArguments';
import { LoadType, ModuleLoader } from './ModuleLoader';
import { BootstrapOption } from './endpoints/endpoint.factory';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { ApplicationEvent } from './ApplicationEvent';
import { EndpointOptions, EndpointServiceOptions } from './EndpointService';

/**
 * application context for global.
 * implements {@link Destroyable}.
 */
@Abstract()
export abstract class ApplicationContext<T = any, TArg extends ApplicationArguments = ApplicationArguments> extends InvocationContext<TArg> implements ApplicationEventPublisher, Destroyable {
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
     * @type {TArg}
     */
    abstract get payload(): TArg;
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
    abstract bootstrap<C, TArg>(type: Type<C> | Class<C>, option?: BootstrapOption<TArg>): Promise<ReflectiveRef<C>>;
    /**
     * get logger.
     * @param name 
     */
    abstract getLogger(name?: string): Logger;
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
 * appliaction boot process root path.
 */
export const PROCESS_ROOT: Token<string> = tokenId<string>('PROCESS_ROOT');

/**
 * Environment option.
 */
export interface EnvironmentOption<TArg = any> extends ModuleOption, EndpointOptions<TArg> {
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

    /**
     * event endpoint options.
     */
    events?: EndpointServiceOptions;
}

/**
 * ApplicationOption option.
 */
export interface ApplicationOption<T= any, TArg = any> extends EnvironmentOption<TArg> {
    /**
     * target module type.
     *
     * @type {ClassType}
     */
    module: Type<T> | ModuleDef<T> | ModuleMetadata;
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
    abstract create<T, TArg extends ApplicationArguments>(root: ModuleRef<T>, option?: EnvironmentOption<TArg>): ApplicationContext<T, TArg>;
}