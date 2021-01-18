import {
    ClassType, IDestroyable, IocContext, IProvider, ProviderType, ObjectMap,
    RegInMetadata, SymbolType, Token, Type, TypeReflect, IContainer, IModuleLoader, LoadType, IInjector
} from '@tsdi/ioc';
import {  } from '@tsdi/core';
import { ILoggerManager } from '@tsdi/logs';
import { Configure, IConfigureManager } from './configure/config';
import { ModuleReflect } from './modules/reflect';
import { BootstrapMetadata } from './decorators';

export interface ProdverOption {
    /**
     * providers for contexts.
     *
     * @type {(ProviderType[] | IProvider)}
     */
    contexts?: ProviderType[] | IProvider;

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
 * destoryable context.
 */
export interface IDestoryableContext<T> extends IocContext, IDestroyable {
    /**
     * current injector.
     */
    readonly injector: IInjector;
    /**
     * get providers of options.
     */
    readonly providers: IProvider;

    getOptions(): T;

    /**
     * has register in context or not.
     * @param token
     */
    has(token: Token): boolean;
    /**
    * has value in context or not.
    * @param token
    */
    hasValue(token: SymbolType): boolean;
    /**
     * remove contexts.
     * @param tokens
     */
    remove(...tokens: Token[]);
    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     */
    get<T>(token: Token<T>): T;
    /**
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: SymbolType<T>): T;
    /**
     * set value to this contet.
     * @param key token key
     * @param value value of key.
     */
    setValue<T>(key: SymbolType<T>, value: T): this;
    /**
     * set provider of this context.
     *
     * @param {Token} token context provider token.
     * @param {*} value context value.
     */
    set(token: Token, value: any);
    /**
     * set context provider of boot application.
     *
     * @param {...ProviderType[]} providers
     */
    set(...providers: ProviderType[]);
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
export interface IAnnoationContext<T extends AnnoationOption = AnnoationOption> extends IDestoryableContext<T> {
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
