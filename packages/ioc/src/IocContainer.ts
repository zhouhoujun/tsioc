import 'reflect-metadata';
import { IIocContainer, IocContainerToken, ContainerFactoryToken, ContainerFactory } from './IIocContainer';
import { Type, Token, Factory, SymbolType, ToInstance, InstanceFactory } from './types';
import { isClass, isFunction, isSymbol, isString, isDefined } from './utils/lang';
import { Registration } from './Registration';
import { isToken } from './utils/isToken';
import { registerCores } from './registerCores';
import { InjectReference } from './InjectReference';
import { ParamProviders, ProviderTypes } from './providers/types';
import { IResolver } from './IResolver';
import { TypeReflects } from './services/TypeReflects';
import { IParameter } from './IParameter';
import { ProviderParser } from './providers/ProviderParser';
import { ProviderMap } from './providers/ProviderMap';
import { ResolveActionOption, ResolveActionContext } from './actions/ResolveActionContext';
import { ActionRegisterer } from './actions/ActionRegisterer';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { IocCacheManager } from './actions/IocCacheManager';
import { IocSingletonManager } from './actions/IocSingletonManager';
import { RuntimeActionContext } from './actions/runtime/RuntimeActionContext';
import { RuntimeLifeScope } from './actions/RuntimeLifeScope';
import { DesignActionContext } from './actions/design/DesignActionContext';
import { DesignLifeScope } from './actions/DesignLifeScope';
import { MethodAccessor } from './actions/MethodAccessor';


const factoryToken = ContainerFactoryToken.toString();
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
     * @type {Map<Token, Type>}
     * @memberof Container
     */
    protected provideTypes: Map<Token, Type>;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof Container
     */
    protected factories: Map<Token, InstanceFactory>;

    constructor() {
        this.factories = new Map();
        this.provideTypes = new Map();
        this.init();
    }

    get size(): number {
        return this.factories.size;
    }

    getTypeReflects(): TypeReflects {
        return this.getInstance(TypeReflects);
    }

    getFactory<T extends IIocContainer>(): ContainerFactory<T> {
        return this.getInstance(factoryToken) as ContainerFactory<T>;
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
     * iterator.
     *
     * @param {(tk: Token, fac: InstanceFactory) => void | boolean} callbackfn
     * @memberof IExports
     */
    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IResolver) => void | boolean): void | boolean {
        return !Array.from(this.factories.keys()).some(tk => callbackfn(this.factories.get(tk), tk, this) === false);
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
        if (!this.factories.has(key)) {
            this.factories.set(key, () => value);
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
                return this.get(provider, ...providers);
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
     * bind providers for only target class.
     *
     * @param {Token} target
     * @param {ParamProviders[]} providers
     * @param {(mapTokenKey: Token) => void} [onceBinded]
     * @returns {this}
     * @memberof Container
     */
    bindProviders(target?: Token | ProviderTypes, onceBinded?: ProviderTypes | ((mapTokenKey: Token) => void), ...providers: ProviderTypes[]): this {
        let tgt: Token;
        let complete: (mapTokenKey: Token) => void;
        let prods: ProviderTypes[] = providers;

        if (isFunction(onceBinded)) {
            complete = onceBinded as (mapTokenKey: Token) => void;
        } else if (onceBinded) {
            prods.unshift(onceBinded);
        }

        if (isToken(target)) {
            tgt = target;
        } else if (target) {
            tgt = null;
            prods.unshift(target);
        }

        let maps = this.getInstance(ProviderParser).parse(...prods);
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
                isToken(key) && this.factories.set(key, (...prods) => maps.resolve(key, ...prods));
            });
        }
        return this;
    }

    /**
     * bind provider ref to target.
     *
     * @template T
     * @param {Token} target
     * @param {Token<T>} provide
     * @param {(Token<T> | Factory<T>)} provider
     * @param {string} [alias]
     * @param {(refToken: Token<T>) => void} [onceBinded]
     * @returns {this}
     * @memberof Container
     */
    bindRefProvider<T>(target: Token, provide: Token<T>, provider: Token<T> | Factory<T>, alias?: string, onceBinded?: (refToken: Token<T>) => void): this {
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
     * @param {Type} targetType
     * @memberof IContainer
     */
    clearCache(targetType: Type) {
        this.getInstance(IocCacheManager).destroy(targetType);
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
        this.bindProvider(IocContainerToken, () => this);
        registerCores(this);
    }

    protected registerFactory<T>(token: Token<T>, value?: Factory<T>, singleton?: boolean) {
        (async () => {
            let key = this.getTokenKey(token);
            if (this.factories.has(key)) {
                return;
            }

            let classFactory;
            if (isDefined(value)) {
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
        })();
    }

    protected createCustomFactory<T>(key: SymbolType<T>, factory?: ToInstance<T>, singleton?: boolean) {
        return singleton ?
            (...providers: ParamProviders[]) => {
                let mgr = this.getInstance(IocSingletonManager);
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

        let factory = (...providers: ParamProviders[]) => {
            let mgr = this.getInstance(IocSingletonManager);
            if (mgr.has(key)) {
                return mgr.get(key);
            }
            let ctx = RuntimeActionContext.parse({
                tokenKey: key,
                targetType: ClassT,
                singleton: singleton,
                providers: providers,
                raiseContainer: this.getFactory()
            });
            this.getInstance(ActionRegisterer).get(RuntimeLifeScope).register(ctx);
            return ctx.target;
        };

        this.factories.set(ClassT, factory);
        if (key !== ClassT) {
            this.bindProvider(key, ClassT);
        }

        (async () => {
            this.getInstance(ActionRegisterer).get(DesignLifeScope).register(
                DesignActionContext.parse({
                    tokenKey: key,
                    targetType: ClassT,
                    raiseContainer: this.getFactory()
                }));
        })();
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
     * @memberof Container
     */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: string | ((tag: T) => Function), ...providers: ParamProviders[]): TR {
        return this.getInstance(MethodAccessor).invoke(this, target, propertyKey, ...providers);
    }

    invokedProvider(target: any, propertyKey: string): ProviderMap {
        return this.getInstance(MethodAccessor).invokedProvider(target, propertyKey);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.getInstance(MethodAccessor).createParams(this, params, ...providers);
    }
}
