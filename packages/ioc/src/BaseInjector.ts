import { IInjector, InjectorToken } from './IInjector';
import { Token, InstanceFactory, SymbolType, Factory, ToInstance, Type } from './types';
import { Registration } from './Registration';
import { ProviderTypes, ParamProviders, InjectTypes } from './providers/types';
import { isFunction, isUndefined, isNull, isClass, lang, isString, isBaseObject, isArray, isDefined, isObject } from './utils/lang';
import { isToken } from './utils/isToken';
import { IocCoreService } from './IocCoreService';
import { Provider, ParamProvider, ObjectMapProvider } from './providers/Provider';
import { IIocContainer, ContainerFactory } from './IIocContainer';
import { IocSingletonManager } from './actions/IocSingletonManager';
import { MethodAccessorToken } from './IMethodAccessor';
import { IParameter } from './IParameter';
import { ResolveActionOption, ResolveActionContext } from './actions/ResolveActionContext';
import { ActionRegisterer } from './actions/ActionRegisterer';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { IocCacheManager } from './actions/IocCacheManager';
import { InjectReference } from './InjectReference';


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

    /**
     * provide types.
     *
     * @protected
     * @type {Map<Token, Type>}
     * @memberof BaseInjector
     */
    protected provideTypes: Map<Token, Type>;


    constructor() {
        super();
        this.factories = new Map();
        this.provideTypes = new Map();
        this.init();
    }

    protected init() {
        this.bindProvider(IocSingletonManager, new IocSingletonManager(this));
        this.bindProvider(IocCacheManager, new IocCacheManager(this))
    }

    get size(): number {
        return this.factories.size;
    }

    keys(): SymbolType[] {
        return Array.from(this.factories.keys());
    }

    values(): InstanceFactory[] {
        return Array.from(this.factories.values());
    }


    /**
     *  get container factory.
     */
    abstract getFactory<T extends IIocContainer>(): ContainerFactory<T>;
    /**
     * get container.
     */
    abstract getContainer<T extends IIocContainer>(): T;
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
    /**
     * register value.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     * @returns {this}
     * @memberof BaseInjector
     */
    registerValue<T>(token: Token<T>, value: T): this {
        let key = this.getTokenKey(token);
        // if (!this.factories.has(key)) {
            this.factories.set(key, () => value);
        // }
        return this;
    }


    set<T>(provide: SymbolType<T>, fac: InstanceFactory<T>, providerType?: Type<T>): this {
        this.factories.set(provide, fac);
        providerType && this.provideTypes.set(provide, providerType);
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
    bindProvider<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this {
        let provideKey = this.getTokenKey(provide);
        let factory;
        if (isToken(provider)) {
            factory = (...providers: ParamProviders[]) => {
                return this.getInstance(this.getTokenKey(provider), ...providers);
            };
        } else {
            if (isFunction(provider)) {
                factory = (...providers: ParamProviders[]) => {
                    return (<ToInstance>provider)(this, ...providers);
                };
            } else {
                factory = () => {
                    return provider
                };
            }
        }
        if (isClass(provider)) {
            if (!this.has(provider)) {
                this.register(provider);
            }
            this.provideTypes.set(provideKey, provider);
        } else if (isToken(provider)) {
            let token = this.provideTypes.get(provider);
            if (isClass(token)) {
                this.provideTypes.set(provideKey, token);
            }
        }

        this.factories.set(provideKey, factory);
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

    bindTagProvider<T>(target: Token, ...providers: ProviderTypes[]): InjectReference<IInjector> {
        let refToken = new InjectReference(InjectorToken, target);
        if (this.has(refToken)) {
            this.get(refToken).inject(...providers);
        } else {
            this.bindProvider(refToken, this.getContainer().get(InjectorToken).inject(...providers));
        }
        return refToken;
    }

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
                if (!this.has(p)) {
                    this.register(p);
                }
            } else if (p instanceof ObjectMapProvider) {
                let pr = p.get();
                lang.forIn(pr, (val, name) => {
                    if (name && isString(name)) {
                        // object this can not resolve token. set all fileld as value factory.
                        this.factories.set(name, () => val);
                    }
                });

            } else if (isBaseObject(p)) {
                let pr: any = p;
                if (isToken(pr.provide)) {
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d) && !this.has(d)) {
                                this.register(d);
                            }
                        });
                    }
                    if (isDefined(pr.useValue)) {
                        this.factories.set(pr.provide, () => pr.useValue);
                    } else if (isClass(pr.useClass)) {
                        if (!this.has(pr.useClass)) {
                            this.register(pr.useClass);
                        }
                        this.factories.set(pr.provide, pr.useClass);
                        this.provideTypes.set(pr.provideKey, pr.useClass);
                    } else if (isFunction(pr.useFactory)) {
                        this.factories.set(pr.provide, (...providers: ProviderTypes[]) => {
                            let args = [];
                            if (isArray(pr.deps) && pr.deps.length) {
                                args = pr.deps.map(d => {
                                    if (isToken(d)) {
                                        return this.get(d, ...providers);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args.concat(providers));
                        });
                    } else if (isToken(pr.useExisting)) {
                        this.factories.set(pr.provide, (...providers: ProviderTypes[]) => this.get(pr.useExisting, ...providers));
                    }
                }
            }
        });

        return this;
    }

    hasTokenKey<T>(key: SymbolType<T>): boolean {
        return this.factories.has(key);
    }
    /**
     * has register the token or not.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {boolean}
     * @memberof BaseInjector
     */
    has<T>(token: Token<T>, alias?: string): boolean {
        return this.factories.has(this.getTokenKey(token, alias));
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
        let factory = this.factories.get(key);
        return factory ? factory(...providers) : null;
    }

    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveActionOption<T> | ResolveActionContext<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveActionOption<T> | ResolveActionContext<T>, ...providers: ProviderTypes[]): T {
        return this.getInstance(ActionRegisterer).get(ResolveLifeScope).resolve(token, ...providers);
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
        if (isClass(token)) {
            return token;
        }
        let tokenKey = this.getTokenKey(token);
        if (this.provideTypes.has(tokenKey)) {
            return this.provideTypes.get(tokenKey);
        }
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
            if (this.provideTypes.has(key)) {
                this.provideTypes.delete(key);
            }
            if (isClass(key)) {
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

    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IInjector) => void | boolean): void | boolean {
        return !Array.from(this.factories.keys()).some(tk => {
            if (isToken(tk)) {
                return callbackfn(this.factories.get(tk), tk, this) === false;
            }
            return false;
        });
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
        return this.get(MethodAccessorToken).invoke(this, target, propertyKey, ...providers);
    }

    invokedProvider(target: any, propertyKey: string): IInjector {
        return this.get(MethodAccessorToken).invokedProvider(target, propertyKey);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.get(MethodAccessorToken).createParams(this, params, ...providers);
    }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} injector
     * @returns
     * @memberof ProviderMap
     */
    copy(injector: BaseInjector): this {
        if (!injector) {
            return this;
        }
        this.mergeTo(injector, this);
        return this;
    }

    clone(to: BaseInjector): BaseInjector {
        this.mergeTo(this, to);
        return to;
    }

    protected mergeTo(from: BaseInjector, to: BaseInjector) {
        from.factories.forEach((fac, key) => {
            to.factories.set(key, fac);
        });
        from.provideTypes.forEach((fac, key) => {
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
    if (!isObject(target)) {
        return false;
    }
    return target instanceof BaseInjector;
}

