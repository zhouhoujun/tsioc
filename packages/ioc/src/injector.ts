import { LoadType, Modules, Type } from './types';
import { Abstract } from './decor/decorators';
import { MethodType } from './IMethodAccessor';
import { KeyValueProvider, StaticProviders } from './providers';
import { ClassRegister, IInjector, IModuleLoader, IProvider, ProviderOption, RegisterOption, ResolveOption, ServiceOption, ServicesOption, ValueRegister } from './IInjector';
import { FactoryLike, Factory, InstFac, isToken, ProviderType, Token, tokenRef } from './tokens';
import { isArray, isPlainObject, isClass, isNil, isFunction, isNull, isString, isUndefined, getClass, isBoolean, isTypeObject, isDefined } from './utils/chk';
import { IContainer } from './IContainer';
import { cleanObj, getTypes, mapEach } from './utils/lang';
import { Registered } from './decor/type';
import { INJECTOR, PROVIDERS } from './utils/tk';


@Abstract()
export abstract class Strategy {

    protected constructor() { }

    resolve<T>(curr: IProvider, option: ResolveOption<T>, toProvider: (...providers: ProviderType[]) => IProvider): T {
        let targetToken = isTypeObject(option.target) ? getClass(option.target) : option.target as Type;
        let pdr = toProvider(...option.providers || []);
        let inst: T;
        const regState = curr.getContainer().regedState;
        if (isFunction(targetToken)) {
            inst = regState.getTypeProvider(targetToken)?.get(option.token, pdr) ?? curr.get(tokenRef(option.token, targetToken), pdr);
        }

        if (option.tagOnly || isDefined(inst)) return inst ?? null;

        inst = pdr?.get(option.token, pdr) ?? curr.get(option.token, pdr) ?? curr.parent?.get(option.token, pdr);

        if (isDefined(inst)) return inst;

        if (option.regify && isFunction(option.token) && !regState.isRegistered(option.token)) {
            curr.register(option.token as Type);
            inst = curr.get(option.token, pdr);
        }
        if (isNil(inst) && option.defaultToken) {
            inst = curr.get(option.defaultToken, pdr);
        }
        return inst ?? null;
    }

    /**
     * vaild parent.
     * @param parent parent provider.
     */
    abstract vaildParent(parent: IProvider): boolean;
    /**
     * has token or not.
     * @param key token key.
     * @param curr current provider.
     * @param deep deep or not.
     */
    abstract hasToken<T>(key: Token<T>, curr: IProvider, deep?: boolean): boolean;
    /**
     * get instance.
     * @param key token key.
     * @param curr current provider.
     * @param providers providers
     */
    abstract getInstance<T>(key: Token<T>, curr: IProvider, ...providers: ProviderType[]): T;
    /**
     * has value
     * @param key token key.
     * @param curr current provider.
     */
    abstract hasValue<T>(key: Token<T>, curr: IProvider): boolean;
    /**
     * get value
     * @param key token key.
     * @param curr current provider.
     */
    abstract getValue<T>(key: Token<T>, curr: IProvider): T;
    /**
     * get token provider.
     * @param key token key.
     * @param curr current provider.
     */
    abstract getTokenProvider<T>(key: Token<T>, curr: IProvider): Type<T>;
    /**
     * iterator.
     * @param map the fac map.
     * @param callbackfn call back func.
     * @param curr current provider.
     * @param deep deep iterator or not.
     */
    abstract iterator(map: Map<Token, InstFac>, callbackfn: (fac: InstFac, key: Token, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean): void | boolean;

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

    hasToken<T>(key: Token<T>, curr: IProvider, deep?: boolean) {
        return deep && curr.parent?.has(key);
    }

    getInstance<T>(key: Token<T>, curr: IProvider, ...providers: ProviderType[]) {
        return curr.parent?.getInstance(key, ...providers);
    }

    hasValue<T>(key: Token<T>, curr: IProvider) {
        return curr.parent?.hasValue(key) ?? false;
    }

    getValue<T>(key: Token<T>, curr: IProvider) {
        return curr.parent?.getValue(key);
    }

    getTokenProvider<T>(key: Token<T>, curr: IProvider) {
        return curr.parent?.getTokenProvider(key);
    }

    iterator(map: Map<Token, InstFac>, callbackfn: (fac: InstFac, key: Token, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean) {
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
export class Provider implements IProvider {
    /**
     * none poincut for aop.
     */
    static ρNPT = true;

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<Token, InstFac>;

    constructor(public parent?: IProvider, protected strategy: Strategy = providerStrategy) {
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
        if (isFunction(fac)) {
            let provider = pdOrRep as Type;
            this.factories.set(provide, { fac, provider });
        } else if (fac) {
            pdOrRep ? this.factories.set(provide, fac) : this.factories.set(provide, { ...this.factories.get(provide), ...fac });
        }
        return this;
    }

    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    register<T>(type: Type<T>): this;
    /**
     * register with option.
     * @param options
     */
    register<T>(option: RegisterOption<T>): this;
    /**
     * register type class.
     * @param Type the class.
     * @param [provider] the class prodvider to.
     * @param [singleton]
     * @returns {this}
     */
    register<T>(token: Token<T>, provider: FactoryLike<T>, singleton?: boolean): this;
    register(token: any, provider?: any, singleton?: boolean): this {
        if (provider) {
            this.regToken(token, provider, singleton);
        } else {
            if (isFunction(token)) {
                this.regType(token);
            } else {
                if ((token as ClassRegister).useClass) {
                    this.regType((token as ClassRegister).useClass, token as ClassRegister);
                } else if ((token as ValueRegister).provide) {
                    this.setValue((token as ValueRegister).provide, (token as ValueRegister).useValue);
                }
            }
        }
        return this;
    }

    protected regType<T>(target: Type<T>, option?: ProviderOption) {
        this.getContainer()?.registerIn(this, target, option);
    }

    protected regToken<T>(token: Token<T>, provider: FactoryLike<T>, singleton?: boolean) {
        if (isClass(provider)) {
            this.getContainer()?.registerIn(this, provider, { provide: token, singleton });
        } else {
            const classFactory = this.createCustomFactory(token, provider, singleton);
            this.set(token, classFactory);
        }
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
                this.regType(p);
            } else if (p instanceof KeyValueProvider) {
                p.each((k, value) => {
                    this.set(k, { value });
                });
            } else if (isPlainObject(p)) {
                let pr = p as StaticProviders;
                if (pr.provide) {
                    let provide = pr.provide;
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d)) this.regType(d);
                        });
                    }
                    if (!isNil(pr.useValue)) {
                        let val = pr.useValue;
                        this.setValue(provide, val);
                    } else if (isClass(pr.useClass)) {
                        this.regType(pr.useClass, pr);
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

    getValue<T>(token: Token<T>): T {
        return this.factories.get(token)?.value ?? this.strategy.getValue(token, this) ?? null;
    }

    setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this {
        const isp = this.factories.get(token);
        if (isp) {
            isp.value = value;
            if (provider) isp.provider = provider;
        } else {
            this.factories.set(token, { value, provider });
        }
        return this;
    }

    delValue(token: Token) {
        const isp = this.factories.get(token);
        if (!isp) return;
        if (!isp.fac) {
            this.factories.delete(token);
        } else {
            isp.value = null;
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
    get<T>(token: Token<T>, ...providers: ProviderType[]): T {
        return this.getInstance(token, ...providers);
    }

    /**
     * get token instance in current injector or root container.
     * @param key token key.
     * @param providers providers.
     */
    getInstance<T>(key: Token<T>, ...providers: ProviderType[]): T {
        return getFacInstance(this.factories.get(key), ...providers) ?? this.strategy.getInstance(key, this, ...providers) ?? null;
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
        if (provide && provider) {
            !reged && this.register(provider);
            if (reged && reged.provides.indexOf(provide) < 0) {
                reged.provides.push(provide);
            }
            const fac = reged ? (...pdrs) => reged.injector.getInstance(provider, ...pdrs) : (...pdrs) => this.getInstance(provider, ...pdrs);
            this.factories.set(provide, { fac, provider: provider });
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
        return this.factories.get(token)?.provider ?? (this.factories.has(token) && isClass(token) ? token : null) ?? this.strategy.getTokenProvider(token, this);
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

    iterator(callbackfn: (fac: InstFac, key: Token, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean {
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
            this.destroyCbs.forEach(cb => cb());
            this.destroyCbs = [];
            this.destroying();
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }

    protected parse(...providers: ProviderType[]): IProvider {
        return this.getInstance(PROVIDERS).inject({ provide: INJECTOR, useValue: this }, { provide: Injector, useValue: this }, ...providers);
    }

    protected createCustomFactory<T>(key: Token<T>, factory?: Factory<T>, singleton?: boolean) {
        return singleton ?
            (...providers: ProviderType[]) => {
                if (this.hasValue(key)) {
                    return this.getValue(key);
                }
                let instance = factory(this.parse(...providers));
                this.setValue(key, instance);
                return instance;
            }
            : (...providers: ProviderType[]) => factory(this.parse(...providers));
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
 * @param target target
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
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Injector
     */
    use(...modules: Modules[]): Type[] {
        let types = getTypes(...modules);
        types.forEach(ty => this.register(ty));
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
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        let option: ResolveOption<T>;
        if (isPlainObject(token)) {
            option = token as ResolveOption;
            if (option.providers) {
                option.providers.push(...providers);
            } else {
                option.providers = providers;
            }
        } else {
            option = { token, providers };
        }
        let destroy: Function;
        const inst = this.strategy.resolve(this, option, (...pdrs) => {
            if (pdrs.length) {
                let pdr = getProvider(this, ...pdrs);
                if (pdr !== pdrs[0]) {
                    destroy = () => pdr.destroy();
                }
                return pdr;
            }
            return null;
        });
        destroy?.();
        cleanObj(option);
        return inst;
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
    clone(filter: (key: Token) => boolean, to?: IInjector): IInjector;
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

