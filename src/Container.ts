import 'reflect-metadata';
import { IContainer } from './IContainer';
import { Token, Factory, ObjectMap, SymbolType, ToInstance } from './types';
import { Registration } from './Registration';
import { Injectable } from './decorators/Injectable';
import { Type, AbstractType } from './Type';
import { ParameterMetadata, InjectableMetadata, PropertyMetadata, InjectMetadata, TypeMetadata, ClassMetadata, AutoWiredMetadata } from './metadatas';
import { DecoratorType, Inject, AutoWired, Param, Singleton } from './decorators';
import { ActionComponent, ActionType, ActionBuilder, ResetPropData, ProviderActionData } from './actions';
import { isClass, isFunction } from './utils';
import { isSymbol, isString, isUndefined, isArray } from 'util';
import { fail } from 'assert';


export const NOT_FOUND = new Object();

/**
 * Container.
 */
export class Container implements IContainer {

    protected factories: Map<Token<any>, any>;
    protected singleton: Map<Token<any>, any>;
    protected classDecoractors: Map<string, ActionComponent>;
    protected methodDecoractors: Map<string, ActionComponent>;
    protected propDecoractors: Map<string, ActionComponent>;
    protected paramDecoractors: Map<string, ActionComponent>;
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
        let key = this.getTokenKey<T>(token, alias);
        if (!this.hasRegister(key)) {
            return notFoundValue === undefined ? (NOT_FOUND as T) : notFoundValue;
        }
        let factory = this.factories.get(key);
        return factory() as T;
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

    /**
     * register decorator.
     *
     * @template T
     * @param {Function} decirator
     * @param {ActionComponent<T>} actions
     * @memberof Container
     */
    registerDecorator<T>(decirator: Function, actions: ActionComponent) {
        if (!actions.decorType) {
            actions.decorType = this.getDecoratorType(decirator);
        }
        if (!actions.name) {
            actions.name = decirator.toString();
        }
        if (actions.decorType & DecoratorType.Class) {
            this.cacheDecorator(this.classDecoractors, actions);
        }
        if (actions.decorType & DecoratorType.Method) {
            this.cacheDecorator(this.methodDecoractors, actions);
        }
        if (actions.decorType & DecoratorType.Property) {
            this.cacheDecorator(this.propDecoractors, actions);
        }
        if (actions.decorType & DecoratorType.Parameter) {
            this.cacheDecorator(this.paramDecoractors, actions);
        }
    }

    /**
     * is vaildate dependence type or not. dependence type must with class decorator.
     *
     * @template T
     * @param {Type<T>} target
     * @returns {boolean}
     * @memberof Container
     */
    isVaildDependence<T>(target: Type<T>): boolean {
        if (!target) {
            return false;
        }
        if (!this.isClass(target)) {
            return false;
        }
        let vaildate = false;
        this.classDecoractors.forEach((act, key) => {
            if (vaildate) {
                return false;
            }
            vaildate = Reflect.hasMetadata(key, target);
            return true;
        });
        return vaildate;
    }

    getDecoratorType(decirator: any): DecoratorType {
        return decirator.decoratorType || DecoratorType.All;
    }

    execMethod<T>(propertyKey: string | symbol, type: Type<any>, instance?: any): T {

        instance = instance || this.get(type);
        if (instance && isFunction(instance[propertyKey])) {
            let parameters = this.getParameterMetadata(type, propertyKey);
            let paramInstances = parameters.map((type, index) => this.get(type));
            return instance[propertyKey].call(instance, paramInstances) as T;
        } else {
            throw new Error(`type: ${type} has no method ${propertyKey}.`)
        }

    }

    protected cacheDecorator<T>(map: Map<string, ActionComponent>, action: ActionComponent) {
        if (!map.has(action.name)) {
            map.set(action.name, action);
        }
    }

    protected init() {
        this.factories = new Map<Token<any>, any>();
        this.singleton = new Map<Token<any>, any>();
        this.classDecoractors = new Map<string, ActionComponent>();
        this.methodDecoractors = new Map<string, ActionComponent>();
        this.paramDecoractors = new Map<string, ActionComponent>();
        this.propDecoractors = new Map<string, ActionComponent>();

        this.registerDefautDecorators();
        this.register(Date);
        this.register(String);
        this.register(Number);
        this.register(Boolean);
        this.register(Object);
    }

    protected registerDefautDecorators() {
        let builder = new ActionBuilder();
        this.registerDecorator<InjectableMetadata>(Injectable,
            builder.build(Injectable.toString(), this.getDecoratorType(Injectable),
                ActionType.provider));

        this.registerDecorator<AutoWiredMetadata>(AutoWired,
            builder.build(AutoWired.toString(), this.getDecoratorType(AutoWired),
                ActionType.resetParamType, ActionType.resetPropType));

        this.registerDecorator<InjectMetadata>(Inject,
            builder.build(Inject.toString(), this.getDecoratorType(Inject),
                ActionType.resetParamType, ActionType.resetPropType));

        this.registerDecorator<ClassMetadata>(Singleton,
            builder.build(Singleton.toString(), this.getDecoratorType(Singleton), ActionType.provider));

        this.registerDecorator<ParameterMetadata>(Param,
            builder.build(Param.toString(), this.getDecoratorType(Param),
                ActionType.resetParamType));
    }


    protected registerFactory<T>(token: Token<T>, value?: Factory<T>, singleton?: boolean) {
        let key = this.getTokenKey(token);

        if (this.factories.has(key)) {
            return;
        }

        let classFactory;
        if (!isUndefined(value)) {
            if (isFunction(value)) {
                if (this.isClass(value)) {
                    classFactory = this.createTypeFactory(key, value as Type<T>, singleton);
                } else {
                    classFactory = this.createCustomFactory(key, value as ToInstance<T>, singleton);
                }
            } else if (singleton && value !== undefined) {
                let symbolValue = value;
                classFactory = () => {
                    return symbolValue;
                }
            }

        } else if (!isString(token) && !isSymbol(token)) {
            let ClassT = (token instanceof Registration) ? token.getClass() : token;
            if (this.isClass(ClassT)) {
                classFactory = this.createTypeFactory(key, ClassT as Type<T>, singleton);
            }
        }

        if (classFactory) {
            this.factories.set(key, classFactory);
        }
    }

    private isClass(value: Function) {
        return isClass(value);
    }

    protected createCustomFactory<T>(key: SymbolType<T>, factory?: ToInstance<T>, singleton?: boolean) {
        return singleton ?
            () => {
                if (this.singleton.has(key)) {
                    return this.singleton.get(key);
                }
                let instance = factory(this);
                this.singleton.set(key, instance);
                return instance;
            }
            : () => factory(this);
    }

    protected createTypeFactory<T>(key: SymbolType<T>, ClassT?: Type<T>, singleton?: boolean) {
        if (!Reflect.isExtensible(ClassT)) {
            return null;
        }
        let parameters = this.getParameterMetadata(ClassT);
        let props = this.getPropMetadata(ClassT);
        if (!singleton) {
            singleton = this.isSingletonType<T>(ClassT);
        }

        let factory = () => {
            if (singleton && this.singleton.has(key)) {
                return this.singleton.get(key);
            }

            let paramInstances = parameters.map((type, index) => this.get(type));
            let instance = new ClassT(...paramInstances);
            // this.propDecoractors.forEach()
            if (instance) {
                props.forEach((prop, idx) => {
                    instance[prop.propertyKey] = prop.provider ?
                        this.get(prop.provider, prop.alias) : this.get(prop.type);
                });
            }

            // execute class instance action.
            this.classDecoractors.forEach((act, key) => {
                act.execute(this, {
                    metadata: Reflect.getMetadata(key, ClassT),
                    instance: instance
                }, ActionType.bindInstance);
            });

            this.methodDecoractors.forEach((act, key) => {
                act.execute(this, {
                    methodMetadata: Reflect.getMetadata(key, ClassT),
                    instance: instance
                }, ActionType.bindMethod);
            })

            if (singleton) {
                this.singleton.set(key, instance);
            }
            return instance;
        };

        this.classDecoractors.forEach((action, decorator) => {
            let metadata: TypeMetadata[] = Reflect.getOwnMetadata(decorator, ClassT) as TypeMetadata[];
            action.execute(this, {
                metadata: metadata
            } as ProviderActionData, ActionType.provider);
        });


        return factory;
    }

    protected isSingletonType<T>(type: Type<T>): boolean {
        if (Reflect.hasOwnMetadata(Singleton.toString(), type)) {
            return true;
        }

        let singleton;
        this.classDecoractors.forEach((act, key) => {
            if (singleton) {
                return false;
            }
            let metadatas = Reflect.getMetadata(key, type) as ClassMetadata[] || [];
            if (isArray(metadatas)) {
                singleton = metadatas.some(m => m.singleton === true);
            }
            return true;
        })
        return singleton;
    }

    protected getParameterMetadata<T>(type: Type<T>, propertyKey?: string | symbol): Type<any>[] {

        let designParams: Type<any>[];
        if (propertyKey) {
            designParams = Reflect.getOwnMetadata('design:paramtypes', type, propertyKey) || [];
        } else {
            designParams = Reflect.getOwnMetadata('design:paramtypes', type) || [];
        }
        designParams = designParams.slice(0);
        designParams.forEach(ptype => {
            if (this.isVaildDependence(ptype)) {
                if (!this.has(ptype)) {
                    this.register(ptype);
                }
            }
        });
        if (designParams.length > 0) {
            this.paramDecoractors.forEach((v, name) => {
                let parameters = Reflect.getMetadata(name, type);
                v.execute(this, {
                    designMetadata: designParams,
                    paramMetadata: parameters
                }, ActionType.resetParamType);
            });
        }
        return designParams;
    }

    protected getPropMetadata<T>(type: Type<T>): PropertyMetadata[] {

        let restPropData = {
            props: []
        } as ResetPropData;

        this.propDecoractors.forEach((val, name) => {
            let prop = Reflect.getMetadata(name, type) || {} as ObjectMap<PropertyMetadata[]>;
            restPropData.propMetadata = prop;
            val.execute(this, restPropData, ActionType.resetPropType)
        });


        return restPropData.props;
    }
}


