import 'reflect-metadata';
import { IContainer } from './IContainer';
import { Token, Factory } from './types';
import { Registration } from './Registration';
import { Injectable } from './decorators/Injectable';
import { Type } from './Type';
import { AutoWired, AutoWiredMetadata } from './decorators/AutoWried';


export const NOT_FOUND = new Object();

/**
 * Container.
 */
export class Container implements IContainer {
    private factories: Map<Token<any>, any>;
    private singleton: Map<Token<any>, any>;
    constructor() {
        this.factories = new Map<Token<any>, any>();
    }

    /**
     * get instance via token.
     * @template T
     * @param {Token<T>} [token]
     * @param {T} [notFoundValue]
     * @returns {T}
     *
     * @memberOf DefaultInjectableor
     */
    get<T>(token?: Token<T>, notFoundValue?: T): T {
        if (!this.factories.has(token)) {
            return notFoundValue === undefined ? (NOT_FOUND as T) : notFoundValue;
        }
        let factory = this.factories.get(token);
        return factory() as T;
    }

    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @memberOf Injectableor
     */
    register<T>(token: Token<T>, value?: Factory<T>) {
        this.registerFactory(token, value);
    }

    has<T>(token: Token<T>) {
        let key = this.getTokenKey(token);
        return this.factories.has(key);
    }

    /**
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     *
     * @memberOf Injectableor
     */
    registerSingleton<T>(token: Token<T>, value?: T) {
        this.registerFactory(token, value, true);
    }

    protected getTokenKey<T>(token: Token<T>) {
        return (token instanceof Registration) ? token.toString() : token;
    }

    protected registerFactory<T>(token: Token<T>, value?: T, singleton?: boolean) {
        let key = this.getTokenKey(token);
        if (this.factories.has(key)) {
            return;
        }

        let classFactory;
        if (value && typeof value === 'function') {
            classFactory = this.createCustomFactory(key, value, singleton);
        } else if (value !== undefined) {
            let symbolValue = value;
            classFactory = () => {
                return symbolValue;
            }
        } else if (typeof token !== 'string' && typeof token !== 'symbol') {
            classFactory = this.createTypeFactory(key, token, singleton);
        } else {
            let symbolValue = value;
            classFactory = () => {
                return symbolValue;
            }
        }

        this.factories.set(key, classFactory);
    }

    createCustomFactory<T>(key: string | symbol | Type<T>, value?: (container?: IContainer) => T, singleton?: boolean) {
        return () => {
            if (singleton && this.singleton.has(key)) {
                return this.singleton.get(key);
            }
            let instance = value(this);
            if (singleton) {
                this.singleton.set(key, instance);
            }
            return instance;
        }
    }

    createTypeFactory<T>(key: string | symbol | Type<T>, token?: Type<T> | Registration<T>, singleton?: boolean) {
        let ClassT = (token instanceof Registration) ? token.getClass() : token;
        let parameters = this.getParameterMetadata(ClassT);
        this.registerDependencies(...parameters);
        let props = this.getAutoWriedMetadata(ClassT);
        this.registerDependencies(...props.map(it => it.type));

        return () => {
            if (singleton && this.singleton.has(key)) {
                return this.singleton.get(key);
            }

            let paramInstances = parameters.map((ParamClass, index) => this.get(ParamClass));
            let instance = new ClassT(...paramInstances);
            if (instance) {
                props.forEach((prop, idx) => {
                    instance[prop.bindingPropertyName] = this.get(prop.type);
                });
            }

            if (singleton) {
                this.singleton.set(key, instance);
            }
            return instance;
        };
    }

    protected getParameterMetadata<T>(type: Type<T>): Type<T>[] {
        let parameters: Type<T>[] = Reflect.getMetadata('autofac:parameters', type) || [];
        return parameters;
    }

    protected getAutoWriedMetadata<T>(type: Type<T>): AutoWiredMetadata[] {
        let parameters: AutoWiredMetadata[] = Reflect.getMetadata('autofac:AutoWired', type) || [];
        return parameters;
    }

    protected registerDependencies<T>(...deps: Token<T>[]) {
        deps.forEach(Deptype => {
            let InjectableConfig = Reflect.getMetadata('autofac:Injectable', Deptype);
            if (InjectableConfig) {
                this.register(Deptype, InjectableConfig);
            }
        });
    }
}


