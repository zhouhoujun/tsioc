import { AbstractType, Type, noPointcut } from '../types';
import { Destroyable, DestroyCallback } from '../destroy';
import { InjectFlags, Token } from '../tokens';
import { cleanObj, deepForEach, Defer, defer, getTypeName, immediate } from '../utils/lang';
import { isNil, isFunction, isPromise, isArray, isNumber, isUndefined } from '../utils/chk';
import { getType, isType } from '../metadata/type';
import { MethodType, InjectorScope, RegisterOption, Injector, InjectOperator, InjectorRecord, RegOption, INJECT_IMPL, EnvironmentInjector, RecordFactory } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { ClassRef, ModuleDef } from '../metadata/class';
import { Provider, ModuleType, StaticProvider, DynamicProvider, MutilProvider, Provide, ProviderExts, isValueProvider, isFactoryProvider, isExistingProvider, isTypeProvider, UseAsStatic, ClassProvider, ModuleWithProviders } from '../providers';
import { createInvocationContext, hasContextOptions, INVOCATION_CONTEXT_IMPL, InvocationContext, InvokeOptions } from '../context';
import { nonEnumerable } from '../metadata/decor';
import { getClassRef } from '../metadata/refl';
import { NullInjectorException, THROW_FLAGE, tryResolveToken, eachProvider, mergePromise, createRecord, createValueRecord, resolveArgs, LAZY } from './common';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { createDesignContext, createRuntimeContext } from '../lifescope/context';
import { createResolveContext, getResolver, isParameter, Parameter, Parameters } from '../resolver';
import { CONTAINER, INJECTOR } from '../metadata/tk';
import { InvocationFactory } from '../invocation';
import { DefaultInvocationFactory } from './invocation';
import { DefaultRuntime } from './runtime';
import { getDef } from '../metadata/type.def';


export const SCOPE_PRODIDERS: Provider[] = [];

/**
 * Default Injector
 */
export class AbstractInjector<TParent extends Injector = Injector> extends Injector {
    /**
     * none poincut for aop.
     * 
     * 该类是否支持AOP注入
     */
    static [noPointcut] = true;

    private _destroyed = false;

    @nonEnumerable
    protected _dsryCbs = new Set<DestroyCallback>();

    @nonEnumerable
    protected _runtime: Runtime | null = null;

    @nonEnumerable
    protected _operator: InjectOperator | null = null;

    protected _readyDefer = defer<void>();
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     */
    @nonEnumerable
    protected records: Map<Token, InjectorRecord>;

    @nonEnumerable
    protected _parent: TParent | null;

    constructor(parent?: TParent, readonly scope?: InjectorScope, readonly isStatic?: boolean) {
        super()
        this.records = new Map();
        this._parent = parent ?? null;
        this.initScope(scope);
        parent?.onDestroy(this);
    }


    initScope(scope?: InjectorScope) {
        const val = createValueRecord(this);
        switch (scope) {
            case 'platform':
                platformAlias.forEach(tk => this.records.set(tk, val));
                this._runtime = new DefaultRuntime(this);
                registerCores(this, this._runtime);
                break;
            case 'root':
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                this._runtime.setInjector(scope, this);
                rootAlias.forEach(tk => this.records.set(tk, val));
                break;
            case 'static':
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                break;
            default:
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                if (scope) {
                    this._runtime.setInjector(scope, this);
                    SCOPE_PRODIDERS.length && processProviders(this, SCOPE_PRODIDERS);
                }
                (this.isStatic ? staticInjectAlias : injectAlias).forEach(tk => this.records.set(tk, val));
                break;
        }
    }

    get ready() {
        return this._readyDefer.promise
    }

    getRuntime(): Runtime {
        return this._runtime!
    }

    getParent(): TParent | null {
        return this._parent;
    }

    getInject(): InjectOperator {
        if (!this._operator) {
            this.assertNotDestroyed();
            this._operator = new DefaultInjectOperator(this);
        }
        return this._operator
    }

    getRecords() {
        return this.records;
    }


    has<T>(token: Token<T>, flags = InjectFlags.Default): boolean {
        this.assertNotDestroyed();
        if (!(flags & InjectFlags.NonSingleton) && this.getRuntime().has(token)) return true;
        if (!(flags & InjectFlags.SkipSelf) && (this.records.has(token))) return true;
        if (!(flags & InjectFlags.Self)) {
            return this._parent?.has(token, flags) === true
        }
        return false
    }

    get<T>(token: Token<T>, notFoundValue?: any, flags: InjectFlags = InjectFlags.Default, raise?: Injector): T {
        this.assertNotDestroyed();
        const runtime = this.getRuntime();

        // 检查单例缓存
        if (!(flags & InjectFlags.NonSingleton) && runtime.has(token)) return runtime.get(token);
        if (notFoundValue === undefined) {
            notFoundValue = THROW_FLAGE!;
        }
        // 检查当前注入器记录
        const record = this.records.get(token);
        if (record && !(flags & InjectFlags.SkipSelf)) {
            return tryResolveToken(token, record, runtime, this, raise ?? this,
                notFoundValue,
                flags, this.isStatic);
        }

        // 父注入器查找
        if (this._parent && !(flags & InjectFlags.Self)) {
            const value = this._parent.get(
                token,
                notFoundValue,
                flags & InjectFlags.NonSingleton,
                raise ?? this);

            if (this.isStatic && !isNil(value)) {
                this.records.set(token, createValueRecord(value))
            }
            return value;
        }

        // 处理未找到的情况
        let value: T;
        if (!(flags & InjectFlags.Optional)) {
            if (notFoundValue === THROW_FLAGE) {
                throw new NullInjectorException(token);
            }
            value = notFoundValue ?? null!;
        } else {
            value = notFoundValue ?? null!;
        }

        return value;
    }

    /**
     * resolve parameter of targetType.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Parameter<T>} parameter the resolve parameter {@link Parameter}.
     * @param {AbstractType} targetType the parameter of type.
     * 
     * @returns {T}
     */
    resolve<T>(parameter: Parameter<T>, targetType?: AbstractType): T;
    /**
     * resolve token in context.
     * 
     * 解析上下文中标记指令的实例值
     * @param token
     * @param flags InjectFalgs 
     */
    resolve<T>(token: Token<T>, falgs?: InjectFlags): T;
    resolve<T>(token: any, arg?: any): T {
        return InjectUtil.resolve(this, token, arg);
    }

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed
    }
    /**
     * destroy this.
     */
    destroy(): void {
        return this._destroying()
    }


    /**
     * destroy hook.
     */
    onDestroy(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback: DestroyCallback): void;
    onDestroy(callback?: DestroyCallback): void {
        if (!callback) {
            this._destroying()
        } else {
            this._dsryCbs.add(callback)
        }
    }

    offDestroy(callback: DestroyCallback) {
        this._dsryCbs.delete(callback)
    }


    private _destroying() {
        if (this._destroyed) return;
        this._destroyed = true;
        try {
            this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy());
        } finally {
            this._dsryCbs.clear();
            this.clear()
        }
        if (this.scope === 'root') {
            return this._parent?.destroy()
        }
    }


    protected clear() {
        this.scope && this.getRuntime()?.removeInjector(this.scope);
        this.records.forEach(r => {
            if (r?.type) this.getRuntime().clearTypeProvider(r.type);
        });
        this.records.clear();
        if (this._parent) {
            !this._parent.destroyed && (this._parent as Destroyable).offDestroy?.(this)
        }
        this._runtime = null;
        this._operator = null;
        this._parent = null;
    }


    assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Exception(`${getTypeName(this)} has already been destroyed.`)
        }
    }



}


/**
 * Environment Injector
 */
export class DefaultEnvironmentInjector extends AbstractInjector implements EnvironmentInjector {
    constructor(providers?: Provider[]) {
        super(undefined, 'platform');
        deferProcessProviders(this, providers, this._readyDefer)
    }
}

/**
 * static injector.
 */
export class StaticInjector extends AbstractInjector {

    constructor(providers?: Provider[], parent?: Injector, scope?: InjectorScope) {
        super(parent, scope ?? 'static', true);
        deferProcessProviders(this, providers, this._readyDefer)
    }
}


const platformAlias = [Injector, EnvironmentInjector, CONTAINER];
const rootAlias = [Injector, INJECTOR];
const injectAlias = [Injector];
const staticInjectAlias = [Injector, StaticInjector];





/**
 * Default Injector
 */
export class DefaultInjector extends AbstractInjector {

    constructor(providers?: Provider[], parent?: Injector, scope?: InjectorScope) {
        super(parent, parent ? scope : 'platform')
        deferProcessProviders(this, providers, this._readyDefer)
    }

}






INJECT_IMPL.create = (providers?: Provider[], parent?: Injector, scope?: InjectorScope) => {
    if (scope === 'static' || isFunction(scope)) {
        return new StaticInjector(providers, parent, scope)
    }
    return parent ? new DefaultInjector(providers, parent!, scope) : new DefaultEnvironmentInjector(providers);
};

INJECT_IMPL.isInjector = (target) => target instanceof AbstractInjector;

/**
 * register core for root.
 *
 * @export
 * @param {IContainer} container
 */
function registerCores(container: Injector, platform: Runtime) {
    platform.set(InvocationFactory, new DefaultInvocationFactory(platform), container);
}



export namespace InjectUtil {
    /**
     * set gloabl singleton.
     * 
     * 设置标记令牌的实例，并设置为全局单例。
     * 
     * @param token provide key
     * @param value singleton vaule
     */
    export function setSingleton<T>(injector: Injector, token: Token<T>, value: T): void {
        injector.getRuntime().set(token, value, injector);
    }

    /**
     * resolve parameter of targetType.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Parameter<T>} parameter the resolve parameter {@link Parameter}.
     * @param {AbstractType} targetType the parameter of type.
     * 
     * @returns {T}
     */
    export function resolve<T>(injector: Injector, parameter: Parameter<T>, targetType?: AbstractType): T;
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
    export function resolve<T>(injector: Injector, token: Token<T>, flags?: InjectFlags): T;
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
    export function resolve<T>(injector: Injector, token: Token<T>, providers?: Provider[]): T;
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
    export function resolve<T>(injector: Injector, token: Token<T>, option?: InvokeOptions): T;
    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {InvocationContext} context invocation context type of {@link InvocationContext}, use to resolve with token.
     * @returns {T}
     */
    export function resolve<T>(injector: Injector, token: Token<T>, context?: InvocationContext): T;
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
    export function resolve<T>(injector: Injector, token: Token<T>, ...providers: Provider[]): T;
    export function resolve<T>(injector: Injector, tokenOrParam: Token<T> | Parameter, ...args: any[]) {
        if (!args.length || isUndefined(args[0]) || isNumber(args[0]) || isFunction(args[0])) {
            if (isParameter(tokenOrParam)) {
                return getResolver(injector).resolve(tokenOrParam, createResolveContext(injector));
            } else {
                return getResolver(injector).resolve({ provider: tokenOrParam, flags: args[0] } as Parameter, createResolveContext(injector));
            }
        }
        (injector as AbstractInjector).assertNotDestroyed?.();
        const token = tokenOrParam as Token;
        let context: InvocationContext | undefined;
        const isResolve = true;
        let isCtx = false;
        if (args.length === 1) {
            const arg1 = args[0];
            if (INVOCATION_CONTEXT_IMPL.isContext(arg1)) {
                context = arg1;
                isCtx = true;
            } else if (isArray(arg1)) {
                context = arg1.length ? createInvocationContext(injector, { isResolve, providers: arg1 }) : undefined;
            } else if (arg1.provide) {
                context = createInvocationContext(injector, { isResolve, providers: [arg1] });
            } else if (hasContextOptions(arg1)) {
                context = createInvocationContext(injector, { isResolve, ...arg1 });
            }
        } else {
            context = createInvocationContext(injector, { isResolve, providers: args });
        }

        const result = (context && !isCtx) ? context.resolve(token, InjectFlags.Resolve) : injector.get(token, null, InjectFlags.Resolve, context);

        if (context && !isCtx && !context.used) {
            immediate(() => context!.destroy());
        }
        return result;
    }

    /**
     * set value.
     * 
     * 设置标记令牌的实例，并设置为静态值。
     * 
     * @param token provide key
     * @param value the vaule provider for the token.
     * @param provider the value type.
     */
    export function setValue<T>(injector: Injector, token: Token<T>, value: T, type?: AbstractType<T> | undefined): void {
        (injector as AbstractInjector).assertNotDestroyed();
        const records = (injector as AbstractInjector).getRecords();
        const isp = records.get(token);
        if (isp) {
            isp.value = value;
            if (type) isp.type = type
        } else if (!isNil(value)) {
            records.set(token, createValueRecord(value))
        }
    }

    /**
     * cache token instance.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} cache
     * @param {number} expires cache expires time.
     * @returns {this}
     */
    export function cache<T>(injector: Injector, token: Token<T>, value: T, expires: number): void {
        (injector as AbstractInjector).assertNotDestroyed();
        const records = (injector as AbstractInjector).getRecords();
        const pd = records.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.value = value;
            pd.expires = ltop + expires
        } else {
            records.set(token, { value, expires })
        }
    }

    export function provider(injector: Injector, provider: StaticProvider | DynamicProvider): void {
        processProvider(injector as AbstractInjector, provider);
    }

    /**
     * inject providers
     * 
     * 注入提供标记指令
     * @param providers
     */
    export function inject(injector: Injector, providers: Provider | Provider[]): void;
    /**
     * inject providers.
     *
     * 注入提供标记指令
     * @param {...Provider[]} providers
     * @returns {this}
     */
    export function inject(injector: Injector, ...providers: Provider[]): void;
    export function inject(injector: Injector, ...args: any[]): void {
        (injector as AbstractInjector).assertNotDestroyed();
        processProviders(injector as AbstractInjector, args);
    }

    /**
     * use modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {this}
     */
    export function use(injector: Injector, modules: ModuleType[]): Type<any>[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    export function use(injector: Injector, ...modules: ModuleType[]): Type<any>[];
    export function use(injector: Injector, ...args: any[]): Type<any>[] {
        const types: Type<any>[] = [];
        processUse(injector as AbstractInjector, args, types);
        return types
    }


    /**
     * async use modules.
     * @param modules 
     */
    export function useAsync(injector: Injector, modules: ModuleType[]): Promise<Type[]>;
    /**
     * async use modules.
     * @param modules 
     */
    export function useAsync(injector: Injector, ...modules: ModuleType[]): Promise<Type[]>;
    /**
     * async use modules.
     * @param modules 
     */
    export async function useAsync(injector: Injector, ...args: any[]): Promise<Type[]> {
        const types: Type<any>[] = [];
        await processUse(injector as AbstractInjector, args, types);
        return types;
    }


    /**
     * register types.
     * 
     * 注册类
     * 
     * @param {Type<any>[]} types class type array.
     */
    export function register(injector: Injector, types: (Type | RegisterOption)[]): void;
    /**
     * register types.
     * 
     * 注册类
     * @param types class type params.
     */
    export function register(injector: Injector, ...types: (Type | RegisterOption)[]): void;
    export function register(injector: Injector, ...args: any[]): void {
        (injector as AbstractInjector).assertNotDestroyed();
        deepForEach(args, t => {
            processProvider(injector as AbstractInjector, t)
        });
    }

    /**
     * unregister the token
     *
     * 注销标记指令
     * @template T
     * @param {Token<T>} token
     * @returns {this} this self.
     */
    export function unregister<T>(injector: Injector, token: Token<T>): void {
        (injector as AbstractInjector).assertNotDestroyed();
        const records = (injector as AbstractInjector).getRecords();
        const isp = records?.get(token);
        if (isp) {
            records.delete(token);
            if (isp.type) injector.getRuntime().clearTypeProvider(isp.type);
            cleanObj(isp)
        }
    }

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
    export function invoke<T, TR = any>(injector: AbstractInjector, target: T | AbstractType<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
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
    export function invoke<T, TR = any>(injector: AbstractInjector, target: T | AbstractType<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
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
    export function invoke<T, TR = any>(injector: AbstractInjector, target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
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
    export function invoke<T, TR = any>(injector: AbstractInjector, target: T | Token<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    export function invoke<T, TR = any>(injector: AbstractInjector, target: T | Token<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        injector.assertNotDestroyed();
        let providers: Provider[] | undefined;
        let context: InvocationContext | undefined;
        let option: any;
        if (args.length === 1) {
            const arg0 = args[0];
            if (INVOCATION_CONTEXT_IMPL.isContext(arg0)) {
                context = arg0;
                providers = [];
            } else if (isArray(arg0)) {
                providers = arg0
            } else if (isPlainObject(arg0) && !arg0.provide) {
                option = arg0
            } else {
                providers = args
            }
        } else {
            providers = args
        }

        let targetClass: AbstractType, instance: any;
        let tgRefl: ClassRef | undefined;

        if (!context) {
            option = { ...option, providers };
            context = createInvocationContext(injector, option);
        }
        if (isTypeObject(target)) {
            targetClass = getType(target);
            instance = target as T
        } else {
            if (target instanceof ClassRef) {
                tgRefl = target;
                targetClass = target.type
            } else {
                instance = injector.get(target as Token, context);
                targetClass = getType(instance);
                if (!targetClass) {
                    throw new Exception((target as Token).toString() + ' is not implements by any class.')
                }
            }
        }
        tgRefl = tgRefl ?? getClassRef(targetClass);

        return tgRefl.invoke(tgRefl.getMethodName(propertyKey), context, instance)

    }
}



export class DefaultInjectOperator implements InjectOperator {

    @nonEnumerable
    private injector: AbstractInjector;

    constructor(injector: AbstractInjector) {
        this.injector = injector;
    }


    setSingleton<T>(token: Token<T>, value: T): this {
        InjectUtil.setSingleton(this.injector, token, value);
        return this;
    }

    setValue<T>(token: Token<T>, value: T, type?: AbstractType<T> | undefined): this {
        InjectUtil.setValue(this.injector, token, value, type);
        return this
    }
    cache<T>(token: Token<T>, cache: T, expires: number): this {
        InjectUtil.cache(this.injector, token, cache, expires);
        return this
    }

    provider(provider: StaticProvider | DynamicProvider) {
        InjectUtil.provider(this.injector, provider);
        return this;
    }

    inject(providers: Provider | Provider[]): this;
    inject(...providers: Provider[]): this;
    inject(...args: any[]): this {
        InjectUtil.inject(this.injector, ...args);
        return this
    }

    use(modules: ModuleType[]): Type[];
    use(...modules: ModuleType[]): Type[];
    use(...args: any[]): Type[] {
        const types: Type[] = [];
        InjectUtil.use(this.injector, args, types);
        return types
    }


    useAsync(modules: ModuleType[]): Promise<Type[]>;
    useAsync(...modules: ModuleType[]): Promise<Type[]>;
    useAsync(...args: any[]): Promise<Type[]> {
        return InjectUtil.useAsync(this.injector, args);
    }


    register(types: (AbstractType | RegisterOption)[]): this;
    register(...types: (AbstractType | RegisterOption)[]): this;
    register(...args: any[]): this {
        InjectUtil.register(this.injector, ...args);
        return this
    }

    unregister<T>(token: Token<T>): this {
        InjectUtil.unregister(this.injector, token);
        return this
    }


    resolve<T, TArg>(token: Token<T>, option?: InvokeOptions): T;
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    resolve<T>(token: Token<T>, providers?: Provider[]): T;
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    resolve<T>(token: Token<T>, ...args: any[]) {
        return InjectUtil.resolve(this.injector, token, ...args);
    }

    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        return InjectUtil.invoke(this.injector, target, propertyKey, ...args);
    }
}

export function deferProcessProviders(injector: AbstractInjector, providers: Provider[] | undefined, defer: Defer<void>) {
    const ret = processProviders(injector, providers);
    if (ret) {
        ret.then(defer.resolve).catch(defer.reject);
    } else {
        defer.resolve();
    }
}

export function processProviders(injector: AbstractInjector, providers: Provider[] | undefined) {
    if (!providers || !providers.length) return;

    return eachProvider(providers, p => processProvider(injector, p));
}

function processProvider(injector: AbstractInjector, provider: StaticProvider | DynamicProvider): void | Promise<void> {

    const token = isFunction(provider) ? provider : (provider as Provide).provide;
    if (token) {
        const record = generateRecord(injector, provider as StaticProvider);
        if (!isFunction(provider) && (provider as MutilProvider).multi) {
            let multiPdr = injector.getRecords().get(token);
            if (!multiPdr) {
                multiPdr = createRecord(undefined, injector.isStatic, true);
                multiPdr.factory = (raise) => resolveArgs(raise ?? injector, multiPdr!.multi);
                injector.getRecords().set(token, multiPdr);
            }
            if (multiPdr.multi) {
                const multiOrder = (provider as MutilProvider).multiOrder;
                if (isNumber(multiOrder)) {
                    multiPdr.multi.splice(multiOrder, 0, record)
                } else {
                    multiPdr.multi.push(record)
                }
            }
        } else {
            injector.getRecords().set(token, record);
        }
        if (record.onRegister) {
            record.onRegister();
            record.onRegister = undefined;
        }
        (provider as ProviderExts).onRegistered?.(injector);
    } else if ((provider as DynamicProvider).provider) {
        const pdrs = (provider as DynamicProvider).provider(injector);
        if (isPromise(pdrs)) {
            return pdrs.then(ps => {
                ps && processProviders(injector, ps);
            });
        } else if (pdrs) {
            processProviders(injector, pdrs);
        }
    }
}







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
export function generateRecord<T>(injector: AbstractInjector, provider: StaticProvider): InjectorRecord<T> {

    if (isTypeProvider(provider)) {
        return generateTypeRecord(injector, getClassRef(provider));
    } else {
        let factory: RecordFactory<T> | undefined;
        if (isValueProvider(provider)) {
            return createValueRecord(provider.useValue);
        } else if (isFactoryProvider(provider)) {
            factory = (raise) => provider.useFactory(...resolveArgs(raise ?? injector, provider.deps));
        } else if (isExistingProvider(provider)) {
            factory = (raise, flags) => (raise ?? injector).get(provider.useExisting, undefined, flags);
        } else if (provider.provide) {
            if ((provider as ClassProvider).useClass && !(provider as ClassProvider).deps && injector.has((provider as ClassProvider).useClass)) {
                const type = (provider as ClassProvider).useClass;
                factory = (raise, flags) => raise?.get(type, null, flags) ?? injector.get(type, flags);
            } else {
                const classType = (provider as ClassProvider).useClass ?? provider.provide;
                return generateTypeRecord(injector, getClassRef(classType), provider.deps, provider.provide, provider.multi);
            }
        }

        return createRecord(factory, (provider as UseAsStatic).static ?? injector.isStatic);
    }

}


export function generateTypeRecord(injector: AbstractInjector, typeRef: ClassRef, params?: Parameters, provide?: Token, multi?: boolean): InjectorRecord {

    const { static: decStatic, providedIn, singleton } = typeRef.getAnnotation();
    const origin = injector;
    const runtime = injector.getRuntime();
    if (providedIn) {
        injector = runtime.getInjector(providedIn, injector);
    }
    const isStatic = decStatic ?? injector.isStatic;
    const type = typeRef.type as Type;
    const pdrId = origin !== injector;
    if (pdrId && injector.has(typeRef.type)) {
        return createRecord((raise, flags) => origin.get(type, undefined, flags), isStatic);
    }


    const factory = (raise?: Injector) => {
        if (singleton && runtime.has(type)) {
            return runtime.get(type);
        }

        const context = createRuntimeContext(injector, undefined, runtime, raise, multi, params);
        const instance = runtime.getInstanceHandler().handle(typeRef, context, { finally: () => context.onDestroy() });
        if (singleton) {
            runtime.set(type, instance, injector);
        }
        return instance;
    };

    let record: InjectorRecord;
    if (pdrId) {
        const pdRecord = createRecord(factory, isStatic);
        if (provide) injector.getRecords().set(type, pdRecord);
        record = createRecord(() => injector.get(type), isStatic);
    } else {
        record = createRecord(factory, isStatic);
        if (provide) injector.getRecords().set(type, record);
    }

    record.onRegister = () => {
        const context = createDesignContext(injector, undefined, runtime, multi, provide);
        runtime.getRegisterHandler().handle(typeRef, context, { finally: () => context.onDestroy() })
    }
    return record;

}

export function register(injector: AbstractInjector, typeRef: ClassRef) {
    const record = generateTypeRecord(injector, typeRef);
    injector.getRecords().set(typeRef.type, record);
    if (record.onRegister) record.onRegister();

}


export function processInjectType(
    injector: AbstractInjector,
    typeOrDef: AbstractType | ModuleWithProviders,
    dedupStack: AbstractType[],
    imported?: boolean,
    extedOption?: (typeRef: ClassRef, option?: RegOption) => RegOption | undefined,
    moduleRefl?: ClassRef,
): void | Promise<void> {
    // 提前检查重复处理
    const isFn = isFunction(typeOrDef);
    const type = isFn ? typeOrDef : typeOrDef.module;
    if (dedupStack.includes(type)) {
        return;
    }
    dedupStack.push(type);

    let ps: Promise<any> | void | undefined;

    // 处理ModuleWithProviders情况
    if (!isFn && typeOrDef.providers?.length) {
        ps = eachProvider(typeOrDef.providers, pdr => processProvider(injector, pdr));
    }


    const typeRef = moduleRefl ?? getClassRef<ModuleDef>(type);
    const annotation = typeRef.getAnnotation<ModuleDef>();
    if (annotation.module) {
        if (annotation.imports?.length) {
            for (const imp of annotation.imports) {
                ps = mergePromise(ps, () => processInjectType(injector, imp, dedupStack, true, extedOption));
            }
        }

        if (annotation.providers) {
            const providers = annotation.providers;
            ps = mergePromise(ps, () => eachProvider(
                providers,
                pdr => processProvider(injector, pdr)
            ))
        }

        const noDecl = !(imported && !(annotation.providedIn === 'root' || annotation.providedIn === 'platform'));

        ps = mergePromise(ps, () => processInjectDeclarations(injector, annotation, dedupStack, noDecl));

    }

    if (ps) {
        return ps.then(() => register(injector, typeRef));
    } else {
        register(injector, typeRef);
    }
}

export function processInjectDeclarations(
    injector: AbstractInjector,
    annotation: ModuleDef<any>,
    dedupStack: AbstractType[],
    declarations?: boolean,
    ps?: Promise<void> | void): void | Promise<void> {
    const dps: Promise<void>[] = [];
    if (ps) dps.push(ps);

    if (declarations && annotation.declarations?.length) {
        const extedOption = (typeRef: ClassRef, option?: RegOption) => ({ static: false, ...option, declaration: true });
        for (const d of annotation.declarations) {
            const res = processInjectType(injector, d, dedupStack, true, extedOption);
            if (res) {
                dps.push(res);
            }
        }
    }
    if (annotation.exports?.length) {
        const extedOption = (typeRef: ClassRef, option?: RegOption) => typeRef.getAnnotation<ModuleDef>().module ? option : ({ static: false, ...option, declaration: true });
        for (const d of annotation.exports) {
            const res = processInjectType(injector, d, dedupStack, true, extedOption);
            if (res) {
                dps.push(res);
            }
        }
    }
    if (dps.length) return Promise.all(dps) as Promise<any>;
}

export function processUse(injector: AbstractInjector, args: ModuleType[], types?: AbstractType[]) {
    const stk: AbstractType[] = [];
    return deepForEach(args, (ty: any) => {
        if (isType(ty) && getDef(ty)?.abstract !== true) {
            types?.push(ty);
            return processInjectType(injector, ty, stk)
        } else if (isFunction(ty.module) && isArray(ty.providers)) {
            types?.push(ty.module);
            return processInjectType(injector, ty, stk)
        }
    }, v => isPlainObject(v) && !(isFunction(v.module) && isArray(v.providers)));
}
