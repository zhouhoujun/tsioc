import { IInjector, INJECTOR, PROVIDERS, InjectorProxyToken, InjectorProxy } from './IInjector';
import { Token, InstanceFactory, SymbolType, Factory, Type } from './types';
import { Registration } from './Registration';
import { ProviderTypes, ParamProviders, InjectTypes } from './providers/types';
import { isFunction, isUndefined, isNull, isClass, lang, isString, isBaseObject, isArray, isDefined, isClassType } from './utils/lang';
import { isToken } from './utils/isToken';
import { IocCoreService } from './IocCoreService';
import { Provider, ParamProvider, ObjectMapProvider, StaticProviders } from './providers/Provider';
import { IIocContainer, ContainerProxy } from './IIocContainer';
import { MethodAccessorToken, IMethodAccessor } from './IMethodAccessor';
import { IParameter } from './IParameter';
import { ResolveActionOption } from './actions/ResolveActionContext';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { IocCacheManager } from './actions/IocCacheManager';
import { InjectReference } from './InjectReference';
import { ActionInjectorToken, IActionInjector } from './actions/Action';


const MethodAccessorKey = MethodAccessorToken.toString();
const ActionInjectorKey = ActionInjectorToken.toString();
/**
 * Base Injector.
 *
 * @export
 * @abstract
 * @class BaseInjector
 * @implements {IInjector}
 */
export abstract class BaseInjector extends IocCoreService implements IInjector {
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<SymbolType, InstanceFactory>;
    protected singletons: Map<SymbolType, any>;

    /**
     * provide types.
     *
     * @protected
     * @type {Map<Token, Type>}
     * @memberof BaseInjector
     */
    protected provideTypes: Map<SymbolType, Type>;


    constructor() {
        super();
        this.factories = new Map();
        this.singletons = new Map();
        this.provideTypes = new Map();
        this.init();
    }

    protected init() {
        this.registerValue(INJECTOR, this, lang.getClass(this));
        this.registerValue(InjectorProxyToken, () => this);
        this.registerValue(IocCacheManager, new IocCacheManager(this));
    }

    get size(): number {
        return this.factories.size;
    }


    getProxy(): InjectorProxy<IInjector> {
        return this.get(InjectorProxyToken);
    }

    abstract getContainer(): IIocContainer;

    /**
     *  get container factory.
     */
    abstract getContainerProxy<T extends IIocContainer>(): ContainerProxy<T>;

    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @returns {this}
     * @memberOf BaseInjector
     */
    abstract register<T>(token: Token<T>, fac?: Factory<T>): this;

    /**
     * register as singleton.
     * @param token token
     * @param value factory
     */
    abstract registerSingleton<T>(token: Token<T>, fac?: Factory<T>): this;

    set<T>(provide: Token<T>, fac: InstanceFactory<T>, provider?: Type<T>): this {
        let key = this.getTokenKey(provide);
        if (isClass(provider)) {
            this.factories.set(provider, fac);
            this.factories.set(key, (...providers) => this.getInstance(provider, ...providers));
            this.provideTypes.set(key, provider);
        } else {
            this.factories.set(key, fac);
        }
        return this;
    }

    /**
     * register value.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     * @returns {this}
     * @memberof BaseInjector
     */
    registerValue<T>(token: Token<T>, value: T, provider?: Type<T>): this {
        let key = this.getTokenKey(token);
        if (isClass(provider)) {
            this.singletons.set(provider, value);
            this.singletons.set(key, value);
            this.provideTypes.set(key, provider);
        } else {
            this.singletons.set(key, value);
        }
        return this;
    }

    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    abstract registerType<T>(Type: Type<T>, provide?: Token<T>, singleton?: boolean): this;

    /**
     * bind provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T>} provider
     * @returns {this}
     * @memberof BaseInjector
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T> | T): this {
        let provideKey = this.getTokenKey(provide);
        if (!provideKey) {
            return this;
        }
        if (isToken(provider)) {
            let ptk = this.getTokenKey(provider);
            let type = this.getTokenProvider(ptk);
            if (isClass(type)) {
                this.registerType(type);
                this.provideTypes.set(provideKey, type);
            }
            this.factories.set(provideKey, (...providers) => this.getInstance(ptk, ...providers));

        } else {
            this.singletons.set(provideKey, provider);
        }
        return this;
    }

    /**
     *  bind provider ref to target.
     * @param target the target, provide ref to.
     * @param provide provide token.
     * @param provider provider factory or token.
     * @param alias alias.
     */
    bindRefProvider<T>(target: Token, provide: Token<T>, provider: Token<T> | Factory<T>, alias?: string): InjectReference<T> {
        let refToken = new InjectReference(this.getTokenKey(provide, alias), target);
        this.bindProvider(refToken, provider);
        return refToken;
    }

    bindTagProvider<T>(target: Token, ...providers: InjectTypes[]): InjectReference<IInjector> {
        let refToken = new InjectReference(INJECTOR, target);
        if (this.has(refToken)) {
            this.get(refToken).inject(...providers);
        } else {
            this.registerValue(refToken, this.get(PROVIDERS).inject(...providers));
        }
        return refToken;
    }

    /**
     * parse providers to new injector.
     * @param providers
     */
    protected abstract parse(...providers: InjectTypes[]): IInjector;

    inject(...providers: InjectTypes[]): this {
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (p instanceof BaseInjector) {
                this.copy(p);
            } else if (p instanceof Provider) {
                if (p instanceof ParamProvider) {
                    this.factories.set(this.getTokenKey(p.getToken()), (...providers: ParamProviders[]) => p.resolve(this, ...providers));
                } else {
                    this.factories.set(this.getTokenKey(p.type), (...providers: ParamProviders[]) => p.resolve(this, ...providers));
                }
            } else if (isClass(p)) {
                this.registerType(p);
            } else if (p instanceof ObjectMapProvider) {
                let pr = p.get();
                lang.forIn(pr, (val, name) => {
                    if (name && isString(name)) {
                        // object this can not resolve token. set all fileld as value factory.
                        this.singletons.set(name, val);
                    }
                });

            } else if (isBaseObject(p)) {
                let pr = p as StaticProviders;
                if (isToken(pr.provide)) {
                    let provide = this.getTokenKey(pr.provide);
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d)) {
                                this.registerType(d);
                            }
                        });
                    }
                    if (isDefined(pr.useValue)) {
                        let val = pr.useValue;
                        this.singletons.set(provide, val);
                    } else if (isClass(pr.useClass)) {
                        this.registerType(pr.useClass, pr.provide, pr.singleton);
                    } else if (isFunction(pr.useFactory)) {
                        this.factories.set(provide, (...providers: ProviderTypes[]) => {
                            let args = [];
                            if (isArray(pr.deps) && pr.deps.length) {
                                args = pr.deps.map(d => {
                                    if (isToken(d)) {
                                        return this.resolve(d, ...providers);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args.concat(providers));
                        });
                    } else if (isToken(pr.useExisting)) {
                        this.factories.set(provide, (...providers) => this.resolve(pr.useExisting, ...providers));
                    }
                }
            }
        });

        return this;
    }

    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(token: Token<T>): boolean;
    /**
     *  has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias.
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(token: Token<T>, alias: string): boolean;
    /**
     *  has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias.
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(token: Token<T>, alias?: string): boolean {
        return this.hasTokenKey(this.getTokenKey(token, alias));
    }
    /**
     * has register.
     * @param token the token
     * @param alias addtion alias
     */
    hasRegister<T>(token: Token<T>, alias?: string): boolean {
        let key = this.getTokenKey(token, alias);
        return this.hasTokenKey(key) || this.hasInRoot(key);
    }

    hasTokenKey<T>(key: SymbolType<T>): boolean {
        return this.factories.has(key) || this.singletons.has(key);
    }

    hasSingleton<T>(key: SymbolType<T>): boolean {
        return this.singletons.has(key) || this.hasSingletonInRoot(key);
    }

    protected hasInRoot(key: SymbolType): boolean {
        return false;
    }

    protected hasSingletonInRoot(key: SymbolType): boolean {
        return false;
    }
    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(string | ProviderTypes)} [alias]
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof BaseInjector
     */
    get<T>(token: Token<T>, alias?: string | ProviderTypes, ...providers: ProviderTypes[]): T {
        let key;
        if (isString(alias)) {
            key = this.getTokenKey(token, alias);
        } else {
            key = this.getTokenKey(token);
            if (alias) {
                providers.unshift(alias);
            }
        }
        return this.getInstance(key, ...providers);
    }

    getInstance<T>(key: SymbolType<T>, ...providers: ProviderTypes[]): T {
        return this.getSingleton(key) ?? this.getTokenFactory(key)?.(...providers) ?? null;
    }

    getSingleton<T>(key: SymbolType<T>): T {
        return this.tryGetSingleton(key) ?? this.tryGetSingletonInRoot(key);
    }

    protected tryGetSingleton<T>(key: SymbolType<T>): T {
        return this.singletons.has(key) ? this.singletons.get(key) : null;
    }

    protected tryGetSingletonInRoot<T>(key: SymbolType<T>): T {
        return null;
    }

    getTokenFactory<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.tryGetFactory(key) ?? this.tryGetFactoryInRoot(key);
    }

    protected tryGetFactory<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.factories.has(key) ? this.factories.get(key) : null;
    }

    protected tryGetFactoryInRoot<T>(key: SymbolType<T>): InstanceFactory<T> {
        return null;
    }

    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveActionOption<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveActionOption<T>, ...providers: ProviderTypes[]): T {
        return this.getInstance<IActionInjector>(ActionInjectorKey).get(ResolveLifeScope).resolve(this, token, ...providers);
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
        let tokenKey = this.getTokenKey(token);
        return this.tryGetTokenProvidider(tokenKey) ?? this.tryGetTokenProviderInRoot(tokenKey) ?? (isClassType(tokenKey) ? tokenKey as Type<T> : null);
    }

    protected tryGetTokenProvidider<T>(tokenKey: SymbolType<T>): Type<T> {
        if (this.provideTypes.has(tokenKey)) {
            return this.provideTypes.get(tokenKey);
        }
    }

    protected tryGetTokenProviderInRoot<T>(tokenKey: SymbolType<T>): Type<T> {
        return null;
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
        let key = this.getTokenKey(token);
        if (this.has(key)) {
            this.factories.delete(key);
            this.singletons.delete(key);
            this.provideTypes.delete(key);
            if (isClass(key)) {
                let keys = [];
                this.provideTypes.forEach((v, k) => {
                    if (v === key) {
                        keys.push(k);
                    }
                });
                keys.forEach(k => {
                    this.provideTypes.delete(k);
                    this.factories.delete(k);
                });
                this.clearCache(key);
            }
        }
        return this;
    }

    /**
     * clear cache.
     *
     * @param {Type} targetType
     * @memberof BaseInjector
     */
    clearCache(targetType: Type) {
        this.getInstance(IocCacheManager).destroy(targetType);
        return this;
    }

    clear() {
        this.factories.clear();
        this.provideTypes.clear();
    }

    /**
     * get token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof BaseInjector
     */
    getToken<T>(token: Token<T>, alias?: string): Token<T> {
        if (alias) {
            return new Registration(token, alias);
        }
        return token;
    }


    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {SymbolType<T>}
     * @memberof BaseInjector
     */
    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        if (alias) {
            return new Registration(token, alias).toString();
        } else if (token instanceof Registration) {
            return token.toString();
        }
        return token;
    }

    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean {
        let next = !Array.from(this.singletons.keys()).some(tk => {
            if (isToken(tk)) {
                return callbackfn(() => this.singletons.get(tk), tk, this) === false;
            }
            return false;
        });

        return next ? !Array.from(this.factories.keys()).some(tk => {
            if (!this.singletons.has(tk) && isToken(tk)) {
                return callbackfn(this.factories.get(tk), tk, this) === false;
            }
            return false;
        }) : false;
    }

    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance
     * @param {string} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...ParamProviders[]} providers
     * @returns {TR}
     * @memberof BaseInjector
     */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: string | ((tag: T) => Function), ...providers: ParamProviders[]): TR {
        return this.getInstance<IMethodAccessor>(MethodAccessorKey).invoke(this, target, propertyKey, ...providers);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.getInstance<IMethodAccessor>(MethodAccessorKey).createParams(this, params, ...providers);
    }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} injector
     * @returns
     * @memberof ProviderMap
     */
    copy(injector: IInjector, filter?: (key: Token) => boolean): this {
        if (!injector) {
            return this;
        }
        this.mergeInjector(injector as BaseInjector, this, filter);
        return this;
    }

    clone(to?: IInjector): IInjector;
    clone(filter: (key: Token) => boolean, to?: IInjector): IInjector;
    clone(filter?: any, to?: IInjector): IInjector {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (lang.getClass(this))(this.getContainerProxy());
        this.mergeInjector(this, to as BaseInjector, filter);
        return to;
    }

    protected mergeInjector(from: BaseInjector, to: BaseInjector, filter?: (key: Token) => boolean) {
        from.factories.forEach((fac, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.factories.set(key, fac);
        });
        from.singletons.forEach((val, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.singletons.set(key, val);
        });
        from.provideTypes.forEach((fac, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.provideTypes.set(key, fac);
        });
    }
}

/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is BaseInjector {
    return target instanceof BaseInjector;
}

