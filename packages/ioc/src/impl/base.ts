import { AbstractType, Type, noPointcut } from '../types';
import { Destroyable, DestroyCallback } from '../destroy';
import { InjectFlags, Token } from '../tokens';
import { cleanObj, deepForEach, Defer, defer, getTypeName, immediate } from '../utils/lang';
import { isNil, isFunction, isPromise, isArray, isNumber, isBoolean, isAbstractType, getType } from '../utils/chk';
import { MethodType, InjectorScope, RegisterOption, Injector, InjectOperator, InjectorRecord, TypeOption, RegOption } from '../injector';
import { ArgumentException, Exception } from '../exception';
import { Runtime } from '../runtime';
import { ClassRef, ModuleDef } from '../metadata/class';
import { Provider, ModuleType, StaticProvider, DynamicProvider, MutilProvider, Provide, ProviderExts, isValueProvider, isFactoryProvider, isExistingProvider, isClassProvider, isTypeProvider, UseAsStatic, ClassProvider, ModuleWithProviders } from '../providers';
import { createContext, hasContextOptions, InvocationContext, InvokeOptions } from '../context';
import { nonEnumerable } from '../metadata/decor';
import { getClassRef } from '../metadata/refl';
import { NullInjectorException, THROW_FLAGE, tryResolveToken, RegisterExtedOption, eachProvider, mergePromise, createRecord, createValueRecord, resolveArgs, Empty } from './common';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { Context, ContextToken } from '../handler';
import { PROVIDERIN_INJECTOR, REGISTER_INJECTOR } from '../lifescope/tokens';



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
        parent?.onDestroy(this);
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
        if (!(flags & InjectFlags.NonSingleton) && this.getRuntime().hasSingleton(token)) return true;
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
        if (!(flags & InjectFlags.NonSingleton) && runtime.hasSingleton(token)) return runtime.getSingleton(token);
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
                this.records.set(token, { value })
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



export namespace Operator {
    /**
     * set gloabl singleton.
     * 
     * 设置标记令牌的实例，并设置为全局单例。
     * 
     * @param token provide key
     * @param value singleton vaule
     */
    export function setSingleton<T>(injector: Injector, token: Token<T>, value: T): void {
        injector.getRuntime().setSingleton(token, value, injector);
    }

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
    export function resolve<T>(injector: Injector, token: Token<T>, ...args: any[]) {
        if (!(injector instanceof AbstractInjector)) throw new ArgumentException('not extends from AbstractInjector');
        if (!args.length) {
            return injector.get(token);
        }
        injector.assertNotDestroyed();
        let context: InvocationContext | undefined;
        const isResolve = true;
        let isCtx = false;
        if (args.length === 1) {
            const arg1 = args[0];
            if (arg1 instanceof InvocationContext) {
                context = arg1;
                isCtx = true;
            } else if (isArray(arg1)) {
                context = arg1.length ? createContext(injector, { isResolve, providers: arg1 }) : undefined;
            } else if (arg1.provide) {
                context = createContext(injector, { isResolve, providers: [arg1] });
            } else if (hasContextOptions(arg1)) {
                context = createContext(injector, { isResolve, ...arg1 });
            }
        } else {
            context = createContext(injector, { isResolve, providers: args });
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
        if (!(injector instanceof AbstractInjector)) throw new ArgumentException('not extends from AbstractInjector');
        injector.assertNotDestroyed();
        const records = injector.getRecords();
        const isp = records.get(token);
        if (isp) {
            isp.value = value;
            if (type) isp.type = type
        } else if (!isNil(value)) {
            records.set(token, createValueRecord(value, type))
        }
    }

    /**
     * get token implement class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {InjectFlags} flags get token strategy.
     * @returns {AbstractType<T>}
     */
    export function getTokenProvider<T>(injector: Injector, token: Token<T>, flags = InjectFlags.Default): AbstractType<T> {
        if (!(injector instanceof AbstractInjector)) throw new ArgumentException('not extends from AbstractInjector');
        injector.assertNotDestroyed();
        let type: AbstractType | undefined;
        const records = injector.getRecords();
        if (!(flags & InjectFlags.SkipSelf)) {
            const rd = records.get(token);
            type = rd?.type;
        }
        if (!type && !(flags & InjectFlags.Self)) {
            const parent = injector.getParent();
            type = parent ? getTokenProvider(parent as AbstractInjector, token, flags) : null!;
        }
        return type ?? null!
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
        if (!(injector instanceof AbstractInjector)) throw new ArgumentException('not extends from AbstractInjector');
        injector.assertNotDestroyed();
        const records = injector.getRecords();
        const pd = records.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.value = value;
            pd.expires = ltop + expires
        } else {
            records.set(token, { value, expires })
        }
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
        if (!(injector instanceof AbstractInjector)) throw new ArgumentException('not extends from AbstractInjector');
        injector.assertNotDestroyed();
        processProviders(injector, args);
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
        if (!(injector instanceof AbstractInjector)) throw new ArgumentException('not extends from AbstractInjector');
        const types: Type<any>[] = [];
        processUse(injector, args, types);
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
        if (!(injector instanceof AbstractInjector)) throw new ArgumentException('not extends from AbstractInjector');
        const types: Type<any>[] = [];
        await processUse(injector, args, types);
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
        if (!(injector instanceof AbstractInjector)) throw new ArgumentException('not extends from AbstractInjector');
        injector.assertNotDestroyed();
        deepForEach(args, t => {
            processProvider(injector, t)
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
    export function unregister<T>(injector: AbstractInjector, token: Token<T>): void {
        injector.assertNotDestroyed();
        const records = injector.getRecords();
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
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance
     * @param {MethodType} propertyKey method name.
     * @param {InvocationContext} context ivacation context.
     * @returns {TR} the returnning of invoked method.
     */
    export function invoke<T, TR = any>(injector: AbstractInjector, target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    export function invoke<T, TR = any>(injector: AbstractInjector, target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        injector.assertNotDestroyed();
        let providers: Provider[] | undefined;
        let context: InvocationContext | undefined;
        let option: any;
        if (args.length === 1) {
            const arg0 = args[0];
            if (arg0 instanceof InvocationContext) {
                context = arg0;
                providers = Empty;
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
            context = createContext(injector, option);
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
        Operator.setSingleton(this.injector, token, value);
        return this;
    }

    setValue<T>(token: Token<T>, value: T, type?: AbstractType<T> | undefined): this {
        Operator.setValue(this.injector, token, value, type);
        return this
    }
    cache<T>(token: Token<T>, cache: T, expires: number): this {
        Operator.cache(this.injector, token, cache, expires);
        return this
    }

    inject(providers: Provider | Provider[]): this;
    inject(...providers: Provider[]): this;
    inject(...args: any[]): this {
        Operator.inject(this.injector, ...args);
        return this
    }

    use(modules: ModuleType[]): Type[];
    use(...modules: ModuleType[]): Type[];
    use(...args: any[]): Type[] {
        const types: Type[] = [];
        Operator.use(this.injector, args, types);
        return types
    }


    useAsync(modules: ModuleType[]): Promise<Type[]>;
    useAsync(...modules: ModuleType[]): Promise<Type[]>;
    useAsync(...args: any[]): Promise<Type[]> {
        return Operator.useAsync(this.injector, args);
    }


    register(types: (AbstractType | RegisterOption)[]): this;
    register(...types: (AbstractType | RegisterOption)[]): this;
    register(...args: any[]): this {
        Operator.register(this.injector, ...args);
        return this
    }

    unregister<T>(token: Token<T>): this {
        Operator.unregister(this.injector, token);
        return this
    }



    getTokenProvider<T>(token: Token<T>, flags = InjectFlags.Default): AbstractType<T> {
        return Operator.getTokenProvider(this.injector, token, flags);
    }



    resolve<T, TArg>(token: Token<T>, option?: InvokeOptions): T;
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    resolve<T>(token: Token<T>, providers?: Provider[]): T;
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    resolve<T>(token: Token<T>, ...args: any[]) {
        return Operator.resolve(this.injector, token, ...args);
    }

    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        return Operator.invoke(this.injector, target, propertyKey, ...args);
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

export function processProvider(injector: AbstractInjector, provider: StaticProvider | DynamicProvider): void | Promise<void> {

    const token = isFunction(provider) ? provider : (provider as Provide).provide;
    if (token) {
        const record = generateRecord(injector, provider as StaticProvider);
        if (!isFunction(provider) && (provider as MutilProvider).multi) {
            let multiPdr = injector.getRecords().get(token);
            if (!multiPdr) {
                multiPdr = createRecord(undefined, LAZY, true);
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




const LAZY = {};


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
export function generateRecord<T>(injector: AbstractInjector, provider: StaticProvider, isStatic?: boolean): InjectorRecord<T> {

    if (isTypeProvider(provider)) {
        return generateTypeRecord(injector, getClassRef(provider), isStatic);
    } else {
        let factory: ((raise?: Injector) => T) | undefined;
        if (isValueProvider(provider)) {
            return createValueRecord(provider.useValue);
        } else if (isFactoryProvider(provider)) {
            factory = (raise?: Injector) => provider.useFactory(...resolveArgs(raise ?? injector, provider.deps));
        } else if (isExistingProvider(provider)) {
            factory = (raise?: Injector) => (raise ?? injector).get(provider.useExisting);
        } else if (provider.provide) {
            const classType = (provider as ClassProvider).useClass ?? provider.provide;
            if (!provider.deps) {
                return generateTypeRecord(injector, getClassRef(classType), isStatic);
            }
            factory = (raise?: Injector) => {
                // 创建实例
                const instanceDeps = resolveArgs(raise ?? injector, provider.deps);
                return new classType(...instanceDeps);
            };
        }

        if (isBoolean((provider as UseAsStatic).static)) {
            isStatic = (provider as UseAsStatic).static;
        }
        return createRecord(factory, isStatic ? LAZY : null);
    }

}



export function registerHandler(typeRef: ClassRef, context: Context) {
    const type = typeRef.type as Type;
    const injector = context.get(REGISTER_INJECTOR) as AbstractInjector;
    const providerIn = context.get(PROVIDERIN_INJECTOR) as AbstractInjector;

    const factory = (raise?: Injector) => {
        // 创建实例
        const instanceDeps = resolveArgs(raise ?? providerIn ?? injector, typeRef.getParameters('constructor'));
        return new type(...instanceDeps);
    };

    if (providerIn) {
        providerIn.getRecords().set(type, createRecord(factory, (typeRef.getAnnotation().static ?? providerIn.isStatic) ? LAZY : null));
        return createRecord((raise?: Injector) => providerIn.get(type, undefined, InjectFlags.Default, raise), (typeRef.getAnnotation().static ?? injector.isStatic) ? LAZY : null);
    }

    return createRecord(factory, (typeRef.getAnnotation().static ?? injector.isStatic) ? LAZY : null);
}

export function generateTypeRecord(injector: AbstractInjector, typeRef: ClassRef, isStatic?: boolean): InjectorRecord {
    isStatic = typeRef.getAnnotation()?.static ?? isStatic;
    const providedIn = typeRef.getAnnotation()?.providedIn;
    const origin = injector;
    const runtime = injector.getRuntime();
    if (providedIn) {
        injector = runtime.getInjector(providedIn, injector);
    }
    if (injector.has(typeRef.type)) {
        return createRecord(() => injector.get(type), isStatic ? LAZY : null);
    }
    const context = new Context();
    context.set(REGISTER_INJECTOR, injector);
    context.set(Runtime, injector.getRuntime());

    const type = typeRef.type as Type;
    if (origin !== injector) {
        context.set(PROVIDERIN_INJECTOR, injector);
        // register(injector, typeRef);
        // return createRecord(() => injector.get(type), isStatic ? LAZY : null);
    }

    return runtime.designHandler.handle(typeRef, context, {
        finally: () => {
            context.onDestroy()
        }
    });
    // const factory = (raise?: Injector) => {
    //     // 创建实例
    //     const instanceDeps = resolveArgs(raise ?? injector, typeRef.getParameters('constructor'));
    //     return new type(...instanceDeps);
    // };


    // return createRecord(factory, isStatic ? LAZY : null);

}

export function register(injector: AbstractInjector, typeRef: ClassRef) {
    const record = generateTypeRecord(injector, typeRef, injector.isStatic);
    injector.getRecords().set(typeRef.type, record);

}


export function processInjectType(
    injector: AbstractInjector,
    typeOrDef: AbstractType | ModuleWithProviders,
    dedupStack: AbstractType[],
    imported?: boolean,
    extedOption?: RegisterExtedOption,
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
        annotation.imports?.forEach(imp => {
            ps = mergePromise(ps, () => processInjectType(injector, imp, dedupStack, true, extedOption, moduleRefl));
        });

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
        annotation.declarations?.forEach(d => {
            const res = processInjectType(injector, d, dedupStack, true, extedOption);
            if (res) {
                dps.push(res);
            }
        });
    }
    if (annotation.exports?.length) {
        const extedOption = (typeRef: ClassRef, option?: RegOption) => typeRef.getAnnotation<ModuleDef>().module ? option : ({ static: false, ...option, declaration: true });
        annotation.exports?.forEach(d => {
            const res = processInjectType(injector, d, dedupStack, true, extedOption);
            if (res) {
                dps.push(res);
            }
        })
    }
    if (dps.length) return Promise.all(dps) as Promise<any>;
}

export function processUse(injector: AbstractInjector, args: ModuleType[], types?: AbstractType[]) {
    const stk: AbstractType[] = [];
    return deepForEach(args, (ty: any) => {
        if (isAbstractType(ty)) {
            types?.push(ty);
            return processInjectType(injector, ty, stk)
        } else if (isFunction(ty.module) && isArray(ty.providers)) {
            types?.push(ty.module);
            return processInjectType(injector, ty, stk)
        }
    }, v => isPlainObject(v) && !(isFunction(v.module) && isArray(v.providers)));
}
