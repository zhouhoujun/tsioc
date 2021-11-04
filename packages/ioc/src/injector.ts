import { Destroyable } from './destroy';
import { ClassType, LoadType, Modules, Type } from './types';
import { Token, InjectFlags } from './tokens';
import { Abstract } from './metadata/fac';
import { TypeReflect } from './metadata/type';
import { remove } from './utils/lang';
import { EMPTY, isArray } from './utils/chk';
import { Handler } from './utils/hdl';
import { Action } from './action';
import { ClassProvider, ExistingProvider, FactoryProvider, StaticProvider, ValueProvider } from './providers';
import { InvocationContext, OperationArgumentResolver } from './invoker';
import { ModuleLoader } from './module.loader';


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

    readonly scope?: InjectorScope | string;

    /**
     * parent injector.
     */
    readonly parent?: Injector;
    /**
     * platform.
     */
    abstract platform(): Platform;
    /**
     * registered tokens.
     */
    abstract tokens(): Token<any>[];
    /**
     * token size.
     */
    abstract get size(): number;
    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {InjectFlags} flags check strategy by inject flags.
     * @returns {boolean}
     */
    abstract has<T>(token: Token<T>, flags?: InjectFlags): boolean;
    /**
     * has value or not.
     * @param token
     * @param {InjectFlags} flags check strategy by inject flags.
     */
    abstract hasValue<T>(token: Token<T>, flags?: InjectFlags): boolean;
    /**
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} notFoundValue 
     * @param {InjectFlags} flags get token strategy.
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {ResolveOption<T>} option  resolve option
     * @returns {T}
     */
    abstract resolve<T>(option: ResolveOption<T>): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, option?: {
        /**
        * resolve token in target context.
        */
        target?: Token | TypeReflect | Object | (Token | Object)[];
        /**
         * all faild use the default token to get instance.
         */
        defaultToken?: Token<T>;
        /**
         * resolve strategy.
         */
        flags?: InjectFlags;
        /**
         * register token if has not register.
         */
        regify?: boolean;
        /**
         * resolve providers.
         */
        providers?: ProviderType[];
        /**
         * invocation context.
         */
        context?: InvocationContext;
    }): T;
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
    abstract resolve<T>(token: Token<T>, providers?: ProviderType[]): T;
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
     * @param {InjectFlags} flags get token strategy.
     * @returns {Type<T>}
     */
    abstract getTokenProvider<T>(token: Token<T>, flags?: InjectFlags): Type<T>;
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
    abstract set<T>(token: Token<T>, option: FactoryRecord<T>): this;
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
    
    // /**
    //  * iterator current resolver.
    //  *
    //  * @param {((pdr: FactoryRecord, key: Token, resolvor?: Injector) => void|boolean)} callbackfn
    //  * @param {InjectFlags} [flags] iterator strategy.
    //  * @returns {(void|boolean)}
    //  */
    // abstract iterator(callbackfn: (pdr: FactoryRecord<any>, key: Token<any>, resolvor?: Injector) => boolean | void, flags?: InjectFlags): boolean | void;
    
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
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...ProviderType[]} providers
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {ProviderType[]} providers
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {any} option ivacation context option.
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, option: {
        args?: Record<string, any>,
        resolvers?: OperationArgumentResolver[] | ((injector: Injector, typeRef?: TypeReflect<T>, method?: string) => OperationArgumentResolver[]),
        providers?: ProviderType[]
    }): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {InvocationContext} context ivacation context.
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, context: InvocationContext): TR;
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
     * @param {(ResolveOption<T>} option resolve option.
     * @returns {T}
     */
    abstract getService<T>(option: ResolveOption<T>): T;
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
            this._dsryCbs = null!;
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

    protected abstract destroying(): void;

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
        options: ProviderType[] | { providers: ProviderType[], parent?: Injector, scope?: InjectorScope } | undefined,
        parent?: Injector, scope?: InjectorScope): Injector {
        if (!options) {
            options = EMPTY;
        }
        return isArray(options) ? INJECT_IMPL.create(options, parent, scope) :
            INJECT_IMPL.create(options.providers, options.parent, options.scope);
    }
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


@Abstract()
export abstract class Platform implements Destroyable {
    /**
     * modules.
     */
    abstract get modules(): Set<Type>;
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
    abstract setTypeProvider(type: ClassType | TypeReflect, providers: ProviderType[]): void;
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
    abstract regType<T extends Registered>(type: ClassType, data: T): void;

    /**
     * delete registered.
     * @param type
     */
    abstract deleteType(type: ClassType): void;

    /**
    * register action, simple create instance via `new type(this)`.
    * @param types
    */
    abstract regAction(...types: Type<Action>[]): this;
    abstract hasAction(token: Token): boolean;
    /**
     * get action instace in current .
     *
     * @template T
     * @param {Token<T>} token
     * @param {Injector} provider
     * @returns {T}
     */
    abstract getAction<T>(token: Token<T>, notFoundValue?: T): T
    /**
     * get action handle.
     * @param target target.
     */
    abstract getHandle<T extends Handler>(target: Token<Action>): T;
    /**
     * set value.
     * @param token 
     * @param value 
     * @param provider 
     */
    abstract setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;

    abstract get destroyed(): boolean;
    abstract destroy(): void;
    abstract onDestroy(callback: () => void): void;

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
* @deprecated use {@link Injector} instead.
*/
@Abstract()
export abstract class Container extends Injector { };


/**
 * injector factory implement.
 */
export const INJECT_IMPL = {
    /**
     * create injector
     * @param providers 
     * @param parent 
     * @param scope 
     */
    create(providers: ProviderType[], parent?: Injector, scope?: string | InjectorScope): Injector {
        throw new Error('not implemented.');
    }
};

/**
 * providers for {@link Injector}.
 * 
 */
export type ProviderType = Modules[] | Injector | StaticProvider | undefined;

/**
 * instance factory.
 */
export type Factory<T = any> = (...args: any[]) => T;

/**
 * type register option.
 */
export interface TypeOption<T = any> {
    provide?: Token<T>;
    type: Type<T>;
    regProvides?: boolean;
    singleton?: boolean;
    regIn?: 'root';
}

/**
 * provider option.
 */
export type ProviderOption<T = any> = ClassProvider | ValueProvider | ExistingProvider | FactoryProvider;

/**
 * register option.
 */
export type RegisterOption<T = any> = TypeOption<T> | ProviderOption<T>;

/**
 * fn type
 */
export const enum FnType {
    Cotr,
    Inj,
    Fac
}

/**
 * injector scope.
 */
export type InjectorScope = Type | 'platfrom' | 'root' | 'provider' | 'invoked' | 'parameter';

export const enum OptionFlags {
    Optional = 1 << 0,
    CheckSelf = 1 << 1,
    CheckParent = 1 << 2,
    Default = CheckSelf | CheckParent
}

export interface DependencyRecord {
    token: any;
    options: OptionFlags;
}
/**
 * factory record.
 */
export interface FactoryRecord<T = any> {
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

    deps?: DependencyRecord[];

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
    token: Token<T>;
    /**
     * resolve token in target context.
     */
    target?: Token | TypeReflect | Object | (Token | Object)[];
    /**
     * all faild use the default token to get instance.
     */
    defaultToken?: Token<T>;
    /**
     * resolve strategy.
     */
    flags?: InjectFlags;
    /**
     * register token if has not register.
     */
    regify?: boolean;
    /**
     * resolve providers.
     */
    providers?: ProviderType[];
    /**
     * invocation context.
     */
    context?: InvocationContext;
}

/**
 * method type.
 */
export type MethodType<T> = string | ((tag: T) => Function);
