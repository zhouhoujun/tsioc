import { LoadType, Modules, Type } from './types';
import { MethodType } from './Invoker';
import { ClassProvider, ExistingProvider, FactoryProvider, KeyValueProvider, StaticProviders, ValueProvider } from './providers';
import {
    TypeOption, Factory, IActionProvider, IInjector, IModuleLoader, FacRecord, IProvider, ProviderType,
    RegisteredState, RegisterOption, ResolveOption, ServicesOption, ProviderOption
} from './IInjector';
import { isToken, Token, tokenRef } from './tokens';
import { isArray, isPlainObject, isClass, isNil, isFunction, isString, getClass, isDefined, isTypeObject, isTypeReflect } from './utils/chk';
import { IContainer } from './IContainer';
import { cleanObj, getTypes, remove } from './utils/lang';
import { INJECTOR, TARGET } from './metadata/tk';
import { Abstract } from './metadata/decor';
import { DefaultStrategy, Strategy } from './strategy';
import { DesignContext } from './actions/ctx';
import { DesignLifeScope } from './actions/design';


/**
 * provider default startegy.
 */
export const providerStrategy = new DefaultStrategy();

/**
 * provider container.
 *
 * @export
 * @class Provider
 * @extends {Destoryable}
 */
export class Provider implements IProvider {
    /**
     * none poincut for aop.
     */
    static ρNPT = true;

    private _destroyed = false;
    protected _container: IContainer;
    private _dsryCbs: (() => void)[] = [];
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<Token, FacRecord>;
    protected destCb: () => void;

    constructor(public parent: IProvider, protected strategy: Strategy = providerStrategy) {
        this.factories = new Map();
        parent && this.init(parent);
    }

    protected init(parent: IProvider) {
        this.destCb = () => this.destroy();
        this._container = parent.getContainer();
        if (this.strategy.vaildParent(parent)) {
            parent.onDestroy(this.destCb);
        } else {
            this._container.onDestroy(this.destCb);
            this.parent = null;
        }
    }

    get size(): number {
        return this.factories.size;
    }

    getContainer(): IContainer {
        return this._container;
    }

    /**
     * registered state.
     */
    state(): RegisteredState {
        return this._container?.state();
    }

    /**
     * action provider.
     */
    action(): IActionProvider {
        return this._container?.action();
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
    set<T>(token: Token<T>, option: FacRecord<T>): this;
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
            this.factories.set((target as ProviderOption).provide, generateRecord(this, target));
        }
        return this;
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
                } else {
                    this.factories.set(target.provide, generateRecord(this, target as ProviderOption));
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
    protected registerIn<T>(injector: IProvider, type: Type<T>, option?: TypeOption<T>) {
        const state = injector.state();
        // make sure class register once.
        if (state.isRegistered(type) || injector.has(type, true)) {
            return this;
        }

        const ctx = {
            injector,
            ...option,
            type
        } as DesignContext;
        injector.action().get(DesignLifeScope).register(ctx);
        cleanObj(ctx);
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
                this.regType(p);
            } else if (isPlainObject(p) && (p as StaticProviders).provide) {
                this.factories.set((p as StaticProviders).provide, generateRecord(this, p as StaticProviders));
            } else if (p instanceof KeyValueProvider) {
                p.each((k, useValue) => {
                    this.factories.set(k, { value: useValue });
                });
            } else if (p instanceof Provider) {
                this.copy(p);
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
     * @param {boolean} deep deep check in parent or not.
     * @returns {boolean}
     */
    has<T>(token: Token<T>, deep?: boolean): boolean {
        return this.factories.has(token) || (this.strategy.hasToken(token, this, deep) ?? false);
    }

    hasValue<T>(token: Token<T>): boolean {
        return !isNil(this.factories.get(token)?.value) || (this.strategy.hasValue(token, this) ?? false);
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
     * @param {IProvider} providers
     * @returns {T}
     */
    get<T>(key: Token<T>, providers?: IProvider): T {
        return resolveRecord(this.factories.get(key), providers) ?? this.strategy.getInstance(key, this, providers) ?? null;
    }



    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...ProviderType[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, providers: ProviderType[]): T;
    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...ProviderType[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T;
    resolve<T>(token: Token<T> | ResolveOption<T>, ...args: any[]) {
        let inst: T;
        let destroy: Function;
        let providers: ProviderType[] = (args.length === 1 && isArray(args[0])) ? args[0] : args;
        if (isPlainObject(token)) {
            let option = token as ResolveOption;
            if (option.providers) {
                providers = option.providers.concat(providers);
            }
            if (option.target) {
                providers.push({ provide: TARGET, useValue: option.target });
            }
            const pdr = this.toProvider(providers, false, p => {
                destroy = () => p.destroy();
                return p;
            });
            inst = this.resolveStrategy(option, pdr);
            cleanObj(option);
        } else {
            const pdr = this.toProvider(providers, false, p => {
                destroy = () => p.destroy();
                return p;
            });
            inst = this.resolveToken(token, pdr);
        }

        destroy?.();
        return inst;
    }

    protected resolveStrategy<T>(option: ResolveOption<T>, pdr: IProvider) {
        const targetToken = isTypeReflect(option.target) ? option.target.type as Type : (isTypeObject(option.target) ? getClass(option.target) : option.target as Type);

        let inst: T;
        const state = this.state();
        if (isFunction(targetToken)) {
            inst = this.resolveWithTarget(state, option.token, targetToken, pdr);
        }

        if (option.tagOnly || isDefined(inst)) return inst ?? null;

        return this.resolveToken(option.token, pdr) ?? this.resolveFailed(state, option.token, pdr, option.regify, option.defaultToken) ?? null;
    }

    protected resolveWithTarget<T>(state: RegisteredState, token: Token<T>, targetToken: Type, pdr: IProvider): T {
        return state?.getTypeProvider(targetToken)?.get(token, pdr) ?? this.get(tokenRef(token, targetToken), pdr);
    }

    protected resolveToken<T>(token: Token<T>, pdr: IProvider): T {
        return pdr?.get(token, pdr) ?? this.get(token, pdr) ?? this.parent?.get(token, pdr);
    }

    protected resolveFailed<T>(state: RegisteredState, token: Token<T>, pdr: IProvider, regify?: boolean, defaultToken?: Token): T {
        if (regify && isFunction(token) && !state?.isRegistered(token)) {
            this.regType(token as Type);
            return this.get(token, pdr);
        }
        if (defaultToken) {
            return this.get(defaultToken, pdr);
        }
        return null;
    }


    toProvider(providers: ProviderType[], force?: boolean, ifyNew?: (p: IProvider) => IProvider): IProvider {
        if (!force && (!providers || !providers.length)) return null;
        if (providers.length === 1 && isProvider(providers[0])) return providers[0] as IProvider;
        const pdr = this.createProvider(providers);
        return ifyNew ? ifyNew(pdr) : pdr;
    }



    protected createProvider(providers: ProviderType[]): IProvider {
        return createProvider(this, providers);
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
        return frd?.type ?? (frd?.value ? getClass(frd.value) : null) ?? (frd && isClass(token) ? token : null) ?? this.strategy.getTokenProvider(token, this);
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

    iterator(callbackfn: (fac: FacRecord, key: Token, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean {
        return this.strategy.iterator(this.factories, callbackfn, this, deep);
    }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} from
     * @returns
     * @memberof ProviderMap
     */
    copy(from: IProvider, filter?: (key: Token) => boolean): this {
        if (!from) {
            return this;
        }
        this.merge(from as Provider, this, filter);
        return this;
    }

    clone(to?: IProvider): IProvider;
    clone(filter: (key: Token) => boolean, to?: IProvider): IProvider;
    clone(filter?: any, to?: IProvider): IProvider {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (getClass(this))(this.parent);
        this.merge(this, to as Provider, filter);
        return to;
    }

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs = null;
            this.destroying();
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this._dsryCbs) {
            this._dsryCbs.push(callback);
        }
    }

    offDestory(callback: () => void) {
        remove(this._dsryCbs, callback);
    }

    protected merge(from: Provider, to: Provider, filter?: (key: Token) => boolean) {
        from.factories.forEach((pdr, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.factories.set(key, { ...pdr });
        });
    }

    protected destroying() {
        Array.from(this.factories.keys())
            .forEach(k => {
                this.unregister(k);
            });
        this.factories.clear();
        this.factories = null;
        if (this.parent) {
            !this.parent.destroyed && this.parent.offDestory(this.destCb);
        } else if (this._container) {
            !this._container.destroyed && this._container.offDestory(this.destCb);
        }
        this.destCb = null;
        this._container = null;
        this.parent = null;
        this.strategy = null;
    }
}


/**
 * invoked param provider.
 */
export class InvokedProvider extends Provider {
    constructor(parent: IProvider) {
        super(parent);
    }
}



/**
 * is target provider or not.
 * @param target target
 */
export function isProvider(target: any): target is Provider {
    return target instanceof Provider;
}


/**
 * create new injector.
 * @param parent
 * @param providers
 * @param strategy
 * @returns
 */
export function createProvider(parent: IProvider, providers?: ProviderType[], strategy?: Strategy) {
    const pdr = new Provider(parent, strategy);
    if (providers && providers.length) pdr.inject(providers);
    return pdr;
}

/**
 * create new invoked injector.
 * @param parent
 * @param strategy
 * @returns
 */
export function createInvokedProvider(parent: IProvider, providers: ProviderType[]) {
    if (!providers || !providers.length) return null;
    return new InvokedProvider(parent).inject(providers);
}


/**
 * injector default startegy.
 */
export const injectorStrategy = new DefaultStrategy(p => isInjector(p));

@Abstract()
export abstract class Injector extends Provider implements IInjector {

    constructor(readonly parent: IInjector, strategy: Strategy = injectorStrategy) {
        super(parent, strategy);
        const red = { value: this };
        this.factories.set(INJECTOR, red);
        this.factories.set(Injector, red);
    }

    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance.
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...ProviderType[]} providers
     * @returns {TR}
     * @memberof Injector
     */
    abstract invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    abstract getLoader(): IModuleLoader;

    /**
    * load modules.
    *
    * @param {LoadType[]} modules load modules.
    * @returns {Promise<Type[]>}  types loaded.
    */
    abstract load(modules: LoadType[]): Promise<Type[]>;
    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     */
    abstract load(...modules: LoadType[]): Promise<Type[]>;

    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(target: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        return this.resolve(target, providers);
    }

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    abstract getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
     */
    abstract getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider;

    protected createProvider(providers: ProviderType[]): IProvider {
        return createProvider(this, [{ provide: INJECTOR, useValue: this }, { provide: Injector, useValue: this }, ...providers]);
    }
}

/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is Injector {
    return target instanceof Injector;
}


/**
 * resove record.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function resolveRecord<T>(rd: FacRecord<T>, provider?: IProvider): T {
    if (!rd) return null;
    if (!isNil(rd.value)) return rd.value;
    if (rd.expires) {
        if ((rd.expires + rd.ltop) < Date.now()) {
            rd.ltop = Date.now();
            return rd.cache;
        }
        rd.expires = null;
        rd.cache = null;
        rd.ltop = null;
    }
    return rd.fn?.(provider) ?? null;
}

/**
 * generate record.
 * @param injector 
 * @param option 
 * @returns 
 */
export function generateRecord<T>(injector: IProvider, option: ProviderOption<T>): FacRecord<T> {
    const pd = option as ClassProvider & ValueProvider & ExistingProvider & FactoryProvider

    const rd: FacRecord = { type: pd.useClass };

    if (pd.useValue) {
        rd.value = pd.useValue;
        return rd;
    }

    if (pd.useFactory) {
        rd.fn = genFactory(injector, pd);
        return rd;
    }

    if (pd.useExisting) {
        const tk = pd.useExisting;
        rd.fn = (pdr: IProvider) => injector.get(tk, pdr);
        return rd;
    }

    if (pd.useClass) {
        rd.fn = genUseClass(injector, pd);
        return rd;
    }

    if (isFunction(pd.provide)) {
        rd.fn = genCtor(injector, pd.provide as Type, pd.deps);
    }
    return rd;
}


function genFactory(injector: IProvider, option: FactoryProvider): Factory {
    const { useFactory, deps } = option;
    return (pdr) => {
        let args = deps?.map(d => {
            if (isToken(d)) {
                return pdr?.get(d) ?? injector.get(d, pdr) ?? (isString(d) ? d : null);
            } else {
                return d;
            }
        }) ?? [];
        return useFactory(...args.concat(pdr));
    }
}

function genUseClass(injector: IProvider, option: ClassProvider): Factory {
    const { useClass, deps, singleton } = option;
    return (pdr) => {
        if (!injector.state().isRegistered(useClass) && !injector.has(useClass, true)) {
            injector.register({ type: useClass, singleton, deps });
        }
        return injector.get(useClass, pdr);
    }
}

function genCtor(injector: IProvider, ctor: Type, deps: any[]): Factory {
    return (pdr) => {
        let args = [];
        if (isArray(deps) && deps.length) {
            args = deps.map(p => {
                if (isToken(p)) {
                    return pdr?.get(p) ?? injector.get(p, pdr) ?? (isString(p) ? p : null);
                } else {
                    return p;
                }
            });
        }
        return new ctor(...args);
    };
}
