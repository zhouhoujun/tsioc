import { Destroy, Destroyable, DestroyCallback } from './destroy';
import { ClassType, LoadType, Modules, Type } from './types';
import { ClassProvider, ExistingProvider, FactoryProvider, ProviderType, ValueProvider } from './providers';
import { Token, InjectFlags } from './tokens';
import { Abstract } from './metadata/fac';
import { TypeReflect } from './metadata/type';
import { ProvidedInMetadata } from './metadata/meta';
import { EMPTY, isArray, isFunction } from './utils/chk';
import { Handler } from './utils/hdl';
import { Action } from './action';
import { InvocationContext, InvokeOption, Resolver } from './invoker';
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
    protected _dsryCbs = new Set<DestroyCallback>();

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
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token
     * @param {InvocationContext} context 
     * @param {InjectFlags} flags
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags): T;
    /**
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} notFoundValue 
     * @param {InjectFlags} flags get token strategy.
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, notFoundValue?: T | any, flags?: InjectFlags): T;
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
     * @param {option} option use to resolve and {@link InvocationContext}
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, option?: ResolverOption): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {InvocationContext} context
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, context?: InvocationContext): T;
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
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
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
     * @param {Token<T>} token the token to resolve.
     * @param {option} option use to resolve and {@link InvocationContext}
     * @returns {T}
     */
    abstract getService<T>(token: Token<T>, option?: ResolverOption): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {InvocationContext} context
     * @returns {T}
     */
    abstract getService<T>(token: Token<T>, context?: InvocationContext): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T> } token servive token.
     * @param {ProviderType[]} providers
     * @returns {T}
     */
    abstract getService<T>(token: Token<T>, providers?: ProviderType[]): T;
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
     * register types.
     * @param {Type<any>[]} types 
     */
    abstract register(types: (Type | RegisterOption)[]): this;
    /**
     * register types.
     * @param types 
     */
    abstract register(...types: (Type | RegisterOption)[]): this;
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     */
    abstract unregister<T>(token: Token<T>): this;
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
     * @param {(T | Resolver<T> | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...ProviderType[]} providers
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(target: T | Resolver<T> | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Resolver<T> | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {ProviderType[]} providers
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(target: T | Resolver<T> | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Resolver<T> | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {any} option ivacation context option.
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(target: T | Resolver<T> | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, option?: InvokeOption): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {InvocationContext} context ivacation context.
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(target: T | Resolver<T> | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
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
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.destroy());
            } finally {
                this._dsryCbs.clear();
                this.destroying();
            }
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: DestroyCallback): void {
        this._dsryCbs.add(callback);
    }

    offDestroy(callback: DestroyCallback) {
        this._dsryCbs.delete(callback);
    }

    protected abstract destroying(): void;

    protected abstract processRegister(platform: Platform, type: Type, reflect: TypeReflect, option?: TypeOption): void;

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


@Abstract()
export abstract class Platform implements Destroyable {
    /**
     * platform injector.
     */
    abstract get injector(): Injector;
    /**
     * set singleton value
     * @param token 
     * @param value 
     */
    abstract registerSingleton<T>(injector: Injector, token: Token<T>, value: T): this;
    /**
     * get singleton instance.
     * @param token 
     */
    abstract getSingleton<T>(token: Token<T>): T;
    /**
     * has singleton or not.
     * @param token 
     */
    abstract hasSingleton(token: Token): boolean;
    /**
     * set injector scope.
     * @param scope 
     * @param injector 
     */
    abstract setInjector(scope: ClassType | string, injector: Injector): void;
    /**
     * get injector the type registered in.
     * @param scope
     */
    abstract getInjector(scope: ClassType | 'root' | 'platform'): Injector;
    /**
     * get the type private providers.
     * @param type
     */
    abstract getTypeProvider(type: ClassType): ProviderType[];
    /**
     * set type providers.
     * @param type
     * @param providers
     */
    abstract setTypeProvider(type: ClassType | TypeReflect, providers: ProviderType[]): void;
    /**
     * clear type provider.
     * @param type 
     */
    abstract clearTypeProvider(type: ClassType): void;
    /**
    * register action, simple create instance via `new type(this)`.
    * @param types
    */
    abstract registerAction(...types: Type<Action>[]): this;
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
    abstract setActionValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
    abstract getActionValue<T>(token: Token<T>, notFoundValue?: T): T

    abstract get destroyed(): boolean;
    abstract destroy(): void;
    abstract onDestroy(callback: Destroy | (() => void)): void;
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
* platform container interface.
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
 * instance factory.
 */
export type Factory<T = any> = (...args: any[]) => T;

/**
 * register option
 */
export interface RegOption<T = any> extends ProvidedInMetadata {
    provide?: Token<T>;
    injectorType?: boolean;
    regProvides?: boolean;
    singleton?: boolean;
}

/**
 * type register option.
 */
export interface TypeOption<T = any> extends RegOption<T> {
    type: Type<T>;
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
export type InjectorScope = Type | 'platform' | 'root' | 'provider' | 'invoked' | 'parameter' | string;

export const enum OptionFlags {
    Optional = 1 << 4,
    CheckSelf = 1 << 5,
    CheckParent = 1 << 6,
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
 * resovler option.
 */
export interface ResolverOption extends InvokeOption {
    /**
     * args.
     */
    args?: any[];
    /**
     * resolve token in target context.
     */
    target?: Token | TypeReflect | Object | (Token | Object)[];
    /**
     * all faild use the default token to get instance.
     */
    defaultToken?: Token;
    /**
     * resolve strategy.
     */
    flags?: InjectFlags;
    /**
     * register token if has not register.
     */
    regify?: boolean;

    context?: InvocationContext;
}

/**
 * resolve option of {@link Injector}
 */
export interface ResolveOption<T = any> extends ResolverOption {
    /**
     * token.
     */
    token: Token<T>;
}

/**
 * method type.
 */
export type MethodType<T> = string | ((tag: T) => Function);
