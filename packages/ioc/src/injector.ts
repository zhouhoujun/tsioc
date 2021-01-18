import { LoadType, Modules, Type } from './types';
import { Abstract } from './decor/decorators';
import { Destoryable } from './Destoryable';
import { MethodType } from './IMethodAccessor';
import { KeyValueProvider, StaticProviders } from './providers';
import { IInjector, IModuleLoader, IProvider, ResolveOption, ServiceOption, ServicesOption } from './IInjector';
import { FactoryLike, getTokenKey, Factory, InstFac, isToken, ProviderType, SymbolType, Token } from './tokens';
import { isArray, isPlainObject, isClass, isNil, isFunction, isNull, isString, isUndefined, getClass, isBoolean } from './utils/chk';
import { IContainer } from './IContainer';
import { cleanObj, getTypes, mapEach } from './utils/lang';
import { Registered } from './decor/type';
import { PROVIDERS } from './utils/tk';


@Abstract()
export abstract class Strategy {

    /**
     * vaild parent.
     * @param parent 
     */
    abstract vaildParent(parent: IProvider): boolean;
    /**
     * has token or not.
     * @param key 
     * @param curr 
     * @param deep 
     */
    abstract hasTokenKey<T>(key: SymbolType<T>, curr: IProvider, deep?: boolean): boolean;
    /**
     * get instance.
     * @param key 
     * @param curr 
     * @param providers 
     */
    abstract getInstance<T>(key: SymbolType<T>, curr: IProvider, ...providers: ProviderType[]): T;
    /**
     * has value
     * @param key 
     * @param curr 
     */
    abstract hasValue<T>(key: SymbolType<T>, curr: IProvider): boolean;
    /**
     * get value
     * @param key 
     * @param curr 
     */
    abstract getValue<T>(key: SymbolType<T>, curr: IProvider): T;
    /**
     * get token provider.
     * @param key 
     * @param curr 
     */
    abstract getTokenProvider<T>(key: SymbolType<T>, curr: IProvider): Type<T>;
    /**
     * iterator.
     * @param map 
     * @param callbackfn 
     * @param curr 
     * @param deep 
     */
    abstract iterator(map: Map<SymbolType, InstFac>, callbackfn: (fac: InstFac, key: SymbolType, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean): void | boolean;

}

/**
 * default strategy.
 */
export class DefaultStrategy extends Strategy {
    constructor(private vaild: (parent: IProvider) => boolean) {
        super();
    }

    vaildParent(parent: IProvider) {
        return this.vaild(parent);
    }

    hasTokenKey<T>(key: SymbolType<T>, curr: IProvider, deep?: boolean) {
        return deep && curr.parent?.hasTokenKey(key);
    }

    getInstance<T>(key: SymbolType<T>, curr: IProvider, ...providers: ProviderType[]) {
        return curr.parent?.getInstance(key, ...providers);
    }

    hasValue<T>(key: SymbolType<T>, curr: IProvider) {
        return curr.parent?.hasValue(key);
    }

    getValue<T>(key: SymbolType<T>, curr: IProvider) {
        return curr.parent?.getValue(key);
    }

    getTokenProvider<T>(key: SymbolType<T>, curr: IProvider) {
        return curr.parent?.getTokenProvider(key);
    }

    iterator(map: Map<SymbolType, InstFac>, callbackfn: (fac: InstFac, key: SymbolType, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean) {
        if (mapEach(map, callbackfn, curr) === false) {
            return false;
        }
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }

}

/**
 * provider default strategy.
 */
const providerStrategy = new DefaultStrategy((p) => !(p instanceof Injector));

/**
 * provider container.
 *
 * @export
 * @class Provider
 * @extends {Destoryable}
 */
export class Provider extends Destoryable implements IProvider {
    /**
     * none poincut for aop.
     */
    static ρNPT = true;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<SymbolType, InstFac>;

    constructor(public parent?: IProvider, private strategy: Strategy = providerStrategy) {
        super();
        this.factories = new Map();
        if (parent && !strategy.vaildParent(parent)) {
            this._container = parent.getContainer();
            this.parent = null;
        }
    }

    get size(): number {
        return this.factories.size;
    }


    private _container: IContainer;
    getContainer(): IContainer {
        if (!this._container) {
            this._container = this.parent?.getContainer();
        }
        return this._container;
    }


    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {InstFac<T>} fac
     * @param {boolean} [replace] replace only.
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: InstFac<T>, replace?: boolean): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Factory<T>} fac
     * @param {Type<T>} [providerType]
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: Factory<T>, providerType?: Type<T>): this;
    set<T>(provide: Token<T>, fac: Factory<T> | InstFac<T>, pdOrRep?: Type<T> | boolean): this {
        let key = getTokenKey(provide);
        if (isFunction(fac)) {
            let provider = pdOrRep as Type;
            this.factories.set(key, { fac, provider });
        } else if (fac) {
            pdOrRep ? this.factories.set(key, fac) : this.factories.set(key, { ...this.factories.get(key), ...fac });
        }
        return this;
    }

    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    registerType<T>(type: Type<T>, options?: { provide?: Token<T>, singleton?: boolean, regIn?: 'root' }): this;
    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     * @returns {this}
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    registerType<T>(type: Type<T>, provide?: any, singleton?: boolean): this {
        if (!isClass(type)) return this;
        if (provide) {
            this.getContainer()?.registerIn(this, type, isPlainObject(provide) ? provide : { provide, singleton });
        } else {
            this.getContainer()?.registerIn(this, type);
        }
        return this;
    }

    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this {
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isArray(p)) {
                this.use(...p);
            } else if (p instanceof Provider) {
                this.copy(p);
            } else if (isClass(p)) {
                this.registerType(p);
            } else if (p instanceof KeyValueProvider) {
                p.each((k, value) => {
                    this.set(k, { value });
                });
            } else if (isPlainObject(p)) {
                let pr = p as StaticProviders;
                if (isToken(pr.provide)) {
                    let provide = getTokenKey(pr.provide);
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d)) this.registerType(d);
                        });
                    }
                    if (!isNil(pr.useValue)) {
                        let val = pr.useValue;
                        this.setValue(provide, val);
                    } else if (isClass(pr.useClass)) {
                        this.registerType(pr.useClass, pr.provide, pr.singleton);
                    } else if (isFunction(pr.useFactory)) {
                        let deps = pr.deps;
                        this.set(provide, (...pdrs: ProviderType[]) => {
                            let args = [];
                            if (isArray(deps) && deps.length) {
                                args = deps.map(d => {
                                    if (isToken(d)) {
                                        return this.get(d, ...pdrs);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args.concat(providers));
                        });
                    } else if (isToken(pr.useExisting)) {
                        this.set(provide, (...pdrs) => this.get(pr.useExisting, ...pdrs));
                    } else if (isClass(pr.provide)) {
                        let Ctor = pr.provide;
                        let deps = pr.deps;
                        this.set(provide, (...pdrs) => {
                            let args = [];
                            if (isArray(deps) && deps.length) {
                                args = deps.map(d => {
                                    if (isToken(d)) {
                                        return this.get(d, ...pdrs) ?? (isString(d) ? d : null);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return new Ctor(...args);
                        });
                    }
                }
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
    use(...modules: Modules[]): Type[] {
        let types = getTypes(...modules);
        types.forEach(ty => this.registerType(ty));
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
    has<T>(token: Token<T>, deep?: boolean): boolean;
    /**
     * has token in current injector.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias
     * @param {boolean} deep deep check in parent or not.
     * @returns {boolean}
     */
    has<T>(token: Token<T>, alias: string, deep?: boolean): boolean;
    /**
     *  has register token in current injector.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias.
     * @returns {boolean}
     */
    has<T>(token: Token<T>, alias?: string | boolean, deep?: boolean): boolean {
        return isString(alias) ? this.hasTokenKey(getTokenKey(token, alias), deep) : this.hasTokenKey(getTokenKey(token), alias);
    }

    hasTokenKey<T>(key: SymbolType<T>, deep?: boolean): boolean {
        return this.factories.has(key) || this.strategy.hasTokenKey(key, this, deep);
    }

    hasValue<T>(token: Token<T>): boolean {
        const key = getTokenKey(token);
        return !isNil(this.factories.get(key)?.value) || this.strategy.hasValue(key, this);
    }

    getValue<T>(token: Token<T>): T {
        const key = getTokenKey(token);
        return this.factories.get(key)?.value ?? this.strategy.getValue(key, this);
    }

    setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this {
        const key = getTokenKey(token);
        const fc = this.factories.get(key);
        if (fc) {
            fc.value = value;
            if (provider) fc.provider = provider;
        } else {
            this.factories.set(key, { value, provider });
        }
        return this;
    }

    delValue(token: Token) {
        const key = getTokenKey(token);
        const pdr = this.factories.get(key);
        if (!pdr) return;
        if (!pdr.fac) {
            this.factories.delete(key);
        } else {
            pdr.value = null;
        }
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
    get<T>(token: Token<T>, alias?: string | ProviderType, ...providers: ProviderType[]): T {
        let key;
        if (isString(alias)) {
            key = getTokenKey(token, alias);
        } else {
            key = getTokenKey(token);
            if (alias) {
                providers.unshift(alias);
            }
        }
        return this.getInstance(key, ...providers);
    }

    /**
     * get token instance in current injector or root container.
     * @param key token key.
     * @param providers providers.
     */
    getInstance<T>(key: SymbolType<T>, ...providers: ProviderType[]): T {
        return getFacInstance(this.factories.get(key), ...providers) ?? this.strategy.getInstance(key, this, ...providers);
    }



    /**
     * bind provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Type<T>} provider
     * @param {Registered} [reged]  provider registered state.
     * @returns {this}
     * @memberof Injector
     */
    bindProvider<T>(provide: Token<T>, provider: Type<T>, reged?: Registered): this {
        const provideKey = getTokenKey(provide);
        if (provideKey && isClass(provider)) {
            !reged && this.registerType(provider);
            if (reged && reged.provides.indexOf(provideKey) < 0) {
                reged.provides.push(provideKey);
            }
            const fac = reged ? (...pdrs) => reged.getInjector().getInstance(provider, ...pdrs) : (...pdrs) => this.getInstance(provider, ...pdrs);
            this.factories.set(provideKey, { fac, provider: provider });
        }
        return this;
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
        let key = getTokenKey(token);
        return this.factories.get(key)?.provider ?? (this.factories.has(key) && isClass(key) ? key : null) ?? this.strategy.getTokenProvider(key, this);
    }

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @param {ResoveWay} [resway]
     * @returns {this}
     * @memberof BaseInjector
     */
    unregister<T>(token: Token<T>): this {
        let key = getTokenKey(token);
        const inst = this.factories.get(key);
        if (inst) {
            this.factories.delete(key);
            const state = this.getContainer().regedState;
            const ptype = inst.provider ?? key as Type;
            const reged = state.getRegistered(ptype);
            if (reged.getInjector() as IProvider === this) {
                reged.provides.forEach(k => {
                    this.factories.delete(k);
                });
            }
            cleanObj(inst);
        }
        return this;
    }

    iterator(callbackfn: (fac: InstFac, key: SymbolType, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean {
        return this.strategy.iterator(this.factories, callbackfn, this, deep);
    }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} from
     * @returns
     * @memberof ProviderMap
     */
    copy(from: IProvider, filter?: (key: SymbolType) => boolean): this {
        if (!from) {
            return this;
        }
        this.merge(from as Provider, this, filter);
        return this;
    }

    clone(to?: IProvider): IProvider;
    clone(filter: (key: SymbolType) => boolean, to?: IProvider): IProvider;
    clone(filter?: any, to?: IProvider): IProvider {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (getClass(this))(this.parent);
        this.merge(this, to as Provider, filter);
        return to;
    }

    protected merge(from: Provider, to: Provider, filter?: (key: SymbolType) => boolean) {
        from.factories.forEach((pdr, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.factories.set(key, { ...pdr });
        });
    }

    protected destroying() {
        this.factories.clear();
        this.strategy = null;
        this.factories = null;
        this.parent = null;
        this._container = null;
    }
}

export function getFacInstance<T>(pd: InstFac<T>, ...providers: ProviderType[]): T {
    if (!pd) return null;
    if (!isNil(pd.value)) return pd.value;
    if (pd.expires) {
        if (pd.expires > Date.now()) return pd.cache;
        pd.expires = null;
        pd.cache = null;
    }
    return pd.fac ? pd.fac(...providers) ?? null : null;
}

/**
 * is target provider or not.
 * @param target 
 */
export function isProvider(target: any): target is Provider {
    return target instanceof Provider;
}

export function getProvider(injector: IInjector, ify?: boolean | ProviderType, ...providers: ProviderType[]) {
    let force = false;
    isBoolean(ify) ? force = ify : providers.unshift(ify);
    if (!force && !providers.length) return null;
    if (providers.length === 1 && isProvider(providers[0])) return providers[0];
    return injector.getContainer().get(PROVIDERS).inject(...providers);
}

/**
 * injector default strategy.
 */
const injectorStrategy = new DefaultStrategy((p) => p instanceof Injector);

@Abstract()
export abstract class Injector extends Provider implements IInjector {

    constructor(readonly parent: IInjector, strategy: Strategy = injectorStrategy) {
        super(parent, strategy);
    }

    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @returns {this}
     * @memberOf Injector
     */
    abstract register<T>(token: Token<T>, fac?: FactoryLike<T>): this;

    /**
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {FactoryLike<T>} [fac]
     * @returns {this}
     * @memberOf Injector
     */
    abstract registerSingleton<T>(token: Token<T>, fac?: FactoryLike<T>): this;

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Injector
     */
    use(...modules: Modules[]): Type[] {
        let types = getTypes(...modules);
        types.forEach(ty => this.registerType(ty));
        return types;
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
    abstract resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T;

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

    clone(to?: Injector): IInjector;
    clone(filter: (key: SymbolType) => boolean, to?: IInjector): IInjector;
    clone(filter?: any, to?: Injector): IInjector {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (getClass(this))(this.parent);
        this.merge(this, to as Injector, filter);
        return to;
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
 * invoked param provider.
 */
export class InvokedProvider extends Provider {
    constructor(parent?: IProvider) {
        super(parent);
    }
}

