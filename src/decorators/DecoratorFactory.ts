import 'reflect-metadata';
import { Type, } from '../Type';
import { PropertyMetadata, TypeMetadata, MethodMetadata, ParameterMetadata, Metadate } from '../metadatas';
import { DecoratorType } from './DecoratorType';
import { isUndefined, isFunction, isNumber, isArray, isSymbol } from 'util';
import { ArgsIterator } from './ArgsIterator';
import { isClass, isToken, isClassMetadata } from '../utils';
import { ObjectMap } from '../types';
import { IClassDecorator } from './index';



export interface MetadataAdapter {
    (args: ArgsIterator);
}

export interface MetadataExtends<T> {
    (metadata: T): T;
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
        // console.log('metadata: ', args, metadata);
        if (metadata) {
            return (...args: any[]) => {
                // console.log('some1 metadata: ', args, metadata);
                return storeMetadata(name, metaName, args, metadata, metadataExtends);
            }
        } else {
            if (args.length === 1) {
                if (!isClass(args[0])) {
                    return (...args: any[]) => {
                        // console.log('some2 metadata: ', args, metadata);
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
        if (args.length === 1 && !isToken(args[0])) {
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
            setTypeMetadata(name, metaName, target, metadata, metadataExtends);
            return target;
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
            throw new Error(`Invalid @${name} Decorator declaration.`);
    }
}

/**
 * get a class decorator's metatdata.
 *
 * @export
 * @template T
 * @param {Type<any>} target
 * @param {(string | Function)} metaName
 * @returns
 */
export function getTypeMetadata<T>(target: Type<any>, metaName: string | Function): T[] {
    let annotations = Reflect.getOwnMetadata(isFunction(metaName) ? metaName.toString() : metaName, target);
    annotations = isArray(annotations) ? annotations : [];
    return annotations;
}


function setTypeMetadata<T extends TypeMetadata>(name: string, metaName: string, target: Type<T>, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let annotations = getTypeMetadata(target, metaName);
    // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
    let typeMetadata = (metadata || {}) as T;
    if (!typeMetadata.type) {
        typeMetadata.type = target;
    }
    typeMetadata.decorator = name;
    if (metadataExtends) {
        typeMetadata = metadataExtends(typeMetadata);
    }
    annotations.push(typeMetadata);
    Reflect.defineMetadata(metaName, annotations, target);
}

/**
 * get method action data.
 *
 * @export
 * @template T
 * @param {Type<any>} target
 * @param {(string | Function)} metaName
 * @returns {ObjectMap<T[]>}
 */
export function getMethodMetadata<T>(target: Type<any>, metaName: string | Function): ObjectMap<T[]> {
    let meta = Reflect.getOwnMetadata(isFunction(metaName) ? metaName.toString() : metaName, target);
    meta = isArray(meta) ? {} : (meta || {});
    return meta;
}

function setMethodMetadata<T extends MethodMetadata>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let meta = getMethodMetadata(target, metaName);
    meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];

    // let designParams = Reflect.getMetadata('design:paramtypes', target, propertyKey);
    // console.log('setMethodMetadata', propertyKey, designParams);
    let methodMeadata = (metadata || {}) as T;
    methodMeadata.decorator = name;
    methodMeadata.propertyKey = propertyKey;
    methodMeadata.descriptor = descriptor;
    if (metadataExtends) {
        methodMeadata = metadataExtends(methodMeadata);
    }
    meta[propertyKey].unshift(methodMeadata);
    Reflect.defineMetadata(metaName, meta, target.constructor);
}


/**
 * get property metadata.
 *
 * @export
 * @template T
 * @param {Type<any>} target
 * @param {(string | Function)} metaName
 * @returns {ObjectMap<T[]>}
 */
export function getPropertyMetadata<T>(target: Type<any>, metaName: string | Function): ObjectMap<T[]> {
    let meta = Reflect.getOwnMetadata(isFunction(metaName) ? metaName.toString() : metaName, target);
    meta = isArray(meta) ? {} : (meta || {});
    return meta;
}

function setPropertyMetadata<T extends PropertyMetadata>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let meta = getPropertyMetadata(target, metaName);
    let propmetadata = (metadata || {}) as T;

    propmetadata.propertyKey = propertyKey;
    propmetadata.decorator = name;
    if (!propmetadata.type) {
        let t = Reflect.getOwnMetadata('design:type', target, propertyKey);
        if (!t) {
            // Needed to support react native inheritance
            t = Reflect.getOwnMetadata('design:type', target.constructor, propertyKey);
        }
        propmetadata.type = t;
    }

    if (metadataExtends) {
        propmetadata = metadataExtends(propmetadata);
    }

    meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];
    meta[propertyKey].unshift(propmetadata);
    Reflect.defineMetadata(metaName, meta, target.constructor);
}


/**
 * get paramerter metadata.
 *
 * @export
 * @template T
 * @param {Type<any>} target
 * @param {(string | Function)} metaName
 * @param {(string | symbol)} propertyKey
 * @returns {T[][]}
 */
export function getParamMetadata<T>(target: Type<any>, metaName: string | Function, propertyKey: string | symbol): T[][] {
    let parameters = Reflect.getOwnMetadata(isFunction(metaName) ? metaName.toString() : metaName, target, propertyKey);
    parameters = isArray(parameters) ? parameters : [];
    return parameters;
}

function setParamMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, parameterIndex: number, metadata?: T, metadataExtends?: MetadataExtends<any>) {

    let parameters: any[][] = getParamMetadata(target, metaName, propertyKey);
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
    parameters[parameterIndex].push(paramMeadata);
    Reflect.defineMetadata(metaName, parameters, target, propertyKey);
}
