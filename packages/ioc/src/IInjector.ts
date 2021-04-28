import { Type, Modules, LoadType, ClassType } from './types';
import { Token } from './tokens';
import { IContainer } from './IContainer';
import { Destroyable } from './Destroyable';
import { MethodType } from './Invoker';
import { Registered, TypeReflect } from './decor/type';
import { Action } from './action';
import { Handler } from './utils/hdl';
import { StaticProvider, StaticProviders } from './providers';


/**
 * providers.
 */
export type ProviderType = IProvider | StaticProvider | Modules[];

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
 * inject types
 * @deprecated use `ProviderType` instead.
 */
export type InjectTypes = ProviderType;

/**
 * instance factory.
 */
export type Factory<T = any> = (provider: IProvider) => T;


/**
 * Factory of Token
 */
export type FactoryLike<T> = Type<T> | Factory<T>;

/**
 * instance fac.
 */
export interface InstFac<T = any> {
    provide?: Token<T>;

    /**
     * use class for provide.
     *
     * @type {Type}
     * @memberof ClassProvider
     */
    useClass?: Type<T>;
    /**
     * A list of `token`s which need to be resolved by the injector.
     */
    deps?: any[];
    /**
     * singleton or not.
     */
    singleton?: boolean;

    /**
     * use value for provide.
     *
     * @type {*}
     */
    useValue?: any;

    /**
    * A function to invoke to create a value for this `token`. The function is invoked with
    * resolved values of `token`s in the `deps` field.
    */
    useFactory?: Function;

    /**
     * use existing registered token for provide.
     *
     * @type {Token}
     * @memberof ExistingProvider
     */
    useExisting?: Token;

    
    /**
     * factory.
     */
    fac?: Factory<T>;
    /**
     * cache value.
     */
    cache?: T;
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
 * value register.
 */
export interface ValueRegister<T = any> {
    provide: Token<T>;
    /**
     * use value for provide.
     *
     * @type {*}
     */
    useValue: any;
}

export interface ProviderOption {
    provide?: Token;
    singleton?: boolean;
    regIn?: 'root';
}

export interface ClassRegister<T = any> extends ProviderOption {
    provide?: Token<T>;
    useClass: Type<T>;
}

/**
 * register option.
 */
export type RegisterOption<T> = ValueRegister<T> | ClassRegister<T>;




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
    getInstance<T>(type: ClassType<T>, ...providers: ProviderType[]): T;
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

    /**
     * has decorator provider or not.
     * @param decor
     */
    hasProvider(decor: string): boolean;
    /**
     * get decorator provider.
     * @param decor
     */
    getProvider(decor: string);

    /**
     * register decorator.
     * @param decor
     * @param providers
     */
    regDecoator(decor: string, ...providers: ProviderType[]);
}


/**
 * provider interface.
 */
export interface IProvider extends Destroyable {
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
     * get token instace in current injector or root container.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    get<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
     * get token instance in current injector or root container.
     *
     * @template T
     * @param {Token<T>} key
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getInstance<T>(key: Token<T>, ...providers: ProviderType[]): T;
    /**
     * resolve to instance.
     * @param key 
     * @param providers 
     */
    toInstance<T>(key: Token<T>, providers: IProvider): T;
    /**
     * get value.
     * @param token token key.
     */
    getValue<T>(token: Token<T>): T;
    /**
     * set value.
     * @param token provide key
     * @param value vaule
     */
    setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
    /**
     * delete value.
     * @param token key
     */
    delValue<T>(token: Token<T>): void;
    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Type<T>} provider
     * @param {Registered} [reged]  provider registered state.
     * @returns {this}
     */
    bindProvider<T>(provide: Token<T>, provider: Type<T>, reged?: Registered): this;
    /**
     * parse provider. no providers, will return new provider.
     * if not exist INJECTOR with provider this. { provide: INJECTOR, useValue: this }, { provide: Injector, useValue: this }
     * @param providers 
     */
    parseProvider(...providers: ProviderType[]): IProvider;

    /**
     * to provider. no providers, will return null
     * @param providers 
     */
    toProvider(...providers: ProviderType[]): IProvider;
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
     * @param {Token<T>} provide
     * @param {InstFac<T>} fac
     * @param {boolean} [replace] replace only.
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: InstFac<T>, replace?: boolean): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Factory<T>} fac
     * @param {Type<T>} [providerType]
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: Factory<T>, providerType?: Type<T>): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this;
    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    register<T>(type: Type<T>): this;
    /**
     * register with option.
     * @param options
     */
    register<T>(option: RegisterOption<T>): this;
    /**
     * register type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {FactoryLike<T>} provider
     * @param {boolean} singleton
     * @returns {this}
     */
    register<T>(token: Token<T>, provider: FactoryLike<T>, singleton: boolean): this;
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
     * @param {((pdr: InstFac, key: Token, resolvor?: IProvider) => void|boolean)} callbackfn
     * @param {boolean} [deep] deep iterator all register in parent or not.
     * @returns {(void|boolean)}
     */
    iterator(callbackfn: (pdr: InstFac, key: Token, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean;
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
    target?: Token | Object | (Token | Object)[];
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
 * service context option.
 *
 * @export
 * @interface ServiceOption
 * @extends {ResovleActionOption}
 */
export interface ServiceOption<T> extends ResolveOption<T> {
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
}

/**
 * services context options
 *
 * @export
 * @interface ServicesOption
 * @extends {ServiceOption}
 */
export interface ServicesOption<T> extends ServiceOption<T> {
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
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {Type[]}
     */
    use(...modules: Modules[]): Type[];
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
     * @param {Token<T>} token the token to resolve.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
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
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T;
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
    load(...modules: LoadType[]): Promise<Modules[]>;
    /**
     * register types.
     * @param modules modules.
     */
    register(injecor: IInjector, ...modules: LoadType[]): Promise<Type[]>;
    /**
     * dynamic require file.
     *
     * @param {string} fileName
     * @returns {Promise<any>}
     */
    require(fileName: string): Promise<any>;
    /**
     * load all class types in modules
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    loadTypes(...modules: LoadType[]): Promise<Type[][]>;
}
