import { LoadType, Modules, Type } from './types';
import { Abstract } from './decor/decorators';
import { Destoryable } from './Destoryable';
import { MethodType } from './IMethodAccessor';
import { KeyValueProvider, StaticProviders } from './providers';
import { IInjector, IModuleLoader, IProvider, ResolveOption, ServiceOption, ServicesOption } from './IInjector';
import { FactoryLike, getTokenKey, Factory, InstFac, isToken, ProviderType, SymbolType, Token } from './tokens';
import { isArray, isPlainObject, isClass, isNil, isFunction, isNull, isString, isUndefined, getClass, isBoolean } from './utils/chk';
import { IContainer } from './IContainer';
import { getTypes } from './utils/lang';
import { Registered } from './decor/type';

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

    constructor(readonly parent: IProvider, readonly type?: string) {
        super();
        this.factories = new Map();
    }

    get size(): number {
        return this.factories.size;
    }

    getContainer(): IContainer {
        return this.parent?.getContainer()
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
        if (isPlainObject(provide)) {
            this.getContainer()?.registerIn(this, type, provide as any);
        } else {
            this.getContainer()?.registerIn(this, type, { provide, singleton });
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
                            if (isClass(d)) {
                                this.registerType(d);
                            }
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
        return this.hasTokenKey(getTokenKey(token, isString(alias) ? alias : ''), isBoolean(alias) ? alias : deep);
    }

    hasTokenKey<T>(key: SymbolType<T>, deep?: boolean): boolean {
        return this.factories.has(key) || (deep && this.parent?.hasTokenKey(key));
    }

    hasValue<T>(token: Token<T>): boolean {
        return !isNil(this.factories.get(getTokenKey(token))?.value);
    }

    getValue<T>(token: Token<T>): T {
        return this.factories.get(getTokenKey(token))?.value ?? null;
    }

    setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this {
        const key = getTokenKey(token);
        this.factories.set(key, { ...this.factories.get(key), value, provider });
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
        return this.getInstVia(key, null, true, ...providers);
    }

    protected getInstVia<T>(key: SymbolType<T>, ext: (...pdrs: ProviderType[]) => T, deep: boolean, ...providers: ProviderType[]): T {
        const pdr = this.factories.get(key);
        if (!pdr) {
            if (ext) {
                let inst = ext(...providers);
                if (!isNil(inst)) return inst;
            }
            return deep ? this.parent?.getInstance(key, ...providers) : null;
        }
        if (!isNil(pdr.value)) return pdr.value;
        if (pdr.expires) {
            if (pdr.expires > Date.now()) return pdr.cache;
            pdr.expires = null;
            pdr.cache = null;
        }
        return pdr.fac ? pdr.fac(...providers) ?? null : null;
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
        let tokenKey = getTokenKey(token);
        if (isClass(tokenKey)) return tokenKey;
        return this.factories.get(tokenKey)?.provider ?? this.parent?.getTokenProvider(tokenKey);
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
        if (this.has(key)) {
            this.factories.delete(key);
            if (isClass(key)) {
                let keys = [];
                this.delValue(key);
                keys.forEach(k => {
                    this.factories.delete(key);
                });
                const state = this.getContainer().regedState;
                if (state.getInjector<any>(key) === this) {
                    state.deleteType(key);
                }
            }
        }
        return this;
    }



    iterator(callbackfn: (fac: InstFac, key: SymbolType, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean {
        if (this.each(callbackfn)) {
            return false;
        }
        if (deep) {
            return this.parent?.iterator(callbackfn, deep);
        }
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

    protected each(callbackfn: (fac: InstFac, key: SymbolType, resolvor?: IProvider) => void | boolean) {
        const keys = Array.from(this.factories.keys());
        const values = Array.from(this.factories.values());
        if (Array.from(keys).some((tk, idx) => callbackfn(values[idx], tk, this) === false)) {
            return false;
        }
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
        this.factories = null;
    }
}

export function isProvider(target: any): target is Provider {
    return target instanceof Provider;
}

@Abstract()
export abstract class Injector extends Provider implements IInjector {

    constructor(readonly parent: IInjector) {
        super(parent, 'injector');
    }

    hasValue<T>(token: Token<T>): boolean {
        const key = getTokenKey(token);
        return !isNil(this.factories.get(key)?.value) || this.parent?.hasValue(key);
    }

    getValue<T>(token: Token<T>): T {
        const key = getTokenKey(token);
        return this.factories.get(key)?.value || this.parent?.getValue(key);
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
            const pdr = this.factories.get(provideKey);
            !reged && this.registerType(provider);
            if (reged && reged.provides.indexOf(provideKey) < 0) {
                reged.provides.push(provideKey);
            }
            this.factories.set(provideKey, { fac: (...pdrs) => this.getInstance(provider, ...pdrs), ...pdr, provider: provider });
        }
        return this;
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
    return target instanceof Injector && target.type === 'injector';
}


/**
 * invoked param provider.
 */
export class InvokedProvider extends Provider {
    constructor(readonly parent: IProvider) {
        super(parent, 'invoked');
    }
}

