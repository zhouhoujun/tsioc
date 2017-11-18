import 'reflect-metadata';
import { IContainer } from './IContainer';
import { Token, Factory, ObjectMap, SymbolType, ToInstance } from './types';
import { Registration } from './Registration';
import { Injectable, InjectableMetadata } from './decorators/Injectable';
import { Type, AbstractType } from './Type';
import { AutoWired, AutoWiredMetadata } from './decorators/AutoWried';
import { ParameterMetadata } from './decorators/Metadata';
import { PropertyMetadata } from './decorators/Metadata';
import { Inject, InjectMetadata } from './decorators/Inject';
import { Param } from './decorators/Param';
import { Singleton, SingletonMetadata } from './decorators/Singleton';
import { DecoratorAction, ParamPropDecoratorAction, ParamDecoratorAction, PropDecoratorAction, ClassDecoratorAction } from './DecoratorAction';
import { DecoratorType } from './decorators/DecoratorType';


export const NOT_FOUND = new Object();

/**
 * Container.
 */
export class Container implements IContainer {

    protected factories: Map<Token<any>, any>;
    protected singleton: Map<Token<any>, any>;
    protected classDecoractors: Map<string, ClassDecoratorAction<any>>;
    protected methodDecoractors: Map<string, DecoratorAction<any>>;
    protected propDecoractors: Map<string, PropDecoratorAction<any>>;
    protected paramDecoractors: Map<string, ParamDecoratorAction<any>>;
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
     * has token.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {boolean}
     * @memberof Container
     */
    has<T>(token: Token<T>): boolean {
        let key = this.getTokenKey(token);
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
     * register decorator.
     *
     * @template T
     * @param {Function} decirator
     * @param {DecoratorAction<T>} actions
     * @memberof Container
     */
    registerDecorator<T>(decirator: Function, actions: DecoratorAction<T>) {
        if (!actions.type) {
            actions.type = this.getDecoratorType(decirator);
        }
        if (!actions.name) {
            actions.name = decirator.toString();
        }
        if (actions.type & DecoratorType.Class) {
            this.cacheDecorator(this.classDecoractors, actions);
        }
        if (actions.type & DecoratorType.Method) {
            this.cacheDecorator(this.methodDecoractors, actions);
        }
        if (actions.type & DecoratorType.Property) {
            this.cacheDecorator(this.propDecoractors, actions);
        }
        if (actions.type & DecoratorType.Parameter) {
            this.cacheDecorator(this.paramDecoractors, actions);
        }
    }

    protected cacheDecorator<T>(map: Map<string, DecoratorAction<T>>, action: DecoratorAction<T>) {
        if (!map.has(action.name)) {
            map.set(action.name, action);
        }
    }

    protected init() {
        this.factories = new Map<Token<any>, any>();
        this.singleton = new Map<Token<any>, any>();
        this.classDecoractors = new Map<string, ClassDecoratorAction<any>>();
        this.methodDecoractors = new Map<string, DecoratorAction<any>>();
        this.paramDecoractors = new Map<string, ParamDecoratorAction<any>>();
        this.propDecoractors = new Map<string, PropDecoratorAction<any>>();

        this.registerDefautDecorators();
        this.register(Date);
        this.register(String);
        this.register(Number);
        this.register(Boolean);
        this.register(Object);
    }

    protected getDecoratorType(decirator: any): DecoratorType {
        return decirator.decoratorType || DecoratorType.All;
    }

    protected registerDefautDecorators() {
        this.registerDecorator<InjectableMetadata>(Injectable, {
            getType: (metadata) => metadata.type
        });

        this.registerDecorator<AutoWiredMetadata>(AutoWired, {
            getType: (metadata) => metadata.type,
            toMetadataList: (props) => {
                return this.concatPropMetadata(props);
            },
            resetParamType: (designParams: Type<any>[], metadata) => {
                return this.resetDesignParams(designParams, metadata);
            }
        } as ParamPropDecoratorAction<AutoWiredMetadata>);

        this.registerDecorator<InjectMetadata>(Inject, {
            getType: (metadata) => metadata.type,
            toMetadataList: (props) => {
                return this.concatPropMetadata(props);
            },
            resetParamType: (designParams: Type<any>[], metadata) => {
                return this.resetDesignParams(designParams, metadata);
            }
        } as ParamPropDecoratorAction<InjectMetadata>);

        this.registerDecorator<SingletonMetadata>(Singleton, {
            getType: (metadata) => metadata.type
        });

        this.registerDecorator<ParameterMetadata>(Param, {
            getType: (metadata) => metadata.type,
            resetParamType: (designParams: Type<any>[], metadata) => {
                return this.resetDesignParams(designParams, metadata);
            }
        } as ParamDecoratorAction<ParameterMetadata>);
    }

    protected concatPropMetadata<T>(props: ObjectMap<T>) {
        if (Array.isArray(props)) {
            props = {};
        }
        let list = [];
        for (let n in props) {
            list = list.concat(props[n]);
        }

        return list;
    }

    protected resetDesignParams(designParams: Type<any>[], parameters) {
        if (Array.isArray(parameters) && parameters.length > 0) {
            parameters.forEach(params => {
                let parm = Array.isArray(params) && params.length > 0 ? params[0] : params;
                if (parm && parm.index >= 0 && parm.type) {
                    designParams[parm.index] = parm.type;
                }
            });
        }
    }


    protected getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        if (token instanceof Registration) {
            return token.toString();
        } else {
            if (alias && typeof token === 'function') {
                return new Registration(token, alias).toString();
            }
            return token;
        }
    }

    protected registerFactory<T>(token: Token<T>, value?: Factory<T>, singleton?: boolean) {
        let key = this.getTokenKey(token);

        if (this.factories.has(key)) {
            return;
        }

        let classFactory;
        if (typeof value !== 'undefined') {
            if (typeof value === 'function') {
                if (value.constructor) {
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

        } else if (typeof token !== 'string' && typeof token !== 'symbol') {
            let ClassT = (token instanceof Registration) ? token.getClass() : token;
            classFactory = this.createTypeFactory(key, ClassT as Type<T>, singleton);
        }

        if (classFactory) {
            this.factories.set(key, classFactory);
        }
    }

    protected createCustomFactory<T>(key: SymbolType<T>, value?: ToInstance<T>, singleton?: boolean) {
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

    protected createTypeFactory<T>(key: SymbolType<T>, ClassT?: Type<T>, singleton?: boolean) {
        if (!Reflect.isExtensible(ClassT)) {
            return null;
        }
        let parameters = this.getParameterMetadata(ClassT);
        this.registerDependencies(...parameters);
        let props = this.getPropMetadata(ClassT);
        this.registerDependencies(...props.map(it => it.type));
        if (!singleton) {
            singleton = this.isSingletonType<T>(ClassT);
        }

        let factory = () => {
            if (singleton && this.singleton.has(key)) {
                return this.singleton.get(key);
            }

            let paramInstances = parameters.map((type, index) => this.get(type));
            let instance = new ClassT(...paramInstances);
            if (instance) {
                props.forEach((prop, idx) => {
                    instance[prop.propertyName] = this.get(prop.type);
                });
            }

            if (singleton) {
                this.singleton.set(key, instance);
            }
            return instance;
        };

        // register provider.
        let injectableConfig = Reflect.getOwnMetadata(Injectable.toString(), ClassT) as InjectableMetadata[];
        if (Array.isArray(injectableConfig) && injectableConfig.length > 0) {
            let jcfg = injectableConfig.find(c => c && !!(c.provider || c.alias));
            if (jcfg) {
                let providerKey = this.getTokenKey(jcfg.provider, jcfg.alias);
                this.factories.set(providerKey, factory);
            }
        }

        return factory;
    }

    protected isSingletonType<T>(type: Type<T>): boolean {
        return Reflect.hasOwnMetadata(Singleton.toString(), type);
    }

    protected getParameterMetadata<T>(type: Type<T>): Type<any>[] {
        let designParams: Type<any>[] = Reflect.getOwnMetadata('design:paramtypes', type) || [];
        designParams = designParams.slice(0);
        if (designParams.length > 0) {
            this.paramDecoractors.forEach((v, name) => {
                let parameters = Reflect.getMetadata(name, type);
                if (v.resetParamType) {
                    v.resetParamType(designParams, parameters);
                }
            });
        }
        return designParams;
    }

    protected getPropMetadata<T>(type: Type<T>): PropertyMetadata[] {

        let props = [];

        this.propDecoractors.forEach((val, name) => {
            let prop = Reflect.getMetadata(name, type) || {} as ObjectMap<PropertyMetadata[]>;
            if (val.toMetadataList) {
                props = props.concat(val.toMetadataList(prop));
            }
        });


        return props;
    }

    protected registerDependencies<T>(...deps: Token<T>[]) {
        deps.forEach(depType => {
            if (this.has(depType)) {
                return;
            }
            let injectableConfig: any[] = Reflect.getMetadata(Injectable.toString(), depType);
            if (injectableConfig && injectableConfig.length > 0) {
                this.register(depType);
            }
        });
    }
}


