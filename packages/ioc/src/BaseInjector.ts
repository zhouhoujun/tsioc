import { IInjector, INJECTOR, PROVIDERS, InjectorProxyToken, InjectorProxy } from './IInjector';
import { Token, InstanceFactory, SymbolType, Factory, Type, Modules } from './types';
import { ProviderTypes, ParamProviders, InjectTypes } from './providers/types';
import {
    isFunction, isUndefined, isNull, isClass, lang, isString,
    isBaseObject, isArray, isDefined, isClassType
} from './utils/lang';
import { isToken } from './utils/isToken';
import { Provider, ParamProvider, ObjectMapProvider, StaticProviders } from './providers/Provider';
import { IIocContainer } from './IIocContainer';
import { MethodAccessorToken, MethodType } from './IMethodAccessor';
import { IParameter } from './IParameter';
import { ResolveOption } from './actions/IocResolveAction';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { IocCacheManager } from './actions/IocCacheManager';
import { InjectReference } from './InjectReference';
import { ActionInjectorToken } from './actions/Action';
import { TypeReflectsToken } from './services/ITypeReflects';
import { ValueInjector } from './ValueInjector';


/**
 * Base Injector.
 *
 * @export
 * @abstract
 * @class BaseInjector
 * @implements {IInjector}
 */
export abstract class BaseInjector extends ValueInjector implements IInjector {
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<SymbolType, InstanceFactory>;
    /**
     * singleton map.
     *
     * @protected
     * @type {Map<SymbolType, any>}
     * @memberof BaseInjector
     */
    protected singletons: Map<SymbolType, any>;


    constructor() {
        super();
        this.initReg();
    }

    get size(): number {
        return this.factories.size + this.values.size + this.singletons.size;
    }

    getProxy(): InjectorProxy<this> {
        return this.getSingleton(InjectorProxyToken) as InjectorProxy<this>;
    }

    abstract getContainer(): IIocContainer;

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
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [fac]
     * @returns {this}
     * @memberOf Container
     */
    abstract registerSingleton<T>(token: Token<T>, fac?: Factory<T>): this;


    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    abstract registerType<T>(Type: Type<T>, provide?: Token<T>, singleton?: boolean): this;

    /**
     * set token factory.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {InstanceFactory<T>} fac
     * @param {Type<T>} [provider]
     * @returns {this}
     * @memberof BaseInjector
     */
    set<T>(provide: Token<T>, fac: InstanceFactory<T>, provider?: Type<T>): this {
        let key = this.getTokenKey(provide);
        if (isClass(provider)) {
            this.factories.set(provider, fac);
            if (key) {
                this.factories.set(key, (...providers) => this.getInstance(provider, ...providers));
                this.provideTypes.set(key, provider);
            }
        } else if (key) {
            this.factories.set(key, fac);
        }
        return this;
    }

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
            this.values.set(provideKey, provider);
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
        let refToken = new InjectReference(PROVIDERS, target);
        if (this.has(refToken)) {
            this.get(refToken).inject(...providers);
        } else {
            this.registerValue(refToken, this.get(PROVIDERS).inject(...providers));
        }
        return refToken;
    }

    /**
     * inject providers.
     *
     * @param {...InjectTypes[]} providers
     * @returns {this}
     * @memberof BaseInjector
     */
    inject(...providers: InjectTypes[]): this {
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isArray(p)) {
                this.injectModule(...p);
            } else if (p instanceof BaseInjector) {
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
                        this.values.set(name, val);
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
                        this.values.set(provide, val);
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
     * inject modules
     *
     * @param {...Modules[]} modules
     * @returns {Type[]} the class types in modules.
     * @memberof IInjector
     */
    injectModule(...modules: Modules[]): Type[] {
        let types = lang.getTypes(...modules);
        types.forEach(ty => this.registerType(ty));
        return types;
    }

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IInjector
     */
    use(...modules: Modules[]): this {
        this.injectModule(...modules);
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
     *  has register token in current injector.
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
        return this.singletons.has(key) || this.values.has(key) || this.factories.has(key);
    }

    hasSingleton<T>(key: SymbolType<T>): boolean {
        return this.singletons.has(key);
    }

    getSingleton<T>(key: SymbolType<T>): T {
        return this.singletons.get(key);
    }

    setSingleton<T>(key: SymbolType<T>, value: T, provider?: Type<T>): this {
        this.singletons.set(key, value);
        if (provider && isClass(provider)) {
            this.singletons.set(provider, value);
            this.provideTypes.set(key, provider);
        }
        return this;
    }

    delSingleton(key: SymbolType) {
        this.singletons.delete(key);
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
        return this.getSingleton(key) ?? this.getValue(key) ?? this.getTokenFactory(key)?.(...providers) ?? null;
    }

    getTokenFactory<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.factories.get(key) ?? null;
    }

    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderTypes[]): T {
        return this.getSingleton(ActionInjectorToken).getInstance(ResolveLifeScope).resolve(this, token, ...providers);
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
        return this.provideTypes.get(tokenKey) ?? (isClassType(tokenKey) ? tokenKey as Type<T> : null);
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
            this.values.delete(key);
            this.singletons.delete(key);
            this.provideTypes.delete(key);
            if (isClass(key)) {
                let keys = [];
                this.delSingleton(key);
                this.provideTypes.forEach((v, k) => {
                    if (v === key) {
                        keys.push(k);
                    }
                });
                keys.forEach(k => {
                    this.singletons.delete(key);
                    this.factories.delete(key);
                    this.provideTypes.delete(key);
                });
                this.clearCache(key);
                this.getSingleton(TypeReflectsToken).delete(key);
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

    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean {
        let next = !Array.from(this.singletons.keys()).some(tk => isToken(tk) ? callbackfn(() => this.singletons.get(tk), tk, this) === false : false);
        if (!next) {
            next = !Array.from(this.values.keys()).some(tk => isToken(tk) ? callbackfn(() => this.values.get(tk), tk, this) === false : false);
        }
        return next ? !Array.from(this.factories.keys()).some(tk => {
            if (!this.singletons.has(tk) && !this.values.has(tk) && isToken(tk)) {
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
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...ParamProviders[]} providers
     * @returns {TR}
     * @memberof BaseInjector
     */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ParamProviders[]): TR {
        return this.getSingleton(MethodAccessorToken).invoke(this, target, propertyKey, ...providers);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.getSingleton(MethodAccessorToken).createParams(this, params, ...providers);
    }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} injector
     * @returns
     * @memberof ProviderMap
     */
    copy(injector: IInjector, filter?: (key: SymbolType) => boolean): this {
        if (!injector) {
            return this;
        }
        this.merge(injector as BaseInjector, this, filter);
        return this;
    }

    clone(to?: IInjector): IInjector;
    clone(filter: (key: SymbolType) => boolean, to?: IInjector): IInjector;
    clone(filter?: any, to?: IInjector): IInjector {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (lang.getClass(this))(this.getContainer().getProxy());
        this.merge(this, to as BaseInjector, filter);
        return to;
    }

    protected init() {
        super.init();
        this.factories = new Map();
        this.singletons = new Map();
    }

    protected initReg() {
        this.setSingleton(INJECTOR, this, lang.getClass(this));
        this.setSingleton(InjectorProxyToken, () => this);
        this.setSingleton(IocCacheManager, new IocCacheManager(this));
    }

    /**
     * parse providers to new injector.
     * @param providers
     */
    protected abstract parse(...providers: InjectTypes[]): IInjector;

    protected hasInRoot(key: SymbolType): boolean {
        return false;
    }


    protected merge(from: BaseInjector, to: BaseInjector, filter?: (key: SymbolType) => boolean) {
        from.factories.forEach((fac, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.factories.set(key, fac);
        });
        from.singletons.forEach((sgl, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.singletons.set(key, sgl);
        });
        from.values.forEach((val, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.values.set(key, val);
        });
        from.provideTypes.forEach((fac, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.provideTypes.set(key, fac);
        });
    }

    protected destroying() {
        super.destroying();
        this.singletons.clear();
        delete this.singletons;
        this.factories.clear();
        delete this.factories;
    }
}

