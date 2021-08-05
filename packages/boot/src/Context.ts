import {
    ProviderType, RegInMetadata, LoadType, Injector, Abstract, Token, Type,
    ModuleLoader, Registered, DefaultInjector, Destroyable, Modules
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
 * runnable
 */
@Abstract()
export abstract class Runnable {
    /**
     * run this service.
     * @param context 
     */
    abstract run(context?: ApplicationContext): any;
}

/**
 * runner with target ref.
 */
@Abstract()
export abstract class Runner<T = any> extends Runnable {
    /**
     * instance of target
     *
     * @readonly
     * @abstract
     * @type {T}
     * @memberof Executor
     */
    abstract get instance(): T;
    /**
     * runnable target ref.
     *
     * @readonly
     * @abstract
     * @type {TargetRef<T>}
     * @memberof Runner
     */
    abstract get targetRef(): TargetRef<T>;
}

/**
 * target ref.
 */
@Abstract()
export abstract class TargetRef<T = any> implements Destroyable {
    /**
     * injector of current target.
     *
     * @readonly
     * @abstract
     * @type {Injector}
     * @memberof TargetRef
     */
    abstract get injector(): Injector;
    /**
     * instance of target
     *
     * @readonly
     * @abstract
     * @type {T}
     * @memberof Executor
     */
    abstract get instance(): T;
    /**
     * target reflect.
     *
     * @readonly
     * @abstract
     * @type {AnnotationReflect<T>}
     * @memberof Executor
     */
    abstract get reflect(): AnnotationReflect<T>;
    /**
     * execute target type.
     *
     * @readonly
     * @abstract
     * @type {Type<T>}
     * @memberof Executor
     */
    abstract get type(): Type<T>;
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
    abstract onDestroy(callback: () => void): void;
}

/**
 * boot factory.
 */
@Abstract()
export abstract class RunnableFactory<T> {
    /**
     * service type.
     */
    abstract get type(): Type<T>;
    /**
     * create boot context.
     * @param option 
     */
    abstract create(option: BootstrapOption, context?: ApplicationContext): Runnable;
}

/**
 * runnable factory resolver.
 */
@Abstract()
export abstract class RunnableFactoryResolver {
    abstract resolve<T>(type: Type<T>): RunnableFactory<T>;
}


/**
 * module exports provider.
 */
export interface IModuleExports extends Injector {
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

    /**
     * is root injector or not.
     */
    abstract get isRoot(): boolean;
    /**
     * module type.
     */
    abstract get type(): Type<T>;
    /**
     * module instance.
     */
    abstract get instance(): T;
    /**
     * reg in
     */
    abstract get regIn(): string;
    /**
     * module imports.
     */
    abstract get imports(): ModuleInjector[];
    /**
     * module exports.
     */
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
    injector?: Injector;

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
    abstract create(parent: Injector, option?: ModuleOption): ModuleInjector<T>;
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
     * exit application or not, when throw error.
     */
    abstract get exit(): boolean;
    /**
     * module instance.
     */
    abstract get instance();

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
    abstract get bootstraps(): Runnable[];

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
 * boot context.
 */
export const BootContext = ApplicationContext;


@Abstract()
export abstract class ApplicationExit {

    abstract get context(): ApplicationContext;

    abstract register(): void;

    abstract exit(error?: Error);
}

/**
 * application option.
 */
export interface ApplicationOption<T = any> extends ModuleOption<T> {
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