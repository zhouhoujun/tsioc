import {
    IProvider, ProviderType, RegInMetadata, LoadType, IInjector, Abstract,
    Token, Type, IModuleLoader, Registered, DefaultInjector
} from '@tsdi/ioc';
import { ILoggerManager } from '@tsdi/logs';
import { Configure, IConfigureManager } from './configure/config';
import { AnnotationReflect, ModuleReflect } from './reflect';
import { MessageQueue } from './middlewares/queue';
import { MessageContext, RequestOption } from './middlewares';
import { DIModuleMetadata } from './decorators';

export interface ProdverOption {

    /**
     *  providers.
     */
    providers?: ProviderType[];
}

/**
 * context option.
 *
 */
export interface ContextOption<T = any> extends ProdverOption, RegInMetadata {
    /**
     * target module type.
     *
     * @type {ClassType}
     */
    type: Type<T>;
}


/**
 * boot options
 *
 * @export
 * @interface BootOptions
 */
export interface BootOption<T = any> extends ContextOption<T> {
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
}


/**
 * boot context.
 */
@Abstract()
export abstract class BootContext<T = any> extends DefaultInjector {

    /**
     * boot type.
     */
    abstract get type(): Type<T>;

    abstract get instance(): T;
    /**
    * get target reflect.
    */
    abstract get reflect(): AnnotationReflect<T>;
    // /**
    //  * Destroys the component instance and all of the data structures associated with it.
    //  */
    // abstract destroy(): void;

    // /**
    //  * A lifecycle hook that provides additional developer-defined cleanup
    //  * functionality for the component.
    //  * @param callback A handler function that cleans up developer-defined data
    //  * associated with this component. Called when the `destroy()` method is invoked.
    //  */
    // abstract onDestroy(callback: Function): void;

}

@Abstract()
export abstract class BootFactory {
    abstract create<T>(type: Type<T> | BootOption<T>, parent?: IInjector): BootContext<T>;
}


// /**
//  * module exports provider.
//  */
// export interface IModuleInjector extends IInjector {
//     /**
//      * module type.
//      */
//     readonly type: Type;
//     readonly moduleRef: ModuleContext;
//     readonly imports: ModuleContext[];
//     readonly exports: IModuleExports;
// }

/**
 * module exports provider.
 */
export interface IModuleExports extends IProvider {
    /**
     * export moduleRefs.
     */
    exports: ModuleContext[]
    /**
     * export type.
     * @param type 
     */
    export(type: Type, noRef?: boolean);
}

@Abstract()
export abstract class ModuleContext<T = any> extends DefaultInjector {

    /**
     * module type.
     */
    abstract get type(): Type<T>;

    /**
     * module instance.
     */
    abstract get instance(): T;

    abstract get regIn(): string;

    abstract get imports(): ModuleContext[];
    abstract get exports(): IModuleExports;

    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    abstract bootstrap(type: Type, opts?: BootstrapOption): any;

    /**
    * get target reflect.
    */
    abstract get reflect(): ModuleReflect<T>;
}


/**
 * module registered state.
 */
export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleContext;
}

export interface ModuleOption<T = any> extends BootOption<T> {
    regIn: string;
}

@Abstract()
export abstract class ModuleFactory {
    abstract create<T>(type: Type<T> | BootOption<T>, parent?: IInjector): ModuleContext<T>;
}

/**
 * bootstrap option.
 */
export interface BootstrapOption extends ProdverOption {
    injector?: IInjector;
    args?: string[];
}

export interface ApplicationOption<T = any> extends BootOption<T> {
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
    deps?: LoadType[];
}

/**
 * boot context.
 */
@Abstract()
export abstract class ApplicationContext<T = any> extends ModuleContext<T>  {
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

    abstract getAnnoation<T extends DIModuleMetadata>(): T;

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
}


@Abstract()
export abstract class ApplicationFactory {
    abstract create<T>(type: Type<T> | ApplicationOption<T>, parent?: IInjector): ApplicationContext<T>;
}