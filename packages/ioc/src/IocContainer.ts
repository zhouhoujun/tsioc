import 'reflect-metadata';
import { IIocContainer, IocContainerToken } from './IIocContainer';
import { Type, Token, Factory, SymbolType, ToInstance, InstanceFactory } from './types';
import { isClass, isFunction, isSymbol, isToken, isString, isUndefined } from './utils';
import { Registration } from './Registration';

import { registerCores } from './registerCores';
import { InjectReference } from './InjectReference';
import { ParamProviders, ProviderMap, ProviderTypes, IProviderParser, ProviderParser } from './providers';
import { IResolver } from './IResolver';
import { IocCacheManager, MethodAccessor, RuntimeLifeScope, DesignLifeScope, IocSingletonManager, TypeReflects } from './services';
import { IParameter } from './IParameter';
import { RuntimeActionContext, DesignActionContext } from './actions';

/**
 * Container
 *
 * @export
 * @class IocContainer
 * @implements {IIocContainer}
 */
export class IocContainer implements IIocContainer {
    /**
     * provide types.
     *
     * @protected
     * @type {Map<Token<any>, Type<any>>}
     * @memberof Container
     */
    protected provideTypes: Map<Token<any>, Type<any>>;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token<any>, Function>}
     * @memberof Container
     */
    protected factories: Map<Token<any>, InstanceFactory<any>>;

    constructor() {
        this.init();
    }

    get size(): number {
        return this.factories.size;
    }


    getProviderParser(): IProviderParser {
        return this.get(ProviderParser);
    }

    getTypeReflects(): TypeReflects {
        return this.get(TypeReflects);
    }

    getSingletonManager(): IocSingletonManager {
        if (!this.has(IocSingletonManager)) {
            this.bindProvider(IocSingletonManager, new IocSingletonManager(this));
        }
        return this.get(IocSingletonManager);
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
        let key = this.getTokenKey(token, alias);
        return this.factories.has(this.getTokenKey(key));
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
            providers.unshift(alias);
        }

        let factory = this.factories.get(key);
        return factory ? factory(...providers) : null;
    }

    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} [notFoundValue]
     * @param {...ProviderTypes[]} providers
     * @memberof Container
     */
    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T {
        let factory = this.factories.get(this.getTokenKey(token));
        return factory ? factory(...providers) : null;
    }

    /**
     * iterator.
     *
     * @param {(tk: Token<any>, fac: InstanceFactory<any>) => void | boolean} callbackfn
     * @memberof IExports
     */
    iterator(callbackfn: (fac: InstanceFactory<any>, tk: Token<any>, resolvor?: IResolver) => void | boolean): void | boolean {
        return !Array.from(this.factories.keys()).some(tk => {
            return callbackfn(this.factories.get(tk), tk, this) === false;
        });
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

    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @returns {this}
     * @memberOf Container
     */
    register<T>(token: Token<T>, value?: Factory<T>): this {
        this.registerFactory(token, value);
        return this;
    }

    /**
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [value]
     * @returns {this}
     * @memberOf Container
     */
    registerSingleton<T>(token: Token<T>, value?: Factory<T>): this {
        this.registerFactory(token, value, true);
        return this;
    }

    /**
     * register value.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     * @returns {this}
     * @memberof Container
     */
    registerValue<T>(token: Token<T>, value: T): this {
        let key = this.getTokenKey(token);
        this.getSingletonManager().set(key, value);
        if (!this.factories.has(key)) {
            this.factories.set(key, () => {
                return this.getSingletonManager().get(key);
            });
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
     * @memberof Container
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this {
        let provideKey = this.getTokenKey(provide);
        let factory;
        if (isToken(provider)) {
            factory = (...providers: ParamProviders[]) => {
                return this.resolve(provider, ...providers);
            };
        } else {
            if (isFunction(provider)) {
                factory = (...providers: ParamProviders[]) => {
                    return (<ToInstance<any>>provider)(this, ...providers);
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
            let token = provider;
            while (this.provideTypes.has(token) && !isClass(token)) {
                token = this.provideTypes.get(token);
                if (isClass(token)) {
                    this.provideTypes.set(provideKey, token);
                    break;
                }
            }
        }

        this.factories.set(provideKey, factory);
        return this;
    }

    /**
     * bind providers for only target class.
     *
     * @param {Token<any>} target
     * @param {ParamProviders[]} providers
     * @param {(mapTokenKey: Token<any>) => void} [onceBinded]
     * @returns {this}
     * @memberof Container
     */
    bindProviders(target?: Token<any> | ProviderTypes, onceBinded?: ProviderTypes | ((mapTokenKey: Token<any>) => void), ...providers: ProviderTypes[]): this {
        let tgt: Token<any>;
        let complete: (mapTokenKey: Token<any>) => void;
        let prods: ProviderTypes[] = providers;

        if (isFunction(onceBinded)) {
            complete = onceBinded as (mapTokenKey: Token<any>) => void;
        } else if (onceBinded) {
            prods.unshift(onceBinded);
        }

        if (isToken(target)) {
            tgt = target;
        } else if (target) {
            tgt = null;
            prods.unshift(target);
        }

        let maps = this.getProviderParser().parse(...prods);
        if (tgt) {
            let refKey = new InjectReference(ProviderMap, isClass(tgt) ? tgt : this.getTokenProvider(tgt));
            if (this.has(refKey)) {
                this.resolve(refKey).copy(maps);
            } else {
                this.bindProvider(refKey, maps);
                complete && complete(refKey);
            }
        } else {
            maps.iterator((fac, key) => {
                isToken(key) && this.factories.set(key, (...prds) => maps.resolve(key, ...prds));
            })

        }
        return this;
    }

    /**
     * bind provider ref to target.
     *
     * @template T
     * @param {Token<any>} target
     * @param {Token<T>} provide
     * @param {(Token<T> | Factory<T>)} provider
     * @param {string} [alias]
     * @param {(refToken: Token<T>) => void} [onceBinded]
     * @returns {this}
     * @memberof Container
     */
    bindRefProvider<T>(target: Token<any>, provide: Token<T>, provider: Token<T> | Factory<T>, alias?: string, onceBinded?: (refToken: Token<T>) => void): this {
        let refToken = new InjectReference(this.getTokenKey(provide, alias), target);
        this.bindProvider(refToken, provider);
        onceBinded && onceBinded(refToken);
        return this;
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
            if (isClass(key)) {
                this.clearCache(key);
            }
        }
        return this;
    }

    /**
     * clear cache.
     *
     * @param {Type<any>} targetType
     * @memberof IContainer
     */
    clearCache(targetType: Type<any>) {
        this.get(IocCacheManager).destroy(targetType);
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
     * get token provider class type.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof Container
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

    protected init() {
        this.factories = new Map();
        this.provideTypes = new Map();
        this.bindProvider(IocContainerToken, () => this);
        registerCores(this);
    }

    protected registerFactory<T>(token: Token<T>, value?: Factory<T>, singleton?: boolean) {
        let key = this.getTokenKey(token);

        if (this.factories.has(key)) {
            return;
        }

        let classFactory;
        if (!isUndefined(value)) {
            if (isFunction(value)) {
                if (isClass(value)) {
                    this.bindTypeFactory(key, value as Type<T>, singleton);
                } else {
                    classFactory = this.createCustomFactory(key, value as ToInstance<T>, singleton);
                }
            } else if (singleton && value !== undefined) {
                classFactory = this.createCustomFactory(key, () => value, singleton);
            }

        } else if (!isString(token) && !isSymbol(token)) {
            let ClassT = (token instanceof Registration) ? token.getClass() : token;
            if (isClass(ClassT)) {
                this.bindTypeFactory(key, ClassT as Type<T>, singleton);
            }
        }

        if (classFactory) {
            this.factories.set(key, classFactory);
        }
    }

    protected createCustomFactory<T>(key: SymbolType<T>, factory?: ToInstance<T>, singleton?: boolean) {
        return singleton ?
            (...providers: ParamProviders[]) => {
                let mgr = this.getSingletonManager();
                if (mgr.has(key)) {
                    return mgr.get(key);
                }
                let instance = factory(this, ...providers);
                mgr.set(key, instance);
                return instance;
            }
            : (...providers: ParamProviders[]) => factory(this, ...providers);
    }

    protected bindTypeFactory<T>(key: SymbolType<T>, ClassT?: Type<T>, singleton?: boolean) {
        if (!Reflect.isExtensible(ClassT)) {
            return;
        }

        let factory = (...providers: ParamProviders[]) => {
            let providerMap = this.getProviderParser().parse(...providers);
            let ctx = RuntimeActionContext.parse({
                tokenKey: key,
                targetType: ClassT,
                singleton: singleton,
                providers: providers,
                providerMap: providerMap
            }, this);
            this.get(RuntimeLifeScope).register(ctx);
            return ctx.target;
        };

        this.factories.set(ClassT, factory);
        if (key !== ClassT) {
            this.bindProvider(key, ClassT);
        }

        this.get(DesignLifeScope).register(
            DesignActionContext.parse({
                tokenKey: key,
                targetType: ClassT
            }, this));
    }


    /**
     * invoke method async.
     *
     * @template T
     * @param {any} target
     * @param {string} propertyKey
     * @param {*} [instance]
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof Container
     */
    invoke<T>(target: any, propertyKey: string, instance?: any, ...providers: ParamProviders[]): Promise<T> {
        return this.get(MethodAccessor).invoke(this, target, propertyKey, instance, ...providers);
    }

    /**
     * invoke method.
     *
     * @template T
     * @param {any} target
     * @param {string} propertyKey
     * @param {*} [instance]
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof Container
     */
    syncInvoke<T>(target: Token<any>, propertyKey: string, instance?: any, ...providers: ParamProviders[]): T {
        return this.get(MethodAccessor).syncInvoke(this, target, propertyKey, instance, ...providers);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.get(MethodAccessor).createParams(this, params, ...providers);
    }
}
