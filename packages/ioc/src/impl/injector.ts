/* eslint-disable no-case-declarations */
import { AbstractType, Type, noPointcut } from '../types';
import { DestroyCallback } from '../destroy';
import { InjectFlags, Token } from '../tokens';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { cleanObj, deepForEach, defer, immediate } from '../utils/lang';
import { isArray, isDefined, isFunction, isNumber, getType, isAbstractType, isPromise } from '../utils/chk';
import {
    MethodType, FnType, InjectorScope, RegisterOption, FactoryRecord,
    Injector, INJECT_IMPL, OptionFlags, RegOption, TypeOption
} from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { getClassRef } from '../metadata/refl';
import { ClassRef } from '../metadata/class';
import { CONTAINER, INJECTOR, ROOT_INJECTOR } from '../metadata/tk';
import { ModuleWithProviders, Provider, DynamicProvider, StaticProvider, StaticProviders, ModuleType } from '../providers';
import { createContext, InvocationContext, InvokeOptions, hasContextOptions } from '../context';
import { DefaultRuntime } from './runtime';
import { DesignContext } from '../lifescope/ctx';
import { DefaultInvocationFactory } from './invocation';
import { InvocationFactory } from '../invocation';
import { eachProvider, Empty, generateRecord, MUTIL, processInjectorType, THROW_FLAGE, tryResolveToken } from './resolve';
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
        const result = this.processInject(providers);
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

    // tokens() {
    //     return Array.from(this.records.keys())
    // }

    getRuntime(): Runtime {
        return this._runtime!
    }

    register(types: (AbstractType | RegisterOption)[]): this;
    register(...types: (AbstractType | RegisterOption)[]): this;
    register(...args: any[]): this {
        this.assertNotDestroyed();
        const runtime = this.getRuntime();
        deepForEach(args, t => {
            this.processProvider(runtime, t)
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
        this.processInject(args);
        return this
    }

    use(modules: ModuleType[]): Type[];
    use(...modules: ModuleType[]): Type[];
    use(...args: any[]): Type[] {
        const types: Type[] = [];
        this.processUse(args, types);
        return types
    }


    useAsync(modules: ModuleType[]): Promise<Type[]>;
    useAsync(...modules: ModuleType[]): Promise<Type[]>;
    async useAsync(...args: any[]): Promise<Type[]> {
        const types: Type[] = [];
        await this.processUse(args, types);
        return types;
    }

    protected processInject(providers: Provider[]) {
        this.assertNotDestroyed();
        if (providers.length) {
            const runtime = this.getRuntime();
            return eachProvider(providers, p => this.processProvider(runtime, p))
        }
    }

    protected processUse(args: ModuleType[], types?: AbstractType[]) {
        this.assertNotDestroyed();
        const runtime = this.getRuntime();
        const stk: AbstractType[] = [];
        return deepForEach(args, (ty: any) => {
            if (isAbstractType(ty)) {
                types?.push(ty);
                return this.processInjectorType(runtime, ty, stk)
            } else if (isFunction(ty.module) && isArray(ty.providers)) {
                types?.push(ty.module);
                return this.processInjectorType(runtime, ty, stk)
            }
        }, v => isPlainObject(v) && !(isFunction(v.module) && isArray(v.providers)));
    }

    protected processProvider(runtime: Runtime, p: TypeOption | StaticProvider | DynamicProvider): void | Promise<void> {
        if (isFunction(p)) {
            this.registerType(runtime, p)
        } else if (isPlainObject(p)) {
            if ((p as StaticProviders).provide) {
                this.registerProvider(runtime, p as StaticProviders)
            } else if ((p as TypeOption).type) {
                this.registerType(runtime, (p as TypeOption).type, p as TypeOption)
            } else if ((p as DynamicProvider).provider) {
                const pdrs = (p as DynamicProvider).provider(this);
                if (isPromise(pdrs)) {
                    return pdrs.then(ps => {
                        if (ps) this.processInject(isArray(ps) ? ps : [ps]);
                    });
                }
                if (pdrs) this.processInject(isArray(pdrs) ? pdrs : [pdrs]);
            }
        }
    }

    /**
     * register type class.
     * @param injector register in the injector.
     * @param option the type register option.
     * @param [singleton]
     */
    protected registerType(runtime: Runtime, type: AbstractType, option?: RegOption) {
        this.registerReflect(runtime, getClassRef(type), option)
    }

    protected registerReflect(runtime: Runtime, def: ClassRef, option?: RegOption) {
        const providedIn = option?.providedIn ?? def.getAnnotation().providedIn;
        runtime.getInjector<DefaultInjector>(providedIn, this).processRegister(runtime, def, option)
    }

    protected processRegister(runtime: Runtime, classRef: ClassRef, option?: RegOption) {
        // make sure class register once.
        const type = classRef.type;
        if (this.has(classRef.type, InjectFlags.Default)) {
            return false
        }

        // this.onRegister(classRef);
        let injectorType: ((type: AbstractType, typeRef: ClassRef) => void | Promise<void>) | undefined;
        if (option?.injectorType) {
            injectorType = (regType, typeRef) => processInjectorType(
                type, [],
                (pdr) => this.processProvider(runtime, pdr), (tyref, ty) => {
                    if (ty !== regType) {
                        this.registerReflect(runtime, tyref)
                    }
                }, typeRef)
        }

        const injector = this as Injector;
        const getRecords = () => this.records;
        const ctx = {
            injector,
            getRecords,
            ...option,
            injectorType,
            classRef,
            runtime,
            type
        } as DesignContext;

        runtime.design.handle(ctx, null, {
            finally: () => {
                cleanObj(ctx);
            }
        });
        return true
    }

    /**
     * register provider.
     * @param platfrom 
     * @param provider 
     * @returns 
     */
    protected registerProvider(platfrom: Runtime, provider: StaticProviders) {
        if (provider.asDefault && this.has(provider.provide)) {
            return
        }
        if (provider.multi) {
            let multiPdr = this.records.get(provider.provide);
            if (!multiPdr) {
                this.records.set(provider.provide, multiPdr = {
                    fy: FnType.Fac,
                    fn: MUTIL,
                    value: Empty,
                    deps: []
                })
            }
            if (multiPdr.deps) {
                const mtltk = { token: generateRecord(platfrom, this, provider), options: OptionFlags.Default };
                if (isNumber(provider.multiOrder)) {
                    multiPdr.deps.splice(provider.multiOrder, 0, mtltk)
                } else {
                    multiPdr.deps.push(mtltk)
                }
            }
        } else {
            this.records.set(provider.provide, generateRecord(platfrom, this, provider))
        }
        provider.onRegistered?.(this);
    }


    protected processInjectorType(runtime: Runtime, typeOrDef: AbstractType | ModuleWithProviders, dedupStack: AbstractType[], moduleRefl?: ClassRef) {
        return processInjectorType(typeOrDef, dedupStack,
            (pdr) => this.processProvider(runtime, pdr),
            (tyref, type, options) => {
                this.registerReflect(runtime, tyref, options)
            }, moduleRefl)
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

    setSingleton<T>(token: Token<T>, value: T): this {
        this.assertNotDestroyed();
        const runtime = this.getRuntime();
        if (!runtime.hasSingleton(token)) {
            runtime.setSingleton(this, token, value)
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

        return this.tryResolve(token, this.records.get(token), runtime, this._parent, context,
            notFoundValue === undefined ? THROW_FLAGE : notFoundValue,
            flags ?? InjectFlags.Default)
    }

    protected tryResolve(token: Token, record: FactoryRecord | undefined, runtime: Runtime, parent: Injector | null,
        context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags) {
        return tryResolveToken(token, record, this.records, runtime, parent, context, notFoundValue, flags, record?.stic ?? this.isStatic)
    }


    resolve<T, TArg>(token: Token<T>, option?: InvokeOptions): T;
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    resolve<T>(token: Token<T>, providers?: Provider[]): T;
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    resolve<T>(token: Token<T>, ...args: any[]) {
        if (!args.length) {
            return this.get(token);
        }
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

    unregister<T>(token: Token<T>): this {
        const isp = this.records?.get(token);
        if (isp) {
            this.records.delete(token);
            if (isp.type) this.getRuntime().clearTypeProvider(isp.type);
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
        if (this.destroyed) {
            throw new Exception('Injector has already been destroyed.')
        }
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
    platform.setSingleton(container, InvocationFactory, new DefaultInvocationFactory(platform));
}
