import 'reflect-metadata';
import { DecoratorType } from './DecoratorType';
import { ArgsIteratorContext, ArgsIteratorAction } from './ArgsIterator';
import {
    isClass, isAbstractClass, isMetadataObject, isUndefined,
    isFunction, isNumber, isArray, lang
} from '../utils/lang';
import { Type, AbstractType, ObjectMap, ClassType } from '../types';
import { Metadate } from '../metadatas/Metadate';
import { ClassMetadata } from '../metadatas/ClassMetadata';
import { MethodMetadata } from '../metadatas/MethodMetadata';
import { PropertyMetadata } from '../metadatas/PropertyMetadata';
import { ParameterMetadata } from '../metadatas/ParameterMetadata';
import { clsUglifyExp, STRIP_COMMENTS, ARGUMENT_NAMES } from '../utils/exps';


export const ParamerterName = 'paramerter_names';

/**
 * extend metadata.
 *
 * @export
 * @interface MetadataExtends
 * @template T
 */
export interface MetadataExtends<T = any> {
    (metadata: T): void;
}

export interface MetadataTarget<T> {
    (target: Type | object): Type | object
}

/**
 * decorator for all.
 *
 * @export
 * @interface IDecorator
 * @template T
 */
export interface IDecorator<T extends Metadate> {
    /**
     * define decorator setting with params.
     *
     * @param {(Type | symbol | string)} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provider: string | symbol | Type, alias?: string): any;
    /**
     * define decorator setting with metadata map.
     *
     * @param {T} [metadata] metadata map.
     */
    (metadata?: T): any;
    (target: Type): void;
    (target: object, propertyKey: string | symbol): void;
    (target: object, propertyKey: string | symbol, parameterIndex: number): void;
    (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): void;
}

/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction[]} [actions]  metadata iterator actions.
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*}
 */
export function createDecorator<T>(name: string, actions?: ArgsIteratorAction<T>[], metadataExtends?: MetadataExtends<T>): any {
    let metaName = `@${name}`;

    let factory = (...args: any[]) => {
        let metadata: T = null;
        if (args.length < 1) {
            return (...args: any[]) => {
                return storeMetadata(name, metaName, args, metadata, metadataExtends);
            }
        }
        metadata = argsToMetadata<T>(args, actions);
        if (metadata) {
            return (...args: any[]) => {
                return storeMetadata(name, metaName, args, metadata, metadataExtends);
            }
        } else {
            if (args.length === 1) {
                if (!isClass(args[0])) {
                    return (...args: any[]) => {
                        return storeMetadata(name, metaName, args, metadata, metadataExtends);
                    };
                }
            }
        }

        return storeMetadata(name, metaName, args, metadata, metadataExtends);
    }

    factory.toString = () => metaName;
    (<any>factory).decoratorType = DecoratorType.Decorator;
    return factory;
}

function argsToMetadata<T extends Metadate>(args: any[], actions?: ArgsIteratorAction<T>[]): T {
    let metadata: T = null;
    if (args.length) {
        if (args.length === 1 && isMetadataObject(args[0])) {
            metadata = args[0];
        } else if (actions) {
            let ctx = new ArgsIteratorContext<T>(args);
            lang.execAction(actions, ctx);
            metadata = ctx.getMetadate();
        }
    }
    return metadata;
}


function storeMetadata<T>(name: string, metaName: string, args: any[], metadata?: any, metadataExtends?: MetadataExtends<T>): any {
    let target;
    switch (args.length) {
        case 1:
            target = args[0];
            if (isClass(target) || isAbstractClass(target)) {
                setTypeMetadata(name, metaName, target, metadata, metadataExtends);
                return target;
            }
            break;
        case 2:
            target = args[0];
            let propertyKey = args[1];
            setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends);
            break;
        case 3:
            if (isNumber(args[2])) {
                target = args[0];
                let propertyKey = args[1];
                let parameterIndex = args[2];
                setParamMetadata(name, metaName, target, propertyKey, parameterIndex, metadata, metadataExtends);
            } else if (isUndefined(args[2])) {
                target = args[0];
                let propertyKey = args[1];
                setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends);
            } else {
                target = args[0];
                let propertyKey = args[1];
                let descriptor = args[2] as TypedPropertyDescriptor<any>;
                if (!descriptor) {
                    return;
                }
                // is set get or not.
                if (descriptor.set || descriptor.get) {
                    setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends);
                } else {
                    setMethodMetadata(name, metaName, target, propertyKey, descriptor, metadata, metadataExtends);
                }
                return descriptor;
            }
            break;
        default:
            throw new Error(`Invalid @${name} Decorator declaration.`);
    }
}

/**
 * get all class metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type} target
 * @returns
 */
export function getTypeMetadata<T>(decorator: string | Function, target: Type | AbstractType<T>): T[] {
    let annotations = Reflect.getOwnMetadata(isFunction(decorator) ? decorator.toString() : decorator, target);
    annotations = isArray(annotations) ? annotations : [];
    return annotations;
}

/**
 * get own class metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type} target
 * @returns
 */
export function getOwnTypeMetadata<T>(decorator: string | Function, target: Type | AbstractType<T>): T[] {
    let annotations = Reflect.getOwnMetadata(isFunction(decorator) ? decorator.toString() : decorator, target);
    annotations = isArray(annotations) ? annotations : [];
    return annotations;
}

/**
 * has class decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type | object)} target
 * @returns {boolean}
 */
export function hasClassMetadata(decorator: string | Function, target: Type | object): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasMetadata(name, target);
}

/**
 * has own class decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type | object)} target
 * @returns {boolean}
 */
export function hasOwnClassMetadata(decorator: string | Function, target: Type | object): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasOwnMetadata(name, target);
}


function setTypeMetadata<T extends ClassMetadata>(name: string, metaName: string, target: Type<T> | AbstractType<T>, metadata?: T, metadataExtends?: MetadataExtends) {
    let annotations = getOwnTypeMetadata(metaName, target).slice(0);
    let typeMetadata = (metadata || {}) as T;
    if (!typeMetadata.type) {
        typeMetadata.type = target;
    }
    typeMetadata.decorator = name;

    if (metadataExtends) {
        metadataExtends(typeMetadata);
    }
    annotations.unshift(typeMetadata);

    setParamerterNames(target);
    Reflect.defineMetadata(metaName, annotations, target);
}

let methodMetadataExt = '__method';
/**
 * get all method metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type} target
 * @returns {ObjectMap<T[]>}
 */
export function getMethodMetadata<T extends MethodMetadata = MethodMetadata>(decorator: string | Function, target: ClassType): ObjectMap<T[]> {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getMetadata(name + methodMetadataExt, target);
    if (!meta || isArray(meta) || !lang.hasField(meta)) {
        meta = Reflect.getMetadata(name + methodMetadataExt, target.constructor);
    }
    return isArray(meta) ? {} : (meta || {});
}

/**
 * get own method metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {ClassType} target
 * @returns {ObjectMap<T[]>}
 */
export function getOwnMethodMetadata<T extends MethodMetadata = MethodMetadata>(decorator: string | Function, target: ClassType): ObjectMap<T[]> {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getOwnMetadata(name + methodMetadataExt, target);
    if (!meta || isArray(meta) || !lang.hasField(meta)) {
        meta = Reflect.getOwnMetadata(name + methodMetadataExt, target.constructor);
    }
    return isArray(meta) ? {} : (meta || {});
}

/**
 * has own method decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {Type} target
 * @param {(string | symbol)} [propertyKey]
 * @returns {boolean}
 */
export function hasOwnMethodMetadata(decorator: string | Function, target: Type, propertyKey?: string | symbol): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        let meta = getOwnMethodMetadata(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    } else {
        return Reflect.hasOwnMetadata(name + methodMetadataExt, target);
    }
}

/**
 * has method decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {Type} target
 * @param {(string | symbol)} [propertyKey]
 * @returns {boolean}
 */
export function hasMethodMetadata(decorator: string | Function, target: Type, propertyKey?: string | symbol): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        let meta = getMethodMetadata(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    } else {
        return Reflect.hasMetadata(name + methodMetadataExt, target);
    }
}

function setMethodMetadata<T extends MethodMetadata>(name: string, metaName: string, target: Type<T>, propertyKey: string, descriptor: TypedPropertyDescriptor<T>, metadata?: T, metadataExtends?: MetadataExtends) {
    let meta = { ...getOwnMethodMetadata(metaName, target) };
    meta[propertyKey] = meta[propertyKey] || [];

    let methodMeadata = (metadata || {}) as T;
    methodMeadata.decorator = name;
    methodMeadata.propertyKey = propertyKey;
    // methodMeadata.descriptor = descriptor;
    if (metadataExtends) {
        metadataExtends(methodMeadata);
    }
    meta[propertyKey].unshift(methodMeadata);
    Reflect.defineMetadata(metaName + methodMetadataExt, meta, target.constructor);
}

const propertyMetadataExt = '__props';
/**
 * get all property metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type} target
 * @returns {ObjectMap<T[]>}
 */
export function getPropertyMetadata<T extends PropertyMetadata>(decorator: string | Function, target: ClassType): ObjectMap<T[]> {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getMetadata(name + propertyMetadataExt, target);
    if (!meta || isArray(meta) || !lang.hasField(meta)) {
        meta = Reflect.getMetadata(name + propertyMetadataExt, target.constructor);
    }
    return isArray(meta) ? {} : (meta || {});
}

/**
 * get own property metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type} target
 * @returns {ObjectMap<T[]>}
 */
export function getOwnPropertyMetadata<T extends PropertyMetadata>(decorator: string | Function, target: ClassType): ObjectMap<T[]> {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getOwnMetadata(name + propertyMetadataExt, target);
    if (!meta || isArray(meta) || !lang.hasField(meta)) {
        meta = Reflect.getOwnMetadata(name + propertyMetadataExt, target.constructor);
    }
    return isArray(meta) ? {} : (meta || {});
}


/**
 * has property decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {Type} target
 * @param {(string | symbol)} [propertyKey]
 * @returns {boolean}
 */
export function hasPropertyMetadata(decorator: string | Function, target: Type, propertyKey?: string | symbol): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        let meta = getPropertyMetadata<any>(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    } else {
        return Reflect.hasMetadata(name + propertyMetadataExt, target);
    }
}

function setPropertyMetadata<T extends PropertyMetadata>(name: string, metaName: string, target: Type<T>, propertyKey: string, metadata?: T, metadataExtends?: MetadataExtends) {
    let meta = { ...getOwnPropertyMetadata(metaName, target) };
    let propmetadata = (metadata || {}) as T;

    propmetadata.propertyKey = propertyKey;
    propmetadata.decorator = name;
    if (!propmetadata.type) {
        let t = Reflect.getMetadata('design:type', target, propertyKey);
        if (!t) {
            // Needed to support react native inheritance
            t = Reflect.getMetadata('design:type', target.constructor, propertyKey);
        }
        propmetadata.type = t;
    }

    if (metadataExtends) {
        metadataExtends(propmetadata);
    }

    if (!meta[propertyKey] || !isArray(meta[propertyKey])) {
        meta[propertyKey] = [];
    }

    meta[propertyKey].unshift(propmetadata);
    Reflect.defineMetadata(metaName + propertyMetadataExt, meta, target.constructor);
}


const paramsMetadataExt = '__params';
/**
 * get paramerter metadata of one specail decorator in target method.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {(Type | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {T[][]}
 */
export function getParamMetadata<T extends ParameterMetadata>(decorator: string | Function, target: Type | object, propertyKey?: string | symbol): T[][] {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let parameters = Reflect.getMetadata(name + paramsMetadataExt, target, propertyKey);
    parameters = isArray(parameters) ? parameters : [];
    return parameters;
}

/**
 * get own paramerter metadata of one specail decorator in target method.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {(Type | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {T[][]}
 */
export function getOwnParamMetadata<T extends ParameterMetadata>(decorator: string | Function, target: Type | object, propertyKey?: string | symbol): T[][] {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let parameters = Reflect.getOwnMetadata(name + paramsMetadataExt, target, propertyKey);
    parameters = isArray(parameters) ? parameters : [];
    return parameters;
}

/**
 * has param decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {boolean}
 */
export function hasParamMetadata(decorator: string | Function, target: Type | object, propertyKey?: string | symbol): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasMetadata(name + paramsMetadataExt, target, propertyKey);
}

/**
 * has param decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {boolean}
 */
export function hasOwnParamMetadata(decorator: string | Function, target: Type | object, propertyKey?: string | symbol): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasOwnMetadata(name + paramsMetadataExt, target, propertyKey);
}


function setParamMetadata<T extends ParameterMetadata>(name: string, metaName: string, target: Type<T>, propertyKey: string, parameterIndex: number, metadata?: T, metadataExtends?: MetadataExtends) {

    let parameters: any[][] = getOwnParamMetadata(metaName, target, propertyKey).slice(0);
    // there might be gaps if some in between parameters do not have annotations.
    // we pad with nulls.
    while (parameters.length <= parameterIndex) {
        parameters.push(null);
    }

    parameters[parameterIndex] = parameters[parameterIndex] || [];

    let paramMeadata = (metadata || {}) as ParameterMetadata;

    if (!paramMeadata.type) {
        let t = Reflect.getOwnMetadata('design:type', target, propertyKey);
        if (!t) {
            // Needed to support react native inheritance
            t = Reflect.getOwnMetadata('design:type', target.constructor, propertyKey);
        }
        paramMeadata.type = t;
    }
    paramMeadata.propertyKey = propertyKey;
    paramMeadata.decorator = name;
    paramMeadata.index = parameterIndex;
    if (metadataExtends) {
        metadataExtends(paramMeadata);
    }
    parameters[parameterIndex].unshift(paramMeadata);
    Reflect.defineMetadata(metaName + paramsMetadataExt, parameters, target, propertyKey);
}


/**
 * get all method paramerter names.
 *
 * @export
 * @param {ClassType} target
 * @returns {ObjectMap<string[]>}
 */
export function getParamerterNames(target: ClassType): ObjectMap<string[]>;
/**
 * get paramerter names.
 *
 * @template T
 * @param {Type<T>} type
 * @param {string} propertyKey
 * @returns {string[]}
 * @memberof LifeScope
 */
export function getParamerterNames(target: ClassType<any>, propertyKey: string): string[];
export function getParamerterNames(target: ClassType<any>, propertyKey?: string): any {
    let meta = Reflect.getMetadata(ParamerterName, target);
    if (!meta || isArray(meta) || !lang.hasField(meta)) {
        meta = Reflect.getMetadata(ParamerterName, target.constructor);
    }
    let metadata = isArray(meta) ? {} : (meta || {});
    if (propertyKey) {
        let paramNames = [];
        if (metadata && metadata.hasOwnProperty(propertyKey)) {
            paramNames = metadata[propertyKey]
        }
        if (!isArray(paramNames)) {
            paramNames = [];
        }
        return paramNames;
    } else {
        return metadata;
    }
}

export function setParamerterNames(target: ClassType) {
    let meta = { ...getParamerterNames(target) };
    let descriptors = Object.getOwnPropertyDescriptors(target.prototype);
    let isUglify = clsUglifyExp.test(target.name);
    let anName = '';
    let classAnnations = lang.getClassAnnations(target);

    if (classAnnations && classAnnations.params) {
        anName = classAnnations.name;
        meta = Object.assign(meta, classAnnations.params);
    }
    if (!isUglify && target.name !== anName) {
        lang.forIn(descriptors, (item, name) => {
            if (name !== 'constructor') {
                if (item.value) {
                    meta[name] = getParamNames(item.value)
                }
                if (item.set) {
                    meta[name] = getParamNames(item.set);
                }
            }
        });
        meta['constructor'] = getParamNames(target.prototype.constructor);
    }
    // fix bug inherit with no constructor
    if (meta['constructor'].length === 0) {
        lang.forInClassChain(target, child => {
            let names = getParamNames(child.prototype.constructor);
            if (names.length) {
                meta['constructor'] = names;
                return false;
            }
            return true;
        })
    }

    Reflect.defineMetadata(ParamerterName, meta, target);
}

function getParamNames(func) {
    if (!isFunction(func)) {
        return [];
    }
    let fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null) {
        result = [];
    }
    return result;
}

