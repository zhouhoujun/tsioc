/* eslint-disable no-case-declarations */
import { AbstractType, Type, noPointcut } from '../types';
import { DestroyCallback } from '../destroy';
import { InjectFlags, Token } from '../tokens';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { cleanObj, deepForEach, defer, getTypeName, immediate } from '../utils/lang';
import { isArray, isDefined, isFunction, getType, isAbstractType } from '../utils/chk';
import { MethodType, InjectorScope, RegisterOption, FactoryRecord, Injector, INJECT_IMPL, InjectorOperator } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { getClassRef } from '../metadata/refl';
import { ClassRef } from '../metadata/class';
import { CONTAINER, INJECTOR, ROOT_INJECTOR } from '../metadata/tk';
import { Provider, ModuleType } from '../providers';
import { createContext, InvocationContext, InvokeOptions, hasContextOptions } from '../context';
import { DefaultRuntime } from './runtime';
import { DefaultInvocationFactory } from './invocation';
import { InvocationFactory } from '../invocation';
import { Empty, getRecords, processInject, processProvider, processUse, THROW_FLAGE, tryResolveToken } from './resolve';
import { nonEnumerable } from '../metadata/decor';


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

    protected isStatic?: boolean;

    protected _readyDefer = defer<void>();
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     */
    @nonEnumerable
    protected records: Map<Token, FactoryRecord>;
    private isAlias?: null | ((token: Token) => boolean);

    get ready() {
        return this._readyDefer.promise
    }

    @nonEnumerable
    private _parent: Injector | null;

    getParent(): Injector | null {
        return this._parent;
    }

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
                this.isAlias = isPlatformAlias;
                this._runtime = new DefaultRuntime(this);
                registerCores(this, this._runtime);
                break;
            case 'root':
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                this._runtime.setInjector(scope, this);
                rootAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isRootAlias;
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
                    SCOPE_PRODIDERS.length && this.inject(SCOPE_PRODIDERS);
                }
                injectAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = this.isStatic ? isStaticAlias : isInjectAlias;
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

    get size(): number {
        return this.records.size
    }

    getRuntime(): Runtime {
        return this._runtime!
    }

    register(types: (AbstractType | RegisterOption)[]): this;
    register(...types: (AbstractType | RegisterOption)[]): this;
    register(...args: any[]): this {
        this.assertNotDestroyed();
        deepForEach(args, t => {
            processProvider(this, t)
        });
        return this
    }

    cache<T>(token: Token<T>, cache: T, expires: number): this {
        this.assertNotDestroyed();
        const pd = this.records.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.cache = cache;
            pd.expires = ltop + expires
        } else {
            this.records.set(token, { cache, expires })
        }
        return this
    }

    inject(providers: Provider | Provider[]): this;
    inject(...providers: Provider[]): this;
    inject(...args: any[]): this {
        this.assertNotDestroyed();
        processInject(this, args);
        return this
    }

    use(modules: ModuleType[]): Type[];
    use(...modules: ModuleType[]): Type[];
    use(...args: any[]): Type[] {
        const types: Type[] = [];
        processUse(this, args, types);
        return types
    }


    useAsync(modules: ModuleType[]): Promise<Type[]>;
    useAsync(...modules: ModuleType[]): Promise<Type[]>;
    async useAsync(...args: any[]): Promise<Type[]> {
        const types: Type[] = [];
        await processUse(this, args, types);
        return types;
    }


    has<T>(token: Token<T>, flags = InjectFlags.Default): boolean {
        this.assertNotDestroyed();
        if (this.getRuntime().hasSingleton(token)) return true;
        if (!(flags & InjectFlags.SkipSelf) && (this.records.has(token))) return true;
        if (!(flags & InjectFlags.Self)) {
            return this._parent?.has(token, flags) === true
        }
        return false
    }


    setValue<T>(token: Token<T>, value: T, type?: AbstractType<T>): this {
        this.assertNotDestroyed();
        const isp = this.records.get(token);
        if (isp) {
            isp.value = value;
            if (type) isp.type = type
        } else if (isDefined(value)) {
            this.records.set(token, type ? { value, type } : { value })
        }
        return this
    }

    protected isself(token: Token): boolean {
        return this.isAlias ? this.isAlias(token) : false
    }

    get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags, context?: InvocationContext): T {
        this.assertNotDestroyed();
        if (this.isself(token)) return this as any;
        const runtime = this.getRuntime();
        if (runtime.hasSingleton(token)) return runtime.getSingleton(token);

        const record = this.records.get(token);
        return tryResolveToken(token, record, this.records, runtime, this._parent, context,
            notFoundValue === undefined ? THROW_FLAGE : notFoundValue,
            flags ?? InjectFlags.Default, record?.stic ?? this.isStatic)
    }


    resolve<T, TArg>(token: Token<T>, option?: InvokeOptions): T;
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    resolve<T>(token: Token<T>, providers?: Provider[]): T;
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    resolve<T>(token: Token<T>, ...args: any[]) {
        if (!args.length) {
            return this.get(token);
        }
        this.assertNotDestroyed();
        let context: InvocationContext | undefined;
        const isResolve = true;
        let isCtx = false;
        if (args.length === 1) {
            const arg1 = args[0];
            if (arg1 instanceof InvocationContext) {
                context = arg1;
                isCtx = true;
            } else if (isArray(arg1)) {
                context = arg1.length ? createContext(this, { isResolve, providers: arg1 }) : undefined;
            } else if (arg1.provide) {
                context = createContext(this, { isResolve, providers: [arg1] });
            } else if (hasContextOptions(arg1)) {
                context = createContext(this, { isResolve, ...arg1 });
            }
        } else {
            context = createContext(this, { isResolve, providers: args });
        }

        const result = (context && !isCtx) ? context.resolve(token, InjectFlags.Resolve) : this.get(token, null, InjectFlags.Resolve, context);

        if (context && !isCtx && !context.used) {
            immediate(() => context!.destroy());
        }
        return result;
    }

    unregister<T>(token: Token<T>): this {
        this.assertNotDestroyed();
        const isp = this.records?.get(token);
        if (isp) {
            this.records.delete(token);
            if (isp.type) this.getRuntime().clearTypeProvider(isp.type);
            cleanObj(isp)
        }

        return this
    }

    getTokenProvider<T>(token: Token<T>, flags = InjectFlags.Default): AbstractType<T> {
        this.assertNotDestroyed();
        let type: AbstractType | undefined;
        if (!(flags & InjectFlags.SkipSelf)) {
            const rd = this.records.get(token);
            type = rd?.type;
        }
        if (!type && !(flags & InjectFlags.Self)) {
            type = this._parent?.getTokenProvider(token, flags)
        }
        return type ?? null!
    }

    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        this.assertNotDestroyed();
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
            context = createContext(this, option);
        }
        if (isTypeObject(target)) {
            targetClass = getType(target);
            instance = target as T
        } else {
            if (target instanceof ClassRef) {
                tgRefl = target;
                targetClass = target.type
            } else {
                instance = this.get(target as Token, context);
                targetClass = getType(instance);
                if (!targetClass) {
                    throw new Exception((target as Token).toString() + ' is not implements by any class.')
                }
            }
        }
        tgRefl = tgRefl ?? getClassRef(targetClass);

        return tgRefl.invoke(tgRefl.getMethodName(propertyKey), context, instance)

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
        this.records = null!;
        if (this._parent) {
            !this._parent.destroyed && (this._parent as DefaultInjector).offDestroy?.(this)
        }
        this._runtime = null;
        this.isAlias = null;
        this._parent = null;
    }
}


function assertNotDestroyed(injector: Injector): void {
    if (injector.destroyed) {
        throw new Exception(`${getTypeName(injector)} has already been destroyed.`)
    }
}



export class DefaultInjectorOperator implements InjectorOperator {

    @nonEnumerable
    private injector: Injector;

    getInjector(){
        return this.injector;
    }

    constructor(injector: Injector) {
        this.injector = injector;
    }

    protected assertNotDestroyed(): void {
        assertNotDestroyed(this.injector);
    }

    setSingleton<T>(token: Token<T>, value: T): this {
        this.injector.getRuntime().setSingleton(token, value, this.injector);
        return this;
    }

    resolve<T, TArg>(token: Token<T>, option?: InvokeOptions): T;
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    resolve<T>(token: Token<T>, providers?: Provider[]): T;
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    resolve<T>(token: Token<T>, ...args: any[]) {
        if (!args.length) {
            return this.injector.get(token);
        }
        this.assertNotDestroyed();
        let context: InvocationContext | undefined;
        const isResolve = true;
        let isCtx = false;
        if (args.length === 1) {
            const arg1 = args[0];
            if (arg1 instanceof InvocationContext) {
                context = arg1;
                isCtx = true;
            } else if (isArray(arg1)) {
                context = arg1.length ? createContext(this.injector, { isResolve, providers: arg1 }) : undefined;
            } else if (arg1.provide) {
                context = createContext(this.injector, { isResolve, providers: [arg1] });
            } else if (hasContextOptions(arg1)) {
                context = createContext(this.injector, { isResolve, ...arg1 });
            }
        } else {
            context = createContext(this.injector, { isResolve, providers: args });
        }

        const result = (context && !isCtx) ? context.resolve(token, InjectFlags.Resolve) : this.injector.get(token, null, InjectFlags.Resolve, context);

        if (context && !isCtx && !context.used) {
            immediate(() => context!.destroy());
        }
        return result;
    }

    setValue<T>(token: Token<T>, value: T, type?: AbstractType<T> | undefined): this {
        this.assertNotDestroyed();
        const records = getRecords(this.injector);
        const isp = records.get(token);
        if (isp) {
            isp.value = value;
            if (type) isp.type = type
        } else if (isDefined(value)) {
            records.set(token, type ? { value, type } : { value })
        }
        return this
    }

    getTokenProvider<T>(token: Token<T>, flags = InjectFlags.Default): AbstractType<T> {
        this.assertNotDestroyed();
        let type: AbstractType | undefined;
        const records = getRecords(this.injector);
        if (!(flags & InjectFlags.SkipSelf)) {
            const rd = records.get(token);
            type = rd?.type;
        }
        if (!type && !(flags & InjectFlags.Self)) {
            type = this.injector.getParent()?.getTokenProvider(token, flags)
        }
        return type ?? null!
    }

    cache<T>(token: Token<T>, cache: T, expires: number): this {
        this.assertNotDestroyed();
        const records = getRecords(this.injector);
        const pd = records.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.cache = cache;
            pd.expires = ltop + expires
        } else {
            records.set(token, { cache, expires })
        }
        return this
    }

    inject(providers: Provider | Provider[]): this;
    inject(...providers: Provider[]): this;
    inject(...args: any[]): this {
        this.assertNotDestroyed();
        processInject(this.injector, args);
        return this
    }

    use(modules: ModuleType[]): Type[];
    use(...modules: ModuleType[]): Type[];
    use(...args: any[]): Type[] {
        const types: Type[] = [];
        processUse(this.injector, args, types);
        return types
    }


    useAsync(modules: ModuleType[]): Promise<Type[]>;
    useAsync(...modules: ModuleType[]): Promise<Type[]>;
    async useAsync(...args: any[]): Promise<Type[]> {
        const types: Type[] = [];
        await processUse(this.injector, args, types);
        return types;
    }


    register(types: (AbstractType | RegisterOption)[]): this;
    register(...types: (AbstractType | RegisterOption)[]): this;
    register(...args: any[]): this {
        this.assertNotDestroyed();
        deepForEach(args, t => {
            processProvider(this.injector, t)
        });
        return this
    }

    unregister<T>(token: Token<T>): this {
        this.assertNotDestroyed();
        const records = getRecords(this.injector);
        const isp = records?.get(token);
        if (isp) {
            records.delete(token);
            if (isp.type) this.injector.getRuntime().clearTypeProvider(isp.type);
            cleanObj(isp)
        }

        return this
    }
    
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        this.assertNotDestroyed();
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
            context = createContext(this.injector, option);
        }
        if (isTypeObject(target)) {
            targetClass = getType(target);
            instance = target as T
        } else {
            if (target instanceof ClassRef) {
                tgRefl = target;
                targetClass = target.type
            } else {
                instance = this.injector.get(target as Token, context);
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


/**
 * static injector.
 */
export class StaticInjector extends DefaultInjector {
    protected isStatic = true;
}


const platformAlias = [Injector, INJECTOR, CONTAINER];
const rootAlias = [Injector, INJECTOR, ROOT_INJECTOR];
const injectAlias = [Injector, INJECTOR];

const isPlatformAlias = (token: any) => token === Injector || token === INJECTOR || token === CONTAINER;
const isRootAlias = (token: any) => token === Injector || token === INJECTOR || token == ROOT_INJECTOR;
const isInjectAlias = (token: any) => token === Injector || token === INJECTOR;
const isStaticAlias = (token: any) => token === StaticInjector;

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
