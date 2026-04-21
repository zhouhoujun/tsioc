import { AbstractType, Type, noPointcut } from '../types';
import { DestroyCallback } from '../destroy';
import { InjectFlags, Token } from '../tokens';
import { Defer } from '../utils/lang';
import { MethodType, InjectorScope, RegisterOption, Injector, InjectorRecord, RegOption, EnvironmentInjector, RECORDS } from '../injector';
import { Runtime } from '../runtime';
import { ClassRef } from '../metadata/class';
import { Provider, ModuleType, StaticProvider, DynamicProvider, ModuleWithProviders, DependLike } from '../providers';
import { InvokeOptions } from '../context';
import { Parameter } from '../resolver';
import { ModuleDef } from '../metadata/type.def';
import { RunContext } from '../handlers/contexts';
export declare const SCOPE_PRODIDERS: Provider[];
/**
 * Default Injector
 */
export declare abstract class AbstractInjector<TParent extends Injector = Injector> extends Injector {
    readonly scope?: InjectorScope | undefined;
    readonly isStatic?: boolean | undefined;
    /**
     * none poincut for aop.
     *
     * 该类是否支持AOP注入
     */
    static [noPointcut]: boolean;
    private _destroyed;
    protected _dsryCbs: Set<DestroyCallback>;
    protected _runtime: Runtime | null;
    protected _readyDefer: Defer<void>;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     */
    protected records: Map<Token, InjectorRecord>;
    /**
     * records of providers.
     *
     * 容器提供者记录
     */
    readonly [RECORDS]: Map<Token<any>, InjectorRecord>;
    protected _parent: TParent;
    constructor(parent: TParent, scope?: InjectorScope | undefined, isStatic?: boolean | undefined);
    protected abstract initScope(scope?: InjectorScope): void;
    get ready(): Promise<void>;
    getRuntime(): Runtime;
    getParent(): TParent;
    has<T>(token: Token<T>, flags?: InjectFlags): boolean;
    protected hasFinal<T>(token: Token<T>, flags: InjectFlags): boolean;
    protected defaultNotFound(): any;
    get<T>(token: Token<T>, notFoundValue?: any, flags?: InjectFlags, context?: RunContext): T;
    isStaticToken(token: Token): boolean | undefined;
    protected getFinal<T>(token: Token<T>, flags: InjectFlags, context?: RunContext): T | null | undefined;
    protected notFound<T>(token: Token<T>, notFoundValue: any, flags: InjectFlags, context?: RunContext): T;
    /**
     * resolve parameter of targetType.
     *
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Parameter<T>} parameter the resolve parameter {@link Parameter}.
     * @param {RunContext} context the resolve context.
     *
     * @returns {T}
     */
    resolve<T>(parameter: Parameter<T>, context?: RunContext): T;
    /**
     * resolve token in context.
     *
     * 解析上下文中标记指令的实例值
     * @param token
     * @param {RunContext} context the resolver context.
     */
    resolve<T>(token: Token<T>, context?: RunContext): T;
    /**
     * resolve token in context.
     *
     * 解析上下文中标记指令的实例值
     * @param token
     * @param flags InjectFalgs
     * @param {RunContext} context the resolver context.
     */
    resolve<T>(token: Token<T>, falgs?: InjectFlags, context?: RunContext): T;
    /**
     * set value.
     *
     * 设置上下文中标记指令的实例值
     * @param token token
     * @param value value for the token.
     */
    setValue<T>(token: Token<T>, value: T): this;
    /**
     * has destoryed or not.
     */
    get destroyed(): boolean;
    /**
     * destroy this.
     */
    destroy(): void;
    /**
     * destroy hook.
     */
    onDestroy(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback: DestroyCallback): void;
    offDestroy(callback: DestroyCallback): void;
    private _destroying;
    protected clear(): void;
    protected assertNotDestroyed(): void;
}
export declare function assertNotDestroyed(injector: Injector): void;
/**
 * Environment Injector
 */
export declare class DefaultEnvironmentInjector extends AbstractInjector implements EnvironmentInjector {
    constructor(providers?: Provider[]);
    protected initScope(scope?: InjectorScope): void;
}
/**
 * static injector.
 */
export declare class StaticInjector extends AbstractInjector {
    constructor(parent: Injector, providers?: Provider[], scope?: InjectorScope);
    protected initScope(scope?: InjectorScope): void;
}
/**
 * Default Injector
 */
export declare class DefaultInjector extends AbstractInjector {
    constructor(parent: Injector, providers?: Provider[], scope?: Omit<InjectorScope, 'static' | 'platform'>, isStatic?: boolean);
    initScope(scope?: InjectorScope): void;
}
/**
 * Inject Util.
 */
export declare namespace InjectUtil {
    /**
     * set gloabl singleton.
     *
     * 设置标记令牌的实例，并设置为全局单例。
     *
     * @param token provide key
     * @param value singleton vaule
     */
    function setSingleton<T>(injector: Injector, token: Token<T>, value: T): void;
    /**
     * resolve parameter of targetType.
     *
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Parameter<T>} parameter the resolve parameter {@link Parameter}.
     * @param {RunContext} context the resolve context
     *
     * @returns {T}
     */
    function resolve<T>(injector: Injector, parameter: Parameter<T>, context?: RunContext): T;
    /**
     * resolve token instance with token and param provider.
     *
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @returns {T}
     */
    function resolve<T>(injector: Injector, token: Token<T>, flags?: InjectFlags): T;
    /**
     * resolve token instance with token and param provider.
     *
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {Provider[]} providers the providers to resolve with token. array of {@link Provider}.
     * @returns {T}
     */
    function resolve<T>(injector: Injector, token: Token<T>, providers?: Provider[]): T;
    /**
     * resolve token instance with token and param provider.
     *
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {option} option the option of type {@link ResolverOption}, use to resolve with token.
     * @returns {T}
     */
    function resolve<T>(injector: Injector, token: Token<T>, option?: InvokeOptions): T;
    /**
     * resolve token instance with token and param provider.
     *
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {RunContext} context resolve context type of {@link RunContext}, use to resolve with token.
     * @returns {T}
     */
    function resolve<T>(injector: Injector, token: Token<T>, context?: RunContext): T;
    /**
     * resolve token instance with token and param provider.
     *
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {...Provider[]} providers the providers {@link Provider} to resolve with token.
     * @returns {T}
     */
    function resolve<T>(injector: Injector, token: Token<T>, ...providers: Provider[]): T;
    /**
     * set value.
     *
     * 设置标记令牌的实例，并设置为静态值。
     *
     * @param token provide key
     * @param value the vaule provider for the token.
     * @param provider the value type.
     */
    function setValue<T>(injector: Injector, token: Token<T>, value: T, type?: AbstractType<T> | undefined): void;
    /**
     * cache token instance.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} cache
     * @param {number} expires cache expires time.
     * @returns {this}
     */
    function cache<T>(injector: Injector, token: Token<T>, value: T, expires: number): void;
    function provider(injector: Injector, provider: StaticProvider | DynamicProvider): void;
    /**
     * inject providers
     *
     * 注入提供标记指令
     * @param providers
     */
    function inject(injector: Injector, providers: Provider | Provider[]): void;
    /**
     * inject providers.
     *
     * 注入提供标记指令
     * @param {...Provider[]} providers
     * @returns {this}
     */
    function inject(injector: Injector, ...providers: Provider[]): void;
    /**
     * use modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {this}
     */
    function use(injector: Injector, modules: ModuleType[]): Type<any>[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    function use(injector: Injector, ...modules: ModuleType[]): Type<any>[];
    /**
     * async use modules.
     * @param modules
     */
    function useAsync(injector: Injector, modules: ModuleType[]): Promise<Type[]>;
    /**
     * async use modules.
     * @param modules
     */
    function useAsync(injector: Injector, ...modules: ModuleType[]): Promise<Type[]>;
    /**
     * register types.
     *
     * 注册类
     *
     * @param {Type<any>[]} types class type array.
     */
    function register(injector: Injector, types: (Type | RegisterOption)[]): void;
    /**
     * register types.
     *
     * 注册类
     * @param types class type params.
     */
    function register(injector: Injector, ...types: (Type | RegisterOption)[]): void;
    /**
     * unregister the token
     *
     * 注销标记指令
     * @template T
     * @param {Token<T>} token
     * @returns {this} this self.
     */
    function unregister<T>(injector: Injector, token: Token<T>): void;
    /**
     * invoke method.
     *
     * 调用类方法
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {T} [instance] instance of target type.
     * @param {...Provider[]} providers ...params of {@link Provider}.
     * @returns {TR} the returnning of invoked method.
     */
    function invoke<T, TR = any>(injector: Injector, target: T | AbstractType<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    /**
     * invoke method.
     *
     * 调用类方法
     * @deprecated  use `ReflectiveRef` instead.
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {Provider[]} providers array of {@link Provider}.
     * @returns {TR} the returnning of invoked method.
     */
    function invoke<T, TR = any>(injector: Injector, target: T | AbstractType<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    /**
     * invoke method.
     *
     * 调用类方法
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {InvokeOptions} option ivacation arguments, type of {@link InvokeOptions}.
     * @returns {TR} the returnning of invoked method.
     */
    function invoke<T, TR = any>(injector: Injector, target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
    /**
     * invoke method.
     *
     * 调用类方法
     * @template T
     * @param {(T | Token<T> | ClassRef<T>)} target type of class or instance
     * @param {MethodType} propertyKey method name.
     * @param {InvocationContext} context ivacation context.
     * @returns {TR} the returnning of invoked method.
     */
    function invoke<T, TR = any>(injector: Injector, target: T | Token<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: RunContext): TR;
}
export declare function deferProcessProviders(injector: Injector, providers: Provider[] | undefined, defer: Defer<void>): void;
export declare function processProviders(injector: Injector, providers: Provider[] | undefined): void | Promise<void>;
/**
 * generate record.
 * @param injector
 * @param provider
 * @returns
 */
/**
 * 生成提供者记录
 * @param injector 注入器实例
 * @param provider 提供者配置
 * @returns 优化后的提供者记录
 */
export declare function generateRecord<T>(injector: Injector, provider: StaticProvider<T>): InjectorRecord<T>;
export declare function generateTypeRecord(injector: Injector, typeRef: ClassRef, params?: DependLike[], provide?: Token, multi?: boolean): InjectorRecord;
export declare function register(injector: Injector, typeRef: ClassRef): void;
export declare function processInjectType(injector: Injector, typeOrDef: AbstractType | ModuleWithProviders, dedupStack: AbstractType[], imported?: boolean, extedOption?: (typeRef: ClassRef, option?: RegOption) => RegOption | undefined, moduleRefl?: ClassRef): void | Promise<void>;
export declare function processInjectDeclarations(injector: Injector, annotation: ModuleDef<any>, dedupStack: AbstractType[], declarations?: boolean, ps?: Promise<void> | void): void | Promise<void>;
export declare function processUse(injector: Injector, args: ModuleType[], types?: AbstractType[]): void | Promise<void>;
