import 'reflect-metadata';
import { IContainer, ContainerToken } from './IContainer';
import { Type, AbstractType, Token, Factory, ObjectMap, SymbolType, ToInstance, IocState, Providers, ModuleType } from './types';
import { Registration } from './Registration';
import { isClass, isFunction, isSymbol, isToken, isString, isUndefined, MapSet } from './utils/index';

import { IMethodAccessor, MethodAccessorToken } from './IMethodAccessor';
import { ActionComponent, DecoratorType, registerCores, CoreActions, Singleton, PropertyMetadata, ComponentLifecycle, CacheActionData, LifeState } from './core/index';
import { LifeScope, LifeScopeToken } from './LifeScope';
import { IParameter } from './IParameter';
import { ICacheManager, CacheManagerToken } from './ICacheManager';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';

/**
 * Container.
 */
export class Container implements IContainer {
    protected provideTypes: MapSet<Token<any>, Type<any>>;
    protected factories: MapSet<Token<any>, Function>;
    protected singleton: MapSet<Token<any>, any>;
    constructor() {
        this.init();
    }

    /**
     * Retrieves an instance from the container based on the provided token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @param {T} [notFoundValue]
     * @returns {T}
     * @memberof Container
     */
    get<T>(token: Token<T>, alias?: string): T {
        return this.resolve(alias ? this.getTokenKey<T>(token, alias) : token);
    }


    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} [notFoundValue]
     * @param {...Providers[]} providers
     * @memberof Container
     */
    resolve<T>(token: Token<T>, ...providers: Providers[]): T {
        let key = this.getTokenKey<T>(token);
        if (!this.hasRegister(key)) {
            console.error('have not register', key);
            return null;
        }
        let factory = this.factories.get(key);
        return factory(...providers) as T;
    }

    /**
     * clear cache.
     *
     * @param {Type<any>} targetType
     * @memberof IContainer
     */
    clearCache(targetType: Type<any>) {
        this.get(CacheManagerToken).destroy(targetType);
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
        return this.hasRegister(key);
    }

    /**
     * has register type.
     *
     * @template T
     * @param {SymbolType<T>} key
     * @returns
     * @memberof Container
     */
    hasRegister<T>(key: SymbolType<T>) {
        return this.factories.has(key);
    }

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof Container
     */
    unregister<T>(token: Token<T>): this {
        let key = this.getTokenKey(token);
        if (this.hasRegister(key)) {
            this.factories.delete(key);
        }
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

        this.singleton.set(key, value);
        if (!this.factories.has(key)) {
            this.factories.set(key, () => {
                return this.singleton.get(key);
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
            factory = (...providers: Providers[]) => {
                return this.resolve(provider, ...providers);
            };
        } else {
            if (isFunction(provider)) {
                factory = (...providers: Providers[]) => {
                    return (<ToInstance<any>>provider)(this, ...providers);
                };
            } else {
                factory = () => {
                    return provider
                };
            }
        }
        if (isClass(provider)) {
            this.provideTypes.set(provide, provider);
        } else if (isToken(provider)) {
            let token = provider;
            while (this.provideTypes.has(token) && !isClass(token)) {
                token = this.provideTypes.get(token);
                if (isClass(token)) {
                    this.provideTypes.set(provide, token);
                    break;
                }
            }
        }

        this.factories.set(provideKey, factory);
        return this;
    }

    /**
     * get token implements class type.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof Container
     */
    getTokenImpl<T>(token: Token<T>): Type<T> {
        if (isClass(token)) {
            return token;
        }
        if (this.provideTypes.has(token)) {
            return this.provideTypes.get(token);
        }
        return null;
    }

    /**
    * get life scope of container.
    *
    * @returns {LifeScope}
    * @memberof IContainer
    */
    getLifeScope(): LifeScope {
        return this.get(LifeScopeToken);
    }

    /**
     * use modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {this}
     * @memberof Container
     */
    use(...modules: ModuleType[]): this {
        this.get<IContainerBuilder>(ContainerBuilderToken).syncLoadModule(this, ...modules);
        return this;
    }

    /**
     * invoke method async.
     *
     * @template T
     * @param {Token<any>} token
     * @param {(string | symbol)} propertyKey
     * @param {*} [instance]
     * @param {...Providers[]} providers
     * @returns {Promise<T>}
     * @memberof Container
     */
    invoke<T>(token: Token<any>, propertyKey: string | symbol, instance?: any, ...providers: Providers[]): Promise<T> {
        return this.get(MethodAccessorToken).invoke(token, propertyKey, instance, ...providers);
    }

    /**
     * invoke method.
     *
     * @template T
     * @param {Token<any>} token
     * @param {(string | symbol)} propertyKey
     * @param {*} [instance]
     * @param {...Providers[]} providers
     * @returns {T}
     * @memberof Container
     */
    syncInvoke<T>(token: Token<any>, propertyKey: string | symbol, instance?: any, ...providers: Providers[]): T {
        return this.get(MethodAccessorToken).syncInvoke(token, propertyKey, instance, ...providers);
    }

    createSyncParams(params: IParameter[], ...providers: Providers[]): any[] {
        return this.get(MethodAccessorToken).createSyncParams(params, ...providers);
    }

    createParams(params: IParameter[], ...providers: Providers[]): Promise<any[]> {
        return this.get(MethodAccessorToken).createParams(params, ...providers);
    }


    protected cacheDecorator<T>(map: Map<string, ActionComponent>, action: ActionComponent) {
        if (!map.has(action.name)) {
            map.set(action.name, action);
        }
    }

    protected init() {
        this.factories = new MapSet<Token<any>, Function>();
        this.singleton = new MapSet<Token<any>, any>();
        this.provideTypes = new MapSet<Token<any>, Type<any>>();
        this.bindProvider(ContainerToken, () => this);

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
            (...providers: Providers[]) => {
                if (this.singleton.has(key)) {
                    return this.singleton.get(key);
                }
                let instance = factory(this, ...providers);
                this.singleton.set(key, instance);
                return instance;
            }
            : (...providers: Providers[]) => factory(this, ...providers);
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

        let factory = (...providers: Providers[]) => {
            if (singleton && this.singleton.has(key)) {
                return this.singleton.get(key);
            }

            if (providers.length < 1) {
                let lifecycleData: CacheActionData = {
                    tokenKey: key,
                    targetType: ClassT,
                    singleton: singleton
                };
                lifeScope.execute(lifecycleData, CoreActions.cache);
                if (lifecycleData.execResult && lifecycleData.execResult instanceof ClassT) {
                    return lifecycleData.execResult;
                }
            }

            lifeScope.execute({
                tokenKey: key,
                targetType: ClassT,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, IocState.runtime, LifeState.beforeCreateArgs);

            let args = this.createSyncParams(parameters, ...providers);

            lifeScope.execute({
                tokenKey: key,
                targetType: ClassT,
                args: args,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, IocState.runtime, LifeState.beforeConstructor);

            let instance = new ClassT(...args);

            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                args: args,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, IocState.runtime, LifeState.afterConstructor);

            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                args: args,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, IocState.runtime, LifeState.onInit);


            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                args: args,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, IocState.runtime, LifeState.AfterInit);


            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT
            }, CoreActions.cache);

            return instance;
        };

        this.factories.set(key, factory);

        lifeScope.execute({
            tokenKey: key,
            targetType: ClassT
        }, IocState.design);

    }

}


