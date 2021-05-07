import {
    IProvider, ProviderType, RegInMetadata, LoadType, IInjector, Abstract,
    Token, Type, TypeReflect, IModuleLoader, InjectorImpl
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
export abstract class BootContext<T = any> extends InjectorImpl {

    get injector(): IInjector {
        return this;
    }
    /**
     * module type.
     */
    abstract get type(): Type<T>;
    abstract get instance(): T;

    /**
     * application root context.
     */
    abstract get app(): ApplicationContext;
    /**
    * get target reflect.
    */
    abstract get reflect(): AnnotationReflect<T>;


}

@Abstract()
export abstract class BootFactory<T> {
    abstract create(type: Type<T> | BootOption<T>, parent?: IInjector): BootContext<T>;
}



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
export abstract class ModuleContext<T = any> extends BootContext<T> {

    abstract get imports(): ModuleContext[];

    abstract get exports(): IModuleExports;

    /**
    * get target reflect.
    */
    abstract get reflect(): ModuleReflect<T>;
}


@Abstract()
export abstract class ModuleFactory<T> {
    abstract create(type: Type<T> | BootOption<T>, parent?: IInjector): ModuleContext<T>;
}

/**
 * bootstrap option.
 */
export interface BootstrapOption {
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

    /**
     * bootstrap type.
     */
    bootstrap?: Type;
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
    abstract getStarupTokens(): Token[];
    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    abstract bootstrap(type: Type, opts?: BootstrapOption): any;
}


@Abstract()
export abstract class ApplicationFactory<T> {
    abstract create(type: Type<T> | ApplicationOption<T>, parent?: IInjector): ApplicationContext<T>;
}