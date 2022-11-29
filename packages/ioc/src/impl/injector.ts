import { LoadType, Modules, Type, EMPTY } from '../types';
import { DestroyCallback, OnDestroy } from '../destroy';
import { cleanObj, deepForEach, immediate } from '../utils/lang';
import { InjectFlags, Token } from '../tokens';
import { isArray, isDefined, isFunction, isNumber, getClass, isString, isUndefined, isNil } from '../utils/chk';
import {
    MethodType, FnType, InjectorScope, RegisterOption, FactoryRecord,
    Platform, Container, Injector, INJECT_IMPL, DependencyRecord, OptionFlags, RegOption, TypeOption, Scopes
} from '../injector';
import { CONTAINER, INJECTOR, ROOT_INJECTOR } from '../metadata/tk';
import { ModuleWithProviders, ProviderType, StaticProvider, StaticProviders } from '../providers';
import { DesignContext } from '../actions/ctx';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { ModuleDef, Reflective } from '../metadata/type';
import { get } from '../metadata/refl';
import { ReflectiveFactory } from '../reflective';
import { DefaultModuleLoader } from './loader';
import { ModuleLoader } from '../module.loader';
import { DefaultPlatform } from './platform';
import { LifecycleHooks, LifecycleHooksResolver } from '../lifecycle';
import { DefaultReflectiveFactory, hasContext } from './reflective';
import { createContext, InvocationContext, InvokeArguments } from '../context';
import { Execption } from '../execption';
import { isPlainObject, isTypeObject } from '../utils/obj';



/**
 * Default Injector
 */
export class DefaultInjector extends Injector {

    private _destroyed = false;
    protected _dsryCbs = new Set<DestroyCallback>();
    protected _plat?: Platform;
    protected isStatic?: boolean;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected records: Map<Token, FactoryRecord>;
    private isAlias?: (token: Token) => boolean;
    lifecycle!: LifecycleHooks;

    constructor(providers: ProviderType[] = EMPTY, readonly parent?: Injector, readonly scope?: InjectorScope) {
        super();
        this.records = new Map();
        if (parent) {
            this.initParent(parent)
        } else {
            scope = this.scope = Scopes.platform
        }
        this.initScope(scope);
        this.inject(providers)
    }

    protected createLifecycle(platform?: Platform): LifecycleHooks {
        return this.get(LifecycleHooksResolver, null)?.resolve(platform) ?? new DestroyLifecycleHooks(platform)
    }

    protected initScope(scope?: InjectorScope) {
        const val = { value: this };
        switch (scope) {
            case Scopes.platform:
                platformAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isPlatformAlias;
                this._plat = new DefaultPlatform(this);
                this.lifecycle = this.createLifecycle();
                registerCores(this);
                break;
            case Scopes.root:
                this.platform().setInjector(scope, this);
                rootAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isRootAlias;
                this.lifecycle = this.createLifecycle(this.platform());
                break;
            case Scopes.static:
                this.lifecycle = this.createLifecycle();
                break;
            case Scopes.configuration:
                this.platform().setInjector(scope, this);
                this.lifecycle = this.createLifecycle();
                break;
            default:
                if (scope) this.platform().setInjector(scope, this);
                injectAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = this.isStatic ? isStaticAlias : isInjectAlias;
                this.lifecycle = this.createLifecycle();
                break;
        }
        this.inject({ provide: LifecycleHooks, useValue: this.lifecycle })
    }

    protected initParent(parent: Injector) {
        parent.onDestroy(this)
    }

    get size(): number {
        return this.records.size
    }

    tokens() {
        return Array.from(this.records.keys())
    }

    platform(): Platform {
        return (this._plat ?? this.parent?.platform())!
    }

    register(types: (Type | RegisterOption)[]): this;
    register(...types: (Type | RegisterOption)[]): this;
    register(...args: any[]): this {
        this.assertNotDestroyed();
        const platform = this.platform();
        deepForEach(args, t => {
            this.processProvider(platform, t)
        });
        return this
    }

    cache<T>(token: Token<T>, cache: T, expires: number): this {
        this.assertNotDestroyed();
        const pd = this.records.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.cache = cache;
            pd.ltop = ltop
            pd.expires = expires
        } else {
            this.records.set(token, { cache, ltop, expires })
        }
        return this
    }

    inject(providers: ProviderType[]): this;
    inject(...providers: ProviderType[]): this;
    inject(...args: any[]): this {
        this.assertNotDestroyed();
        if (args.length) {
            const platform = this.platform();
            deepForEach(args, p => this.processProvider(platform, p, args), v => isPlainObject(v) && !(v as StaticProviders).provide)
        }
        return this
    }

    protected processProvider(platform: Platform, p: TypeOption | StaticProvider, providers?: ProviderType[]) {
        if (isFunction(p)) {
            this.registerType(platform, p)
        } else if (isPlainObject(p) && (p as StaticProviders).provide) {
            this.registerProvider(platform, p as StaticProviders)
        } else if (isPlainObject(p) && (p as TypeOption).type) {
            this.registerType(platform, (p as TypeOption).type, p as TypeOption)
        }
    }

    /**
     * register type class.
     * @param injector register in the injector.
     * @param option the type register option.
     * @param [singleton]
     */
    protected registerType(platform: Platform, type: Type, option?: RegOption) {
        this.registerReflect(platform, get(type), option)
    }

    protected registerReflect(platform: Platform, def: Reflective, option?: RegOption) {
        const providedIn = option?.providedIn ?? def.annotation.providedIn;
        (providedIn ? platform.getInjector(providedIn) as DefaultInjector : this).processRegister(platform, def, option)
    }

    protected processRegister(platform: Platform, def: Reflective, option?: RegOption) {
        // make sure class register once.
        const type = def.type as Type;
        if (this.has(def.type, InjectFlags.Default)) {
            return false
        }

        let injectorType: ((type: Type, typeRef: Reflective) => void) | undefined;
        if (option?.injectorType) {
            injectorType = (regType, typeRef) => processInjectorType(
                type, [],
                (pdr, pdrs) => this.processProvider(platform, pdr, pdrs), (tyref, ty) => {
                    if (ty !== regType) {
                        this.registerReflect(platform, tyref)
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
            typeRef: def,
            platform,
            type
        } as DesignContext;
        platform.getAction(DesignLifeScope).register(ctx);
        cleanObj(ctx);
        return true
    }

    protected registerProvider(platfrom: Platform, provider: StaticProviders) {
        if (provider.asDefault && this.has(provider.provide)) {
            return
        }
        if (provider.multi) {
            let multiPdr = this.records.get(provider.provide);
            if (!multiPdr) {
                this.records.set(provider.provide, multiPdr = {
                    fy: FnType.Fac,
                    fn: MUTIL,
                    value: EMPTY,
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
    }



    use(modules: Modules[]): Type[];
    use(...modules: Modules[]): Type[];
    use(...args: any[]): Type[] {
        this.assertNotDestroyed();
        const types: Type[] = [];
        const platform = this.platform();
        deepForEach(args, ty => {
            if (isFunction(ty)) {
                const mdref = get<ModuleDef>(ty);
                if (mdref) {
                    types.push(ty);
                    this.registerReflect(platform, mdref, { injectorType: mdref.annotation.module })

                }
            }
        }, v => isPlainObject(v));
        return types
    }

    has<T>(token: Token<T>, flags = InjectFlags.Default): boolean {
        this.assertNotDestroyed();
        if (this.platform().hasSingleton(token)) return true;
        if (!(flags & InjectFlags.SkipSelf) && (this.records.has(token))) return true;
        if (!(flags & InjectFlags.Self)) {
            return this.parent?.has(token, flags) === true
        }
        return false
    }


    setValue<T>(token: Token<T>, value: T, type?: Type<T>): this {
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
        const platform = this.platform();
        if (!platform.hasSingleton(token)) {
            platform.registerSingleton(this, token, value)
        }
        return this
    }

    protected isself(token: Token): boolean {
        return this.isAlias ? this.isAlias(token) : false
    }

    get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags): T;
    get<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags, notFoundValue?: T): T;
    get<T>(token: Token<T>, arg1?: InvocationContext, flags = InjectFlags.Default, notFoundValue?: T): T {
        this.assertNotDestroyed();
        if (this.isself(token)) return this as any;
        const platform = this.platform();
        let context: InvocationContext | undefined;
        if (arg1 instanceof InvocationContext || !isUndefined(notFoundValue)) {
            context = arg1;
            if (isUndefined(notFoundValue)) {
                notFoundValue = THROW_FLAGE as T
            }
        } else {
            notFoundValue = (isUndefined(arg1) ? THROW_FLAGE : arg1) as T
        }
        if (platform.hasSingleton(token)) return platform.getSingleton(token);
        return this.tryResolve(token, this.records.get(token), platform, this.parent, context, notFoundValue, flags, this.lifecycle)
    }

    protected tryResolve(token: Token, record: FactoryRecord | undefined, platform: Platform, parent: Injector | undefined,
        context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, lifecycle?: LifecycleHooks) {
        return tryResolveToken(token, record, this.records, platform, parent, context, notFoundValue, flags, lifecycle, record?.stic ?? this.isStatic)
    }


    resolve<T>(token: Token<T>, option?: InvokeArguments): T;
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    resolve<T>(token: Token<T>, providers?: ProviderType[]): T;
    resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
    resolve<T>(token: Token<T>, ...args: any[]) {
        if (!args.length) {
            return this.get(token);
        }
        let context: InvocationContext | undefined;
        if (args.length === 1) {
            const arg1 = args[0]
            if (arg1 instanceof InvocationContext) {
                context = arg1;
            } else if (isArray(arg1)) {
                context = arg1.length ? createContext(this, { providers: arg1 }) : undefined;
            } else if (arg1.provide) {
                context = createContext(this, { providers: [arg1] });
            } else if (hasContext(arg1)) {
                context = createContext(this, arg1);
            }
        } else {
            context = createContext(this, { providers: args });
        }

        const result = this.get(token, context);

        if (context && context !== args[0] && !context.injected) {
            immediate(() => context!.destroy());
        }
        return result;
    }

    getTokenProvider<T>(token: Token<T>, flags = InjectFlags.Default): Type<T> {
        this.assertNotDestroyed();
        let type: Type | undefined;
        if (!(flags & InjectFlags.SkipSelf)) {
            const rd = this.records.get(token);
            type = rd?.type
        }
        if (!type || !(flags & InjectFlags.Self)) {
            type = this.parent?.getTokenProvider(token, flags)
        }
        return type ?? isFunction(token) ? token as Type : null!
    }

    unregister<T>(token: Token<T>): this {
        const isp = this.records?.get(token);
        if (isp) {
            this.records.delete(token);
            if (isFunction(isp.unreg)) isp.unreg();
            cleanObj(isp)
        }

        return this
    }

    invoke<T, TR = any>(target: T | Type<T> | Reflective<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    invoke<T, TR = any>(target: T | Type<T> | Reflective<T>, propertyKey: MethodType<T>, option?: InvokeArguments): TR;
    invoke<T, TR = any>(target: T | Type<T> | Reflective<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    invoke<T, TR = any>(target: T | Type<T> | Reflective<T>, propertyKey: MethodType<T>, providers: ProviderType[]): TR;
    invoke<T, TR = any>(target: T | Type<T> | Reflective<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        this.assertNotDestroyed();
        let providers: ProviderType[] | undefined;
        let context: InvocationContext | undefined;
        let option: any;
        if (args.length === 1) {
            const arg0 = args[0];
            if (arg0 instanceof InvocationContext) {
                context = arg0;
                providers = EMPTY
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

        let targetClass: Type, instance: any;
        let tgRefl: Reflective | undefined;

        if (!context) {
            const opts = { ...option, providers };
            context = hasContext(opts) ? createContext(this, opts) : undefined;
        }
        if (isTypeObject(target)) {
            targetClass = getClass(target);
            instance = target as T
        } else {
            if (target instanceof Reflective) {
                tgRefl = target;
                targetClass = target.type as Type
            } else {
                instance = this.get(target as Token, context);
                targetClass = getClass(instance);
                if (!targetClass) {
                    throw new Execption((target as Token).toString() + ' is not implements by any class.')
                }
            }
        }
        tgRefl = tgRefl ?? get(targetClass);
        const factory = this.get(ReflectiveFactory).create(tgRefl, this);
        return factory.invoke(propertyKey, context, instance)
    }


    getLoader(): ModuleLoader {
        return this.get(ModuleLoader)
    }

    load(modules: LoadType[]): Promise<Type[]>;
    load(...modules: LoadType[]): Promise<Type[]>;
    load(...args: any[]): Promise<Type[]> {
        this.assertNotDestroyed();
        let modules: LoadType[];
        if (args.length === 1 && isArray(args[0])) {
            modules = args[0]
        } else {
            modules = args
        }
        return this.getLoader().register(this, modules)
    }

    protected assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Execption('Injector has already been destroyed.')
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
    destroy(): void | Promise<void> {
        if (!this.lifecycle.destroyable) {
            return this.lifecycle.dispose()
                .finally(() => {
                    this.tryDestroy();
                    if (this.scope === 'root') {
                        return this.parent?.destroy()
                    }
                })
        } else {
            this.tryDestroy();
            if (this.scope === 'root') {
                return this.parent?.destroy()
            }
        }

    }

    private tryDestroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        try {
            this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy());
            this.lifecycle?.runDestroy()
        } finally {
            this._dsryCbs.clear();
            this.destroying()
        }
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
            this.destroy()
        } else {
            this._dsryCbs.add(callback)
        }
    }

    offDestroy(callback: DestroyCallback) {
        this._dsryCbs.delete(callback)
    }


    protected destroying() {
        this.scope && this.platform()?.removeInjector(this.scope);
        this.records.forEach(r => {
            r.unreg && r.unreg()
        });
        this.records.clear();
        this.records = null!;
        if (this.parent) {
            !this.parent.destroyed && this.parent.offDestroy(this)
        }
        this._plat = null!;
        this.isAlias = null!;
        this.lifecycle.clear();
        (this as any).parent = null!;
    }
}


/**
 * static injector.
 */
export class StaticInjector extends DefaultInjector {
    protected isStatic = true;
}

const platformAlias = [Injector, INJECTOR, Container, CONTAINER];
const rootAlias = [Injector, INJECTOR, ROOT_INJECTOR];
const injectAlias = [Injector, INJECTOR];

const isPlatformAlias = (token: any) => token === Injector || token === INJECTOR || token === Container || token === CONTAINER;
const isRootAlias = (token: any) => token === Injector || token === INJECTOR || token == ROOT_INJECTOR;
const isInjectAlias = (token: any) => token === Injector || token === INJECTOR;
const isStaticAlias = (token: any) => token === StaticInjector;

INJECT_IMPL.create = (providers: ProviderType[], parent?: Injector, scope?: InjectorScope) => {
    if (scope === Scopes.static || scope === Scopes.configuration) {
        return new StaticInjector(providers, parent, scope)
    }
    return new DefaultInjector(providers, parent!, scope)
}


export function processInjectorType(typeOrDef: Type | ModuleWithProviders, dedupStack: Type[],
    processProvider: (provider: StaticProvider, providers?: any[]) => void,
    regType: (typeRef: Reflective, type: Type) => void, moduleRefl?: Reflective, imported?: boolean) {
    const type = isFunction(typeOrDef) ? typeOrDef : typeOrDef.module;
    if (!isFunction(typeOrDef)) {
        deepForEach(
            typeOrDef.providers,
            pdr => processProvider(pdr, typeOrDef.providers),
            v => isPlainObject(v) && !v.provide //&& !(isFunction(v.module) && isArray(v.providers))
        )
    }
    const isDuplicate = dedupStack.indexOf(type) !== -1;
    const typeRef = moduleRefl ?? get<ModuleDef>(type);
    const annotation = typeRef.getAnnotation<ModuleDef>();
    if (annotation.module && !isDuplicate) {
        dedupStack.push(type);
        annotation.imports?.forEach(imp => {
            processInjectorType(imp, dedupStack, processProvider, regType, undefined, true)
        });

        if (imported && !(annotation.providedIn === Scopes.root || annotation.providedIn === Scopes.platform)) {
            annotation.exports?.forEach(d => {
                processInjectorType(d, dedupStack, processProvider, regType, undefined, true)
            })
        } else {
            annotation.declarations?.forEach(d => {
                processInjectorType(d, dedupStack, processProvider, regType, undefined, true)
            });
            annotation.exports?.forEach(d => {
                processInjectorType(d, dedupStack, processProvider, regType, undefined, true)
            })
        }

        if (annotation.providers) {
            deepForEach(
                annotation.providers,
                pdr => processProvider(pdr, annotation.providers),
                v => isPlainObject(v) && !v.provide // && !(isFunction(v.module) && isArray(v.providers))
            )
        }
    }
    // // private providers.
    // if (typeRef.class.providers && !isDuplicate) {
    //     deepForEach(
    //         typeRef.class.providers,
    //         pdr => processProvider(pdr, typeRef.class.providers),
    //         v => isPlainObject(v) && !v.provide
    //     );
    // }

    regType(typeRef, type)
}


const IDENT = function <T>(value: T): T {
    return value
};
const MUTIL = function <T>(...args: any): T[] {
    return args
};
const CIRCULAR = IDENT;

/**
 * generate record.
 * @param injector 
 * @param provider 
 * @returns 
 */
export function generateRecord<T>(platfrom: Platform, injector: Injector, provider: StaticProviders): FactoryRecord<T> {
    let fn: Function = IDENT;
    let value: T | undefined;
    let fnType = FnType.Fac;
    let type = provider.useClass;
    const isStatic = provider.static;
    let deps = computeDeps(provider);
    if (isDefined(provider.useValue)) {
        value = provider.useValue
    } else if (provider.useFactory) {
        fn = provider.useFactory
    } else if (provider.useExisting) {
        // use ident.

    } else if (provider.useClass) {
        if (deps) {
            deps.unshift({ token: provider.useClass, options: OptionFlags.Default })
        } else {
            deps = [{ token: provider.useClass, options: OptionFlags.Default }]
        }
        if (!injector.has(type, InjectFlags.Default)) {
            injector.register({ singleton: provider.singleton, type, deps, regProvides: false })
        }
    } else if (isFunction(provider.provide)) {
        if (deps) {
            fnType = FnType.Cotr;
            fn = provider.provide;
            type = provider.provide
        } else {
            deps = [{ token: provider.provide, options: OptionFlags.Default }];
            type = provider.provide;
            if (!injector.has(type, InjectFlags.Default)) {
                injector.register({ singleton: provider.singleton, type, deps, regProvides: false })
            }
        }
    }
    return { value, fn, fy: fnType, deps, type, stic: isStatic }
}

function computeDeps(provider: StaticProviders): DependencyRecord[] {
    let deps: any[] = null!;
    const pdrdeps = provider.deps;
    if (pdrdeps && pdrdeps.length) {
        deps = pdrdeps.map(dep => {
            let options = OptionFlags.Default;
            let token = dep;
            if (isArray(dep)) {
                for (let i = 0; i < dep.length; i++) {
                    const d = dep[i];
                    if (isNumber(d)) {
                        switch (d) {
                            case InjectFlags.Optional:
                                options = options | OptionFlags.Optional;
                                break
                            case InjectFlags.SkipSelf:
                                options = options & ~OptionFlags.CheckSelf;
                                break
                            case InjectFlags.Self:
                                options = options & ~OptionFlags.CheckParent;
                                break
                        }
                    } else {
                        token = d
                    }
                }
            }
            return { token, options }
        });
    } else if (provider.useExisting) {
        deps = [{ token: provider.useExisting, options: OptionFlags.Default }]
    }
    return deps
}

const cirMsg = 'Circular dependency';
/**
 * circular dependency execption.
 */
export class CircularDependencyExecption extends Execption {
    constructor(message?: string) {
        super(message ? cirMsg + message : cirMsg)
    }
}

/**
 * Null injector execption.
 */
export class NullInjectorExecption extends Execption {
    constructor(token: Token) {
        super(`NullInjectorExecption: No provider for ${token?.toString()}!`)
    }
}

/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function tryResolveToken(token: Token, rd: FactoryRecord | undefined, records: Map<any, FactoryRecord>, platform: Platform, parent: Injector | undefined,
    context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, lifecycle?: LifecycleHooks, isStatic?: boolean): any {
    try {
        const value = resolveToken(token, rd, records, platform, parent, context, notFoundValue, flags, lifecycle, isStatic);
        const isDef = isDefined(value) && value !== notFoundValue;
        if (isDef && token !== Injector && token !== INJECTOR && rd && rd.fn !== IDENT && rd.fn !== MUTIL && lifecycle && isTypeObject(value)) {
            lifecycle.register(value)
        }
        if (isDef && isStatic) {
            if (rd) {
                if (isNil(rd.value)) {
                    rd.value = value
                }
            } else {
                records.set(token, { value })
            }
        }
        return value
    } catch (e) {
        if (rd && rd.value === CIRCULAR) {
            rd.value = EMPTY
        }
        throw e
    }
}

const THROW_FLAGE = {};

/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function resolveToken(token: Token, rd: FactoryRecord | undefined, records: Map<any, FactoryRecord>, platform: Platform, parent: Injector | undefined,
    context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, lifecycle?: LifecycleHooks, isStatic?: boolean): any {
    if (rd && !(flags & InjectFlags.SkipSelf)) {
        let value = rd.value;
        if (value === CIRCULAR) {
            throw new CircularDependencyExecption()
        }
        if (isDefined(rd.value) && value !== EMPTY) return rd.value;
        const deps = [];
        if (rd.deps?.length) {
            for (let i = 0; i < rd.deps.length; i++) {
                const dep = rd.deps[i];
                const chlrd = isPlainObject(dep.token) ? dep.token : (dep.options & OptionFlags.CheckSelf ? records.get(dep.token) : undefined);

                let val: any;
                if (context) {
                    val = context.resolveArgument(isString(dep.token) ? { name: dep.token } : { provider: dep.token })
                }
                deps.push(val ?? tryResolveToken(
                    dep.token,
                    chlrd,
                    records,
                    platform,
                    !chlrd && !(dep.options & OptionFlags.CheckParent) ? undefined : parent,
                    context,
                    dep.options & OptionFlags.Optional ? null : THROW_FLAGE,
                    InjectFlags.Default,
                    lifecycle,
                    isStatic))
            }
        }
        if (context && rd.fn !== IDENT && rd.fn !== MUTIL) {
            deps.push(context)
        }
        switch (rd.fy) {
            case FnType.Cotr:
                return new (rd.fn as Type)(...deps)
            case FnType.Fac:
                if (value === EMPTY) {
                    return rd.value = value = rd.fn?.(...deps)
                }
                return rd.fn?.(...deps)
            case FnType.Inj:
            default:
                if (rd.expires) {
                    if ((rd.expires + rd.ltop!) < Date.now()) {
                        rd.ltop = Date.now();
                        return rd.cache!
                    }
                    rd.expires = null!;
                    rd.cache = null!;
                    rd.ltop = null!
                }
                return rd.fn?.(...deps)
        }
    } else if (parent && !(flags & InjectFlags.Self)) {
        return parent.get(token, context, InjectFlags.Default, notFoundValue)
    } else if (!(flags & InjectFlags.Optional)) {
        if (notFoundValue === THROW_FLAGE) {
            throw new NullInjectorExecption(token)
        }
        return notFoundValue ?? null
    } else {
        if (notFoundValue === THROW_FLAGE) {
            throw new NullInjectorExecption(token)
        }
        return notFoundValue ?? null
    }
}



export class DestroyLifecycleHooks extends LifecycleHooks {

    get destroyable(): boolean {
        return this.platform ? this.platform.modules.size < 1 : true
    }

    async dispose(): Promise<void> {
        if (this.destroyable) return;
        if (this.platform) {
            const platform = this.platform;
            this.platform = null!;
            await Promise.all(Array.from(platform.modules.values())
                .reverse()
                .map(m => m.lifecycle.dispose()))
        }
    }

    private _destrories: Set<OnDestroy>;
    constructor(protected platform?: Platform) {
        super()
        this._destrories = new Set()
    }

    register(target: any): void {
        const { onDestroy } = (target as OnDestroy);
        if (isFunction(onDestroy)) {
            this.regDestory(target)
        }
    }

    clear(): void {
        this._destrories.clear()
    }

    runDestroy(): void {
        this._destrories.forEach(d => d?.onDestroy())
    }


    protected regDestory(hook: OnDestroy): void {
        this._destrories.add(hook)
    }
}

/**
 * register core for root.
 *
 * @export
 * @param {IContainer} container
 */
function registerCores(container: Container) {
    container.setValue(ModuleLoader, new DefaultModuleLoader());
    const factory = new DefaultReflectiveFactory();
    container.setValue(ReflectiveFactory, factory);
    container.onDestroy(() => factory.destroy())
    // bing action.
    container.platform().registerAction(
        DesignLifeScope,
        RuntimeLifeScope
    )
}
