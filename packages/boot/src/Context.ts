import {
    ClassType, IDestoryable, IocContext, IProvider, ObjectMap,
    Provider, RegInMetadata, SymbolType, Token, Type, TypeReflect
} from '@tsdi/ioc';
import { IContainer, ICoreInjector, IModuleLoader, LoadType } from '@tsdi/core';
import { ILoggerManager } from '@tsdi/logs';
import { IConfigureManager } from './configure/IConfigureManager';
import { Configure } from './configure/Configure';
import { ModuleReflect } from './modules/reflect';
import { BootstrapMetadata } from './decorators';

export interface ProdverOption {
    /**
     * providers for contexts.
     *
     * @type {(Provider[] | IProvider)}
     */
    contexts?: Provider[] | IProvider;

    /**
     *  providers.
     */
    providers?: Provider[] | IProvider;
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
     * @memberof AnnoationActionOption
     */
    type?: ClassType<T>;

}

/**
 * destoryable context.
 */
export interface IDesctoryableContext<T> extends IocContext, IDestoryable {
    /**
     * current injector.
     */
    readonly injector: ICoreInjector;
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
     * @param {...Provider[]} providers
     */
    set(...providers: Provider[]);
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
export interface IAnnoationContext<T extends AnnoationOption = AnnoationOption> extends IDesctoryableContext<T> {
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
     * @memberof BootOptions
     */
    baseURL?: string;
    /**
     * module loader
     *
     * @type {IModuleLoader}
     * @memberof BootOptions
     */
    loader?: IModuleLoader;
    /**
     * custom configures
     *
     * @type {((string | Configure)[])}
     * @memberof BootOptions
     */
    configures?: (string | Configure)[];
    /**
     * custom set first startups services.
     */
    startups?: Token[]
    /**
     * bootstrap instance.
     *
     * @memberof BootOptions
     */
    bootstrap?: Token;
    /**
     * render host container.
     *
     * @type {*}
     * @memberof BootOption
     */
    renderHost?: any;
    /**
     * bind template
     *
     * @type {*}
     * @memberof BootOption
     */
    template?: any;
    /**
     * boot run env args.
     *
     * @type {string[]}
     * @memberof BootOptions
     */
    args?: string[];
    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     * @memberof BootOptions
     */
    data?: any;
    /**
    * auto statupe or not. default true.
    *
    * @type {boolean}
    * @memberof BootOptions
    */
    autorun?: boolean;
    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     * @memberof BootOptions
     */
    deps?: LoadType[];
    /**
     * injector.
     */
    injector?: ICoreInjector;
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
    injector?: ICoreInjector;
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

    readonly template: Template;
    /**
    * auto statupe or not. default true.
    *
    * @type {boolean}
    * @memberof BootOptions
    */
    readonly autorun?: boolean;
    /**
     * boot dependencies.
     *
     * @type {LoadType[]}
     * @memberof BootOptions
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
     * @memberof BootContext
     */
    getConfiguration(): Configure;

    /**
     * get configure manager.
     *
     * @returns {IConfigureManager<Configure>}
     */
    getConfigureManager(): IConfigureManager<Configure>;

}
