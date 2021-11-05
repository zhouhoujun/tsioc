import { ClassType, LoadType, Modules, Type } from '../types';
import {
    ProviderType, ResolveOption, MethodType, FnType, InjectorScope,
    RegisterOption, TypeOption, FactoryRecord, Platform, Container,
    Injector, INJECT_IMPL, DependencyRecord, OptionFlags
} from '../injector';
import { InjectFlags, Token } from '../tokens';
import { CONTAINER, INJECTOR, ROOT_INJECTOR, TARGET } from '../metadata/tk';
import { cleanObj, deepForEach, getTypes } from '../utils/lang';
import { KeyValueProvider, StaticProvider, StaticProviders } from '../providers';
import {
    isArray, isDefined, isFunction, isNil, isPlainObject, isPrimitiveType,
    isTypeObject, isTypeReflect, EMPTY, EMPTY_OBJ, isUndefined, isNumber, getClass
} from '../utils/chk';
import { DesignContext } from '../actions/ctx';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { TypeReflect } from '../metadata/type';
import { get } from '../metadata/refl';
import { InvocationContext, OperationArgumentResolver, OperationInvokerFactory, ReflectiveOperationInvoker } from '../invoker';
import { DefaultModuleLoader } from './loader';
import { ModuleLoader } from '../module.loader';
import { DefaultPlatform } from './platform';


/**
 * provider container.
 *
 * @export
 * @class Provider
 * @extends {Destoryable}
 */
export class DefaultInjector extends Injector {

    protected _plat?: Platform;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected records: Map<Token, FactoryRecord>;
    protected destCb?: () => void;
    private isAlias?: (token: Token) => boolean;

    constructor(providers: ProviderType[] = EMPTY, readonly parent?: Injector, readonly scope?: InjectorScope) {
        super();
        this.records = new Map();
        if (parent) {
            this.destCb = () => this.destroy();
            this.initParent(parent);
        } else {
            scope = this.scope = 'root';
        }
        this.initScope(scope);
        this.inject(providers);
    }


    protected initScope(scope?: InjectorScope) {
        const val = { value: this };
        switch (scope) {
            case 'platform':
                platformAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isPlatformAlias;
                this._plat = new DefaultPlatform(this);
                registerCores(this);
                break;
            case 'root':
                rootAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isRootAlias;
                break;
            case 'provider':
            case 'invoked':
            case 'parameter':
                break;
            default:
                injectAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isInjectAlias;
                break;
        }
    }

    protected initParent(parent: Injector) {
        parent.onDestroy(this.destCb!);
    }

    get size(): number {
        return this.records.size;
    }

    tokens() {
        return Array.from(this.records.keys());
    }

    /**
     * plaform info.
     */
    platform(): Platform {
        return this._plat ?? this.parent?.platform()!;
    }

    /**
     * register types.
     * @param {Type<any>[]} types 
     */
    register(types: (Type | RegisterOption)[]): this;
    /**
     * register types.
     * @param types 
     */
    register(...types: (Type | RegisterOption)[]): this;
    register(...args: any[]): this {
        this.assertNotDestroyed();
        const platform = this.platform();
        deepForEach(args, t => {
            this.processProvider(t, platform)
        });
        return this;
    }

    /**
     * cache instance.
     * @param token 
     * @param instance 
     * @param expires 
     */
    cache<T>(token: Token<T>, cache: T, expires: number): this {
        this.assertNotDestroyed();
        const pd = this.records.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.cache = cache;
            pd.ltop = ltop
            pd.expires = expires;
        } else {
            this.records.set(token, { cache, ltop, expires });
        }
        return this;
    }

    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(providers: ProviderType[]): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this;
    inject(...args: any[]): this {
        this.assertNotDestroyed();
        if (args.length) {
            const platform = this.platform();
            deepForEach(args, p => this.processProvider(p, platform), v => isPlainObject(v) && !(v as StaticProviders).provide);
        }
        return this;
    }

    protected processProvider(p: Injector | TypeOption | StaticProvider, platform: Platform) {
        if (isFunction(p)) {
            this.registerType(platform, p);
        } else if (isPlainObject(p) && (p as StaticProviders).provide) {
            this.registerProvider((p as StaticProviders).provide, p as StaticProviders);
        } else if (isPlainObject(p) && (p as TypeOption).type) {
            this.registerType(platform, (p as TypeOption).type, p as TypeOption);
        } else if (p instanceof Injector) {
            this.copy(p);
        } else if (p instanceof KeyValueProvider) {
            p.each((k, useValue) => {
                this.records.set(k, { value: useValue });
            });
        }
    }

    /**
     * register type class.
     * @param injector register in the injector.
     * @param option the type register option.
     * @param [singleton]
     */
    protected registerType(platform: Platform, type: Type, option?: TypeOption) {
        const reflect = get(type, true);
        const providedIn = option?.providedIn ?? reflect.providedIn;
        (providedIn ? platform.getInjector(providedIn) as DefaultInjector : this).processRegister(platform, type, reflect, option);
    }

    protected processRegister(platform: Platform, type: Type, reflect: TypeReflect, option?: TypeOption) {
        // make sure class register once.
        if (platform.isRegistered(type) || this.has(type)) {
            return false;
        }

        const injector: Injector = this;
        const getRecords = () => this.records;
        const ctx = {
            injector,
            getRecords,
            ...option,
            reflect,
            platform,
            type
        } as DesignContext;
        platform.getAction(DesignLifeScope).register(ctx);
        cleanObj(ctx);
        return true;
    }

    protected registerProvider(provide: Token, target: StaticProviders) {
        if (target.multi) {
            let multiPdr = this.records.get(provide);
            if (!multiPdr) {
                this.records.set(provide, multiPdr = {
                    fnType: FnType.Fac,
                    fn: MUTIL,
                    value: EMPTY,
                    deps: []
                });
            }
            multiPdr.deps?.push({ token: generateRecord(this, target), options: OptionFlags.Default });
        } else {
            this.records.set(provide, generateRecord(this, target));
        }
    }



    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    use(modules: Modules[]): Type[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    use(...modules: Modules[]): Type[];
    use(...args: any[]): Type[] {
        this.assertNotDestroyed();
        let types = getTypes(args);
        const platform = this.platform();
        types.forEach(ty => this.registerType(platform, ty));
        return types;
    }

    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {InjectFlags} flags.
     * @returns {boolean}
     */
    has<T>(token: Token<T>, flags = InjectFlags.Default): boolean {
        this.assertNotDestroyed();
        if (this.platform().hasSingleton(token)) return true;
        if (!(flags & InjectFlags.SkipSelf) && (this.records.has(token))) return true;
        if (!(flags & InjectFlags.Self)) {
            return this.parent?.has(token, flags) || false;
        }
        return false;
    }

    // /**
    //  * has value or not.
    //  * @param token 
    //  * @param flags 
    //  * @returns 
    //  */
    // hasValue<T>(token: Token<T>, flags = InjectFlags.Default): boolean {
    //     this.assertNotDestroyed();
    //     if (!(flags & InjectFlags.SkipSelf) && (this.isSelf(token) || !isNil(this.factories.get(token)?.value))) return true;
    //     if (!(flags & InjectFlags.Self)) {
    //         return this.parent?.hasValue(token, flags) || false;
    //     }
    //     return false;
    // }

    setValue<T>(token: Token<T>, value: T, type?: Type<T>): this {
        this.assertNotDestroyed();
        const isp = this.records.get(token);
        if (isp) {
            isp.value = value;
            if (type) isp.type = type;
        } else if (isDefined(value)) {
            this.records.set(token, type ? { value, type } : { value });
        }
        return this;
    }

    protected isself(token: Token): boolean {
        return this.isAlias ? this.isAlias(token) : false;
    }

    /**
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} notFoundValue 
     * @param {InjectFlags} flags
     * @returns {T} token value.
     */
    get<T>(token: Token<T>, notFoundValue?: T, flags = InjectFlags.Default): T {
        this.assertNotDestroyed();
        if (this.isself(token)) return this as any;
        const platfrom = this.platform();
        if (platfrom.hasSingleton(token)) return platfrom.getSingleton(token);
        return tryResolveToken(token, this.records.get(token), this.records, platfrom, this.parent, notFoundValue, flags);
    }
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {ResolveOption<T>} option  resolve option
     * @returns {T}
     */
    resolve<T>(option: ResolveOption<T>): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, option?: {
        /**
        * resolve token in target context.
        */
        target?: Token | TypeReflect | Object | (Token | Object)[];
        /**
         * all faild use the default token to get instance.
         */
        defaultToken?: Token<T>;
        /**
         * resolve strategy.
         */
        flags?: InjectFlags;
        /**
         * register token if has not register.
         */
        regify?: boolean;
        /**
         * resolve providers.
         */
        providers?: ProviderType[];
        /**
         * invocation context.
         */
        context?: InvocationContext;
    }): T;
    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     */
    resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     */
    resolve<T>(token: Token<T>, providers: ProviderType[]): T;
    resolve<T>(token: Token<T> | ResolveOption<T>, ...args: any[]) {
        this.assertNotDestroyed();
        let inst: T;
        if (isPlainObject(token)) {
            let option = token as ResolveOption;
            const providers = [];
            if (option.providers) {
                providers.push(...option.providers);
            }
            if (option.target) {
                providers.push({ provide: TARGET, useValue: option.target });
            }
            const injector = providers.length ? Injector.create(providers, this, 'provider') : this;
            inst = this.resolveStrategy(injector, option);
            providers.length && injector.destroy();
            cleanObj(option);
        } else {
            let providers: ProviderType[] = (args.length === 1 && isArray(args[0])) ? args[0] : args;
            const injector = providers.length ? Injector.create(providers, this, 'provider') : this;
            inst = injector.get(token);
            providers.length && injector.destroy();
        }
        return inst;
    }

    protected resolveStrategy<T>(injector: Injector, option: ResolveOption): T {
        let targetToken: ClassType = null!;
        if (option.target) {
            if (isFunction(option.target)) {
                targetToken = option.target;
            } else if (isTypeReflect(option.target)) {
                targetToken = option.target.type;
            } else {
                targetToken = isTypeObject(option.target) ? getClass(option.target) : null!;
            }
        }
        const platform = this.platform();
        return (targetToken ? platform.getTypeProvider(targetToken)?.resolve(option.token!, injector) : null)
            ?? injector.get(option.token!)
            ?? this.resolveFailed(injector, platform, option.token!, option.regify, option.defaultToken);
    }

    protected resolveFailed<T>(injector: Injector, platform: Platform, token: Token<T>, regify?: boolean, defaultToken?: Token): T {
        if (regify && isFunction(token) && !platform.isRegistered(token)) {
            this.registerType(platform, token as Type);
            return this.get(token);
        }
        if (defaultToken) {
            return injector.get(defaultToken);
        }
        return null!;
    }

    /**
     * get token provider class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {InjectFlags} flags
     * @returns {Type<T>}
     */
    getTokenProvider<T>(token: Token<T>, flags = InjectFlags.Default): Type<T> {
        this.assertNotDestroyed();
        let type: Type | undefined;
        if (!(flags & InjectFlags.SkipSelf)) {
            const rd = this.records.get(token);
            type = rd?.type;
        }
        if (!type || !(flags & InjectFlags.Self)) {
            type = this.parent?.getTokenProvider(token, flags);
        }
        return type ?? isFunction(token) ? token as Type : null!;
    }

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof BaseInjector
     */
    unregister<T>(token: Token<T>): this {
        this.assertNotDestroyed();
        const isp = this.records.get(token);
        if (isp) {
            this.records.delete(token);
            if (isFunction(isp.unreg)) isp.unreg();
            cleanObj(isp);
        }
        return this;
    }

    // iterator(callbackfn: (fac: FactoryRecord, key: Token, resolvor?: Injector) => void | boolean, flags = InjectFlags.Default): void | boolean {
    //     if (!(flags & InjectFlags.SkipSelf) && mapEach(this.factories, callbackfn, this) === false) {
    //         return false;
    //     }
    //     return !(flags & InjectFlags.Self) && this.parent?.iterator(callbackfn, flags);
    // }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} from
     * @returns
     * @memberof ProviderMap
     */
    copy(from: Injector, filter?: (key: Token) => boolean): this {
        if (!from) {
            return this;
        }
        this.merge(from as DefaultInjector, this, filter);
        return this;
    }

    clone(to?: Injector): Injector;
    clone(filter: (key: Token) => boolean, to?: Injector): Injector;
    clone(filter?: any, to?: Injector): Injector {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (getClass(this))(this.parent);
        this.merge(this, to as DefaultInjector, filter);
        return to!;
    }


    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...ProviderType[]} providers
     * @returns {TR}
     */
    invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {InvocationContext} context ivacation context.
     * @returns {TR}
     */
    invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, option: {
        args?: Record<string, any>,
        resolvers?: OperationArgumentResolver[] | ((injector: Injector, typeRef?: TypeReflect<T>, method?: string) => OperationArgumentResolver[]),
        providers?: ProviderType[]
    }): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {InvocationContext} context ivacation context.
     * @returns {TR}
     */
    invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, context: InvocationContext): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {ProviderType[]} providers
     * @returns {TR}
     */
    invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, providers: ProviderType[]): TR;
    invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        this.assertNotDestroyed();
        let providers: ProviderType[] | undefined;
        let context: InvocationContext | null = null;
        let option: any;
        if (args.length === 1) {
            const arg0 = args[0];
            if (arg0 instanceof InvocationContext) {
                context = arg0;
                providers = EMPTY;
            } else if (isArray(arg0)) {
                providers = arg0;
            } else if (isPlainObject(arg0) && !arg0.provide) {
                option = arg0;
            } else {
                providers = args;
            }
        } else {
            providers = args;
        }

        let targetClass: Type, instance: any, key: string;
        let tgRefl: TypeReflect | undefined;
        if (isTypeObject(target)) {
            targetClass = getClass(target);
            instance = target as T;
        } else {
            if (isTypeReflect(target)) {
                tgRefl = target;
                instance = this.resolve(target.type, providers!);
                targetClass = target.type as Type;
            } else {
                instance = this.resolve(target as Token, providers!);
                targetClass = getClass(instance);
                if (!targetClass) {
                    throw new Error((target as Token).toString() + ' is not implements by any class.')
                }
            }
        }

        tgRefl = tgRefl ?? get(targetClass);
        if (isFunction(propertyKey)) {
            key = tgRefl.class.getPropertyName(propertyKey(tgRefl.class.getPropertyDescriptors() as any) as TypedPropertyDescriptor<any>);
        } else {
            key = propertyKey;
        }

        const factory = this.resolve({ token: OperationInvokerFactory, target: tgRefl });
        return factory.create(tgRefl, key, instance).invoke(context ?? factory.createContext(tgRefl, key, this, option ?? { providers }));
    }


    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    getLoader(): ModuleLoader {
        return this.get(ModuleLoader);
    }

    load(modules: LoadType[]): Promise<Type[]>;
    load(...modules: LoadType[]): Promise<Type[]>;
    async load(...args: any[]): Promise<Type[]> {
        this.assertNotDestroyed();
        let modules: LoadType[];
        if (args.length === 1 && isArray(args[0])) {
            modules = args[0];
        } else {
            modules = args;
        }
        return await this.getLoader()?.register(this, modules) ?? [];
    }

    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T> } token servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
    * get service or target reference service in the injector.
    *
    * @template T
    * @param {Token<T> } token servive token.
    * @param {ProviderType[]} providers
    * @returns {T}
    */
    getService<T>(token: Token<T>, providers: ProviderType[]): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(ResolveOption<T>} option resolve option.
     * @returns {T}
     */
    getService<T>(option: ResolveOption<T>): T;
    getService<T>(target: Token<T> | ResolveOption<T>, ...args: any[]): T {
        return this.resolve<T>(target as any, ...args);
    }


    protected merge(from: DefaultInjector, to: DefaultInjector, filter?: (key: Token) => boolean) {
        from.records.forEach((rd, key) => {
            if (key === Injector || key === INJECTOR) return;
            if (filter && !filter(key)) return;
            to.records.set(key, rd.fnType === FnType.Inj ? { fn: (pdr: Injector) => from.get(key, pdr) } : { ...rd });
        });
    }

    protected assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Error('Injector has already been destroyed.');
        }
    }


    protected destroying() {
        Array.from(this.records.keys())
            .forEach(k => {
                this.unregister(k);
            });
        this.records.clear();
        this.records = null!;
        if (this.parent && this.destCb) {
            !this.parent.destroyed && this.parent.offDestory(this.destCb);
        }
        if (this.scope === 'platform') {
            this._plat?.destroy();
        }
        this._plat = null!;
        this.destCb = null!;
        (this as any).parent = null!;
        (this as any).strategy = null!;
    }
}


const platformAlias = [Injector, INJECTOR, Container, CONTAINER];
const rootAlias = [Injector, INJECTOR, ROOT_INJECTOR];
const injectAlias = [Injector, INJECTOR];

const isPlatformAlias = (token: any) => token === Injector || token === INJECTOR || token === Container || token === CONTAINER;
const isRootAlias = (token: any) => token === Injector || token === INJECTOR || token == ROOT_INJECTOR;
const isInjectAlias = (token: any) => token === Injector || token === INJECTOR;

INJECT_IMPL.create = (providers: ProviderType[], parent?: Injector, scope?: InjectorScope) => {
    return new DefaultInjector(providers, parent!, scope);
}


const IDENT = function <T>(value: T): T {
    return value;
};
const MUTIL = function <T>(...args: any): T[] {
    return args;
};
const CIRCULAR = IDENT;

/**
 * generate record.
 * @param injector 
 * @param option 
 * @returns 
 */
export function generateRecord<T>(injector: Injector, option: StaticProviders): FactoryRecord<T> {
    let fn: Function = IDENT;
    let value: T | undefined;
    let fnType = FnType.Fac;
    let type = option.useClass;
    const deps = computeDeps(option);
    if (isDefined(option.useValue)) {
        value = option.useValue;
    } else if (option.useFactory) {
        fn = option.useFactory;
    } else if (option.useExisting) {

    } else if (option.useClass) {
        if (deps.length) {
            fnType = FnType.Cotr;
            fn = option.useClass;
        } else {
            fnType = FnType.Inj;
            fn = (pdr: Injector) => {
                if (!injector.platform().isRegistered(type) && !injector.has(type, InjectFlags.Default)) {
                    injector.register({ type, deps, regProvides: false });
                }
                return injector.get(type, pdr);
            };
        }
    } else if (isFunction(option.provide)) {
        fnType = FnType.Cotr;
        fn = option.provide;
        type = option.provide;
    }
    return { value, fn, fnType, deps, type };
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
                    let d = dep[i];
                    if (isNumber(d)) {
                        switch (d) {
                            case InjectFlags.Optional:
                                options = options | OptionFlags.Optional;
                                break;
                            case InjectFlags.SkipSelf:
                                options = options & ~OptionFlags.CheckSelf;
                                break;
                            case InjectFlags.Self:
                                options = options & ~OptionFlags.CheckParent;
                                break;
                        }
                    } else {
                        token = d;
                    }
                }
            }
            return { token, options };
        });
    } else if (provider.useExisting) {
        deps = [{ token: provider.useExisting, options: OptionFlags.Default }];
    }
    return deps ?? EMPTY;
}

/**
 * circular dependency error.
 */
export class CircularDependencyError extends Error {
    constructor(message?: string) {
        super('Circular dependency' + message);
        Object.setPrototypeOf(this, CircularDependencyError);
    }
}

export class NullInjectorError extends Error {
    constructor(token: Token) {
        super(`NullInjectorError: No provider for ${token?.toString()}!`);
        Object.setPrototypeOf(this, NullInjectorError);
    }
}

/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function tryResolveToken(token: Token, rd: FactoryRecord | undefined, records: Map<any, FactoryRecord>, platform: Platform, parent: Injector | undefined, notFoundValue: any, flags: InjectFlags): any {
    try {
        return resolveToken(token, rd, records, platform, parent, notFoundValue, flags);
    } catch (e) {
        if (rd && rd.value === CIRCULAR) {
            rd.value = EMPTY;
        }
        throw e;
    }
}


/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function resolveToken(token: Token, rd: FactoryRecord | undefined, records: Map<any, FactoryRecord>, platform: Platform, parent: Injector | undefined, notFoundValue: any, flags: InjectFlags): any {
    if (rd && !(flags & InjectFlags.SkipSelf)) {
        let value = rd.value;
        if (value === CIRCULAR) {
            throw new CircularDependencyError();
        }
        if (value === EMPTY && !isNil(rd.value)) return rd.value;
        let deps = EMPTY;
        if (rd.deps?.length) {
            deps = [];
            for (let i = 0; i < rd.deps.length; i++) {
                const dep = rd.deps[i];
                const chlrd = isPlainObject(dep.token) ? dep.token : (dep.options & OptionFlags.CheckSelf ? records.get(dep.token) : undefined);
                deps.push(resolveToken(
                    dep.token,
                    chlrd,
                    records,
                    platform,
                    !chlrd && !(dep.options & OptionFlags.CheckParent) ? undefined : parent,
                    dep.options & OptionFlags.Optional ? null : undefined,
                    InjectFlags.Default));
            }
        }
        switch (rd.fnType) {
            case FnType.Cotr:
                return new (rd.fn as Type)(...deps);
            case FnType.Fac:
                if (value === EMPTY) {
                    return rd.value = value = rd.fn?.(...deps);
                }
                return rd.fn?.(...deps);
            case FnType.Inj:
            default:
                if (rd.expires) {
                    if ((rd.expires + rd.ltop!) < Date.now()) {
                        rd.ltop = Date.now();
                        return rd.cache!;
                    }
                    rd.expires = null!;
                    rd.cache = null!;
                    rd.ltop = null!;
                }
                return rd.fn?.(...deps);
        }
    } else if (!(flags & InjectFlags.Self)) {
        return parent?.get(token, notFoundValue, InjectFlags.Default);
    } else if (!(flags & InjectFlags.Optional)) {
        if (isUndefined(notFoundValue)) {
            throw new NullInjectorError(token);
        }
        return notFoundValue;
    } else {
        return notFoundValue ?? null;
    }
}


const resolves: OperationArgumentResolver[] = [
    {
        canResolve(parameter) {
            return (parameter.provider && !parameter.mutil && !isPrimitiveType(parameter.provider)) as boolean;
        },
        resolve(parameter, ctx) {
            const pdr = parameter.provider!;
            const injector = ctx.injector;
            if (isFunction(pdr) && !injector.platform().isRegistered(pdr) && !injector.has(pdr, InjectFlags.Default)) {
                injector.register(pdr as Type);
            }
            return injector.get(pdr, null, parameter.flags);
        }
    },
    {
        canResolve(parameter, ctx) {
            return (parameter.paramName && isDefined(ctx.arguments[parameter.paramName])) as boolean;
        },
        resolve(parameter, ctx) {
            return ctx.arguments[parameter.paramName!];
        }
    },
    {
        canResolve(parameter, ctx) {
            return (parameter.paramName && isDefined(ctx.arguments[parameter.paramName])) as boolean;
        },
        resolve(parameter, ctx) {
            return ctx.injector.get<any>(parameter.paramName!, null, parameter.flags);
        }
    },
    {
        canResolve(parameter) {
            return (parameter.type && !isPrimitiveType(parameter.type)) as boolean;
        },
        resolve(parameter, ctx) {
            const ty = parameter.type!;
            const injector = ctx.injector;
            if (isFunction(ty) && !injector.platform().isRegistered(ty) && !injector.has(ty, InjectFlags.Default)) {
                injector.register(ty as Type);
            }
            return injector.get(ty, null, parameter.flags);
        }
    },
    // default value
    {
        resolve(parameter) {
            return parameter.defaultValue as any;
        },
        canResolve(parameter) {
            return isDefined(parameter.defaultValue);
        }
    }
];

export function createInvocationContext(injector: Injector, option?: {
    typeRef?: TypeReflect,
    method?: string,
    args?: Record<string, any>,
    resolvers?: OperationArgumentResolver[] | ((injector: Injector, typeRef?: TypeReflect, method?: string) => OperationArgumentResolver[]),
    providers?: ProviderType[]
}) {
    option = option || EMPTY_OBJ;
    let providers: ProviderType[] = option.providers ?? EMPTY;
    const { typeRef, method } = option;
    if (typeRef) {
        const platform = injector.platform();
        providers = [...providers, platform.getTypeProvider(typeRef.type), ...(method ? typeRef.methodProviders.get(method) ?? EMPTY : EMPTY)]
    }
    if (providers.length) {
        const proxy = typeRef && method ? typeRef.type.prototype[method]['_proxy'] : false;
        injector = Injector.create(providers, injector, proxy ? 'invoked' : 'parameter');
    }
    return injector.has(InvocationContext) ? injector.get(InvocationContext) : new InvocationContext(injector, typeRef?.type, method, option.args || EMPTY_OBJ,
        ...(isFunction(option.resolvers) ? option.resolvers(injector, typeRef, method) : option.resolvers) ?? EMPTY,
        ...resolves);
}

/**
 * register core for root.
 *
 * @export
 * @param {IContainer} root
 */
function registerCores(root: Injector) {
    root.setValue(ModuleLoader, new DefaultModuleLoader());
    root.setValue(OperationInvokerFactory, {
        create: (type, method, instance?) => {
            return new ReflectiveOperationInvoker(isFunction(type) ? get(type) : type, method, instance);
        },
        createContext: (type, method, injector, options?) => {
            return createInvocationContext(injector, {
                ...options,
                typeRef: isFunction(type) ? get(type) : type,
                method
            });
        }
    });
    // bing action.
    root.platform().registerAction(
        DesignLifeScope,
        RuntimeLifeScope
    );
}
