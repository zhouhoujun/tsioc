import { LoadType, Modules, Type } from './types';
import { Abstract } from './decor/decorators';
import { MethodType } from './Invoker';
import { FactoryProvider, KeyValueProvider, StaticProviders } from './providers';
import {
    TypeOption, Factory, IActionProvider, IInjector, IModuleLoader, FacRecord, IProvider, ProviderType,
    RegisteredState, RegisterOption, ResolveOption, ServiceOption, ServicesOption, ProviderOption, FactoryOption
} from './IInjector';
import { isToken, Token, tokenRef } from './tokens';
import { isArray, isPlainObject, isClass, isNil, isFunction, isNull, isString, isUndefined, getClass, isDefined, isTypeObject } from './utils/chk';
import { IContainer } from './IContainer';
import { cleanObj, getTypes, remove } from './utils/lang';
import { INJECTOR, TARGET } from './utils/tk';
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
    set<T>(token: Token<T>, option: FactoryOption<T> | FacRecord<T>): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Factory<T>} fac
     * @param {Type<T>} [providerType]
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: Factory<T>, useClass?: Type<T>): this;
    set<T>(target: any, fac?: Factory<T> | FactoryOption<T> | FacRecord<T>, useClass?: Type<T>): this {
        if (fac) {
            if (isFunction(fac)) {
                const old = this.factories.get(target as Token);
                if (old) {
                    old.fac = fac;
                    if (useClass) old.useClass = useClass;
                } else {
                    this.factories.set(target as Token, useClass ? { fac, useClass } : { fac });
                }
            } else {
                this.factories.set(target, fac);
            }
        } else {
            this.factories.set((target as ProviderOption).provide, target);
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
    register(target: Type | Type[] | RegisterOption): this {
        if (isArray(target)) {
            target.forEach(t => this.regType(t));
        } else if (isFunction(target)) {
            this.regType(target);
        } else {
            if ((target as TypeOption).type) {
                this.registerIn(this, target as TypeOption);
            } else {
                this.factories.set(target.provide, { ...target as ProviderOption });
            }
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
        if (pd) {
            pd.cache = cache;
            pd.expires = expires;
        } else {
            this.factories.set(token, { cache, expires });
        }
        return this;
    }

    protected regType(type: Type) {
        this.registerIn(this, { type });
    }

    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this {
        return this.parse(providers);
    }

    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    parse(providers: ProviderType[]): this {
        providers.length && providers.forEach(p => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isArray(p)) {
                this.use(p);
            } else if (p instanceof Provider) {
                this.copy(p);
            } else if (isFunction(p)) {
                this.regType(p);
            } else if (p instanceof KeyValueProvider) {
                p.each((k, useValue) => {
                    this.factories.set(k, { useValue });
                });
            } else if (isPlainObject(p) && (p as StaticProviders).provide) {
                this.factories.set((p as StaticProviders).provide, { ...p as StaticProviders });
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
        return !isNil(this.factories.get(token)?.useValue) || (this.strategy.hasValue(token, this) ?? false);
    }

    // getValue<T>(token: Token<T>): T {
    //     return this.factories.get(token)?.useValue ?? this.strategy.getValue(token, this) ?? null;
    // }

    setValue<T>(token: Token<T>, useValue: T, useClass?: Type<T>): this {
        const isp = this.factories.get(token);
        if (isp) {
            isp.useValue = useValue;
            if (useClass) isp.useClass = useClass;
        } else if (isDefined(useValue)) {
            this.factories.set(token, useClass ? { useValue, useClass } : { useValue });
        }
        return this;
    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(string | ProviderType)} [alias]
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    get<T>(token: Token<T>, ...providers: ProviderType[]): T {
        return this.getInstance(token, this.toProvider(providers));
    }

    getInstance<T>(key: Token<T>, providers?: IProvider): T {
        return getStateValue(this, this.factories.get(key), providers) ?? this.strategy.getInstance(key, this, providers) ?? null;
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
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        let inst: T;
        let destroy: Function;
        if (isPlainObject(token)) {
            let option = token as ResolveOption;
            if (option.providers) {
                providers = option.providers.concat(providers);
            }
            if (option.target) {
                providers.push({ provide: TARGET, useValue: option.target });
            }
            const pdr = this.toProvider(providers, true, p => {
                destroy = () => p.destroy();
                return p;
            });
            inst = this.resolveStrategy(option, pdr);
            cleanObj(option);
        } else {
            const pdr = this.toProvider(providers, true, p => {
                destroy = () => p.destroy();
                return p;
            });
            inst = this.rsvToken(token, pdr);
        }

        destroy?.();
        return inst;
    }

    protected resolveStrategy<T>(option: ResolveOption<T>, pdr: IProvider) {
        const targetToken = isTypeObject(option.target) ? getClass(option.target) : option.target as Type;

        let inst: T;
        const state = this.state();
        if (isFunction(targetToken)) {
            inst = this.rsvWithTarget(state, option.token, targetToken, pdr);
        }

        if (option.tagOnly || isDefined(inst)) return inst ?? null;

        return this.rsvToken(option.token, pdr) ?? this.rsvFailed(state, option.token, pdr, option.regify, option.defaultToken) ?? null;
    }


    protected rsvWithTarget<T>(state: RegisteredState, token: Token<T>, targetToken: Type, pdr: IProvider): T {
        return state?.getTypeProvider(targetToken)?.get(token, pdr) ?? this.get(tokenRef(token, targetToken), pdr);
    }

    protected rsvToken<T>(token: Token<T>, pdr: IProvider): T {
        return pdr?.get(token, pdr) ?? this.get(token, pdr) ?? this.parent?.get(token, pdr);
    }

    protected rsvFailed<T>(state: RegisteredState, token: Token<T>, pdr: IProvider, regify?: boolean, defaultToken?: Token): T {
        if (regify && isFunction(token) && !state?.isRegistered(token)) {
            this.register(token as Type);
            return this.get(token, pdr);
        }
        if (defaultToken) {
            return this.get(defaultToken, pdr);
        }
        return null;
    }

    /**
     * register type class.
     * @param injector register in the injector.
     * @param option the type register option.
     * @param [singleton]
     */
    registerIn<T>(injector: IProvider, option: TypeOption<T>) {
        const state = injector.state();
        // make sure class register once.
        if (state.isRegistered(option.type) || injector.has(option.type, true)) {
            return this;
        }

        const ctx = {
            injector,
            ...option
        } as DesignContext;
        injector.action().getInstance(DesignLifeScope).register(ctx);
        cleanObj(ctx);

        return this;
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
        return this.factories.get(token)?.useClass ?? (this.factories.has(token) && isClass(token) ? token : null) ?? this.strategy.getTokenProvider(token, this);
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
    if (providers && providers.length) pdr.parse(providers);
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
    return new InvokedProvider(parent).parse(providers);
}


/**
 * injector default startegy.
 */
export const injectorStrategy = new DefaultStrategy(p => isInjector(p));

@Abstract()
export abstract class Injector extends Provider implements IInjector {

    constructor(readonly parent: IInjector, strategy: Strategy = injectorStrategy) {
        super(parent, strategy);
        const red = { useValue: this };
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
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    abstract getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T;

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

export function getStateValue<T>(injector: IProvider, pd: FacRecord<T>, provider?: IProvider): T {
    if (!pd) return null;
    if (!isNil(pd.useValue)) return pd.useValue;
    if (pd.expires) {
        if (pd.expires > Date.now()) return pd.cache;
        pd.expires = null;
        pd.cache = null;
    }

    if (!pd.fac && !pd._ged) {
        generateFac(injector, pd);
    }
    return pd.fac?.(provider) ?? null;
}

function getFactoryProviderValue(injector: IProvider, pd: FactoryProvider, provider: IProvider) {
    let args = pd.deps?.map(d => {
        if (isToken(d)) {
            return injector.getInstance(d, provider) ?? (isString(d) ? d : null);
        } else {
            return d;
        }
    }) ?? [];
    return pd.useFactory.apply(pd, args.concat(provider));
}

function generateFac(injector: IProvider, pd: FacRecord) {
    pd._ged = true;
    if (pd.useFactory) {
        pd.fac = (pdr: IProvider) => getFactoryProviderValue(injector, pd as FactoryProvider, pdr);
        return;
    }

    if (pd.useExisting) {
        pd.fac = (pdr: IProvider) => injector.getInstance(pd.useExisting, pdr);
        return;
    }

    if (pd.useClass) {
        if (!injector.state().isRegistered(pd.useClass) && !injector.has(pd.useClass, true)) {
            const rgopt = { type: pd.useClass, ...pd };
            rgopt.provide = undefined;
            injector.register(rgopt);
        }
        pd.fac = (pdr) => injector.getInstance(pd.useClass, pdr);
        return;
    }

    if (isClass(pd.provide)) {
        const Ctor = pd.provide;
        pd.fac = (pdr) => {
            let args = [];
            if (isArray(pd.deps) && pd.deps.length) {
                args = pd.deps.map(d => {
                    if (isToken(d)) {
                        return injector.getInstance(d, pdr) ?? (isString(d) ? d : null);
                    } else {
                        return d;
                    }
                });
            }
            return new Ctor(...args);
        };
        return;
    }
}
