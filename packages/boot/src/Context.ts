import {
    ClassType, Destroyable, IocContext, IProvider, ProviderType, ObjectMap,
    RegInMetadata, Token, Type, TypeReflect, IContainer, IModuleLoader, LoadType, IInjector
} from '@tsdi/ioc';
import { ILoggerManager } from '@tsdi/logs';
import { Configure, IConfigureManager } from './configure/config';
import { ModuleReflect } from './modules/reflect';
import { BootstrapMetadata } from './decorators';
import { MessageQueue } from './middlewares/queue';
import { MessageContext, RequestOption } from './middlewares';

export interface ProdverOption {

    /**
     *  providers.
     */
    providers?: ProviderType[] | IProvider;
}

/**
 * annoation action option.
 *
 * @export
 * @interface AnnoationOption
 * @extends {ActionContextOption}
 */
export interface AnnoationOption<T = any> extends ProdverOption, RegInMetadata {
    /**
     * target module type.
     *
     * @type {ClassType}
     */
    type?: ClassType<T>;
}

/**
 * destroyable context.
 */
export interface IDestroyableContext<T> extends IocContext, Destroyable {
    /**
     * current injector.
     */
    readonly injector: IInjector;
    /**
     * get providers of options.
     */
    readonly providers: IProvider;

    /**
    * has value in context providers or not.
    * @param token
    */
    hasValue(token: Token): boolean;
    /**
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: Token<T>): T;
    /**
     * set value to this context providers.
     * @param key token key
     * @param value value of key.
     */
    setValue<T>(key: Token<T>, value: T): this;

    /**
     * options.
     */
    getOptions(): T;

    /**
     * get root container.
     */
    getContainer(): IContainer;
    /**
     * clone this context.
     */
    clone(options?: T): this;
}

/**
 * annoation context interface.
 */
export interface IAnnoationContext<T extends AnnoationOption = AnnoationOption> extends IDestroyableContext<T> {
    /**
    * current build type.
    */
    readonly type: Type;
    /**
     * type reflect.
     */
    readonly reflect: TypeReflect;

}


/**
 * boot options
 *
 * @export
 * @interface BootOptions
 */
export interface BootOption<T = any> extends AnnoationOption<T> {
    /**
     * boot base url.
     *
     * @type {string}
     */
    baseURL?: string;
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
    startups?: Token[]
    /**
     * bootstrap instance.
     */
    bootstrap?: Token;
    /**
     * render host container.
     *
     * @type {*}
     */
    renderHost?: any;
    /**
     * bind template
     *
     * @type {*}
     */
    template?: any;
    /**
     * boot run env args.
     *
     * @type {string[]}
     */
    args?: string[];
    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     */
    data?: any;
    /**
    * auto statupe or not. default true.
    *
    * @type {boolean}
    */
    autorun?: boolean;
    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     */
    deps?: LoadType[];
    /**
     * injector.
     */
    injector?: IInjector;
}


export type Template = string | ObjectMap<any>;

/**
 * module resolve option.
 *
 * @export
 * @interface IModuleResolveOption
 */
export interface BuildOption<T = any> extends AnnoationOption<T> {
    /**
     * name of component.
     */
    name?: string;
    /**
     * template to binding.
     */
    template?: Template;
    /**
     * module reslove in the injector.
     */
    injector?: IInjector;
}

/**
 * build context.
 *
 * @export
 * @interface IBuildContext
 * @extends {IHandleContext}
 */
export interface IBuildContext<T extends BuildOption = BuildOption> extends IAnnoationContext<T> {

    /**
     * build instance.
     */
    value?: any;
}

/**
 * boot context.
 */
export interface IBootContext<T extends BootOption = BootOption> extends IAnnoationContext<T> {

    /**
     * get target reflect.
     */
    readonly reflect: ModuleReflect;

    /**
     * get message queue.
     */
    getMessager(): MessageQueue;

    /**
     * send message
     *
     * @param {T} ctx message context
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     */
    send(ctx: MessageContext): Promise<MessageContext>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {RequestOption} options query data.
     * @returns {Promise<MessageContext>}
     */
    send(url: string, options: RequestOption, injector?: IInjector): Promise<MessageContext>;

    /**
     * get log manager.
     */
    getLogManager(): ILoggerManager;
    /**
     * get service in context.
     * @param token
     */
    getService<T>(token: Token<T>): T;
    /**
     * get statup service tokens.
     */
    getStarupTokens(): Token[];

    /**
     * boot base url.
     *
     * @type {string}
     */
    baseURL: string;

    /**
     * boot run env args.
     *
     * @type {string[]}
     * @memberof BootOptions
     */
    readonly args: string[];
    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     * @memberof BootOptions
     */
    readonly data: any;

    /**
     * template.
     */
    readonly template: Template;
    /**
    * auto statupe or not. default true.
    *
    * @type {boolean}
    */
    readonly autorun?: boolean;
    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     */
    readonly deps: LoadType[];

    readonly bootstrap: Token;


    target: any;
    /**
     * boot instance.
     */
    boot?: any;

    getAnnoation<T extends BootstrapMetadata>(): T;

    /**
     * get statup runnable.
     */
    getStartup(): any;

    /**
     * configuration merge metadata config and all application config.
     *
     * @type {T}
     */
    getConfiguration(): Configure;

    /**
     * get configure manager.
     *
     * @returns {IConfigureManager<Configure>}
     */
    getConfigureManager(): IConfigureManager<Configure>;

}
