import {
    IProvider, ProviderType, RegInMetadata, LoadType, IInjector, Abstract,
    Token, Type, IModuleLoader, Registered, DefaultInjector, Destroyable, Modules
} from '@tsdi/ioc';
import { ILoggerManager } from '@tsdi/logs';
import { Configuration, IConfigureManager } from './configure/config';
import { AnnotationReflect, ModuleReflect } from './metadata/ref';
import { MessageQueue } from './middlewares/queue';
import { MessageContext, RequestOption } from './middlewares';
import { DIModuleMetadata } from './metadata/meta';



/**
 * bootstrap option.
 */
export interface BootstrapOption {
    /**
     * injector
     */
    injector?: IInjector;
    /**
     * providers.
     */
    providers?: ProviderType[];
    args?: string[];
}

/**
 * service config hook.
 */
export interface Configurable<T = any, R = Promise<void>> {
    /**
     * config the service with context.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {R} startup service token
     */
    configureService(ctx: BootContext<T>): R;
}

/**
 * service run hook.
 */
export interface Runnable<T = any, R = Promise<void>> {
    /**
     * run service.
     * @param ctx 
     */
    run(ctx?: BootContext<T>): R;
}

/**
 * service interface. define the type as a service.
 *
 * @export
 * @interface IService
 * @template T
 * @template TCtx default IBootContext
 */
export interface IService extends Destroyable {

}

/**
 * boot context.
 */
@Abstract()
export abstract class BootContext<T = any> {
    /**
     * boot injector
     */
    abstract get injector(): IInjector;
    /**
     * boot type.
     */
    abstract get type(): Type<T>;

    /**
    * get target reflect.
    */
    abstract get reflect(): AnnotationReflect<T>;

    abstract get instance(): T;

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
    abstract onDestroy(callback: Function): void;

}

/**
 * boot factory.
 */
@Abstract()
export abstract class ServiceFactory<T> {
    /**
     * service type.
     */
    abstract get type(): Type<T>
    /**
     * create boot context.
     * @param type 
     * @param option 
     */
    abstract create(option: BootstrapOption, appContext?: ApplicationContext): BootContext<T> | Promise<BootContext<T>>;
}

@Abstract()
export abstract class ServiceFactoryResolver {
    abstract resolve<T>(type: Type<T>): ServiceFactory<T>;
}

/**
 * module exports provider.
 */
export interface IModuleExports extends IProvider {
    /**
     * export moduleRefs.
     */
    exports: ModuleInjector[]
    /**
     * export type.
     * @param type 
     */
    export?(type: Type, noRef?: boolean, hasReged?: boolean);
}

/**
 * module injector.
 */
@Abstract()
export abstract class ModuleInjector<T = any> extends DefaultInjector {

    abstract get isRoot(): boolean;
    /**
     * module type.
     */
    abstract get type(): Type<T>;

    /**
     * module instance.
     */
    abstract get instance(): T;

    abstract get regIn(): string;

    abstract get imports(): ModuleInjector[];
    abstract get exports(): IModuleExports;


    /**
    * get target reflect.
    */
    abstract get reflect(): ModuleReflect<T>;
}


/**
 * module registered state.
 */
export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleInjector;
}

/**
 * module option.
 */
export interface ModuleOption<T = any> extends RegInMetadata {
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
    injector?: IInjector;

    /**
     *  providers.
     */
    providers?: ProviderType[];

    /**
     * dependence types.
     */
    deps?: Modules[];

    root?: boolean;
}

@Abstract()
export abstract class ModuleFactory<T = any> {
    abstract get moduleType(): Type<T>;
    abstract create(parent: IInjector, option?: ModuleOption): ModuleInjector<T>;
}

@Abstract()
export abstract class ModuleFactoryResolver {
    abstract resolve<T>(type: Type<T>): ModuleFactory<T>;
}

/**
 * boot context.
 */
@Abstract()
export abstract class ApplicationContext implements Destroyable {

    /**
     * application injector.
     */
    abstract get injector(): ModuleInjector;

    /**
     * module instance.
     */
    abstract get instance();

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    abstract bootstrap<C>(type: Type<C> | ServiceFactory<C>, opts?: BootstrapOption): BootContext<C> | Promise<BootContext<C>>;

    /**
     * get message queue.
     */
    abstract getMessager(): MessageQueue;
    /**
     * send message
     *
     * @param {RequestOption} request request option
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     */
    abstract send(request: RequestOption, ...providers: ProviderType[]): Promise<MessageContext>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {RequestOption} request request options data.
     * @returns {Promise<MessageContext>}
     */
    abstract send(url: string, request: RequestOption, ...providers: ProviderType[]): Promise<MessageContext>

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

    abstract getAnnoation<TM extends DIModuleMetadata>(): TM;

    /**
     * configuration merge metadata config and all application config.
     *
     * @type {T}
     */
    abstract getConfiguration(): Configuration;

    /**
     * get configure manager.
     *
     * @returns {IConfigureManager<Configuration>}
     */
    abstract getConfigureManager(): IConfigureManager<Configuration>;
    /**
     * get statup service tokens.
     */
    abstract get startups(): Token[];
    /**
     * registered boot service.
     */
    abstract get boots(): Type[];

    /**
     * application bootstraps.
     */
    abstract get bootstraps(): BootContext[];

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
    abstract onDestroy(callback: Function): void;
}

/**
 * application option.
 */
export interface ApplicationOption<T = any> extends ModuleOption<T> {
    /**
     * target module type.
     *
     * @type {ClassType}
     */
    type: Type<T>;
    /**
     * module loader
     *
     * @type {IModuleLoader}
     */
    loader?: IModuleLoader;
    /**
     * custom configures
     *
     * @type {((string | Configuration)[])}
     */
    configures?: (string | Configuration)[];
    /**
     * custom set first startups services.
     */
    startups?: Token[];
    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     */
    loads?: LoadType[];
}

/**
 * application factory.
 */
@Abstract()
export abstract class ApplicationFactory {
    abstract create<T>(root: ModuleInjector<T>, option?: ApplicationOption<T>): ApplicationContext;
}