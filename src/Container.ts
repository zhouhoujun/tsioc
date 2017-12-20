import 'reflect-metadata';
import { IContainer } from './IContainer';
import { Token, Factory, ObjectMap, SymbolType, ToInstance } from './types';
import { Registration } from './Registration';
import { Type } from './Type';
import { isClass, isFunction, symbols } from './utils';
import { isSymbol, isString, isUndefined, isArray } from 'util';
import { registerAops } from './aop';
import { IMethodAccessor } from './IMethodAccessor';
import { ParamProvider, AsyncParamProvider } from './ParamProvider';
import { ActionComponent, DecoratorType, registerCores, CoreActions, Singleton, PropertyMetadata } from './core';
import { LifeScope } from './LifeScope';
import { IocState } from './types';
import { IParameter } from './IParameter';


export const NOT_FOUND = new Object();

/**
 * Container.
 */
export class Container implements IContainer {
    protected factories: Map<Token<any>, any>;
    protected singleton: Map<Token<any>, any>;
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
    get<T>(token: Token<T>, alias?: string, notFoundValue?: T): T {
        return this.resolve(alias ? this.getTokenKey<T>(token, alias) : token, notFoundValue);
    }

    resolve<T>(token: Token<T>, notFoundValue?: T, ...providers: ParamProvider[]): T {
        let key = this.getTokenKey<T>(token);
        if (!this.hasRegister(key)) {
            return notFoundValue === undefined ? (NOT_FOUND as T) : notFoundValue;
        }
        let factory = this.factories.get(key);
        return factory(...providers) as T;
    }


    getToken<T>(token: Token<T>, alias?: string): Token<T> {
        if (token instanceof Registration) {
            return token;
        } else {
            if (alias && isFunction(token)) {
                return new Registration(token, alias);
            }
            return token;
        }
    }

    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        if (token instanceof Registration) {
            return token.toString();
        } else {
            if (alias && isFunction(token)) {
                return new Registration(token, alias).toString();
            }
            return token;
        }
    }


    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @memberOf Container
     */
    register<T>(token: Token<T>, value?: Factory<T>) {
        this.registerFactory(token, value);
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
     * @memberof Container
     */
    unregister<T>(token: Token<T>) {
        let key = this.getTokenKey(token);
        if (this.hasRegister(key)) {
            this.factories.delete(key);
        }
    }

    /**
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [value]
     *
     * @memberOf Container
     */
    registerSingleton<T>(token: Token<T>, value?: Factory<T>) {
        this.registerFactory(token, value, true);
    }

    /**
     * bind provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T>} provider
     * @memberof Container
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T> | Factory<T>) {
        let provideKey = this.getTokenKey(provide);
        let factory;
        if (isClass(provider) || isString(provider) || provider instanceof Registration || isSymbol(provider)) {
            factory = () => {
                return this.get(provider);
            };
        } else {
            if (isFunction(provider)) {
                factory = () => {
                    return (<ToInstance<any>>provider)(this);
                };
            } else {
                factory = () => {
                    return provider
                };
            }
        }

        this.factories.set(provideKey, factory);
    }

    getLifeScope(): LifeScope {
        return this.get<LifeScope>(symbols.LifeScope);
    }

    /**
     * invoke method async.
     *
     * @template T
     * @param {Type<any>} type
     * @param {(string | symbol)} propertyKey
     * @param {*} [instance]
     * @returns {Promise<T>}
     * @memberof Container
     */
    invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: AsyncParamProvider[]): Promise<T> {
        return this.get<IMethodAccessor>(symbols.IMethodAccessor).invoke(type, propertyKey, instance, ...providers);
    }

    /**
     * invoke method.
     *
     * @template T
     * @param {Type<any>} type
     * @param {(string | symbol)} propertyKey
     * @param {*} [instance]
     * @param {...ParamProvider[]} providers
     * @returns {T}
     * @memberof Container
     */
    syncInvoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: ParamProvider[]): T {
        return this.get<IMethodAccessor>(symbols.IMethodAccessor).syncInvoke(type, propertyKey, instance, ...providers);
    }

    createSyncParams(params: IParameter[], ...providers: ParamProvider[]): any[] {
        return this.get<IMethodAccessor>(symbols.IMethodAccessor).createSyncParams(params, ...providers);
    }

    createParams(params: IParameter[], ...providers: AsyncParamProvider[]): Promise<any[]> {
        return this.get<IMethodAccessor>(symbols.IMethodAccessor).createParams(params, ...providers);
    }


    protected cacheDecorator<T>(map: Map<string, ActionComponent>, action: ActionComponent) {
        if (!map.has(action.name)) {
            map.set(action.name, action);
        }
    }

    protected init() {
        this.factories = new Map<Token<any>, any>();
        this.singleton = new Map<Token<any>, any>();
        this.bindProvider(symbols.IContainer, () => this);

        registerCores(this);
        registerAops(this);
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
                    classFactory = this.createTypeFactory(key, value as Type<T>, singleton);
                } else {
                    classFactory = this.createCustomFactory(key, value as ToInstance<T>, singleton);
                }
            } else if (singleton && value !== undefined) {
                classFactory = this.createCustomFactory(key, () => value, singleton);
            }

        } else if (!isString(token) && !isSymbol(token)) {
            let ClassT = (token instanceof Registration) ? token.getClass() : token;
            if (isClass(ClassT)) {
                classFactory = this.createTypeFactory(key, ClassT as Type<T>, singleton);
            }
        }

        if (classFactory) {
            this.factories.set(key, classFactory);
        }
    }

    protected createCustomFactory<T>(key: SymbolType<T>, factory?: ToInstance<T>, singleton?: boolean) {
        return singleton ?
            (...providers: ParamProvider[]) => {
                if (this.singleton.has(key)) {
                    return this.singleton.get(key);
                }
                let instance = factory(this, ...providers);
                this.singleton.set(key, instance);
                return instance;
            }
            : (...providers: ParamProvider[]) => factory(this, ...providers);
    }

    protected createTypeFactory<T>(key: SymbolType<T>, ClassT?: Type<T>, singleton?: boolean) {
        if (!Reflect.isExtensible(ClassT)) {
            return null;
        }

        let lifeScope = this.getLifeScope();
        let parameters = lifeScope.getConstructorParameters(ClassT);

        if (!singleton) {
            singleton = lifeScope.isSingletonType<T>(ClassT);
        }

        let factory = (...providers: ParamProvider[]) => {
            if (singleton && this.singleton.has(key)) {
                return this.singleton.get(key);
            }

            lifeScope.execute(DecoratorType.Class, {
                targetType: ClassT
            }, IocState.runtime);

            let args = this.createSyncParams(parameters, ...providers);

            lifeScope.execute(DecoratorType.Class, {
                targetType: ClassT,
                args: args,
                params: parameters
            }, CoreActions.beforeConstructor);

            let instance = new ClassT(...args);

            lifeScope.execute(DecoratorType.Class, {
                target: instance,
                targetType: ClassT
            }, CoreActions.afterConstructor);

            lifeScope.execute(DecoratorType.Property, {
                target: instance,
                targetType: ClassT
            });

            lifeScope.execute(DecoratorType.Method, {
                target: instance,
                targetType: ClassT
            });


            if (singleton) {
                this.singleton.set(key, instance);
            }
            return instance;
        };

        lifeScope.execute(DecoratorType.Class, {
            targetType: ClassT
        }, IocState.design);


        return factory;
    }

}


