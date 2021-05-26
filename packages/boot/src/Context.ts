import {
    IProvider, ProviderType, RegInMetadata, LoadType, IInjector, Abstract,
    Token, Type, IModuleLoader, Registered, DefaultInjector, Destroyable, Modules
} from '@tsdi/ioc';
import { ILoggerManager } from '@tsdi/logs';
import { Configure, IConfigureManager } from './configure/config';
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
 * IRunnable interface. define the type as a runnable.
 *
 * @export
 * @interface IRunnable
 * @template T
 * @template TCtx default IBootContext
 */
export interface IRunnable<T = any> extends Destroyable {

    /**
     * configure and startup this service.
     *
     * @param {IBootContext} [ctx]
     * @returns {(Promise<void>)}
     */
    configureService?(ctx: BootContext<T>): Promise<void>;

    /**
     * get runable instance.
     */
    getInstance(): T;

    /**
     * get runable instance type.
     */
    getInstanceType(): Type<T>;

}


/**
 * boot context.
 */
@Abstract()
export abstract class BootContext<T = any> {

    /**
     * get root context.
     */
    abstract getRoot(): ApplicationContext;
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
     * bootstrap runnable.
     */
    runnable?: IRunnable;

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
 * boot factory option.
 */
export interface BootFactoryOption extends BootstrapOption {
    /**
     * injector.
     */
    injector: IInjector;
}

/**
 * boot factory.
 */
@Abstract()
export abstract class BootFactory {
    /**
     * create boot context.
     * @param type 
     * @param option 
     */
    abstract create<T>(type: Type<T> | AnnotationReflect<T>, option: BootFactoryOption): BootContext<T> | Promise<BootContext<T>>;
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
    export?(type: Type, noRef?: boolean);
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
     * target module type.
     *
     * @type {ClassType}
     */
    type: Type<T>;
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
}

@Abstract()
export abstract class ModuleFactory {
    abstract create<T>(type: Type<T> | ModuleReflect<T> | ModuleOption<T>, parent?: IInjector, root?: boolean): ModuleInjector<T>;
    abstract create<T>(type: Type<T> | ModuleReflect<T> | ModuleOption<T>, parent?: IInjector, regIn?: string, root?: boolean): ModuleInjector<T>;
}

/**
 * boot context.
 */
@Abstract()
export abstract class ApplicationContext<T = any> implements Destroyable {

    /**
     * application injector.
     */
    abstract get injector(): ModuleInjector<T>;

    /**
     * module instance.
     */
    abstract get instance(): T;

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    abstract bootstrap(type: Type | AnnotationReflect<T>, opts?: BootstrapOption): any;

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
    abstract getConfiguration(): Configure;

    /**
     * get configure manager.
     *
     * @returns {IConfigureManager<Configure>}
     */
    abstract getConfigureManager(): IConfigureManager<Configure>;
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
     * module loader
     *
     * @type {IModuleLoader}
     */
    loader?: IModuleLoader;
    /**
     * custom configures
     *
     * @type {((string | Configure)[])}
     */
    configures?: (string | Configure)[];
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
    abstract create<T>(type: ApplicationOption<T>): ApplicationContext<T>;
    abstract create<T>(type: ModuleInjector<T>, option: ApplicationOption<T>): ApplicationContext<T>;
    abstract create<T>(type: Type<T> | ApplicationOption<T>, parent?: IInjector): ApplicationContext<T>;
}