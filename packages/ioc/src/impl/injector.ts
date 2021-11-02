import { ClassType, LoadType, Modules, Type } from '../types';
import {
    ProviderType, ResolveOption, ServicesOption, MethodType, InjectorScope, Factory,
    ProviderOption, RegisterOption, TypeOption, FnType, FnRecord, ActionProvider, Container,
    Injector, INJECT_IMPL, RegisteredState, ServicesProvider
} from '../injector';
import { Token } from '../tokens';
import { CONTAINER, INJECTOR, ROOT_INJECTOR, TARGET } from '../metadata/tk';
import { cleanObj, getClass, getTypes, mapEach } from '../utils/lang';
import { KeyValueProvider, StaticProviders } from '../providers';
import {
    isArray, isClass, isDefined, isFunction, isNil, isPlainObject,
    isTypeObject, isTypeReflect, EMPTY, EMPTY_OBJ, isPrimitiveType
} from '../utils/chk';
import { DesignContext } from '../actions/ctx';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { TypeReflect } from '../metadata/type';
import { get } from '../metadata/refl';
import { InvocationContext, OperationArgumentResolver, OperationInvokerFactory, ReflectiveOperationInvoker } from '../invoker';
import { DefaultModuleLoader } from './loader';
import { ResolveServicesScope } from '../actions/serv';
import { ModuleLoader } from '../module.loader';
import { resolveToken } from './resolves';
import { Services } from './services';
import { RegisteredStateImpl } from './state';
import { ActionProviderImpl } from './action.provider';



const platformAlias = (token: any) => token === Injector || token === INJECTOR || token === Container || token === CONTAINER;
const rootAlias = (token: any) => token === Injector || token === INJECTOR || token == ROOT_INJECTOR;
const injectAlias = (token: any) => token === Injector || token === INJECTOR;

/**
 * provider container.
 *
 * @export
 * @class Provider
 * @extends {Destoryable}
 */
export class DefaultInjector extends Injector {

    protected _state!: RegisteredState;
    protected _action!: ActionProvider;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<Token, FnRecord>;
    protected destCb!: () => void;

    constructor(providers: ProviderType[] = EMPTY, readonly parent?: Injector, readonly scope?: InjectorScope) {
        super();
        this.factories = new Map();
        if (parent) {
            this.destCb = () => this.destroy();
            this.initParent(parent);
        } else {
            scope = this.scope = 'root';
        }
        this.initScope(scope);
        this.inject(providers);
    }

    protected isSelf(token: Token) {
        switch (this.scope) {
            case 'platfrom':
                return platformAlias(token);
            case 'root':
                return rootAlias(token);
            case 'provider':
            case 'invoked':
            case 'parameter':
                return false;
            default:
                return injectAlias(token);
        }
    }


    protected initScope(scope?: InjectorScope) {
        if (scope === 'platfrom') {
            this._state = new RegisteredStateImpl();
            this._action = new ActionProviderImpl([], this);
            registerCores(this);
        }
    }

    protected initParent(parent: Injector) {
        parent.onDestroy(this.destCb);
    }

    get size(): number {
        return this.factories.size;
    }

    tokens() {
        return Array.from(this.factories.keys());
    }

    /**
     * registered state.
     */
    state(): RegisteredState {
        return this._state ?? this.parent?.state();
    }


    /**
     * action provider.
     */
    action(): ActionProvider {
        return this._action ?? this.parent?.action();
    }

    /**
     * set provide.
     *
     * @template T
     * @param {ProviderOption<T>} option
     * @returns {this}
     */
    set<T>(option: ProviderOption<T>): this;
    /**
     * set provide.
     * @param token token.
     * @param option factory option.
     */
    set<T>(token: Token<T>, option: FnRecord<T>): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} fn
     * @param {Type<T>} [providerType]
     * @returns {this}
     */
    set<T>(token: Token<T>, fn: Factory<T>, type?: Type<T>): this;
    set<T>(target: any, fn?: any, type?: Type<T>): this {
        if (isFunction(fn)) {
            const old = this.factories.get(target);
            if (old) {
                old.fn = fn;
                if (
                    type) old.type = type;
            } else {
                this.factories.set(target, type ? { fn, type } : { fn });
            }
        } else if (fn) {
            this.factories.set(target, fn);
        } else {
            this.registerProvider((target as ProviderOption).provide, target);
        }
        return this;
    }

    protected registerProvider(provide: Token, target: StaticProviders) {
        if (target.multi) {
            let multiPdr = this.factories.get(provide);
            if (!multiPdr) {
                this.set(provide, multiPdr = {
                    fnType: 'fac',
                    fn: MUTIL,
                    deps: []
                });
            }
            multiPdr.deps?.push(generateRecord(this, target));
        } else {
            this.factories.set(provide, generateRecord(this, target));
        }
    }

    /**
     * register with option.
     * @param options
     */
    register<T>(option: RegisterOption<T>): this;
    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    register<T>(type: Type<T>): this;
    /**
     * register types.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    register(types: Type[]): this;
    register(...types: Type[]): this;
    register(...args: any[]): this {
        if (args.length === 1) {
            const target = args[0];
            if (isArray(target)) {
                target.forEach(t => this.regType(t));
            } else if (isFunction(target)) {
                this.regType(target);
            } else {
                if ((target as TypeOption).type) {
                    this.registerIn(this, (target as TypeOption).type, target as TypeOption);
                } else if (target.provide) {
                    this.registerProvider(target.provide, target);
                }
            }
        } else {
            args.forEach(t => this.regType(t));
        }

        return this;
    }

    /**
     * cache instance.
     * @param token 
     * @param instance 
     * @param expires 
     */
    cache<T>(token: Token<T>, cache: T, expires: number): this {
        const pd = this.factories.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.cache = cache;
            pd.ltop = ltop
            pd.expires = expires;
        } else {
            this.factories.set(token, { cache, ltop, expires });
        }
        return this;
    }


    /**
     * register type class.
     * @param injector register in the injector.
     * @param option the type register option.
     * @param [singleton]
     */
    protected registerIn<T>(injector: Injector, type: Type<T>, option?: TypeOption<T>) {
        const state = injector.state();
        // make sure class register once.
        if (state.isRegistered(type) || injector.has(type, true)) {
            return false;
        }

        const ctx = {
            injector,
            ...option,
            type
        } as DesignContext;
        injector.action().get(DesignLifeScope).register(ctx);
        cleanObj(ctx);
        return true;
    }

    protected regType(type: Type) {
        this.registerIn(this, type);
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
        const providers = (args.length === 1 && isArray(args[0])) ? args[0] : args;
        providers?.length && providers.forEach(p => {
            if (!p) {
                return;
            }

            if (isFunction(p)) {
                return this.regType(p);
            }

            if (isArray(p)) {
                return this.use(p);
            }

            if (isPlainObject(p)) {
                if ((p as StaticProviders).provide) {
                    this.registerProvider((p as StaticProviders).provide, p as StaticProviders);
                } else {
                    this.use(p);
                }
            } else if (p instanceof Injector) {
                this.copy(p);
            } else if (p instanceof KeyValueProvider) {
                p.each((k, useValue) => {
                    this.factories.set(k, { value: useValue });
                });
            }
        });

        return this;
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
        let modules: Modules[];
        if (args.length === 1 && isArray(args[0])) {
            modules = args[0];
        } else {
            modules = args;
        }
        let types = getTypes(modules);
        types.forEach(ty => this.regType(ty));
        return types;
    }

    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {boolean} deep.
     * @returns {boolean}
     */
    has<T>(token: Token<T>, deep?: boolean): boolean {
        return this.factories.has(token) || this.strategy.has?.(this, token, deep) || false;
    }

    /**
     * has value or not.
     * @param token 
     * @param deep 
     * @returns 
     */
    hasValue<T>(token: Token<T>, deep?: boolean): boolean {
        return !isNil(this.factories.get(token)?.value) || this.strategy.hasValue?.(this, token, deep) || false;
    }

    setValue<T>(token: Token<T>, value: T, type?: Type<T>): this {
        const isp = this.factories.get(token);
        if (isp) {
            isp.value = value;
            if (type) isp.type = type;
        } else if (isDefined(value)) {
            this.factories.set(token, type ? { value, type } : { value });
        }
        return this;
    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Injector} provider
     * @returns {T}
     */
    get<T>(token: Token<T>, notFoundValue?: T): T {
        if (this.isSelf(token)) return this as any;
        return resolveToken(this.factories.get(token)!, this)
            ?? this.strategy.resolve?.(this, token, this)
            ?? notFoundValue;
    }

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
    /**
    * resolve instance with token and param provider via resolve scope.
    *
    * @template T
    * @param {(Token<T> | ResolveOption<T>)} token
    * @param {...ProviderType[]} providers
    * @returns {T}
    */
    resolve<T>(option: ResolveOption<T>): T;
    resolve<T>(token: Token<T> | ResolveOption<T>, ...args: any[]) {
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
        const state = this.state();
        return (targetToken ? state.getTypeProvider(targetToken)?.resolve(option.token!, injector) : null)
            ?? injector.get(option.token!)
            ?? this.resolveFailed(injector, state, option.token!, option.regify, option.defaultToken);
    }


    protected resolveFailed<T>(injector: Injector, state: RegisteredState, token: Token<T>, regify?: boolean, defaultToken?: Token): T {
        if (regify && isFunction(token) && !state?.isRegistered(token)) {
            this.regType(token as Type);
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
     * @returns {Type<T>}
     * @memberof BaseInjector
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        const frd = this.factories.get(token);
        return frd?.type ?? (frd?.value ? getClass(frd.value) : null!)
            ?? (frd && isClass(token) ? token : null!)
            ?? this.strategy.getProvider?.(this, token)
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
        const isp = this.factories.get(token);
        if (isp) {
            this.factories.delete(token);
            if (isFunction(isp.unreg)) isp.unreg();
            cleanObj(isp);
        }
        return this;
    }

    iterator(callbackfn: (fac: FnRecord, key: Token, resolvor?: Injector) => void | boolean, deep?: boolean): void | boolean {
        if (mapEach(this.factories, callbackfn, this) === false) {
            return false;
        }
        return this.strategy.iterator?.(this, callbackfn, deep);
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

        const factory = this.resolve({ token: OperationInvokerFactory, target: tgRefl, providers });
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

    /**
     * get all service extends type.
     *
     * @template T
     * @param {Token<T>} token servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    getServices<T>(token: Token<T>, ...providers: ProviderType[]): T[];
    /**
    * get all service extends type.
    *
    * @template T
    * @param {Token<T>} token servive token or express match token.
    * @returns {T[]} all service instance type of token type.
    */
    getServices<T>(token: Token<T>, providers: ProviderType[]): T[];
    /**
     * get all service extends type.
     *
     * @template T
     * @param {ServicesOption<T>} target servive token or express match token.
     * @returns {T[]} all service instance type of token type.
     */
    getServices<T>(option: ServicesOption<T>): T[];
    getServices<T>(target: any, ...args: any[]): T[] {
        return this.get(ServicesProvider).getServices(this, target,
            (args.length === 1 && isArray(args[0])) ? args[0] : args) ?? EMPTY;
    }

    protected merge(from: DefaultInjector, to: DefaultInjector, filter?: (key: Token) => boolean) {
        from.factories.forEach((rd, key) => {
            if (key === Injector || key === INJECTOR) return;
            if (filter && !filter(key)) return;
            to.factories.set(key, rd.fnType === 'inj' ? { fn: (pdr: Injector) => from.get(key, pdr) } : { ...rd });
        });
    }

    protected destroying() {
        Array.from(this.factories.keys())
            .forEach(k => {
                this.unregister(k);
            });
        this.factories.clear();
        this.factories = null!;
        if (this.parent) {
            !this.parent.destroyed && this.parent.offDestory(this.destCb);
        }
        if (this.scope === 'platfrom') {
            this._action.destroy();
            this._state.destroy();
        }
        this._action = null!;
        this._state = null!;
        this.destCb = null!;
        (this as any).parent = null!;
        (this as any).strategy = null!;
    }
}



INJECT_IMPL.create = (providers: ProviderType[], parent?: Injector, scope?: InjectorScope) => {
    return new DefaultInjector(providers, parent!, scope);
}


const IDENT = function <T>(value: T): T {
    return value;
};
const MUTIL = function <T>(...args: any): T[] {
    return args;
};
/**
 * generate record.
 * @param injector 
 * @param option 
 * @returns 
 */
export function generateRecord<T>(injector: Injector, option: StaticProviders): FnRecord<T> {
    let fn: Function = IDENT;
    let value: T | undefined;
    let fnType: FnType = 'fac';
    let type = option.useClass;
    const deps = computeDeps(option);
    if (isDefined(option.useValue)) {
        value = option.useValue;
    } else if (option.useFactory) {
        fn = option.useFactory;
    } else if (option.useExisting) {

    } else if (option.useClass) {
        if (deps.length) {
            fnType = 'cotr';
            fn = option.useClass;
        } else {
            fnType = 'inj';
            fn = (pdr: Injector) => {
                if (!injector.state().isRegistered(type) && !injector.has(type, true)) {
                    injector.register({ type, deps, regProvides: false });
                }
                return injector.get(type, pdr);
            };
        }
    } else if (isFunction(option.provide)) {
        fnType = 'cotr';
        fn = option.provide;
    }
    return { value, fn, fnType, deps, type };
}

function computeDeps(provider: StaticProviders) {
    let deps: any[] = null!;
    if (provider.deps && provider.deps.length) {
        deps = provider.deps;
    } else if (provider.useExisting) {
        deps = [provider.useExisting];
    }
    return deps ?? EMPTY;
}


const resolves: OperationArgumentResolver[] = [
    {
        canResolve(parameter) {
            return (parameter.provider && !parameter.mutil && !isPrimitiveType(parameter.provider)) as boolean;
        },
        resolve(parameter, ctx) {
            const pdr = parameter.provider!;
            const injector = ctx.injector;
            if (isFunction(pdr) && !injector.state().isRegistered(pdr) && !injector.has(pdr, true)) {
                injector.register(pdr as Type);
            }
            return injector.get(pdr);
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
            return ctx.injector.get<any>(parameter.paramName!);
        }
    },
    {
        canResolve(parameter) {
            return (parameter.type && !isPrimitiveType(parameter.type)) as boolean;
        },
        resolve(parameter, ctx) {
            const ty = parameter.type!;
            const injector = ctx.injector;
            if (isFunction(ty) && !injector.state().isRegistered(ty) && !injector.has(ty, true)) {
                injector.register(ty as Type);
            }
            return injector.get(ty);
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

export function createInvocationContext(injector: Injector, typeRef: TypeReflect, method: string
    , option?: {
        args?: Record<string, any>,
        resolvers?: OperationArgumentResolver[] | ((injector: Injector, typeRef?: TypeReflect, method?: string) => OperationArgumentResolver[]),
        providers?: ProviderType[]
    }) {
    option = option || EMPTY_OBJ;
    const state = injector.state();
    const proxy = typeRef.type.prototype[method]['_proxy'];
    let providers = [...option.providers || EMPTY, state.getTypeProvider(typeRef.type), ...typeRef.methodProviders.get(method) || EMPTY]
    if (providers.length) {
        injector = Injector.create(providers, injector, proxy ? 'invoked' : 'parameter');
    }
    return injector.has(InvocationContext) ? injector.get(InvocationContext) : new InvocationContext(injector, typeRef.type, method, option.args || EMPTY_OBJ,
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
    root.setValue(ServicesProvider, new Services(root));
    root.setValue(OperationInvokerFactory, {
        create: (type, method, instance?) => {
            return new ReflectiveOperationInvoker(isFunction(type) ? get(type) : type, method, instance);
        },
        createContext: (type, method, injector, options?) => {
            return createInvocationContext(injector, isFunction(type) ? get(type) : type, method, options);
        }
    });
    // bing action.
    root.action().regAction(
        DesignLifeScope,
        RuntimeLifeScope,
        ResolveServicesScope
    );
}
