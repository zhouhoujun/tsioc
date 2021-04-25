import {
    IProvider, ProviderType, ObjectMap, RegInMetadata,
    Token, Type, TypeReflect, IModuleLoader, LoadType, IInjector
} from '@tsdi/ioc';
import { ILoggerManager } from '@tsdi/logs';
import { Configure, IConfigureManager } from './configure/config';
import { ModuleReflect } from './modules/reflect';
import { MessageQueue } from './middlewares/queue';
import { MessageContext, RequestOption } from './middlewares';
import { DIModuleMetadata } from './decorators';

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
    type?: Type<T>;
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
    * current parent injector.
    */
    readonly injector: IInjector;    
    /**
    * current parent injector.
    */
     readonly root: IInjector;
    /**
     * get providers of options.
     */
    readonly providers: IProvider;
    /**
     * options.
     */
    getOptions(): T;

}

export type IBuildContext = IAnnoationContext;


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
     * bootstrap type.
     */
    bootstrap?: Type;
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
 * bootstrap option.
 */
export interface BootstrapOption {
    injector?: IInjector;
    args?: string[];
}

/**
 * boot context.
 */
export interface IBootContext<T extends BootOption = BootOption> extends IAnnoationContext<T> {

    /**
     * get target reflect.
     */
    readonly reflect: ModuleReflect;

    setInjector(injector: IInjector);

    /**
     * get message queue.
     */
    getMessager(): MessageQueue;
    /**
     * bootstrap type
     * @param type 
     * @param opts 
     */
    bootstrap(type: Type, opts?: BootstrapOption): any;

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

    readonly bootToken: Type;


    target: any;
    /**
     * boot instance.
     */
    boot?: any;

    getAnnoation<T extends DIModuleMetadata>(): T;

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
