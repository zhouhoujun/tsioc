import { AbstractType, Type, noPointcut } from '../types';
import { Destroyable, DestroyCallback } from '../destroy';
import { InjectFlags, Token } from '../tokens';
import { deepForEach, defer, getTypeName } from '../utils/lang';
import { isNil, isFunction, isPromise, isArray, isNumber, isDefined, isUndefined, isBoolean } from '../utils/chk';
import { MethodType, InjectorScope, RegisterOption, Injector, INJECT_IMPL, InjectOperator, InjectorRecord, TypeOption } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { ClassRef } from '../metadata/class';
import { CONTAINER, INJECTOR } from '../metadata/tk';
import { Provider, ModuleType, StaticProvider, DynamicProvider, StaticProviders, MutilProvider } from '../providers';
import { InvocationContext, InvokeOptions } from '../context';
import { DefaultRuntime } from './runtime';
import { DefaultInvocationFactory } from './invocation';
import { InvocationFactory } from '../invocation';
import { NullInjectorException, processInject, registerClass, THROW_FLAGE, tryResolveToken } from './resolve';
import { nonEnumerable } from '../metadata/decor';
import { Operator } from './operator';
import { isPlainObject } from '../utils/obj';
import { getClassRef } from '../metadata/refl';
import { escape } from 'node:querystring';



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

    protected isStatic?: boolean;

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
    private _parent: TParent | null;

    constructor(parent?: TParent, readonly scope?: InjectorScope) {
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

    protected assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Exception(`${getTypeName(this)} has already been destroyed.`)
        }
    }

    protected processProviders(providers: Provider[]) {
        if (!providers.length) return;

        const result = eachProvider(providers, p => this.processProvider(p));
        if (result) {
            result.then(() => this._readyDefer.resolve())
        } else {
            this._readyDefer.resolve();
        }
    }

    protected processProvider(provider: StaticProvider | DynamicProvider): void | Promise<void> {
        // if (isFunction(provider)) {
        //     registerClass(injector, getClassRef(provider))
        // } else if (isPlainObject(provider)) {
        //     if ((provider as StaticProviders).provide) {
        //         registerProvider(injector, provider as StaticProviders)
        //     } else if ((provider as TypeOption).type) {

        //         registerClass(injector, getClassRef((provider as TypeOption).type), provider as TypeOption)

        //     } else if ((provider as DynamicProvider).provider) {
        //         const pdrs = (provider as DynamicProvider).provider(injector);
        //         if (isPromise(pdrs)) {
        //             return pdrs.then(ps => {
        //                 if (ps) Operator.inject(injector, ps);
        //             });
        //         }
        //         if (pdrs) this.processProviders(pdrs);
        //     }
        // }


        // if (isFunction(provider)) {
        //     // this.registerClass(getClassRef(provider))
        //     // this.registerClass(getClassRef(provider))
        // } else 
        const token = isFunction(provider) ? provider : (provider as StaticProviders).provide;
        if (token) {
            const mtltk = generateRecord(this, provider as StaticProviders);
            if (!isFunction(provider) && (provider as MutilProvider).multi) {
                let multiPdr = this.records.get(token);
                if (!multiPdr) {
                    multiPdr = createRecord(undefined, LAZY, true);
                    multiPdr.factory = () => invokeArgsForFactory(this, multiPdr!.multi);
                    this.records.set(token, multiPdr);
                }
                if (multiPdr.multi) {
                    const mtltk = generateRecord(this, provider);
                    if (isNumber(provider.multiOrder)) {
                        multiPdr.multi.splice(provider.multiOrder, 0, mtltk)
                    } else {
                        multiPdr.multi.push(mtltk)
                    }
                }
            } else {
                this.records.set(token, generateRecord(this, provider))
            }
        } else if ((provider as DynamicProvider).provider) {
            const pdrs = (provider as DynamicProvider).provider(this);
            if (isPromise(pdrs)) {
                return pdrs.then(ps => {
                    ps && this.processProviders(ps);
                });
            } else if (pdrs) {
                this.processProviders(pdrs);
            }
        }
        // provider.onRegistered?.(injector);
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


}


export function eachProvider(providers: Provider[], cb: (provider: StaticProvider | DynamicProvider) => void) {
    return deepForEach(providers, cb, v => isPlainObject(v) && !((v as StaticProviders).provide || (v as DynamicProvider).provider));
}



export class DefaultInjectOperator implements InjectOperator {

    @nonEnumerable
    private injector: Injector;

    constructor(injector: Injector) {
        this.injector = injector;
    }


    setSingleton<T>(token: Token<T>, value: T): this {
        Operator.setSingleton(this.injector, token, value);
        return this;
    }

    resolve<T, TArg>(token: Token<T>, option?: InvokeOptions): T;
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    resolve<T>(token: Token<T>, providers?: Provider[]): T;
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    resolve<T>(token: Token<T>, ...args: any[]) {
        return Operator.resolve(this.injector, token, ...args);
    }

    setValue<T>(token: Token<T>, value: T, type?: AbstractType<T> | undefined): this {
        Operator.setValue(this.injector, token, value, type);
        return this
    }

    getTokenProvider<T>(token: Token<T>, flags = InjectFlags.Default): AbstractType<T> {
        return Operator.getTokenProvider(this.injector, token, flags);
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

    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        return Operator.invoke(this.injector, target, propertyKey, ...args);
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
export function generateRecord<T>(injector: Injector, provider: StaticProviders, isStatic?: boolean): InjectorRecord<T> {
    let factory: (() => T) | undefined;
    if (!isUndefined(provider.useValue)) {
        return createValueRecord(provider.useValue);
    } else if (provider.useFactory) {
        factory = () => provider.useFactory!(...invokeArgsForFactory(injector, provider.deps));
    } else if (provider.useExisting) {
        factory = () => injector.get(provider.useExisting);
    } else if (provider.useClass) {
        const classType = provider.useClass;
        // 确保类已注册
        // if (!injector.has(classType, InjectFlags.Default)) {
        //     Operator.register(injector, { singleton: provider.singleton, type: classType, provider.deps, regProvides: false });
        // }
        factory = () => {
            // 创建实例
            const instanceDeps = invokeArgsForFactory(injector, provider.deps);
            return new classType(...instanceDeps);
        };
    } else if (isFunction(provider.provide)) {
        // // 确保类已注册
        // if (!injector.has(classType, InjectFlags.Default)) {
        //     Operator.register(injector, { singleton: provider.singleton, type: classType, deps: [], regProvides: false });
        // }
        const classType = provider.provide;
        factory = () => {
            // 创建实例
            return injector.get(classType);
        };
    }
    if (isBoolean(provider.static)) {
        isStatic = provider.static;
    }

    return createRecord(factory, isStatic ? LAZY : null);
}

function createValueRecord<T>(value: T): InjectorRecord<T> {
    return { value };
}

function createRecord<T>(factory: (() => T) | undefined, value: T | null | {}, multi?: boolean): InjectorRecord<T> {
    return { factory, value, multi: multi ? [] : undefined };
}

/**
 * 辅助函数：为工厂函数调用解析参数
 */
function invokeArgsForFactory(injector: Injector, deps?: any[]): any[] {
    if (!deps || !deps.length) return [];

    const args: any[] = [];

    for (let i = 0; i < deps.length; i++) {
        const dep = deps[i];
        let depToken: Token;
        let depFlags = InjectFlags.Default;

        if (isArray(dep)) {
            depToken = dep[0];
            dep.forEach(d => {
                if (isNumber(d)) {
                    depFlags |= d;
                }
            });
        } else {
            depToken = dep;
        }

        args.push(injector.get(depToken, undefined, depFlags));
    }

    return args;
}
