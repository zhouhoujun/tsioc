/* eslint-disable no-case-declarations */
import { AbstractType, Type, noPointcut } from '../types';
import { Destroyable, DestroyCallback } from '../destroy';
import { InjectFlags, Token } from '../tokens';
import { defer, getTypeName } from '../utils/lang';
import { isNil, isFunction } from '../utils/chk';
import { MethodType, InjectorScope, RegisterOption, Injector, INJECT_IMPL, InjectOperator, InjectorRecord } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { ClassRef } from '../metadata/class';
import { CONTAINER, INJECTOR } from '../metadata/tk';
import { Provider, ModuleType } from '../providers';
import { InvocationContext, InvokeOptions } from '../context';
import { DefaultRuntime } from './runtime';
import { DefaultInvocationFactory } from './invocation';
import { InvocationFactory } from '../invocation';
import { NullInjectorException, processInject, THROW_FLAGE, tryResolveToken } from './resolve';
import { nonEnumerable } from '../metadata/decor';
import { Operator } from './operator';


export const SCOPE_PRODIDERS: Provider[] = [];


/**
 * Default Injector
 */
export class DefaultInjector extends Injector {
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
    private _parent: Injector | null;

    constructor(providers: Provider[] = [], parent?: Injector, readonly scope?: InjectorScope) {
        super()
        this.records = new Map();
        if (parent) {
            this._parent = parent;
            this.initParent(parent)
        } else {
            this._parent = null;
            scope = this.scope = 'platform'
        }
        this.initScope(scope);
        this.initProviders(providers);
    }


    protected initScope(scope?: InjectorScope) {
        const val = { value: this };
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
                    SCOPE_PRODIDERS.length && Operator.inject(this, SCOPE_PRODIDERS);
                }
                (this.isStatic ? staticInjectAlias : injectAlias).forEach(tk => this.records.set(tk, val));
                break;
        }
    }

    protected initProviders(providers: Provider[]) {
        const result = processInject(this, providers);
        if (result) {
            result.then(() => this._readyDefer.resolve())
        } else {
            this._readyDefer.resolve();
        }
    }

    protected initParent(parent: Injector) {
        parent.onDestroy(this)
    }

    get ready() {
        return this._readyDefer.promise
    }

    getRuntime(): Runtime {
        return this._runtime!
    }

    getParent(): Injector | null {
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
        assertNotDestroyed(this);
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


function assertNotDestroyed(injector: Injector): void {
    if (injector.destroyed) {
        throw new Exception(`${getTypeName(injector)} has already been destroyed.`)
    }
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


/**
 * static injector.
 */
export class StaticInjector extends DefaultInjector {
    protected isStatic = true;
}


const platformAlias = [Injector, CONTAINER];
const rootAlias = [Injector, INJECTOR];
const injectAlias = [Injector];
const staticInjectAlias = [Injector, StaticInjector];


INJECT_IMPL.create = (providers: Provider[], parent?: Injector, scope?: InjectorScope) => {
    if (scope === 'static' || isFunction(scope)) {
        return new StaticInjector(providers, parent, scope)
    }
    return new DefaultInjector(providers, parent!, scope)
};

INJECT_IMPL.isInjector = (target) => target instanceof DefaultInjector;



/**
 * register core for root.
 *
 * @export
 * @param {IContainer} container
 */
function registerCores(container: Injector, platform: Runtime) {
    platform.setSingleton(InvocationFactory, new DefaultInvocationFactory(platform), container);
}
