import { Type, Modules, LoadType, ClassType } from './types';
import { Token } from './tokens';
import { Destroyable } from './Destroyable';
import { Registered, TypeReflect } from './metadata/type';
import { Action } from './action';
import { Handler } from './utils/hdl';
import { ClassProvider, ExistingProvider, FactoryProvider, StaticProvider, ValueProvider } from './providers';
import { ParameterMetadata } from './metadata/meta';


/**
 * providers.
 */
export type ProviderType =  Modules[] | IProvider | StaticProvider;

/**
 * providers types
 * @deprecated use `ProviderType` instead.
 */
export type ProviderTypes = ProviderType;
/**
 * providers types
 * @deprecated use `ProviderType` instead.
 */
export type ParamProviders = ProviderType;

/**
 * instance factory.
 */
export type Factory<T = any> = (provider: IProvider) => T;


/**
 * Factory of Token
 */
export type FactoryLike<T> = Type<T> | Factory<T>;


/**
 * type register option.
 */
export interface TypeOption<T = any> {
    provide?: Token<T>;
    type: Type<T>;
    singleton?: boolean;
    regIn?: 'root';
}

export type ProviderOption<T = any> =  ClassProvider | ValueProvider | ExistingProvider | FactoryProvider;

/**
 * register option.
 */
export type RegisterOption<T = any> = TypeOption<T> | ProviderOption<T>;


/**
 * instance provider.
 */
export interface FacRecord<T = any> {
    /**
     * use value for provide.
     *
     * @type {*}
     */
    value?: any;

    /**
     * factory.
     */
    fn?: Factory<T>;

    /**
     * token provider type.
     */
    type?: Type<T>;

    /**
     * cache value.
     */
    cache?: T;
    /**
     * last timer use the cache.
     */
    ltop?: number;
    /**
     * cache expires.
     */
    expires?: number;

    /**
     * unregister callback.
     */
    unreg?: () => void;
}



/**
 * registered state.
 */
export interface RegisteredState {
    /**
     * get type registered info.
     * @param type
     */
    getRegistered<T extends Registered>(type: ClassType): T;
    /**
     * get injector the type registered in.
     * @param type
     */
    getInjector<T extends IInjector = IInjector>(type: ClassType): T;
    /**
     * get the type private providers.
     * @param type
     */
    getTypeProvider(type: ClassType): IProvider;
    /**
     * set type providers.
     * @param type
     * @param providers
     */
    setTypeProvider(type: ClassType | TypeReflect, ...providers: ProviderType[]);
    /**
     * get instance.
     * @param type class type.
     */
    getInstance<T>(type: ClassType<T>, providers?: IProvider): T;
    /**
     * get instance.
     * @param type class type.
     */
    resolve<T>(type: ClassType<T>, ...providers: ProviderType[]): T;
    /**
     * check the type registered or not.
     * @param type
     */
    isRegistered(type: ClassType): boolean;

    /**
     * register type.
     * @param type class type
     * @param data registered data.
     */
    regType<T extends Registered>(type: ClassType, data: T);

    /**
     * delete registered.
     * @param type
     */
    deleteType(type: ClassType);

}

/**
 * provider interface.
 */
 export interface WithParent {
    /**
     * parent provider.
     */
    parent?: IProvider;
 }

/**
 * provider interface.
 */
export interface IProvider extends Destroyable, WithParent {
    /**
     * parent provider.
     */
    readonly parent?: IProvider;

    /**
     * registered state.
     */
    state(): RegisteredState;
    /**
     * action provider.
     */
    action(): IActionProvider;

    tokens(): Token[];

    /**
     * resolver size.
     *
     * @type {number}
     */
    readonly size: number;
    /**
     * get root container.
     */
    getContainer(): IContainer;
    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {boolean} deep deep check in parent or not.
     * @returns {boolean}
     */
    has<T>(token: Token<T>, deep?: boolean): boolean;
    /**
     * has value or not.
     * @param key
     */
    hasValue<T>(key: Token<T>): boolean;
    /**
     * get token instance in current injector or root container.
     *
     * @template T
     * @param {Token<T>} key
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    get<T>(key: Token<T>, providers?: IProvider): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {ResolveOption<T>} option  resolve option
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(option: ResolveOption<T>, ...providers: ProviderType[]): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {ResolveOption<T>} option  resolve option
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(option: ResolveOption<T>, providers: ProviderType[]): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
     * set value.
     * @param token provide key
     * @param value vaule
     */
    setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
    /**
     * reate provider or get provider.
     * only one provider with type IProvider with return the provider.
     * to provider. no providers, will return null
     * @param providers
     * @param force  no providers, return new provider or not.
     * @param newIfy init or do sth when create new provider.
     */
    toProvider(providers: ProviderType[], force?: boolean, newIfy?: (p: IProvider) => IProvider): IProvider;
    /**
    * get token implement class type.
    *
    * @template T
    * @param {Token<T>} token
    * @param {ResoveWay} [resway]
    * @returns {Type<T>}
    */
    getTokenProvider<T>(token: Token<T>): Type<T>
    /**
     * set provide.
     *
     * @template T
     * @param {ProviderOption<T>} option
     * @returns {this}
     */
    set<T>(option: ProviderOption<T>): this;
    /**
     * set provide.
     * @param token token.
     * @param option factory option.
     */
    set<T>(token: Token<T>, option: FacRecord<T>): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} fac
     * @param {Type<T>} [type] provider type.
     * @returns {this}
     */
    set<T>(token: Token<T>, fac: Factory<T>, type?: Type<T>): this;
    /**
     * cache instance.
     * @param token 
     * @param instance 
     * @param expires 
     */
    cache<T>(token: Token<T>, instance: T, expires: number): this;
    /**
     * parse
     * @param providers
     */
    inject(providers: ProviderType[]): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this;
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    use(modules: Modules[]): Type[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    use(...modules: Modules[]): Type[];

    /**
     * register with option.
     * @param options
     */
    register<T>(option: RegisterOption<T>): this;
    /**
     * register types.
     * @param types
     */
    register(...types: Type[]): this;
    /**
     * register types.
     * @param options
     */
    register(types: Type[]): this;
    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    register<T>(type: Type<T>): this;
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     */
    unregister<T>(token: Token<T>): this;
    /**
     * iterator current resolver.
     *
     * @param {((pdr: FacRecord, key: Token, resolvor?: IProvider) => void|boolean)} callbackfn
     * @param {boolean} [deep] deep iterator all register in parent or not.
     * @returns {(void|boolean)}
     */
    iterator(callbackfn: (pdr: FacRecord, key: Token, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean;
    /**
     * copy injector to current injector.
     *
     * @param {IProvider} target copy from
     * @param {(key: Token) => boolean} filter token key filter
     * @returns {this} current injector.
     */
    copy(from: IProvider, filter?: (key: Token) => boolean): this;
    /**
     * clone this injector to.
     * @param to
     */
    clone(to?: IProvider): IProvider;
    /**
     * clone this injector to.
     * @param {(key: Token) => boolean} filter token key filter
     * @param to
     */
    clone(filter: (key: Token) => boolean, to?: IProvider): IProvider;
}

/**
 * resovle action option.
 */
export interface ResolveOption<T = any> {
    /**
     * token.
     */
    token?: Token<T>;
    /**
     * resolve token in target context.
     */
    target?: Token | TypeReflect | Object | (Token | Object)[];
    /**
     * only for target private or ref token. if has target.
     */
    tagOnly?: boolean;
    /**
     * all faild use the default token to get instance.
     */
    defaultToken?: Token<T>;
    /**
     * register token if has not register.
     */
    regify?: boolean;

    /**
     * resolve providers.
     */
    providers?: ProviderType[];
}


/**
 * services context options
 *
 * @export
 * @interface ServicesOption
 * @extends {ServiceOption}
 */
export interface ServicesOption<T> extends ResolveOption<T> {
    /**
     * token provider service type.
     *
     * @type {Type}
     */
    tokens?: Token<T>[];
    /**
     * get extend servie or not.
     *
     * @type {boolean}
     */
    extend?: boolean;
    /**
     * get services both in container and target private refrence service.
     *
     * @type {boolean}
     */
    both?: boolean;
}


/**
 * action injector.
 */
export interface IActionProvider extends IProvider {
    /**
     * register action, simple create instance via `new type(this)`.
     * @param types
     */
    regAction(...types: Type<Action>[]): this;
    /**
     * get action via target.
     * @param target target.
     */
    getAction<T extends Handler>(target: Token<Action>): T;
}



/**
 * injector interface.
 *
 * @export
 * @interface IInjector
 */
export interface IInjector extends IProvider {
    /**
     * parent injector.
     */
    readonly parent?: IInjector;
    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {(Token<T> | T)} target type class
     * @param {MethodType<T>} propertyKey
     * @param {...ProviderType[]} providers
     * @returns {TR}
     */
    invoke<T, TR = any>(target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    getLoader(): IModuleLoader;
    /**
     * load modules.
     *
     * @param {LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     */
    load(modules: LoadType[]): Promise<Type[]>;
    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     */
    load(...modules: LoadType[]): Promise<Type[]>;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(target: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T;
    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[];
    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
     */
    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider;
}


/**
 * module loader interface for ioc.
 *
 * @export
 * @interface IModuleLoader
 */
export interface IModuleLoader {
    /**
     * load modules by files patterns, module name or modules.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Modules[]>}
     */
    load(modules: LoadType[]): Promise<Modules[]>;
    /**
     * register types.
     * @param modules modules.
     */
    register(injecor: IInjector, modules: LoadType[]): Promise<Type[]>;
    /**
     * dynamic require file.
     *
     * @param {string} fileName
     * @returns {Promise<any>}
     */
    require(fileName: string): Promise<any>;

    /**
     * get modules.
     * @param mdty
     */
    getMoudle(mdty: LoadType): Promise<Modules[]>;
    /**
     * load all class types in modules
     *
     * @param {LoadType[]} mdl
     * @returns {Promise<Type[]>}
     */
    loadType(mdl: LoadType): Promise<Type[]>;
    /**
     * load all class types in modules
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    loadTypes(modules: LoadType[]): Promise<Type[][]>;
}


/**
 * method type.
 */
 export type MethodType<T> = string | ((tag: T) => Function);

 /**
  * execution, invoke some type method.
  */
 export interface Invoker {
     /**
      * try to async invoke the method of intance, if no instance will create by type.
      *
      * @template T
      * @param { IInjector } injector
      * @param {(Token<T> | T)} target
      * @param {MethodType} propertyKey
      * @param {...ProviderType[]} providers
      * @returns {TR}
      */
     invoke<T, TR = any>(injector: IInjector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
     /**
      * create params instances with IParameter and provider of target type.
      *
      * @param { IInjector } injector
      * @param {Type} target target type.
      * @param {ParameterMetadata[]} params
      * @param {...AsyncParamProvider[]} providers
      * @returns {any[]}
      */
     createParams(injector: IInjector, target: Type, params: ParameterMetadata[],  ...providers: ProviderType[]): any[];
 }
 
 /**
  * @deprecated use `Invoker` instead.
  */
 export type IMethodAccessor = Invoker;

 /**
 * root container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IInjector {
    readonly id: string;
}

export type IIocContainer = IContainer;

