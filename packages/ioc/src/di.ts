import { ClassType, LoadType, Modules, Type } from './types';
import {
    ProviderType, ResolveOption, ServicesOption, MethodType, InjectorScope, Factory,
    ProviderOption, RegisterOption, TypeOption, FnType, FnRecord, ActionProvider, Container,
    Injector, INJECT_IMPL, ModuleLoader, Registered, RegisteredState
} from './injector';
import { isToken, Token } from './tokens';
import { CONTAINER, INJECTOR, ROOT_INJECTOR, TARGET } from './metadata/tk';
import { Abstract } from './metadata/fac';
import { cleanObj, getClass, getTypes, isBaseOf, mapEach } from './utils/lang';
import { KeyValueProvider, StaticProviders } from './providers';
import {
    isArray, isClass, isDefined, isFunction, isNil, isPlainObject, isString,
    isTypeObject, isTypeReflect, EMPTY, EMPTY_OBJ
} from './utils/chk';
import { DesignContext } from './actions/ctx';
import { DesignLifeScope } from './actions/design';
import { Action, IActionSetup } from './action';
import { Handler } from './utils/hdl';
import { RuntimeLifeScope } from './actions/runtime';
import { TypeReflect } from './metadata/type';
import { get } from './metadata/refl';
import { InvocationContext, OperationArgumentResolver, OperationInvokerFactory, ReflectiveOperationInvoker } from './invoker';
import { DefaultModuleLoader } from './loader';
import { ResolveServicesScope, ServicesContext } from './actions/serv';



/**
 * strategy of di.
 */
export interface Strategy {
    has?(injector: Injector, token: Token, deep?: boolean): boolean;
    hasValue?(injector: Injector, token: Token, deep?: boolean): boolean;
    resolve?<T>(injector: Injector, token: Token<T>, provider?: Injector): T;
    getProvider?<T>(injector: Injector, token: Token<T>): Type<T>;
    iterator?(injector: Injector, callbackfn: (fac: FnRecord, key: Token, resolvor?: Injector) => void | boolean, deep?: boolean): void | boolean;
}

export const EMPTY_STRATEGY: Strategy = {};

export const INJECT_STRATEGY: Strategy = {
    has(injector: Injector, token: Token, deep?: boolean): boolean {
        return deep && injector.parent ? injector.parent.has(token, deep) : false;
    },
    hasValue(injector: Injector, token: Token, deep?: boolean): boolean {
        return deep && injector.parent ? injector.parent.hasValue(token, deep) : false;
    },
    resolve<T>(injector: Injector, token: Token<T>, provider?: Injector): T {
        return injector.parent?.get(token, provider)!;
    },
    getProvider<T>(injector: Injector, token: Token<T>): Type<T> {
        return injector.parent?.getTokenProvider(token)!;
    },
    iterator(injector: Injector, callbackfn: (fac: FnRecord, key: Token, resolvor?: Injector) => void | boolean, deep?: boolean): void | boolean {
        return deep && injector.parent?.iterator(callbackfn, deep);
    }
}

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

    constructor(providers: ProviderType[] = EMPTY, readonly parent?: Injector, readonly scope?: string | InjectorScope, private strategy: Strategy = INJECT_STRATEGY) {
        super();
        this.factories = new Map();
        if (parent) {
            this.destCb = () => this.destroy();
            this.initParent(parent);
        } else {
            scope = this.scope = 'root';
            this._state = new RegisteredStateImpl();
            this._action = new ActionProviderImpl([], this);
            registerCores(this);
        }
        this.initScope(scope);
        this.inject(providers);
    }

    protected initScope(scope?: string) {
        const val = { value: this };
        switch (scope) {
            case 'root':
                this.factories.set(Container, val);
                this.factories.set(CONTAINER, val);
                this.factories.set(ROOT_INJECTOR, val);
                this.factories.set(INJECTOR, val);
                this.factories.set(Injector, val);
                break;
            case 'provider':
            case 'invoked':
            case 'parameter':
                break;
            default:
                this.factories.set(INJECTOR, val);
                this.factories.set(Injector, val);
                break;
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
    get<T>(key: Token<T>, notFoundValue?: T): T;
    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Injector} provider
     * @returns {T}
     */
    get<T>(key: Token<T>, provider?: Injector, notFoundValue?: T): T;
    get<T>(key: Token<T>, arg1?: Injector | T, arg2?: T): T {
        let provider: Injector | undefined;
        let notFoundValue: T | undefined;
        if (arg1 instanceof Injector) {
            provider = arg1;
            notFoundValue = arg2 ?? null!;
        } else {
            notFoundValue = arg1 ?? null!;
        }
        return resolveToken(this.factories.get(key)!, provider || this)
            ?? this.strategy.resolve?.(this, key, provider || this)
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
            return this.get(token, injector);
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
    * @param {InvocationContext} context ivacation context.
    * @returns {TR}
    */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    /**
    * invoke method.
    *
    * @template T
    * @param {(T | Type<T>)} target type of class or instance
    * @param {MethodType} propertyKey
    * @param {ProviderType[]} providers
    * @returns {TR}
    */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, providers?: ProviderType[]): TR;
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
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        // return this.get(Invoker).invoke(this, target, propertyKey, (args.length === 1 && isArray(args[0])) ? args[0] : args);
        let providers: ProviderType[];
        let context: InvocationContext | null = null;
        if (args.length === 1) {
            if (args[0] instanceof InvocationContext) {
                context = args[0];
                providers = EMPTY;
            } else {
                providers = isArray(args[0]) ? args[0] : args;
            }
        } else {
            providers = args;
        }

        let targetClass: Type, instance: any, key: string;
        if (isTypeObject(target)) {
            targetClass = getClass(target);
            instance = target as T;
        } else {
            instance = this.resolve(target as Token, providers);
            targetClass = getClass(instance);
            if (!targetClass) {
                throw new Error((target as Token).toString() + ' is not implements by any class.')
            }
        }

        const tgRefl = get(targetClass);
        if (isFunction(propertyKey)) {
            key = tgRefl.class.getPropertyName(propertyKey(tgRefl.class.getPropertyDescriptors() as any) as TypedPropertyDescriptor<any>);
        } else {
            key = propertyKey;
        }

        const factory = this.resolve({ token: OperationInvokerFactory, target: tgRefl, providers });
        return factory.create(tgRefl, key, instance).invoke(context ?? factory.createContext(tgRefl, key, this, { providers }));
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
        if (this.scope === 'root') {
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

/**
 * service provider.
 */
@Abstract()
export abstract class ServicesProvider {
    /**
    * get all service extends type.
    *
    * @template T
    * @param {Injector} injector
    * @param {Token<T>} token servive token or express match token.
    * @param {ProviderType[]} providers
    * @returns {T[]} all service instance type of token type.
    */
    abstract getServices<T>(injector: Injector, token: Token<T>, providers: ProviderType[]): T[];
    /**
     * get all service extends type.
     *
     * @template T
     * @param {Injector} injector
     * @param {ServicesOption<T>} option servive token or express match token.
     * @returns {T[]} all service instance type of token type.
     */
    abstract getServices<T>(injector: Injector, option: ServicesOption<T>): T[];
}


/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function resolveToken<T>(rd: FnRecord<T>, provider: Injector): T {
    if (!rd) return null!;

    if (!isNil(rd.value)) return rd.value;

    switch (rd.fnType) {
        case 'cotr':
            return new (rd.fn as Type)(...createArgs(rd.deps!, provider));
        case 'fac':
            return rd.fn?.(...createArgs(rd.deps!, provider));
        case 'inj':
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
            return rd.fn?.(provider);

    }
}

function createArgs(deps: any[], provider: Injector): any[] {
    return deps?.map(d => {
        if (isToken(d)) {
            return provider.get(d) ?? (isString(d) ? d : undefined);
        } else if (isFunction(d.fn) && (d.fnType === 'cotr' || d.fnType === 'fac' || d.fnType === 'inj')) {
            return resolveToken(d, provider);
        } else {
            return d;
        }
    }) ?? EMPTY;
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


/**
 * service provider.
 */
class Services implements ServicesProvider {

    static ρNPT = true;
    private servicesScope!: ResolveServicesScope;

    constructor(private readonly injector: Injector) { }
    /**
    * get all service extends type.
    *
    * @template T
    * @param {Injector} injector
    * @param {Token<T>} token servive token or express match token.
    * @param {ProviderType[]} providers
    * @returns {T[]} all service instance type of token type.
    */
    getServices<T>(injector: Injector, token: Token<T>, providers: ProviderType[]): T[];
    /**
     * get all service extends type.
     *
     * @template T
     * @param {Injector} injector
     * @param {ServicesOption<T>} option servive token or express match token.
     * @returns {T[]} all service instance type of token type.
     */
    getServices<T>(injector: Injector, option: ServicesOption<T>): T[];
    getServices<T>(injector: Injector, target: Token<T> | ServicesOption<T>, args?: ProviderType[]): T[] {
        let providers: ProviderType[];
        if (isPlainObject(target)) {
            providers = (target as ServicesOption<T>).providers || [];
            if ((target as ServicesOption<T>).target) {
                providers.push({ provide: TARGET, useValue: (target as ServicesOption<T>).target });
            }
        } else {
            providers = args || EMPTY;
        }
        let context = {
            injector,
            ...isPlainObject(target) ? target : { token: target },
        } as ServicesContext;

        this.initTargetRef(context);
        if (!this.servicesScope) {
            this.servicesScope = this.injector.action().get(ResolveServicesScope);
        }

        const services: T[] = [];
        this.servicesScope.execute(context);
        const pdr = providers.length ? Injector.create(providers, injector, 'provider') : injector;
        context.services.forEach(rd => {
            services.push(resolveToken(rd, pdr));
        });
        providers.length && pdr.destroy();
        context.services.clear();
        // clean obj.
        cleanObj(context);
        return services;
    }

    private initTargetRef(ctx: ServicesContext) {
        let targets = (isArray(ctx.target) ? ctx.target : [ctx.target]).filter(t => t).map(tr => isFunction(tr) ? tr : getClass(tr));
        if (targets.length) {
            ctx.targetRefs = targets;
        }
    }
}

/**
 * registered state.
 */
class RegisteredStateImpl implements RegisteredState {

    private states: Map<ClassType, Registered>;
    constructor() {
        this.states = new Map();
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends Injector = Injector>(type: ClassType): T {
        return this.states.get(type)?.injector as T;
    }

    /**
     * get injector
     * @param type
     */
    getTypeProvider(type: ClassType): Injector {
        return this.states.get(type)?.providers!;
    }

    setTypeProvider(type: ClassType | TypeReflect, providers: ProviderType[]) {
        const trefl = isFunction(type) ? get(type) : type;
        trefl.providers.push(...providers);
        const state = this.states.get(trefl.type);
        if (state) {
            if (!state.providers) {
                state.providers = Injector.create(providers, state.injector as Injector, 'provider');
            } else {
                state.providers.inject(providers);
            }
        }
    }

    getInstance<T>(type: ClassType<T>, provider?: Injector): T {
        const state = this.states.get(type)!;
        return state.providers ? state.providers.get(type, provider) : state.injector.get(type, provider);
    }

    resolve<T>(token: ClassType<T>, providers?: ProviderType[]): T {
        const state = this.states.get(token)!;
        return state.providers ? state.providers.resolve(token, providers) : state.injector.resolve(token, providers);
    }

    getRegistered<T extends Registered>(type: ClassType): T {
        return this.states.get(type) as T;
    }

    regType<T extends Registered>(type: ClassType, data: T) {
        const state = this.states.get(type);
        if (state) {
            Object.assign(state, data);
        } else {
            this.states.set(type, data);
        }
    }

    deleteType(type: ClassType) {
        const state = this.states.get(type);
        if (state) {
            state.providers?.destroy();
            const injector = state.injector;
            if (state.provides?.length && injector) {
                state.provides.forEach(p => state.injector.unregister(p));
            }
            cleanObj(state);
        }
        this.states.delete(type);
    }

    isRegistered(type: ClassType): boolean {
        return this.states.has(type);
    }

    destroy() {
        this.states.forEach(v => {
            if (!v) return;
            v.providers?.destroy();
            v.injector?.destroy();
            cleanObj(v);
        });
        this.states.clear();
    }

}

/**
 * action injector.
 */
class ActionProviderImpl extends DefaultInjector implements ActionProvider {

    constructor(providers: ProviderType[], parent: Injector) {
        super(providers, parent, 'provider');
    }

    protected override initParent(parent: Injector) {

    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Injector} provider
     * @returns {T}
     */
    override get<T>(key: Token<T>, prvoider?: Injector, notFoundValue?: T): T {
        if (isFunction(key) && !this.has(key)) {
            this.registerAction(key as Type);
        }
        return super.get(key, prvoider, notFoundValue);
    }

    regAction(...types: Type<Action>[]): this {
        types.forEach(type => {
            if (this.has(type)) return;
            this.registerAction(type);
        });
        return this;
    }

    protected override regType<T>(target: Type<T>) {
        if (isBaseOf(target, Action)) {
            this.registerAction(target);
            return;
        }
        super.regType(target);
    }

    getAction<T extends Handler>(target: Token<Action>): T {
        return this.get(target)?.toHandler() as T ?? null;
    }

    protected registerAction(type: Type<Action>) {
        if (this.has(type)) return true;
        const instance = new type(this) as Action & IActionSetup;

        this.setValue(type, instance);
        if (isFunction(instance.setup)) instance.setup();
    }
}

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
    return new InvocationContext(injector, option.args || EMPTY_OBJ,
        ...(isFunction(option.resolvers) ? option.resolvers(injector, typeRef, method) : option.resolvers) ?? EMPTY,
        {
            resolve(parameter) {
                const pdr = parameter.provider!;
                if (isClass(pdr) && !state.isRegistered(pdr) && !injector.has(pdr, true)) {
                    injector.register(pdr);
                }
                return injector.get(pdr);
            },
            canResolve(parameter) {
                return !!parameter.provider;
            }
        },
        {
            resolve(parameter) {
                return injector.get<any>(parameter.paramName!);
            },
            canResolve(parameter) {
                return !!parameter.paramName && injector.has(parameter.paramName);
            }
        },
        {
            resolve(parameter) {
                const ty = parameter.type!;
                if (isClass(ty) && !state.isRegistered(ty) && !injector.has(ty, true)) {
                    injector.register(ty);
                }
                return injector.get(ty);
            },
            canResolve(parameter) {
                return !!parameter.type;
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
        });
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
