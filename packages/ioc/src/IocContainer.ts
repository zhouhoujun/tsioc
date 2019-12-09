import 'reflect-metadata';
import { IIocContainer, IocContainerToken, ContainerFactoryToken, ContainerFactory } from './IIocContainer';
import { Type, Token, Factory, SymbolType, ToInstance } from './types';
import { isClass, isFunction, isSymbol, isString, isDefined } from './utils/lang';
import { Registration } from './Registration';
import { isToken } from './utils/isToken';
import { registerCores } from './registerCores';
import { InjectReference } from './InjectReference';
import { ParamProviders, ProviderTypes } from './providers/types';
import { TypeReflects } from './services/TypeReflects';
import { IParameter } from './IParameter';
import { ProviderParser } from './providers/ProviderParser';
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
import { IInjector } from './IInjector';
import { BaseInjector } from './BaseInjector';
import { Injector } from './Injector';


const factoryToken = ContainerFactoryToken.toString();
/**
 * Container
 *
 * @export
 * @class IocContainer
 * @implements {IIocContainer}
 */
export class IocContainer extends BaseInjector implements IIocContainer {

    constructor() {
        super();
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
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @returns {this}
     * @memberOf Container
     */
    register<T>(token: Token<T>, value?: Factory<T>): this {
        this.registerFactory(this, token, value);
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
        this.registerFactory(this, token, value, true);
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
            let refKey = new InjectReference<IInjector>(Injector, isClass(tgt) ? tgt : this.getTokenProvider(tgt));
            if (this.has(refKey)) {
                this.get(refKey).copy(maps);
            } else {
                this.bindProvider(refKey, maps);
                complete && complete(refKey);
            }
        } else {
            maps.iterator((fac, key) => {
                isToken(key) && this.factories.set(key, (...prods) => maps.get(key, ...prods));
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
        super.unregister(token);
        if (isClass(token)) {
            this.clearCache(token);
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

    protected init() {
        this.bindProvider(IocContainerToken, () => this);
        registerCores(this);
    }

    registerFactory<T>(injector: IInjector, token: Token<T>, value?: Factory<T>, singleton?: boolean): this {
        (async () => {
            let key = injector.getTokenKey(token);
            // if (injector.hasTokenKey(key)) {
            //     return;
            // }
            let classFactory;
            if (isDefined(value)) {
                if (isFunction(value)) {
                    if (isClass(value)) {
                        this.injectType(injector, value, singleton, key);
                    } else {
                        classFactory = this.createCustomFactory(injector, key, value as ToInstance<T>, singleton);
                    }
                } else if (singleton && value !== undefined) {
                    classFactory = this.createCustomFactory(injector, key, () => value, singleton);
                }

            } else if (!isString(token) && !isSymbol(token)) {
                let ClassT = (token instanceof Registration) ? token.getClass() : token;
                if (isClass(ClassT)) {
                    this.injectType(injector, ClassT, singleton, key);
                }
            }

            if (classFactory) {
                injector.set(key, classFactory);
            }
        })();
        return this;
    }

    protected createCustomFactory<T>(injector: IInjector, key: SymbolType<T>, factory?: ToInstance<T>, singleton?: boolean) {
        return singleton ?
            (...providers: ParamProviders[]) => {
                let mgr = injector.getInstance(IocSingletonManager);
                if (mgr.has(key)) {
                    return mgr.get(key);
                }
                let instance = factory(injector, ...providers);
                mgr.set(key, instance);
                return instance;
            }
            : (...providers: ParamProviders[]) => factory(injector, ...providers);
    }

    /**
     * inject type.
     *
     * @template T
     * @param {IInjector} injector
     * @param {Type<T>} type
     * @param {boolean} [singleton]
     * @param {SymbolType<T>} [provide]
     * @returns {this}
     * @memberof IIocContainer
     */
    protected injectType<T>(injector: IInjector, type: Type<T>, singleton?: boolean, provide?: SymbolType<T>) {
        if (!provide) {
            provide = type;
        }
        let factory = (...providers: ParamProviders[]) => {
            let mgr = injector.getInstance(IocSingletonManager);
            if (mgr.has(provide)) {
                return mgr.get(provide);
            }
            let ctx = RuntimeActionContext.parse({
                tokenKey: provide,
                targetType: type,
                singleton: singleton,
                providers: providers,
                injector: injector
            }, this.getFactory());
            this.getInstance(ActionRegisterer).get(RuntimeLifeScope).register(ctx);
            return ctx.target;
        };

        injector.set(type, factory);
        if (provide !== type) {
            injector.set(provide, factory, type);
        }

        (async () => {
            this.getInstance(ActionRegisterer).get(DesignLifeScope).register(
                DesignActionContext.parse({
                    tokenKey: provide,
                    targetType: type,
                    injector: injector
                }, this.getFactory()));
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

    invokedProvider(target: any, propertyKey: string): IInjector {
        return this.getInstance(MethodAccessor).invokedProvider(target, propertyKey);
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.getInstance(MethodAccessor).createParams(this, params, ...providers);
    }
}
