import { Destroyable } from './Destroyable';
import { ClassType, LoadType, Modules, Type } from './types';
import { Token } from './tokens';
import { Abstract } from './metadata/fac';
import { remove } from './utils/lang';
import { isArray } from './utils/chk';
import { Action } from './action';
import { Handler } from './utils/hdl';
import { TypeReflect } from './metadata/type';
import { ClassProvider, ExistingProvider, FactoryProvider, StaticProvider, ValueProvider } from './providers';


/**
 * injector.
 */
@Abstract()
export abstract class Injector implements Destroyable {
    /**
     * none poincut for aop.
     */
    static ρNPT = true;

    private _destroyed = false;
    protected _dsryCbs: (() => void)[] = [];

    readonly scope?: InjectorScope;

    /**
     * parent injector.
     */
    readonly parent?: Injector;
    /**
     * registered state.
     */
    abstract state(): RegisteredState;
    /**
     * action provider.
     */
    abstract action(): ActionProvider;
    /**
     * registered tokens.
     */
    abstract tokens(): Token<any>[];
    /**
     * token size.
     */
    abstract get size(): number;
    /**
     * get application container.
     */
    abstract getContainer(): Container;
    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {boolean} deep deep check in parent or not.
     * @returns {boolean}
     */
    abstract has<T>(token: Token<T>, deep?: boolean): boolean;
    /**
     * has value or not.
     * @param key
     */
    abstract hasValue<T>(key: Token<T>, deep?: boolean): boolean;
    /**
     * get token instance in current injector or root container.
     *
     * @template T
     * @param {Token<T>} key
     * @param {Injector} provider origin raise provider
     * @param {T} notFoundValue
     * @returns {T}
     */
    abstract get<T>(key: Token<T>, provider?: Injector, notFoundValue?: T): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
    * resolve token instance with token and param provider.
    *
    * @template T
    * @param {Token<T>} token the token to resolve.
    * @param {ProviderType[]} providers
    * @returns {T}
    */
    abstract resolve<T>(token: Token<T>, providers: ProviderType[]): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {ResolveOption<T>} option  resolve option
     * @returns {T}
     */
    abstract resolve<T>(option: ResolveOption<T>): T;
    /**
     * set value.
     * @param token provide key
     * @param value vaule
     */
    abstract setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
    /**
    * get token implement class type.
    *
    * @template T
    * @param {Token<T>} token
    * @param {ResoveWay} [resway]
    * @returns {Type<T>}
    */
    abstract getTokenProvider<T>(token: Token<T>): Type<T>;
    /**
     * set provide.
     *
     * @template T
     * @param {ProviderOption<T>} option
     * @returns {this}
     */
    abstract set<T>(option: ProviderOption<T>): this;
    /**
     * set provide.
     * @param token token.
     * @param option factory option.
     */
    abstract set<T>(token: Token<T>, option: FnRecord<T>): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} fac
     * @param {Type<T>} [type] provider type.
     * @returns {this}
     */
    abstract set<T>(token: Token<T>, fac: Factory<T>, type?: Type<T>): this;
    /**
     * cache instance.
     * @param token 
     * @param instance 
     * @param expires 
     */
    abstract cache<T>(token: Token<T>, instance: T, expires: number): this;
    /**
     * parse
     * @param providers
     */
    abstract inject(providers: ProviderType[]): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    abstract inject(...providers: ProviderType[]): this;
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    abstract use(modules: Modules[]): Type<any>[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    abstract use(...modules: Modules[]): Type<any>[];
    /**
     * register with option.
     * @param options
     */
    abstract register<T>(option: RegisterOption<T>): this;
    /**
     * register types.
     * @param types 
     */
    abstract register(...types: Type<any>[]): this;
    /**
     * register types.
     * @param {Type<any>[]} types 
     */
    abstract register(types: Type<any>[]): this;
    /**
     * regoster type.
     * @param type 
     */
    abstract register<T>(type: Type<T>): this;
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     */
    abstract unregister<T>(token: Token<T>): this;
    /**
     * iterator current resolver.
     *
     * @param {((pdr: FnRecord, key: Token, resolvor?: Injector) => void|boolean)} callbackfn
     * @param {boolean} [deep] deep iterator all register in parent or not.
     * @returns {(void|boolean)}
     */
    abstract iterator(callbackfn: (pdr: FnRecord<any>, key: Token<any>, resolvor?: Injector) => boolean | void, deep?: boolean): boolean | void;
    /**
     * copy injector to current injector.
     *
     * @param {Injector} target copy from
     * @param {(key: Token) => boolean} filter token key filter
     * @returns {this} current injector.
     */
    abstract copy(from: Injector, filter?: (key: Token<any>) => boolean): this;
    /**
     * clone this injector to.
     * @param to
     */
    abstract clone(to?: Injector): Injector;
    /**
     * clone this injector to.
     * @param {(key: Token) => boolean} filter token key filter
     * @param to
     */
    abstract clone(filter: (key: Token<any>) => boolean, to?: Injector): Injector;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance.
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...ProviderType[]} providers
     * @returns {TR}
     * @memberof Injector
     */
    abstract invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * get module loader.
     *
     * @returns {ModuleLoader}
     */
    abstract getLoader(): ModuleLoader;
    /**
    * load modules.
    *
    * @param {LoadType[]} modules load modules.
    * @returns {Promise<Type[]>}  types loaded.
    */
    abstract load(modules: LoadType[]): Promise<Type[]>;
    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     */
    abstract load(...modules: LoadType[]): Promise<Type[]>;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T> } token servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    abstract getService<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
    * get service or target reference service in the injector.
    *
    * @template T
    * @param {Token<T> } token servive token.
    * @param {ProviderType[]} providers
    * @returns {T}
    */
    abstract getService<T>(token: Token<T>, providers: ProviderType[]): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(ResolveOption<T>} option resolve option.
     * @returns {T}
     */
    abstract getService<T>(option: ResolveOption<T>): T;
    /**
     * get all service extends type.
     *
     * @template T
     * @param {Token<T>} token servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    abstract getServices<T>(token: Token<T>, ...providers: ProviderType[]): T[];
    /**
    * get all service extends type.
    *
    * @template T
    * @param {Token<T>} token servive token or express match token.
    * @param {ProviderType[]} providers
    * @returns {T[]} all service instance type of token type.
    */
    abstract getServices<T>(token: Token<T>, providers: ProviderType[]): T[];
    /**
     * get all service extends type.
     *
     * @template T
     * @param {ServicesOption<T>} option servives resolve option.
     * @returns {T[]} all service instance type of token type.
     */
    abstract getServices<T>(option: ServicesOption<T>): T[];
    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs = null;
            this.destroying();
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this._dsryCbs?.unshift(callback);
    }

    offDestory(callback: () => void) {
        remove(this._dsryCbs, callback);
    }

    protected abstract destroying();

    /**
     * create injector.
     * @param providers 
     * @param parent 
     */
    static create(providers?: ProviderType[], parent?: Injector, scope?: InjectorScope): Injector;
    /**
     * create injector with option.
     * @param options 
     */
    static create(options: { providers: ProviderType[], parent?: Injector, scope?: InjectorScope }): Injector;
    static create(
        options: ProviderType[] | { providers: ProviderType[], parent?: Injector, scope?: InjectorScope },
        parent?: Injector, scope?: InjectorScope): Injector {
        if (!options) {
            options = EMPTY;
        }
        return isArray(options) ? INJ_IMPL.create(options, parent, scope) :
            INJ_IMPL.create(options.providers, options.parent, options.scope);
    }
}

/**
 * action injector.
 */
@Abstract()
export abstract class ActionProvider extends Injector {
    /**
     * register action, simple create instance via `new type(this)`.
     * @param types
     */
    abstract regAction(...types: Type<Action>[]): this;
    /**
     * get action via target.
     * @param target target.
     */
    abstract getAction<T extends Handler>(target: Token<Action>): T;
}


/**
 * module loader for ioc.
 *
 * @export
 */
@Abstract()
export abstract class ModuleLoader {
    /**
     * load modules by files patterns, module name or modules.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Modules[]>}
     */
    abstract load(modules: LoadType[]): Promise<Modules[]>;
    /**
     * register types.
     * @param modules modules.
     */
    abstract register(injecor: Injector, modules: LoadType[]): Promise<Type[]>;
    /**
     * dynamic require file.
     *
     * @param {string} fileName
     * @returns {Promise<any>}
     */
    abstract require(fileName: string): Promise<any>;
    /**
     * get modules.
     * @param mdty
     */
    abstract getMoudle(mdty: LoadType): Promise<Modules[]>;
    /**
     * load all class types in modules
     *
     * @param {LoadType[]} mdl
     * @returns {Promise<Type[]>}
     */
    abstract loadType(mdl: LoadType): Promise<Type[]>;
    /**
     * load all class types in modules
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    abstract loadTypes(modules: LoadType[]): Promise<Type[][]>;
}

/**
 * registered.
 */
export interface Registered {
    /**
     * provides.
     */
    readonly provides: Token[];
    /**
     * injector.
     */
    injector: Injector;
    /**
     * type private providers.
     */
    providers?: Injector;
}

/**
 * registered state.
 */
@Abstract()
export abstract class RegisteredState {
    /**
     * get type registered info.
     * @param type
     */
    abstract getRegistered<T extends Registered>(type: ClassType): T;
    /**
     * get injector the type registered in.
     * @param type
     */
    abstract getInjector<T extends Injector = Injector>(type: ClassType): T;
    /**
     * get the type private providers.
     * @param type
     */
    abstract getTypeProvider(type: ClassType): Injector;
    /**
     * set type providers.
     * @param type
     * @param providers
     */
    abstract setTypeProvider(type: ClassType | TypeReflect, providers: ProviderType[]);
    /**
     * get instance.
     * @param type class type.
     */
    abstract getInstance<T>(type: ClassType<T>): T;
    /**
     * get instance.
     * @param type class type.
     * @param providers
     */
    abstract resolve<T>(token: ClassType<T>, providers?: ProviderType[]): T
    /**
     * check the type registered or not.
     * @param type
     */
    abstract isRegistered(type: ClassType): boolean;

    /**
     * register type.
     * @param type class type
     * @param data registered data.
     */
    abstract regType<T extends Registered>(type: ClassType, data: T);

    /**
     * delete registered.
     * @param type
     */
    abstract deleteType(type: ClassType);
}

/**
 * empty.
 */
export const EMPTY = [];


export const INJ_IMPL = {
    create(providers: ProviderType[], parent?: Injector, name?: string): Injector {
        throw new Error('not implemented.');
    }
}
/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is Injector {
    return target instanceof Injector;
}

/**
* root container interface.
*
* @export
* @interface IContainer
*/
@Abstract()
export abstract class Container extends Injector {

    abstract onFinally(callback: () => void);
    /**
     * create injector.
     * @param providers 
     * @param parent 
     */
    static create(providers?: ProviderType[], parent?: Injector): Container;
    /**
     * create injector with option.
     * @param options 
     */
    static create(options: { providers: ProviderType[], parent?: Injector }): Container;
    static create(
        options?: ProviderType[] | { providers: ProviderType[], parent?: Injector},
        parent?: Injector): Container {
        if (!options) {
            options = EMPTY;
        }
        return isArray(options) ? CONTAINER_IMPL.create(options, parent) :
            CONTAINER_IMPL.create(options.providers, options.parent);
    }
}

export const CONTAINER_IMPL = {
    create(providers: ProviderType[], parent?: Injector): Container {
        throw new Error('not implemented.');
    }
}

export type IocContainer = Container;


/**
 * providers.
 */
export type ProviderType = Modules[] | Injector | StaticProvider;


/**
 * instance factory.
 */
export type Factory<T = any> = (...args) => T;


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

export type ProviderOption<T = any> = ClassProvider | ValueProvider | ExistingProvider | FactoryProvider;

/**
 * register option.
 */
export type RegisterOption<T = any> = TypeOption<T> | ProviderOption<T>;


export type FnType = 'cotr' | 'inj' | 'fac';


export type InjectorScope = 'root' | 'provider' | 'invoked' | 'container';

/**
 * factory record.
 */
export interface FnRecord<T = any> {
    /**
     * use value for provide.
     *
     * @type {*}
     */
    value?: any;

    /**
     * factory.
     */
    fn?: Function;

    fnType?: FnType;

    deps?: any[];

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
 * method type.
 */
export type MethodType<T> = string | ((tag: T) => Function);
