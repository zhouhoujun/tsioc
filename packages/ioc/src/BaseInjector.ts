import { IInjector, INJECTOR, PROVIDERS, InjectorProxyToken, InjectorProxy } from './IInjector';
import { Token, InstanceFactory, SymbolType, Factory, Type, Modules } from './types';
import { Registration } from './Registration';
import { ProviderTypes, ParamProviders, InjectTypes } from './providers/types';
import {
    isFunction, isUndefined, isNull, isClass, lang, isString,
    isBaseObject, isArray, isDefined, isClassType, isNullOrUndefined, ClassTypes
} from './utils/lang';
import { isToken } from './utils/isToken';
import { Provider, ParamProvider, ObjectMapProvider, StaticProviders } from './providers/Provider';
import { IIocContainer } from './IIocContainer';
import { MethodAccessorToken, MethodType } from './IMethodAccessor';
import { IParameter } from './IParameter';
import { ResolveOption } from './actions/ResolveContext';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { IocCacheManager } from './actions/IocCacheManager';
import { InjectReference } from './InjectReference';
import { ActionInjectorToken } from './actions/Action';
import { IocDestoryable } from './Destoryable';
import { TypeReflectsToken } from './services/ITypeReflects';


/**
 * Base Injector.
 *
 * @export
 * @abstract
 * @class BaseInjector
 * @implements {IInjector}
 */
export abstract class BaseInjector extends IocDestoryable implements IInjector {
    static d0CT: ClassTypes = 'injector';
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<SymbolType, InstanceFactory>;
    protected values: Map<SymbolType, any>;

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
        this.values = new Map();
        this.provideTypes = new Map();
        this.init();
    }

    protected init() {
        this.setValue(INJECTOR, this, lang.getClass(this));
        this.setValue(InjectorProxyToken, () => this);
        this.setValue(IocCacheManager, new IocCacheManager(this));
    }

    get size(): number {
        return this.factories.size + this.values.size;
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
     * register as singleton.
     * @param token token
     * @param value factory
     */
    abstract registerSingleton<T>(token: Token<T>, fac?: Factory<T>): this;

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

    setValue<T>(key: SymbolType<T>, value: T, provider?: Type<T>) {
        if (provider && isClass(provider)) {
            this.values.set(provider, value);
            this.values.set(key, value);
            this.provideTypes.set(key, provider);
        } else {
            this.values.set(key, value);
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
        return this.setValue(key, value, provider);
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
     * parse providers to new injector.
     * @param providers
     */
    protected abstract parse(...providers: InjectTypes[]): IInjector;


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
        return this.values.has(key) || this.factories.has(key);
    }

    abstract hasSingleton<T>(key: SymbolType<T>): boolean;
    abstract getSingleton<T>(key: SymbolType<T>): T;
    abstract setSingleton<T>(key: SymbolType<T>, value: T, provider?: Type<T>): this;

    hasValue<T>(key: SymbolType<T>): boolean {
        return this.values.has(key);
    }

    hasRegisterValue<T>(key: SymbolType<T>): boolean {
        return this.values.has(key) || this.hasValueInRoot(key);
    }

    protected hasInRoot(key: SymbolType): boolean {
        return false;
    }

    protected hasValueInRoot(key: SymbolType): boolean {
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
        return this.getSingleton(key) ?? this.getValue(key) ?? this.getTokenFactory(key)?.(...providers) ?? null;
    }

    getValue<T>(key: SymbolType<T>): T {
        return this.tryGetValue(key);
    }

    getFirstValue<T>(...keys: SymbolType<T>[]): T {
        let value: T;
        keys.some(k => {
            value = this.getValue(k);
            return !isNullOrUndefined(value);
        })
        return value;
    }

    protected tryGetValue<T>(key: SymbolType<T>): T {
        return this.values.get(key) ?? null;
    }

    protected tryGetValueInRoot<T>(key: SymbolType<T>): T {
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
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderTypes[]): T {
        return this.getValue(ActionInjectorToken).getInstance(ResolveLifeScope).resolve(this, token, ...providers);
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
            this.values.delete(key);
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

    protected destroying() {
        this.values.clear();
        this.factories.clear();
        this.provideTypes.clear();
        delete this.values;
        delete this.factories;
        delete this.provideTypes;
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
        let next = !Array.from(this.values.keys()).some(tk => {
            if (isToken(tk)) {
                return callbackfn(() => this.values.get(tk), tk, this) === false;
            }
            return false;
        });

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
     * @param {...ParamProviders[]} providers
     * @returns {TR}
     * @memberof BaseInjector
     */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ParamProviders[]): TR {
        return this.getInstance(MethodAccessorToken).invoke(this, target, propertyKey, ...providers);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.getInstance(MethodAccessorToken).createParams(this, params, ...providers);
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

    protected merge(from: BaseInjector, to: BaseInjector, filter?: (key: SymbolType) => boolean) {
        from.factories.forEach((fac, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.factories.set(key, fac);
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
}

