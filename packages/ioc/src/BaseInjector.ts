import { Type, Modules } from './types';
import {
    isFunction, isUndefined, isNull, isClass, lang, isString,
    isBaseObject, isArray, isDefined, isClassType, isNullOrUndefined
} from './utils/lang';
import { StaticProviders } from './providers';
import {
    Token, InstanceFactory, SymbolType, Factory, Provider, InjectReference,
    isToken, Registration, getTokenKey
} from './tokens';

import { IInjector, InjectorProxy } from './IInjector';
import { IIocContainer } from './IIocContainer';
import { MethodType } from './IMethodAccessor';
import { Destoryable } from './Destoryable';
import { ActionInjectorToken } from './actions/act';
import { ResolveOption } from './actions/res';
import { ResolveLifeScope } from './actions/resolve';
import { IocCacheManager } from './actions/cache';
import { INJECTOR, PROVIDERS, INJECTOR_DL, METHOD_ACCESSOR, REGISTERED } from './utils/tk';
import { ParameterMetadata } from './decor/metadatas';

/**
 * Base Injector.
 *
 * @export
 * @abstract
 * @class BaseInjector
 * @implements {IInjector}
 */
export abstract class BaseInjector extends Destoryable implements IInjector {
    /**
     * none poincut for aop.
     */
    static ρNPT = true;
    /**
     * provide types.
     *
     * @protected
     * @type {Map<Token, Type>}
     * @memberof BaseInjector
     */
    protected provideTypes: Map<SymbolType, Type>;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<SymbolType, InstanceFactory>;
    /**
     * values map.
     *
     * @protected
     * @type {Map<SymbolType, any>}
     * @memberof BaseInjector
     */
    protected values: Map<SymbolType, any>;

    private rslScope: ResolveLifeScope;

    constructor() {
        super();
        this.init();
        this.initReg();
    }

    get size(): number {
        return this.factories.size + this.values.size;
    }

    getProxy(): InjectorProxy<this> {
        return this.getValue(INJECTOR_DL) as InjectorProxy<this>;
    }

    abstract getContainer(): IIocContainer;

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
        return getTokenKey(token, alias);
    }

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

    bindTagProvider(target: Token, ...providers: Provider[]): InjectReference<IInjector> {
        let refToken = new InjectReference(PROVIDERS, target);
        if (this.has(refToken)) {
            this.get(refToken).inject(...providers);
        } else {
            this.registerSingleton(refToken, this.get(PROVIDERS).inject(...providers));
        }
        return refToken;
    }

    /**
     * inject providers.
     *
     * @param {...Provider[]} providers
     * @returns {this}
     * @memberof BaseInjector
     */
    inject(...providers: Provider[]): this {
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isArray(p)) {
                this.injectModule(...p);
            } else if (p instanceof BaseInjector) {
                this.copy(p);
            } else if (isClass(p)) {
                this.registerType(p);
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
                        let deps = pr.deps;
                        this.factories.set(provide, (...providers: Provider[]) => {
                            let args = [];
                            if (isArray(deps) && deps.length) {
                                args = deps.map(d => {
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
                    } else if (isClass(pr.provide)) {
                        let Ctor = pr.provide;
                        let deps = pr.deps;
                        this.factories.set(provide, (...providers) => {
                            let args = [];
                            if (isArray(deps) && deps.length) {
                                args = deps.map(d => {
                                    if (isToken(d)) {
                                        return this.resolve(d, ...providers);
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
        return this.values.has(key) || this.factories.has(key);
    }

    hasValue<T>(token: Token<T>): boolean {
        return this.values.has(this.getTokenKey(token));
    }

    getValue<T>(token: Token<T>): T {
        return this.values.get(this.getTokenKey(token));
    }

    getFirstValue<T>(...tokens: Token<T>[]): T {
        let value: T;
        tokens.some(k => {
            value = this.getValue(k);
            return !isNullOrUndefined(value);
        })
        return value;
    }

    setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this {
        const key = this.getTokenKey(token);
        this.values.set(key, value);
        if (provider && isClass(provider)) {
            this.values.set(provider, value);
            this.provideTypes.set(key, provider);
        }
        return this;
    }

    delValue(token: Token) {
        this.values.delete(this.getTokenKey(token));
    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(string | Provider)} [alias]
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof BaseInjector
     */
    get<T>(token: Token<T>, alias?: string | Provider, ...providers: Provider[]): T {
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

    getInstance<T>(key: SymbolType<T>, ...providers: Provider[]): T {
        return this.getValue(key) ?? this.getTokenFactory(key)?.(...providers) ?? null;
    }

    getTokenFactory<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.factories.get(key) ?? null;
    }

    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: Provider[]): T {
        if (!this.rslScope) {
            this.rslScope = this.getValue(ActionInjectorToken).getInstance(ResolveLifeScope);
        }
        return this.rslScope.resolve(this, token, ...providers);
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
            this.provideTypes.delete(key);
            if (isClass(key)) {
                let keys = [];
                this.delValue(key);
                this.provideTypes.forEach((v, k) => {
                    if (v === key) {
                        keys.push(k);
                    }
                });
                keys.forEach(k => {
                    this.values.delete(key);
                    this.factories.delete(key);
                    this.provideTypes.delete(key);
                });
                this.clearCache(key);
                this.getContainer().getValue(REGISTERED).delete(key);
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
        let next = !Array.from(this.values.keys()).some(tk => isToken(tk) ? callbackfn(() => this.values.get(tk), tk, this) === false : false);
        return next ? !Array.from(this.factories.keys()).some(tk => {
            if (!this.values.has(tk) && isToken(tk)) {
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
     * @param {...Provider[]} providers
     * @returns {TR}
     * @memberof BaseInjector
     */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR {
        return this.getValue(METHOD_ACCESSOR).invoke(this, target, propertyKey, ...providers);
    }

    createParams(params: ParameterMetadata[], ...providers: Provider[]): any[] {
        return this.getValue(METHOD_ACCESSOR).createParams(this, params, ...providers);
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
        this.provideTypes = new Map();
        this.factories = new Map();
        this.values = new Map();
    }

    protected initReg() {
        this.setValue(INJECTOR, this, lang.getClass(this));
        this.setValue(INJECTOR_DL, () => this);
        this.setValue(IocCacheManager, new IocCacheManager(this));
    }

    /**
     * parse providers to new injector.
     * @param providers
     */
    protected abstract parse(...providers: Provider[]): IInjector;

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
        from.values.forEach((sgl, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.values.set(key, sgl);
        });
        from.provideTypes.forEach((fac, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.provideTypes.set(key, fac);
        });
    }

    protected destroying() {
        this.provideTypes.clear();
        this.values.clear();
        this.factories.clear();
        this.rslScope = null;
        this.provideTypes = null;
        this.factories = null;
        this.values = null;
    }
}


/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is IInjector {
    return target instanceof BaseInjector;
}

