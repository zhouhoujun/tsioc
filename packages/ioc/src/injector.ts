import { OnDestroy, Destroyable, DestroyCallback } from './destroy';
import { ClassType, EMPTY, LoadType, Modules, Type } from './types';
import { ClassProvider, ExistingProvider, FactoryProvider, ProviderType, ValueProvider } from './providers';
import { Token, InjectFlags } from './tokens';
import { Abstract } from './metadata/fac';
import { TypeReflect } from './metadata/type';
import { ProvidedInMetadata } from './metadata/meta';
import { isArray } from './utils/chk';
import { Handler } from './handler';
import { Action } from './action';
import { InvocationContext, InvokeOption } from './context';
import { ModuleLoader } from './module.loader';
import { LifecycleHooks } from './lifecycle';


/**
 * injector.
 * implements {@link Destroyable}
 */
@Abstract()
export abstract class Injector implements Destroyable, OnDestroy {
    /**
     * none poincut for aop.
     */
    static ƿNPT = true;

    readonly scope?: InjectorScope;
    /**
     * parent injector.
     */
    readonly parent?: Injector;
    /**
     * platform.
     */
    abstract platform(): Platform;
    /**
     * lifecycle hooks.
     */
    abstract get lifecycle(): LifecycleHooks;
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
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @returns {boolean}
     */
    abstract has<T>(token: Token<T>, flags?: InjectFlags): boolean;
    /**
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token token id {@link Token}.
     * @param {T} notFoundValue not found token, return this value.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags): T;
    /**
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token token id.
     * @param {InvocationContext} context invocation context. type of {@link InvocationContext}, use to resolve with token.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @param {T} notFoundValue not found token, return this value.
     * @returns {T} the token value.
     */
    abstract get<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags, notFoundValue?: T): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {ResolveOption<T>} option resolve option {@link ResolveOption}
     * @returns {T}
     */
    abstract resolve<T>(option: ResolveOption<T>): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {option} option the option of type {@link ResolverOption}, use to resolve with token.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, option?: ResolverOption): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {InvocationContext} context invocation context type of {@link InvocationContext}, use to resolve with token.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, context?: InvocationContext): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {ProviderType[]} providers the providers to resolve with token. array of {@link ProviderType}.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, providers?: ProviderType[]): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {...ProviderType[]} providers the providers {@link ProviderType} to resolve with token.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {ResolveOption<T>} option resolve option {@link ResolveOption}.
     * @returns {T}
     */
    abstract getService<T>(option: ResolveOption<T>): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T>} token  the resolve token {@link Token}.
     * @param {option} option the option of type {@link ResolverOption}, to resolve with token.
     * @returns {T}
     */
    abstract getService<T>(token: Token<T>, option?: ResolverOption): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T>} token  the resolve token {@link Token}.
     * @param {InvocationContext} context invocation context type of {@link InvocationContext}, use to resolve with token.
     * @returns {T}
     */
    abstract getService<T>(token: Token<T>, context?: InvocationContext): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T> } token servive token.
     * @param {ProviderType[]} providers the providers to resolve with token. array of {@link ProviderType}.
     * @returns {T}
     */
    abstract getService<T>(token: Token<T>, providers?: ProviderType[]): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T> } token servive token.
     * @param {...ProviderType[]} providers the providers {@link ProviderType} to resolve with token.
     * @returns {T}
     */
    abstract getService<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
     * set value.
     * @param token provide key
     * @param value the vaule provider for the token.
     * @param provider the value type.
     */
    abstract setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
    /**
     * set gloabl singleton.
     * @param token provide key
     * @param value singleton vaule
     */
    abstract setSingleton<T>(token: Token<T>, value: T): this;

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
     * @param {Type<any>[]} types class type array.
     */
    abstract register(types: (Type | RegisterOption)[]): this;
    /**
     * register types.
     * @param types class type params.
     */
    abstract register(...types: (Type | RegisterOption)[]): this;
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this} this self.
     */
    abstract unregister<T>(token: Token<T>): this;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {T} [instance] instance of target type.
     * @param {...ProviderType[]} providers ...params of {@link ProviderType}.
     * @returns {TR} the returnning of invoked method.
     */
    abstract invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {ProviderType[]} providers array of {@link ProviderType}.
     * @returns {TR} the returnning of invoked method.
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {InvokeOption} option ivacation context option, type of {@link InvokeOption}.
     * @returns {TR} the returnning of invoked method.
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, option?: InvokeOption): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey method name.
     * @param {InvocationContext} context ivacation context.
     * @returns {TR} the returnning of invoked method.
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    /**
     * get module loader.
     *
     * @returns instance of {@link ModuleLoader}.
     */
    abstract getLoader(): ModuleLoader;
    /**
    * load modules.
    *
    * @param {LoadType[]} modules load modules, array of {@link LoadType}.
    * @returns {Promise<Type[]>} async returnning array of class type.
    */
    abstract load(modules: LoadType[]): Promise<Type[]>;
    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules, ...params of {@link LoadType}.
     * @returns {Promise<Type[]>} async returnning array of class type.
     */
    abstract load(...modules: LoadType[]): Promise<Type[]>;

    /**
     * injector has destoryed or not.
     */
    abstract get destroyed(): boolean;
    /**
    * destroy this.
    */
    abstract destroy(): void | Promise<void>;
    /**
     * destroy hook.
     */
    abstract onDestroy(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback: DestroyCallback): void;
    /**
     * unregister destroy callback.
     * @param callback 
     */
    abstract offDestroy(callback: DestroyCallback): void;


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
            options = EMPTY
        }
        return isArray(options) ? INJECT_IMPL.create(options, parent, scope) :
            INJECT_IMPL.create(options.providers, options.parent, options.scope)
    }
}

export interface ModuleRef<T = any> extends Destroyable {
    get lifecycle(): LifecycleHooks;
    get injector(): Injector;
    get moduleType(): Type<T>;
    get instance(): T;
}

/**
 * transformation between `Observable` and `Promise`.
 */
@Abstract()
export abstract class ObservableParser {
    /**
     * parse promise to observable.
     * @param promise 
     */
    abstract fromPromise(promise: Promise<any>): { subscribe: Function; lift: Function };
    /**
     * parse observable to promise.
     * @param observable 
     */
    abstract toPromise(observable: any): Promise<any>;
}

/**
 * platform of {@link Container}.
 */
@Abstract()
export abstract class Platform implements OnDestroy {
    /**
     * registered modules.
     */
    abstract get modules(): Map<Type, ModuleRef>;
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
    abstract setInjector(scope: InjectorScope, injector: Injector): void;
    /**
     * get injector the type registered in.
     * @param scope
     */
    abstract getInjector(scope: InjectorScope): Injector;
    /**
     * remove injector of scope.
     * @param scope 
     */
    abstract removeInjector(scope: InjectorScope): void;
    /**
     * get the type private providers.
     * @param type
     */
    abstract getTypeProvider(type: ClassType | TypeReflect): ProviderType[];
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
    /**
     * has action.
     * @param token action token.
     */
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
    abstract getActionValue<T>(token: Token<T>, notFoundValue?: T): T;
    /**
     * destroy hook.
     */
    abstract onDestroy(): void;
}

/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is Injector {
    return target instanceof Injector
}

/**
* ioc container. 
*/
@Abstract()
export abstract class Container extends Injector { }


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
    create(providers: ProviderType[], parent?: Injector, scope?: InjectorScope): Injector {
        throw new Error('not implemented.')
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
export type InjectorScope = ClassType | 'platform' | 'root' | 'provider' | 'invocation' | 'configuration';

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
    /**
     * fn type.
     */
    fy?: FnType;

    deps?: DependencyRecord[];

    /**
     * token provider type.
     */
    type?: Type<T>;

    /**
     * is static for fn create once.
     */
    stic?: boolean;

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

export interface MethodFunc extends Function, TypedPropertyDescriptor<any> {
}
/**
 * method type.
 */
export type MethodType<T> = string | ((tag: T) => MethodFunc);
