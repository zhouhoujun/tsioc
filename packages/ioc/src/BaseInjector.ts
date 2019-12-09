import { IInjector } from './IInjector';
import { Token, InstanceFactory, SymbolType, Factory, ToInstance, Type } from './types';
import { Registration } from './Registration';
import { ProviderTypes, ParamProviders, InjectTypes } from './providers/types';
import { isFunction, isUndefined, isNull, isClass, lang, isString, isBaseObject, isArray, isDefined, isObject } from './utils/lang';
import { isToken } from './utils/isToken';
import { IocCoreService } from './IocCoreService';
import { Provider, ParamProvider, ObjectMapProvider } from './providers/Provider';
import { IIocContainer, ContainerFactory } from './IIocContainer';
import { IocSingletonManager } from './actions/IocSingletonManager';


/**
 * resolver.
 *
 * @export
 * @abstract
 * @class Resolver
 * @implements {IResolver}
 */
export abstract class BaseInjector extends IocCoreService implements IInjector {
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof Container
     */
    protected factories: Map<Token, InstanceFactory>;

    /**
     * provide types.
     *
     * @protected
     * @type {Map<Token, Type>}
     * @memberof Container
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
    }

    get size(): number {
        return this.factories.size;
    }

    /**
     *  get factory.
     */
    abstract getFactory<T extends IIocContainer>(): ContainerFactory<T>;
    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @returns {this}
     * @memberOf Container
     */
    abstract register<T>(token: Token<T>, value?: Factory<T>): this;

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
     * @memberof Container
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

    inject(...providers: InjectTypes[]): this {
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (p instanceof BaseInjector) {
                this.copy(p);
            } else if (p instanceof Provider) {
                if (p instanceof ParamProvider) {
                    this.factories.set(p.getToken(), (...providers: ParamProviders[]) => p.resolve(this, ...providers));
                } else {
                    this.factories.set(p.type, (...providers: ParamProviders[]) => p.resolve(this, ...providers));
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
     * @memberof Container
     */
    has<T>(token: Token<T>, alias?: string): boolean {
        return this.factories.has(this.getTokenKey(token, alias));
    }

    /**
     * get token factory resolve instace in current container.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(string | ProviderTypes)} [alias]
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof Container
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
     * @memberof Container
     */
    unregister<T>(token: Token<T>): this {
        let key = this.getTokenKey(token);
        if (this.has(key)) {
            this.factories.delete(key);
            if (this.provideTypes.has(key)) {
                this.provideTypes.delete(key);
            }
        }
        return this;
    }

    /**
     * get token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof Container
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
     * @memberof Container
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
export function isInjector(target: object): target is BaseInjector {
    if (!isObject(target)) {
        return false;
    }
    return target instanceof BaseInjector;
}

