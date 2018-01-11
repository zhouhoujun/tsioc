import 'reflect-metadata';
import { Type } from '../../Type';
import { PropertyMetadata, MethodMetadata, ParameterMetadata, Metadate, ClassMetadata } from '../metadatas/index';
import { DecoratorType } from './DecoratorType';
import { ArgsIterator } from './ArgsIterator';
import { isClass, isToken, isClassMetadata, isMetadataObject, isUndefined, isFunction, isNumber, isArray, isSymbol } from '../../utils/index';
import { ObjectMap } from '../../types';
import { IClassDecorator } from './ClassDecoratorFactory';


export const ParamerterName = 'paramerter_names';

export interface MetadataAdapter {
    (args: ArgsIterator);
}

/**
 * extend metadata.
 *
 * @export
 * @interface MetadataExtends
 * @template T
 */
export interface MetadataExtends<T> {
    (metadata: T): T;
}

export interface MetadataTarget<T> {
    (target: Type<any> | object): Type<any> | object
}

/**
 * decorator for all.
 *
 * @export
 * @interface IDecorator
 * @template T
 */
export interface IDecorator<T extends Metadate> {
    (provider: string | Type<any>, alias?: string): any;
    (metadata?: T): any;
    (target: Type<any>): void;
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
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*}
 */
export function createDecorator<T>(name: string, adapter?: MetadataAdapter, metadataExtends?: MetadataExtends<T>): any {
    let metaName = `@${name}`;

    let factory = (...args: any[]) => {
        let metadata: T = null;
        if (args.length < 1) {
            return (...args: any[]) => {
                return storeMetadata(name, metaName, args, metadata, metadataExtends);
            }
        }
        metadata = argsToMetadata(args, adapter);
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
    (<any>factory).decoratorType = DecoratorType.All;
    return factory;
}

function argsToMetadata<T>(args: any[], adapter?: MetadataAdapter): T {
    let metadata: T = null;
    if (args.length) {
        if (args.length === 1 && isMetadataObject(args[0])) {
            metadata = args[0];
        } else if (adapter) {
            let iterator = new ArgsIterator(args);
            adapter(iterator);
            metadata = iterator.getMetadata() as T;
        }
    }
    return metadata;
}


function storeMetadata<T>(name: string, metaName: string, args: any[], metadata?: any, metadataExtends?: MetadataExtends<T>) {
    let target;
    switch (args.length) {
        case 1:
            target = args[0];
            if (isClass(target)) {
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
                let descriptor = args[2];
                setMethodMetadata(name, metaName, target, propertyKey, descriptor, metadata, metadataExtends);
                return descriptor;
            }
            break;
        default:
            console.log('args:', args);
            throw new Error(`Invalid @${name} Decorator declaration.`);
    }
}

/**
 * get all class metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns
 */
export function getTypeMetadata<T>(decorator: string | Function, target: Type<any>): T[] {
    let annotations = Reflect.getMetadata(isFunction(decorator) ? decorator.toString() : decorator, target);
    annotations = isArray(annotations) ? annotations : [];
    return annotations;
}

/**
 * get own class metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns
 */
export function getOwnTypeMetadata<T>(decorator: string | Function, target: Type<any>): T[] {
    let annotations = Reflect.getOwnMetadata(isFunction(decorator) ? decorator.toString() : decorator, target);
    annotations = isArray(annotations) ? annotations : [];
    return annotations;
}

/**
 * has class decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @returns {boolean}
 */
export function hasClassMetadata(decorator: string | Function, target: Type<any> | object): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasMetadata(name, target);
}


function setTypeMetadata<T extends ClassMetadata>(name: string, metaName: string, target: Type<T>, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let annotations = getOwnTypeMetadata(metaName, target);
    // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
    let typeMetadata = (metadata || {}) as T;
    if (!typeMetadata.type) {
        typeMetadata.type = target;
    }
    typeMetadata.decorator = name;

    if (metadataExtends) {
        typeMetadata = metadataExtends(typeMetadata);
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
 * @param {Type<any>} target
 * @returns {ObjectMap<T[]>}
 */
export function getMethodMetadata<T extends MethodMetadata>(decorator: string | Function, target: Type<any>): ObjectMap<T[]> {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getMetadata(name + methodMetadataExt, target);
    if (!meta || isArray(meta) || Object.keys(meta).length < 0) {
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
 * @param {Type<any>} target
 * @returns {ObjectMap<T[]>}
 */
export function getOwnMethodMetadata<T extends MethodMetadata>(decorator: string | Function, target: Type<any>): ObjectMap<T[]> {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getOwnMetadata(name + methodMetadataExt, target);
    if (!meta || isArray(meta) || Object.keys(meta).length < 0) {
        meta = Reflect.getOwnMetadata(name + methodMetadataExt, target.constructor);
    }
    return isArray(meta) ? {} : (meta || {});
}

/**
 * has method decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @param {(string | symbol)} [propertyKey]
 * @returns {boolean}
 */
export function hasMethodMetadata(decorator: string | Function, target: Type<any>, propertyKey?: string | symbol): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        let meta = getMethodMetadata<any>(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    } else {
        return Reflect.hasMetadata(name + methodMetadataExt, target);
    }
}

function setMethodMetadata<T extends MethodMetadata>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let meta = getOwnMethodMetadata(metaName, target);
    meta[propertyKey] = meta[propertyKey] || [];

    let methodMeadata = (metadata || {}) as T;
    methodMeadata.decorator = name;
    methodMeadata.propertyKey = propertyKey;
    // methodMeadata.descriptor = descriptor;

    if (metadataExtends) {
        methodMeadata = metadataExtends(methodMeadata);
    }
    meta[propertyKey].unshift(methodMeadata);
    Reflect.defineMetadata(metaName + methodMetadataExt, meta, target.constructor);
}

let propertyMetadataExt = '__props';
/**
 * get all property metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns {ObjectMap<T[]>}
 */
export function getPropertyMetadata<T extends PropertyMetadata>(decorator: string | Function, target: Type<any>): ObjectMap<T[]> {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getMetadata(name + propertyMetadataExt, target);
    if (!meta || isArray(meta) || Object.keys(meta).length < 0) {
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
 * @param {Type<any>} target
 * @returns {ObjectMap<T[]>}
 */
export function getOwnPropertyMetadata<T extends PropertyMetadata>(decorator: string | Function, target: Type<any>): ObjectMap<T[]> {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getOwnMetadata(name + propertyMetadataExt, target);
    if (!meta || isArray(meta) || Object.keys(meta).length < 0) {
        meta = Reflect.getOwnMetadata(name + propertyMetadataExt, target.constructor);
    }
    return isArray(meta) ? {} : (meta || {});
}


/**
 * has property decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @param {(string | symbol)} [propertyKey]
 * @returns {boolean}
 */
export function hasPropertyMetadata(decorator: string | Function, target: Type<any>, propertyKey?: string | symbol): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        let meta = getPropertyMetadata<any>(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    } else {
        return Reflect.hasMetadata(name + propertyMetadataExt, target);
    }
}

function setPropertyMetadata<T extends PropertyMetadata>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let meta = getOwnPropertyMetadata(metaName, target);
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
        propmetadata = metadataExtends(propmetadata);
    }

    if (!meta[propertyKey] || !isArray(meta[propertyKey])) {
        meta[propertyKey] = [];
    }

    meta[propertyKey].unshift(propmetadata);
    Reflect.defineMetadata(metaName + propertyMetadataExt, meta, target.constructor);
}


let paramsMetadataExt = '__params';
/**
 * get paramerter metadata of one specail decorator in target method.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {T[][]}
 */
export function getParamMetadata<T extends ParameterMetadata>(decorator: string | Function, target: Type<any> | object, propertyKey?: string | symbol): T[][] {
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
 * @param {(Type<any> | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {T[][]}
 */
export function getOwnParamMetadata<T extends ParameterMetadata>(decorator: string | Function, target: Type<any> | object, propertyKey?: string | symbol): T[][] {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    let parameters = Reflect.getMetadata(name + paramsMetadataExt, target, propertyKey);
    parameters = isArray(parameters) ? parameters : [];
    return parameters;
}

/**
 * has param decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {boolean}
 */
export function hasParamMetadata(decorator: string | Function, target: Type<any> | object, propertyKey?: string | symbol): boolean {
    let name = isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasMetadata(name + paramsMetadataExt, target, propertyKey);
}

function setParamMetadata<T extends ParameterMetadata>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, parameterIndex: number, metadata?: T, metadataExtends?: MetadataExtends<any>) {

    let parameters: any[][] = getOwnParamMetadata(metaName, target, propertyKey);
    parameters = isArray(parameters) ? parameters : [];
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
        paramMeadata = metadataExtends(paramMeadata);
    }
    parameters[parameterIndex].unshift(paramMeadata);
    Reflect.defineMetadata(metaName + paramsMetadataExt, parameters, target, propertyKey);
}



export function getParamerterNames(target: Type<any>): ObjectMap<string[]> {
    let meta = Reflect.getMetadata(ParamerterName, target);
    if (!meta || isArray(meta) || Object.keys(meta).length < 0) {
        meta = Reflect.getMetadata(ParamerterName, target.constructor);
    }
    // console.log(target, '\n params:', meta);
    return isArray(meta) ? {} : (meta || {});
}

export function setParamerterNames(target: Type<any>) {
    let meta = getParamerterNames(target);
    let descriptors = Object.getOwnPropertyDescriptors(target.prototype);
    Object.keys(descriptors).forEach(name => {
        if (name !== 'constructor') {
            if (descriptors[name].value) {
                meta[name] = getParamNames(descriptors[name].value)
            }
            if (descriptors[name].set) {
                meta[name] = getParamNames(descriptors[name].set);
            }
        }
    });

    meta['constructor'] = getParamNames(target.prototype.constructor);


    Reflect.defineMetadata(ParamerterName, meta, target);
}

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    if (!isFunction(func)) {
        return [];
    }
    let fnStr = func.toString().replace(STRIP_COMMENTS, '');
    // console.log(fnStr);
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null) {
        result = [];
    }
    return result;
}

