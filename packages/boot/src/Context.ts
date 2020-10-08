import {
    ClassType, IDestoryable, IInjector, IocContext, IProvider, ITypeReflects, ObjectMap, Provider,
    RegInMetadata, SymbolType, Token, Type
} from '@tsdi/ioc';
import { IContainer, ICoreInjector, IModuleLoader, LoadType } from '@tsdi/core';
import { ILoggerManager } from '@tsdi/logs';
import { IConfigureManager } from './configure/IConfigureManager';
import { IAnnoationReflect, IAnnotationMetadata } from './annotations/reflect';
import { Configure } from './configure/Configure';
import { BootstrapMetadata } from './decorators';
import { IModuleReflect } from './modules/reflect';
import { ModuleRef } from './modules/ModuleRef';
import { IStartup } from './runnable/Startup';

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
    providers?: Provider[] | IInjector;
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
    /**
     * target module type.
     *
     * @type {ClassType}
     * @memberof AnnoationActionOption
     */
    module?: ClassType<T>;
    /**
     *  parent context.
     */
    parent?: IAnnoationContext;

}

/**
 * annoation context interface.
 */
export interface IAnnoationContext<T extends AnnoationOption = AnnoationOption> extends IocContext, IDestoryable {
    /**
    * current build type.
    */
    readonly type: Type;
    /**
     * current annoation type decorator.
     */
    readonly decorator: string;

    /**
     * current injector.
     */
    readonly injector: ICoreInjector;

    /**
     * current context providers.
     */
    readonly context: IProvider;
    /**
     * reflects.
     */
    readonly reflects: ITypeReflects;
    /**
     * get providers of options.
     */
    readonly providers: IProvider;


    /**
     * get current DI module ref.
     */
    getModuleRef(): ModuleRef;

    getTargetReflect(): IAnnoationReflect;

    getAnnoation(): IAnnotationMetadata;

    /**
     * set parent context
     * @param context
     */
    setParent(context: IAnnoationContext): this;

    getParent<T extends IAnnoationContext>(): T;

    addChild(contex: IAnnoationContext);

    removeChild(contex: IAnnoationContext);

    hasChildren(): boolean;

    getChildren<T extends IAnnoationContext>(): T[];
    /**
     * get token providers service route in root contexts.
     * @param token
     * @param success
     */
    getContext<T>(token: Token<T>, success?: (value: T) => void): T
    /**
     * resolve token value route in root contexts.
     * @param token
     * @param success
     */
    getContextValue<T>(token: Token<T>, success?: (value: T) => void): T;

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
    remove(...tokens: SymbolType[]);
    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     */
    get<T>(token: Token<T>): T;
    /**
     * get instance.
     * @param token the token key of instance.
     */
    getInstance<T>(token: SymbolType<T>): T;
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
     * get options of context.
     *
     * @returns {T}
     * @memberof IocRaiseContext
     */
    getOptions(): T;

    /**
     * set options for context.
     * @param options options.
     */
    setOptions(options: T): this;

    /**
     * clone this context.
     */
    clone(): this;
    /**
     * clone this context with out options.
     * @param empty empty context or not.
     */
    clone(empty: boolean): this;
    /**
     * clone this context with custom options.
     * @param options custom options.
     */
    clone(options: T): this;

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
export interface IBuildOption<T = any> extends AnnoationOption<T> {
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
 * handle context.
 *
 * @export
 * @interface IHandleContext
 */
export interface IHandleContext {

}


/**
 * build context.
 *
 * @export
 * @interface IBuildContext
 * @extends {IHandleContext}
 */
export interface IBuildContext<T extends IBuildOption = IBuildOption> extends IAnnoationContext<T>, IHandleContext {

    /**
     * build instance.
     */
    value?: any;

    /**
     * current type attr data to binding.
     */
    getTemplate(): Template;
}


export interface IBootContext<T extends BootOption = BootOption> extends IBuildContext<T> {

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
    readonly baseURL: string;

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

    readonly target: any;

    readonly boot: any;

    /**
     * get boot statup.
     */
    getStartup(): IStartup;

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

    /**
     * get target reflect.
     */
    getTargetReflect(): IModuleReflect;

    /**
     * annoation metadata.
     */
    getAnnoation(): BootstrapMetadata;

}
