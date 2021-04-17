import {
    ClassType, IProvider, ProviderType, ObjectMap, RegInMetadata,
    Token, Type, TypeReflect, IModuleLoader, LoadType, IInjector
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
 * annoation context interface.
 */
export interface IAnnoationContext<T extends AnnoationOption = AnnoationOption> extends IProvider {
    /**
    * current build type.
    */
    readonly type: Type;
    /**
     * type reflect.
     */
    readonly reflect: TypeReflect;

    /**
     * current root injector.
     */
    readonly root: IInjector;

    /**
    * current root injector.
    * 
    * @deprecated use `root` instead.
    */
    readonly injector: IInjector;
    /**
     * get providers of options.
     */
    readonly providers: IProvider;
    /**
     * options.
     */
    getOptions(): T;

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

export interface BuildOption<T = any> extends AnnoationOption<T> {
    /**
     * build type.
     */
    readonly type: ClassType<T>;
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
export interface IBuildContext extends BuildOption<any> {
    /**
     * type reflect.
     */
    readonly reflect?: TypeReflect;

    /**
     * providers.
     */
    readonly providers?: IProvider;

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

    setRoot(injector: IInjector);

    /**
     * get message queue.
     */
    getMessager(): MessageQueue;

    /**
     * send message
     *
     * @param {RequestOption} request request option
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     */
    send(request: RequestOption, ...providers: ProviderType[]): Promise<MessageContext>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {RequestOption} request request options data.
     * @returns {Promise<MessageContext>}
     */
    send(url: string, request: RequestOption, ...providers: ProviderType[]): Promise<MessageContext>

    /**
     * get log manager.
     */
    getLogManager(): ILoggerManager;
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
