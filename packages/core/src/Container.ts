import 'reflect-metadata';
import { IContainer, ContainerToken } from './IContainer';
import {
    Type, Token, Factory, SymbolType, ToInstance, IocState,
    ReferenceToken, RefTokenType, RefTokenFacType,
    RefTokenFac, Modules, LoadType, RefTarget, RefTagLevel
} from './types';
import {
    isClass, isFunction, isSymbol, isToken, isString, isUndefined,
    lang, isArray, isBoolean, isRefTarget, isTypeObject
} from './utils';
import { IParameter } from './IParameter';
import { Registration, isRegistrationClass } from './Registration';
import { MethodAccessorToken } from './IMethodAccessor';
import { CoreActions, CacheActionData, LifeState, ActionComponent } from './core';
import { CacheManagerToken } from './ICacheManager';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { registerCores } from './registerCores';
import { ResolverChain, ResolverChainToken } from './resolves';
import { InjectReference, InjectClassProvidesToken, isInjectReference } from './InjectReference';
import { LifeScope, LifeScopeToken } from './LifeScope';
import { ParamProviders, ProviderMap, ProviderParserToken } from './providers';

/**
 * singleton reg token.
 */
const SingletonRegToken = '___IOC__Singleton___';

/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container implements IContainer {
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
    protected factories: Map<Token<any>, Function>;

    /**
     * parent container.
     *
     * @type {IContainer}
     * @memberof Container
     */
    parent: IContainer

    constructor() {
        this.init();
    }

    /**
     * get root container.
     *
     * @returns {IContainer}
     * @memberof Container
     */
    getRoot(): IContainer {
        let root: IContainer = this;
        while (root.parent) {
            root = root.parent;
        }
        return root;
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.resolveValue(ContainerBuilderToken);
    }

    /**
    * resolve token value in this container only.
    *
    * @template T
    * @param {Token<T>} token
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof Container
    */
    getResolvers(): ResolverChain {
        return this.resolveValue(ResolverChainToken);
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
        return this.getResolvers().has(key);
    }

    /**
     * has register type.
     *
     * @template T
     * @param {Token<T>} key
     * @returns
     * @memberof Container
     */
    hasRegister<T>(key: Token<T>) {
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
        return this.getResolvers().resolve(key, ...providers);
    }

    /**
     * resolve first token when not null.
     *
     * @template T
     * @param {Token<T>[]} tokens
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    resolveFirst<T>(tokens: Token<T>[], ...providers: ParamProviders[]): T {
        let inst: T;
        tokens.some(tk => {
            inst = this.resolve(tk, ...providers);
            return inst !== null;
        })
        return inst;
    }

    /**
     * resolve token value in this container only.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    resolveValue<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let key = this.getTokenKey(token);
        if (!this.hasRegister(key)) {
            return null;
        }
        let factory = this.factories.get(key);
        return factory(...providers) as T;
    }

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(token: Token<T> | Token<any>[], target?: RefTarget | RefTarget[] | ParamProviders, toRefToken?: boolean | Token<T> | RefTokenFac<T> | ParamProviders, defaultToken?: boolean | Token<T> | ParamProviders, ...providers: ParamProviders[]): T {
        if (isArray(target) || isToken(target) || isRefTarget(target) || isTypeObject(target)) {
            let tokens: Token<any>[] = [];
            (isArray(token) ? token : [token]).forEach(tk => {
                tokens.push(tk);
                if (!isClass(tk)) {
                    tokens.push(this.getTokenImpl(tk));
                }
            });

            let fac: RefTokenFac<T>;
            let defToken: Token<T> | Token<any>[];
            let prds: ParamProviders[] = [];
            if (isBoolean(toRefToken)) {
                if (toRefToken) {
                    defToken = token;
                } else {
                    defToken = null;
                }
            } else if (isToken(toRefToken)) {
                defToken = toRefToken;
            } else if (isFunction(toRefToken)) {
                fac = toRefToken;
                if (isBoolean(defaultToken)) {
                    if (defaultToken) {
                        defToken = token;
                    } else {
                        defToken = null;
                    }
                } else if (isToken(defaultToken)) {
                    defToken = defaultToken;
                } else if (defaultToken) {
                    prds.push(defaultToken);
                }
            } else if (toRefToken) {
                prds.unshift(toRefToken);
            }


            defToken = defToken === null ? null : (defToken || token);
            prds = prds.concat(providers);
            return this.getRefService(
                [
                    ...tokens.map(tk => { return { service: tk, isPrivate: true } }),
                    ...fac ? [tk => fac(tk)] : [],
                    ...tokens.map(t => (tk) => new InjectReference(t, tk))
                ],
                target as RefTarget | RefTarget[],
                defToken,
                ...prds);
        } else {
            return this.resolveFirst(isArray(token) ? token : [token], ...[target, toRefToken as ParamProviders, defaultToken as ParamProviders, ...providers].filter(a => a));
        }
    }

    /**
     * get target reference service.
     *
     * @template T
     * @param {Type<Registration<T>>} [refToken] reference service Registration Injector
     * @param {RefTarget | RefTarget[]} target  the service reference to.
     * @param {Token<T>} [defaultToken] default service token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof Container
     */
    getRefService<T>(refToken: ReferenceToken<T>, target: RefTarget | RefTarget[], defaultToken?: Token<T> | Token<any>[], ...providers: ParamProviders[]): T {
        let service: T = null;
        (isArray(target) ? target : [target])
            .some(tag => {
                this.forInRefTarget(tag, tk => {
                    // exclude ref registration.
                    if (isInjectReference(tk)) {
                        return true;
                    }
                    return !(isArray(refToken) ? refToken : [refToken]).some(stk => {
                        let tokens = this.getRefToken(stk, tk);
                        return (isArray(tokens) ? tokens : [tokens]).some(rtk => {
                            service = this.resolveRef(rtk, tk, ...providers);
                            // console.log(rtk, tk, !!service, lang.getClassName(service));
                            return service !== null;
                        });
                    });
                });
                return service !== null;
            });

        if (!service && defaultToken) {
            service = this.resolveFirst(isArray(defaultToken) ? defaultToken : [defaultToken], ...providers);
        }
        return service;
    }

    protected getRefToken<T>(ref: RefTokenFacType<T>, tk: Token<any>): RefTokenType<T> | RefTokenType<T>[] {
        if (isRegistrationClass(ref)) {
            return new ref(tk);
        }
        if (isToken(ref)) {
            return ref;
        }
        if (isFunction(ref)) {
            return ref(tk);
        }
        return ref;
    }

    protected resolveRef<T>(refToken: RefTokenType<T>, target: Token<any>, ...providers: ParamProviders[]): T {
        let tk: Token<T>;
        let isPrivate = false;
        if (isToken(refToken)) {
            tk = refToken;
        } else {
            tk = refToken.service;
            isPrivate = refToken.isPrivate !== false;
        }

        if (!tk) {
            return null;
        }
        // resolve private first.
        if (isClass(target) && !isInjectReference(tk)) {
            let pdrmap = this.resolve(new InjectReference(ProviderMap, target));
            if (pdrmap && pdrmap.hasRegister(tk)) {
                return pdrmap.resolve(tk, ...providers);
            }
        }
        // have not private registered.
        if (isPrivate) {
            return null;
        }
        return this.resolve(tk, ...providers);
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
    bindProviders(target: Token<any>, providers: ParamProviders[], onceBinded?: (mapTokenKey: Token<any>) => void): this {
        let refKey = new InjectReference(ProviderMap, isClass(target) ? target : this.getTokenImpl(target));
        let maps = this.get(ProviderParserToken).parse(...providers);
        if (this.hasRegister(refKey)) {
            this.resolveValue(refKey).copy(maps);
        } else {
            this.bindProvider(refKey, maps);
            onceBinded && onceBinded(refKey);
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
     * @returns {this}
     * @memberof Container
     */
    unregister<T>(token: Token<T>, inchain?: boolean): this {
        let key = this.getTokenKey(token);
        if (inchain === false) {
            if (this.hasRegister(key)) {
                this.factories.delete(key);
                if (this.provideTypes.has(key)) {
                    this.provideTypes.delete(key);
                }
                if (isClass(key)) {
                    this.clearCache(key);
                }
            }
        } else {
            this.getResolvers().unregister(key);
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
        this.resolveValue(CacheManagerToken).destroy(targetType);
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
     * get token implements class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {boolean} [inchain]
     * @returns {Type<T>}
     * @memberof Container
     */
    getTokenImpl<T>(token: Token<T>, inchain?: boolean): Type<T> {
        let tokenKey = this.getTokenKey(token);
        if (inchain === false) {
            if (isClass(token)) {
                return token;
            }
            if (this.provideTypes.has(tokenKey)) {
                return this.provideTypes.get(tokenKey);
            }
            return null;
        } else {
            return this.getResolvers().getTokenImpl(tokenKey);
        }
    }

    /**
     * iterate token  in  token class chain.  return false will break iterate.
     *
     * @param {RefTarget} target
     * @param {(token: Token<any>) => boolean} express
     * @memberof Container
     */
    forInRefTarget(target: RefTarget, express: (token: Token<any>) => boolean): void {
        let type: Type<any>;
        let token: Token<any>;
        let level: RefTagLevel;
        if (isToken(target)) {
            token = target;
            level = RefTagLevel.all;
        } else if (target) {
            if (isRefTarget(target)) {
                token = target.target;
                level = target.level || RefTagLevel.self;
            } else if (isTypeObject(target)) {
                token = lang.getClass(target);
                level = RefTagLevel.all;
            }
        }

        if (!isToken(token)) {
            return;
        }

        if (isClass(token)) {
            type = token;
            if (!this.has(type)) {
                this.use(type);
            }
        } else {
            type = this.getTokenImpl(token);
        }
        if (!isClass(type) || (RefTagLevel.self === level)) {
            express(token);
            return;
        }

        let inChain = (level & RefTagLevel.chain) > 0;
        let inProviders = (level & RefTagLevel.providers) > 0;
        lang.forInClassChain(type, ty => {
            let tokens: Token<any>[];
            if (inProviders) {
                let prdKey = new InjectClassProvidesToken(ty);
                let prds = this.get(prdKey);
                if (prds && prds.provides && prds.provides.length) {
                    let ppdkey = prdKey.toString();
                    let pmapKey = new InjectReference(ProviderMap, ty).toString();
                    tokens = prds.provides.slice(1).filter(p => {
                        let key = this.getTokenKey(p);
                        return key !== ppdkey && key !== pmapKey
                    });
                }
            }
            tokens = tokens || [];
            return !(tokens.concat(ty).some(tk => express(tk) === false)) && inChain;
        });
    }

    /**
     * get token implement class and base classes.
     *
     * @param {Token<any>} token
     * @returns {Token<any>[]}
     * @memberof Container
     */
    getTokenClassChain(token: Token<any>, chain = true): Token<any>[] {
        let tokens: Token<any>[] = [];
        this.forInRefTarget(token, tk => {
            tokens.push(tk);
            return chain;
        });
        return tokens;
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
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Container
     */
    use(...modules: Modules[]): this {
        this.getBuilder().syncLoadModule(this, ...modules);
        return this;
    }

    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type<any>[]>}  types loaded.
     * @memberof IContainer
     */
    loadModule(...modules: LoadType[]): Promise<Type<any>[]> {
        return this.getBuilder().loadModule(this, ...modules);
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
        return this.resolveValue(MethodAccessorToken).invoke(target, propertyKey, instance, ...providers);
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
        return this.resolveValue(MethodAccessorToken).syncInvoke(target, propertyKey, instance, ...providers);
    }

    createSyncParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.resolveValue(MethodAccessorToken).createSyncParams(params, ...providers);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): Promise<any[]> {
        return this.resolveValue(MethodAccessorToken).createParams(params, ...providers);
    }

    protected cacheDecorator<T>(map: Map<string, ActionComponent>, action: ActionComponent) {
        if (!map.has(action.name)) {
            map.set(action.name, action);
        }
    }

    protected init() {
        this.factories = new Map();
        this.provideTypes = new Map();
        this.bindProvider(ContainerToken, () => this);
        registerCores(this);
    }

    protected getSingleton(): Map<Token<any>, any> {
        if (!this.hasRegister(SingletonRegToken)) {
            this.bindProvider(SingletonRegToken, new Map<Token<any>, any>());
        }
        return this.resolveValue(SingletonRegToken);
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

            let providerMap = this.get(ProviderParserToken).parse(...providers);

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
}
