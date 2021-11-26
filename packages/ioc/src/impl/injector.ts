import { ClassType, LoadType, Modules, Type } from '../types';
import {
    ResolveOption, MethodType, FnType, InjectorScope, ResolverOption, RegisterOption, FactoryRecord,
    Platform, Container, Injector, INJECT_IMPL, DependencyRecord, OptionFlags, RegOption, TypeOption
} from '../injector';
import { InjectFlags, Token } from '../tokens';
import { CONTAINER, INJECTOR, ROOT_INJECTOR, TARGET } from '../metadata/tk';
import { cleanObj, deepForEach } from '../utils/lang';
import { InjectorTypeWithProviders, KeyValueProvider, ProviderType, StaticProvider, StaticProviders } from '../providers';
import {
    isArray, isDefined, isFunction, isPlainObject, isPrimitiveType,
    isNumber, isTypeObject, isTypeReflect, EMPTY, EMPTY_OBJ, getClass, isString
} from '../utils/chk';
import { DesignContext } from '../actions/ctx';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { ModuleReflect, TypeReflect } from '../metadata/type';
import { get } from '../metadata/refl';
import {
    InvocationContext, InvocationOption, InvokeOption, OperationArgumentResolver, isResolver, Parameter, OperationFactory,
    ReflectiveOperationInvoker, OperationFactoryResolver, OperationInvoker, InvokeArguments, ReflectiveRef, composeResolver
} from '../invoker';
import { DefaultModuleLoader } from './loader';
import { ModuleLoader } from '../module.loader';
import { DefaultPlatform } from './platform';
import { DestroyCallback } from '../destroy';



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
    private isAlias?: (token: Token) => boolean;
    private _createdHandle?: (val: any) => void;

    constructor(providers: ProviderType[] = EMPTY, readonly parent?: Injector, readonly scope?: InjectorScope) {
        super();
        this.records = new Map();
        if (parent) {
            this.initParent(parent);
        } else {
            scope = this.scope = 'platform';
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
                this.platform().setInjector(scope, this);
                rootAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isRootAlias;
                break;
            case 'provider':
            case 'invoked':
            case 'parameter':
                break;
            default:
                if (scope) this.platform().setInjector(scope, this);
                injectAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isInjectAlias;
                break;
        }
    }

    protected initParent(parent: Injector) {
        parent.onDestroy(this);
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
            this.processProvider(platform, t);
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
            deepForEach(args, p => this.processProvider(platform, p, args), v => isPlainObject(v) && !(v as StaticProviders).provide);
        }
        return this;
    }

    protected processProvider(platform: Platform, p: Injector | TypeOption | StaticProvider, providers?: ProviderType[]) {
        if (isFunction(p)) {
            this.registerType(platform, p);
        } else if (isPlainObject(p) && (p as StaticProviders).provide) {
            this.registerProvider(platform, p as StaticProviders);
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
    protected registerType(platform: Platform, type: Type, option?: RegOption) {
        this.registerReflect(platform, get(type, true), option)
    }

    protected registerReflect(platform: Platform, reflect: TypeReflect, option?: RegOption) {
        const providedIn = option?.providedIn ?? reflect.providedIn;
        (providedIn ? platform.getInjector(providedIn) as DefaultInjector : this).processRegister(platform, reflect.type as Type, reflect, option);
    }

    protected processRegister(platform: Platform, type: Type, reflect: TypeReflect, option?: RegOption) {
        // make sure class register once.
        if (this.has(type, InjectFlags.Default)) {
            return false;
        }

        let injectorType: ((type: Type, typeReflect: ModuleReflect) => void) | undefined;
        if (option?.injectorType) {
            injectorType = (regType, typeReflect) => processInjectorType(
                type, [],
                (pdr, pdrs) => this.processProvider(platform, pdr, pdrs), (tyref, ty) => {
                    if (ty !== regType) {
                        this.registerReflect(platform, tyref);
                    }
                }, typeReflect);
        }

        const injector: Injector = this;
        const getRecords = () => this.records;
        const ctx = {
            injector,
            getRecords,
            ...option,
            injectorType,
            reflect,
            platform,
            type
        } as DesignContext;
        platform.getAction(DesignLifeScope).register(ctx);
        cleanObj(ctx);
        return true;
    }

    protected registerProvider(platfrom: Platform, provider: StaticProviders) {
        if (provider.multi) {
            let multiPdr = this.records.get(provider.provide);
            if (!multiPdr) {
                this.records.set(provider.provide, multiPdr = {
                    fnType: FnType.Fac,
                    fn: MUTIL,
                    value: EMPTY,
                    deps: []
                });
            }
            multiPdr.deps?.push({ token: generateRecord(platfrom, this, provider), options: OptionFlags.Default });
        } else {
            this.records.set(provider.provide, generateRecord(platfrom, this, provider));
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
        let types: Type[] = [];
        const platform = this.platform();
        deepForEach(args, ty => {
            if (isFunction(ty)) {
                const mdref = get<ModuleReflect>(ty);
                if (mdref) {
                    types.push(ty);
                    this.registerReflect(platform, mdref, { injectorType: mdref.module });

                }
            }
        }, v => isPlainObject(v));
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
            return this.parent?.has(token, flags) === true;
        }
        return false;
    }

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
    get<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags): T;
    /**
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} notFoundValue 
     * @param {InjectFlags} flags
     * @returns {T} token value.
     */
    get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags): T;
    get<T>(token: Token<T>, arg1?: InvocationContext | T, flags = InjectFlags.Default): T {
        this.assertNotDestroyed();
        if (this.isself(token)) return this as any;
        const platform = this.platform();
        if (platform.hasSingleton(token)) return platform.getSingleton(token);
        let context: InvocationContext | undefined;
        let notFoundValue: T | undefined;
        if (arg1 instanceof InvocationContext) {
            context = arg1;
        } else {
            notFoundValue = arg1;
        }

        if (!this._createdHandle) {
            this._createdHandle = platform.toCreatedHandle(this);
        }
        return this.tryResolve(token, this.records.get(token), platform, this.parent, context, notFoundValue, flags, this._createdHandle);
    }

    protected tryResolve(token: Token, record: FactoryRecord | undefined, platform: Platform, parent: Injector | undefined,
        context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, instanceCreated?: (value: any) => void) {
        return tryResolveToken(token, record, this.records, platform, parent, context, notFoundValue, flags, instanceCreated);
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
     * @param {option} option use to resolve and {@link InvocationContext}
     * @returns {T}
     */
    resolve<T>(token: Token<T>, option?: ResolverOption): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {InvocationContext} context
     * @returns {T}
     */
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     */
    resolve<T>(token: Token<T>, providers?: ProviderType[]): T;
    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     */
    resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
    resolve<T>(token: Token<T> | ResolveOption<T>, ...args: any[]) {
        this.assertNotDestroyed();
        let option: ResolveOption<T> | undefined = this.toOption(token, args);
        let inst: T;
        if (option) {
            let isnew = false;
            let context = option.context;
            const platform = this.platform();
            if (option.target || option.providers || option.resolvers || option.arguments || option.values) {
                let targetProviders: ProviderType[] | undefined;
                if (option.target) {
                    if (isFunction(option.target) || isTypeReflect(option.target)) {
                        targetProviders = platform.getTypeProvider(option.target);
                    } else if (isTypeObject(option.target)) {
                        targetProviders = platform.getTypeProvider(getClass(option.target));
                    }
                    option.values = [...option.values || EMPTY, [TARGET, option.target]];
                }
                context = context ? createInvocationContext(this, { parent: context, ...option, targetProviders }) : createInvocationContext(this, targetProviders ? { ...option, targetProviders } : option);
                isnew = true;
            }
            inst = this.resolveStrategy(platform, option, context);
            if (isnew && context) {
                context.destroy();
            }
        } else {
            inst = this.get(token as Token);
        }
        return inst;
    }

    protected toOption(token: Token | ResolveOption, args: any[]): ResolveOption | undefined {
        if (isPlainObject(token)) return token as ResolveOption;
        if (args.length) {
            if (args.length > 1 || args.length === 1 && isArray(args)) return { token, providers: args };
            if (args[0] instanceof InvocationContext) {
                return { token, context: args[0] };
            }
            return { token, ...args[0] };
        }
        return;
    }

    protected resolveStrategy<T>(platform: Platform, option: ResolveOption, context?: InvocationContext): T {
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

        return this.get(option.token!, context)
            ?? context?.resolveArgument({ provider: option.token } as Parameter)
            ?? this.resolveFailed(platform, option.token!, context, option.regify, option.defaultToken);
    }

    protected resolveFailed<T>(platform: Platform, token: Token<T>, context?: InvocationContext, regify?: boolean, defaultToken?: Token): T {
        if (regify && isFunction(token)) {
            this.registerType(platform, token as Type);
            return this.get(token, context);
        }
        if (defaultToken) {
            return this.get(defaultToken, context);
        }
        return null!;
    }

    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(ResolveOption<T>} option resolve option.
     * @returns {T}
     */
    getService<T>(option: ResolveOption<T>): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {option} option use to resolve and {@link InvocationContext}
     * @returns {T}
     */
    getService<T>(token: Token<T>, option?: ResolverOption): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {InvocationContext} context
     * @returns {T}
     */
    getService<T>(token: Token<T>, context?: InvocationContext): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T> } token servive token.
     * @param {ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(token: Token<T>, providers?: ProviderType[]): T;
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {Token<T> } token servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(token: Token<T>, ...providers: ProviderType[]): T;
    getService<T>(target: Token<T> | ResolveOption<T>, ...args: any[]): T {
        return this.resolve<T>(target as any, ...args);
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
        const isp = this.records?.get(token);
        if (isp) {
            this.records.delete(token);
            if (isFunction(isp.unreg)) isp.unreg();
            cleanObj(isp);
        }

        return this;
    }

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
    invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, option?: InvokeOption): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | TypeReflect<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {InvocationContext} context ivacation context.
     * @returns {TR}
     */
    invoke<T, TR = any>(target: T | Type<T> | TypeReflect<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
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
        let context: InvocationContext | undefined;
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
        if (isResolver(target)) {
            targetClass = target.type;
            instance = target.resolve(context);
        } else if (isTypeObject(target)) {
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

        const factory = this.get(OperationFactoryResolver).create(tgRefl);
        if (!context) {
            context = factory.createContext(this, { ...option, providers, invokerMethod: key });
            return factory.createInvoker(key, instance).invoke(context, () => context?.destroy());
        }
        return factory.createInvoker(key, instance).invoke(context);
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
    load(...args: any[]): Promise<Type[]> {
        this.assertNotDestroyed();
        let modules: LoadType[];
        if (args.length === 1 && isArray(args[0])) {
            modules = args[0];
        } else {
            modules = args;
        }
        return this.getLoader().register(this, modules);
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
        this.scope && this.platform()?.removeInjector(this.scope);
        Array.from(this.records.keys())
            .forEach(k => {
                this.unregister(k);
            });
        this.records.clear();
        this.records = null!;
        if (this.parent) {
            !this.parent.destroyed && this.parent.offDestroy(this);
        }
        this._plat = null!;
        this.isAlias = null!;
        this._createdHandle = null!;
        (this as any).parent = null!;
        (this as any).strategy = null!;
    }
}


/**
 * static injector.
 */
export class StaticInjector extends DefaultInjector {

    protected override tryResolve(token: Token, record: FactoryRecord | undefined, platform: Platform, parent: Injector | undefined,
        context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, created: (value: any) => void) {
        return tryResolveToken(token, record, this.records, platform, parent, context, notFoundValue, flags, created, true);
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


export function processInjectorType(typeOrDef: Type | InjectorTypeWithProviders, dedupStack: Type[],
    processProvider: (provider: StaticProvider, providers?: any[]) => void,
    regType: (typeRef: ModuleReflect, type: Type) => void, moduleRefl?: ModuleReflect, imported?: boolean) {
    const type = isFunction(typeOrDef) ? typeOrDef : typeOrDef.module;
    if (!isFunction(typeOrDef)) {
        deepForEach(
            typeOrDef.providers,
            pdr => processProvider(pdr, typeOrDef.providers),
            v => isPlainObject(v) && !v.provide
        );
    }
    const isDuplicate = dedupStack.indexOf(type) !== -1;
    const typeRef = moduleRefl ?? get<ModuleReflect>(type, true);
    if (typeRef.module && !isDuplicate) {
        dedupStack.push(type);
        typeRef.imports?.forEach(imp => {
            processInjectorType(imp, dedupStack, processProvider, regType, undefined, true);
        });

        if (imported && !(typeRef.providedIn === 'root' || typeRef.providedIn === 'platform')) {
            typeRef.exports?.forEach(d => {
                processInjectorType(d, dedupStack, processProvider, regType, undefined, true);
            })
        } else {
            typeRef.declarations?.forEach(d => {
                processInjectorType(d, dedupStack, processProvider, regType, undefined, true);
            });
            typeRef.exports?.forEach(d => {
                processInjectorType(d, dedupStack, processProvider, regType, undefined, true);
            })
        }

        if (typeRef.providers) {
            deepForEach(
                typeRef.providers,
                pdr => processProvider(pdr, typeRef.providers),
                v => isPlainObject(v) && !v.provide
            );
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

    regType(typeRef, type);
}


// export function throwExisting(type: Type<any> | undefined, incoming: Type<any>) {
//     if (type && type !== incoming) {
//         throw new Error(
//             `Duplicate module registered for - ${getClassName(type)}`);
//     }
// }


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
 * @param provider 
 * @returns 
 */
export function generateRecord<T>(platfrom: Platform, injector: Injector, provider: StaticProviders): FactoryRecord<T> {
    let fn: Function = IDENT;
    let value: T | undefined;
    let fnType = FnType.Fac;
    let type = provider.useClass;
    let deps = computeDeps(provider);
    if (isDefined(provider.useValue)) {
        value = provider.useValue;
    } else if (provider.useFactory) {
        fn = provider.useFactory;
    } else if (provider.useExisting) {

    } else if (provider.useClass) {
        if (deps) {
            deps.unshift({ token: provider.useClass, options: OptionFlags.Default });
        } else {
            deps = [{ token: provider.useClass, options: OptionFlags.Default }];
        }
        if (!injector.has(type, InjectFlags.Default)) {
            injector.register({ singleton: provider.singleton, type, deps, regProvides: false });
        }
    } else if (isFunction(provider.provide)) {
        if (deps) {
            fnType = FnType.Cotr;
            fn = provider.provide;
            type = provider.provide;
        } else {
            deps = [{ token: provider.provide, options: OptionFlags.Default }];
            type = provider.provide;
            if (!injector.has(type, InjectFlags.Default)) {
                injector.register({ singleton: provider.singleton, type, deps, regProvides: false });
            }
        }
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
    return deps;
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
export function tryResolveToken(token: Token, rd: FactoryRecord | undefined, records: Map<any, FactoryRecord>, platform: Platform, parent: Injector | undefined,
    context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, instanceCreated?: (value: any) => void, isStatic?: boolean): any {
    try {
        const value = resolveToken(token, rd, records, platform, parent, context, notFoundValue, flags, instanceCreated, isStatic);
        if (rd && rd.fn !== IDENT && rd.fn !== MUTIL && instanceCreated && isDefined(value)) {
            instanceCreated(value);
        }
        if (isStatic) {
            if (rd) {
                rd.value = value;
            } else {
                records.set(token, { value });
            }
        }
        return value;
    } catch (e) {
        if (rd && rd.value === CIRCULAR) {
            rd.value = EMPTY;
        }
        throw e;
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
    context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, instanceCreated?: (value: any) => void, isStatic?: boolean): any {
    if (rd && !(flags & InjectFlags.SkipSelf)) {
        let value = rd.value;
        if (value === CIRCULAR) {
            throw new CircularDependencyError();
        }
        if (isDefined(rd.value) && value !== EMPTY) return rd.value;
        let deps = [];
        if (rd.deps?.length) {
            for (let i = 0; i < rd.deps.length; i++) {
                const dep = rd.deps[i];
                const chlrd = isPlainObject(dep.token) ? dep.token : (dep.options & OptionFlags.CheckSelf ? records.get(dep.token) : undefined);

                let val: any;
                if (context) {
                    val = context.resolveArgument(isString(dep.token) ? { paramName: dep.token } : { provider: dep.token } as any);
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
                    instanceCreated,
                    isStatic));
            }
        }
        if (context) {
            deps.push(context);
        }
        switch (rd.fnType) {
            case FnType.Cotr:
                return new (rd.fn as Type)(...deps);
            case FnType.Fac:
                if (value === EMPTY) {
                    return rd.value = value = rd.fn?.(...deps);
                }
                return rd.fn?.(...deps)
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
                return rd.fn?.(...deps)
        }
    } else if (!(flags & InjectFlags.Self)) {
        return parent?.get(token, context ?? notFoundValue, InjectFlags.Default) ?? notFoundValue;
    } else if (!(flags & InjectFlags.Optional)) {
        if (notFoundValue === THROW_FLAGE) {
            throw new NullInjectorError(token);
        }
        return notFoundValue ?? null;
    } else {
        return notFoundValue ?? null;
    }
}


export const DEFAULT_RESOLVERS: OperationArgumentResolver[] = [
    composeResolver(
        (parameter, ctx) => isDefined(parameter.provider),
        {
            canResolve(parameter, ctx) {
                return ctx.hasValue(parameter.provider!);
            },
            resolve(parameter, ctx) {
                return ctx.getValue<any>(parameter.provider!);
            }
        },
        {
            canResolve(parameter, ctx) {
                return isString(parameter.provider) && isDefined(ctx.arguments[parameter.provider]);
            },
            resolve(parameter, ctx) {
                return ctx.arguments[parameter.provider as string];
            }
        },
        {
            canResolve(parameter, ctx) {
                return ctx.injector.has(parameter.provider as Token, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.injector.get(parameter.provider as Token, ctx, parameter.flags);
            }
        },
        {
            canResolve(parameter, ctx) {
                if (parameter.mutil || !isFunction(parameter.provider) || isPrimitiveType(parameter.provider)
                    || get(parameter.provider)?.class.abstract) return false;
                return isDefined(parameter.flags) ? !ctx.injector.has(parameter.provider!, InjectFlags.Default) : true;
            },
            resolve(parameter, ctx) {
                const pdr = parameter.provider!;
                const injector = ctx.injector;
                injector.register(pdr as Type);
                return injector.get(pdr, ctx, parameter.flags);
            }
        }
    ),
    composeResolver(
        (parameter, ctx) => isDefined(parameter.paramName),
        {
            canResolve(parameter, ctx) {
                return isDefined(ctx.arguments[parameter.paramName!]);
            },
            resolve(parameter, ctx) {
                return ctx.arguments[parameter.paramName!];
            }
        },
        {
            canResolve(parameter, ctx) {
                return ctx.hasValue(parameter.paramName!);
            },
            resolve(parameter, ctx) {
                return ctx.getValue(parameter.paramName!);
            }
        },
        {
            canResolve(parameter, ctx) {
                return ctx.injector.has(parameter.paramName!, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.injector.get(parameter.paramName!, ctx, parameter.flags);
            }
        }
    ),
    composeResolver(
        (parameter, ctx) => isDefined(parameter.type),
        {
            canResolve(parameter, ctx) {
                return ctx.hasValue(parameter.type!);
            },
            resolve(parameter, ctx) {
                return ctx.getValue<any>(parameter.type!);
            }
        },
        {
            canResolve(parameter, ctx) {
                return ctx.injector.has(parameter.type!, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.injector.get(parameter.type!, ctx, parameter.flags);
            }
        },
        {
            canResolve(parameter, ctx) {
                if (isPrimitiveType(parameter.type) || get(parameter.type!)?.class.abstract) return false;
                return isDefined(parameter.flags) ? !ctx.injector.has(parameter.type!, InjectFlags.Default) : true;
            },
            resolve(parameter, ctx) {
                const ty = parameter.type!;
                const injector = ctx.injector;
                injector.register(ty as Type);
                return injector.get(ty, ctx, parameter.flags);
            }
        }
    ),
    // default value
    {
        canResolve(parameter) {
            return isDefined(parameter.defaultValue);
        },
        resolve(parameter) {
            return parameter.defaultValue as any;
        }
    }
];

function createInvocationContext(injector: Injector, option?: InvocationOption & {
    proxy?: boolean;
    /**
     * invocation invoker target.
     */
    invokerTarget?: ClassType;
    targetProviders?: ProviderType[],
    methodProviders?: ProviderType[],
    targetResolvers?: OperationArgumentResolver[],
    methodResolvers?: OperationArgumentResolver[]
}) {
    option = option || EMPTY_OBJ;
    let providers: ProviderType[] = option.providers ?? EMPTY;
    if (option.targetProviders || option.methodProviders) {
        providers = [...providers, ...option.targetProviders || EMPTY, ...option.methodProviders || EMPTY]
    }

    injector = new StaticInjector(providers, injector, option.proxy ? 'invoked' : 'parameter');
    return new InvocationContext(
        injector,
        option.parent ?? injector.get(InvocationContext),
        option.invokerTarget,
        option.invokerMethod,
        option.arguments || EMPTY_OBJ,
        option.values,
        ...option.resolvers ?? EMPTY,
        ...option.targetResolvers ?? EMPTY,
        ...option.methodResolvers ?? EMPTY,
        ...DEFAULT_RESOLVERS);
}

class ReflectiveRefImpl<T> extends ReflectiveRef<T> {

    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();
    private _type: Type<T>;

    constructor(private factory: OperationFactory<T>, private _injector: Injector, readonly root: InvocationContext, private _instance?: T) {
        super()
        this._type = factory.targetReflect.type as Type;
        this.root.setValue(ReflectiveRef, this);
    }

    get injector(): Injector {
        return this._injector;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this._injector.resolve({ token: this.type, regify: true, context: this.root });
        }
        return this._instance;
    }

    get reflect(): TypeReflect<T> {
        return this.factory.targetReflect;
    }

    get type(): Type<T> {
        return this._type;
    }

    invoke(method: string, option?: InvokeArguments) {
        const context = this.factory.createContext(this.root.injector, option, this.root);
        const result = this.factory.createInvoker(method, this.instance).invoke(context);
        context.destroy();
        return result;
    }

    get destroyed() {
        return this._destroyed;
    }

    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.destroy());
            } finally {
                this._dsryCbs.clear();
                this.root.destroy();
                this._instance = null!;
                this._injector = null!;
                this._type = null!;
                this.factory = null!;
            }
        }
    }

    onDestroy(callback: DestroyCallback): void {
        this._dsryCbs.add(callback);
    }

}

export class DefaultOperationFactory<T> extends OperationFactory<T> {

    private _tagRefl: TypeReflect<T>;
    private _tagPdrs: ProviderType[] | undefined;
    constructor(targetType: ClassType<T> | TypeReflect<T>) {
        super()
        this._tagRefl = isFunction(targetType) ? get(targetType) : targetType;
    }

    get targetReflect(): TypeReflect<T> {
        return this._tagRefl;
    }

    create(injector: Injector, option?: InvokeOption): ReflectiveRef<T> {
        return new ReflectiveRefImpl(this, injector, this.createContext(injector, option));
    }

    createInvoker(method: string, instance?: T): OperationInvoker {
        return new ReflectiveOperationInvoker(this.targetReflect, method, instance);
    }

    createContext(injector: Injector, option?: InvocationOption, root?: InvocationContext): InvocationContext<any> {
        if (!this._tagPdrs) {
            this._tagPdrs = injector.platform().getTypeProvider(this.targetReflect);
        }
        let proxy: boolean | undefined;
        let methodProviders: ProviderType[] | undefined;
        let methodResolvers: OperationArgumentResolver[] | undefined;
        const method = option?.invokerMethod;
        if (method) {
            methodProviders = this.targetReflect.class.getMethodProviders(method);
            methodResolvers = this.targetReflect.class.getMethodResolvers(method);
            proxy = this.targetReflect.type.prototype[method]['_proxy'];
        }
        return root ? createInvocationContext(injector, {
            ...option,
            parent: root,
            proxy,
            invokerTarget: this.targetReflect.type,
            methodProviders,
            methodResolvers
        })
            : createInvocationContext(injector, {
                ...option,
                proxy,
                invokerTarget: this.targetReflect.type,
                targetProviders: this._tagPdrs,
                methodProviders,
                targetResolvers: this.targetReflect.class.resolvers,
                methodResolvers
            });
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
    container.setValue(OperationFactoryResolver, {
        create: (type) => {
            return new DefaultOperationFactory(type);
        }
    });
    // bing action.
    container.platform().registerAction(
        DesignLifeScope,
        RuntimeLifeScope
    );
}
