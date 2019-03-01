import 'reflect-metadata';
import { IIocContainer, IocContainerToken } from './IIocContainer';
import { Type, Token, Factory, SymbolType, IocState, ToInstance, InstanceFactory } from './types';
import { isClass, isFunction, isSymbol, isToken, isString, isUndefined } from './utils';
import { Registration } from './Registration';

import { registerCores } from './registerCores';
import { InjectReference } from './InjectReference';
import { ParamProviders, ProviderMap, ProviderTypes, IProviderParser, ProviderParser } from './providers';
import { IResolver } from './IResolver';
import { CacheManager, MethodAccessor } from './services';
import { IParameter } from './IParameter';

/**
 * singleton reg token.
 */
const SingletonRegToken = '___IOC__Singleton___';

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

    private parser: IProviderParser;
    getProviderParser(): IProviderParser {
        if (!this.parser) {
            this.parser = this.resolve(ProviderParser)
        }
        return this.parser;
    }

    /**
     * has register the token or not.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {boolean}
     * @memberof Container
     */
    has<T>(token: Token<T>, aliasOrway?: string): boolean {
        return this.has(token, aliasOrway);
    }

    /**
     * has register type.
     *
     * @template T
     * @param {Token<T>} key
     * @returns
     * @memberof Container
     */
    hasRegister<T>(key: Token<T>): boolean {
        return this.factories.has(this.getTokenKey(key));
    }

    /**
     * Retrieves an instance from the container based on the provided token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof Container
     */
    get<T>(token: Token<T>, alias?: string, ...providers: ParamProviders[]): T {
        return this.resolve(alias ? this.getTokenKey<T>(token, alias) : token, ...providers);
    }

    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} [notFoundValue]
     * @param {...ParamProviders[]} providers
     * @memberof Container
     */
    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let key = this.getTokenKey<T>(token);
        if (!this.hasRegister(key)) {
            return null;
        }
        let factory = this.factories.get(key);
        return factory(...providers) as T;
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
        this.getSingleton().set(key, value);
        if (!this.factories.has(key)) {
            this.factories.set(key, () => {
                return this.getSingleton().get(key);
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
            if (this.hasRegister(refKey)) {
                this.resolve(refKey).copy(maps);
            } else {
                this.bindProvider(refKey, maps);
                complete && complete(refKey);
            }
        } else {
            maps.forEach((fac, key) => {
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
        if (this.hasRegister(key)) {
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
        this.resolve(CacheManager).destroy(this, targetType);
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

    protected getSingleton(): Map<Token<any>, any> {
        if (!this.hasRegister(SingletonRegToken)) {
            this.bindProvider(SingletonRegToken, new Map<Token<any>, any>());
        }
        return this.resolve(SingletonRegToken);
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
                if (this.getSingleton().has(key)) {
                    return this.getSingleton().get(key);
                }
                let instance = factory(this, ...providers);
                this.getSingleton().set(key, instance);
                return instance;
            }
            : (...providers: ParamProviders[]) => factory(this, ...providers);
    }

    protected bindTypeFactory<T>(key: SymbolType<T>, ClassT?: Type<T>, singleton?: boolean) {
        if (!Reflect.isExtensible(ClassT)) {
            return;
        }

        let lifeScope = this.getLifeScope();
        let parameters = lifeScope.getConstructorParameters(ClassT);
        if (!singleton) {
            singleton = lifeScope.isSingletonType<T>(ClassT);
        }

        let factory = (...providers: ParamProviders[]) => {
            if (singleton && this.getSingleton().has(key)) {
                return this.getSingleton().get(key);
            }

            if (providers.length < 1) {
                let lifecycleData: CacheActionData = {
                    tokenKey: key,
                    targetType: ClassT,
                    // raiseContainer: this,
                    singleton: singleton
                };
                lifeScope.execute(lifecycleData, CoreActions.cache);
                if (lifecycleData.execResult && lifecycleData.execResult instanceof ClassT) {
                    return lifecycleData.execResult;
                }
            }

            let providerMap = this.getProviderParser().parse(...providers);

            lifeScope.execute({
                tokenKey: key,
                targetType: ClassT,
                raiseContainer: this,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, IocState.runtime, LifeState.beforeCreateArgs);

            let args = this.createSyncParams(parameters, providerMap);

            lifeScope.routeExecute({
                tokenKey: key,
                targetType: ClassT,
                raiseContainer: this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, IocState.runtime, LifeState.beforeConstructor);

            let instance = new ClassT(...args);

            lifeScope.routeExecute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, IocState.runtime, LifeState.afterConstructor);

            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, IocState.runtime, LifeState.onInit);


            lifeScope.routeExecute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, IocState.runtime, LifeState.AfterInit);

            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: this
            }, CoreActions.cache);

            return instance;
        };

        this.factories.set(key, factory);

        lifeScope.routeExecute({
            tokenKey: key,
            targetType: ClassT,
            raiseContainer: this
        }, IocState.design);

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
        return this.resolve(MethodAccessor).invoke(this, target, propertyKey, instance, ...providers);
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
        return this.resolve(MethodAccessor).syncInvoke(this, target, propertyKey, instance, ...providers);
    }

    createSyncParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.resolve(MethodAccessor).createSyncParams(this, params, ...providers);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): Promise<any[]> {
        return this.resolve(MethodAccessor).createParams(this, params, ...providers);
    }
}
