import 'reflect-metadata';
import { Type } from '../Type';
import { PropertyMetadata, TypeMetadata, MethodMetadata, ParameterMetadata, Metadate } from '../metadatas';
import { DecoratorType } from './DecoratorType';
import { isUndefined, isFunction, isNumber, isArray, isSymbol } from 'util';
import { ArgsIterator } from './ArgsIterator';
import { isClass, isToken } from '../index';



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
    let metadata: T = null;
    let factory = (...args: any[]) => {
        if (args.length && adapter && !metadata) {
            let iterator = new ArgsIterator(args);
            adapter(iterator);
            metadata = iterator.getMetadata() as T;
            if (metadata) {
                return (...args: any[]) => {
                    factory(...args);
                    metadata = null;
                }
            }
        }
        // return checkArgs(name,metaName, args, metadata, metadataExtends);
        switch (args.length) {
            case 0:
                metadata = null;
                return (...args: any[]) => {
                    factory(...args);
                    metadata = null;
                }
            case 1:
                if (isClass(args[0])) {
                    let target = args[0];
                    setTypeMetadata<T>(name, metaName, target, metadata, metadataExtends);
                    metadata = null;
                    return target;
                } else {
                    if (!metadata) {
                        metadata = args[0];
                    }
                    return (...args: any[]) => {
                        factory(...args);
                        metadata = null;
                    }
                }
            case 2:
                let target = args[0];
                let propertyKey = args[1];
                setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends);
                break;
            case 3:
                if (isNumber(args[2])) {
                    let target = args[0];
                    let propertyKey = args[1];
                    let parameterIndex = args[2];
                    setParamMetadata<T>(name, metaName, target, propertyKey, parameterIndex, metadata, metadataExtends);
                } else if (isUndefined(args[2])) {
                    let target = args[0];
                    let propertyKey = args[1];
                    setPropertyMetadata<T>(name, metaName, target, propertyKey, metadata, metadataExtends);
                } else {
                    let target = args[0];
                    let propertyKey = args[1];
                    let descriptor = args[2];
                    setMethodMetadata<T>(name, metaName, target, propertyKey, descriptor, metadata, metadataExtends);
                    return descriptor;
                }
                break;
            default:
                throw new Error(`Invalid @${name} Decorator declaration.`);
        }
    };

    factory.toString = () => metaName;
    (<any>factory).decoratorType = DecoratorType.All;
    return factory;
}


// function checkArgs<T>(name: string, metaName: string, args: any[], metadata?: any, metadataExtends?: MetadataExtends<T>) {
//     switch (args.length) {
//         case 0:
//             return (...args: any[]) => {
//                 checkArgs(name, metaName, args, metadata, metadataExtends);
//             }
//         case 1:
//             if (isClass(args[0])) {
//                 let target = args[0];
//                 setTypeMetadata<T>(name, metaName, target, metadata, metadataExtends);
//                 return target;
//             } else {
//                 return (...args: any[]) => {
//                     checkArgs(name, metaName, args, metadata, metadataExtends);
//                 }
//             }
//         case 2:
//             let target = args[0];
//             let propertyKey = args[1];
//             setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends);
//             break;
//         case 3:
//             if (isNumber(args[2])) {
//                 let target = args[0];
//                 let propertyKey = args[1];
//                 let parameterIndex = args[2];
//                 setParamMetadata<T>(name, metaName, target, propertyKey, parameterIndex, metadata, metadataExtends);
//             } else if (isUndefined(args[2])) {
//                 let target = args[0];
//                 let propertyKey = args[1];
//                 setPropertyMetadata<T>(name, metaName, target, propertyKey, metadata, metadataExtends);
//             } else {
//                 let target = args[0];
//                 let propertyKey = args[1];
//                 let descriptor = args[2];
//                 setMethodMetadata<T>(name, metaName, target, propertyKey, descriptor, metadata, metadataExtends);
//                 return descriptor;
//             }
//             break;
//         default:
//             throw new Error(`Invalid @${name} Decorator declaration.`);
//     }
// }

function setTypeMetadata<T>(name: string, metaName: string, target: Type<T>, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let annotations = Reflect.getOwnMetadata(metaName, target);
    annotations = isArray(annotations) ? annotations : [];
    // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
    let typeMetadata = (metadata || {}) as TypeMetadata;
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


function setMethodMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let meta = Reflect.getOwnMetadata(metaName, target) || {};
    meta = isArray(meta) ? {} : meta;
    meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];

    let methodMeadata: MethodMetadata = metadata || {};
    methodMeadata.decorator = name;
    if (metadataExtends) {
        methodMeadata = metadataExtends(methodMeadata);
    }
    meta[propertyKey].unshift(methodMeadata);
    Reflect.defineMetadata(metaName, meta, target.constructor);
}



function setPropertyMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, metadata?: T, metadataExtends?: MetadataExtends<any>) {
    let meta = Reflect.getOwnMetadata(metaName, target) || {};
    meta = isArray(meta) ? {} : meta;
    let propmetadata = (metadata || {}) as PropertyMetadata;

    propmetadata.propertyName = propertyKey;
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


function setParamMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, parameterIndex: number, metadata?: T, metadataExtends?: MetadataExtends<any>) {

    let parameters: any[][] = Reflect.getOwnMetadata(metaName, target, propertyKey) || [];
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
    paramMeadata.propertyName = propertyKey;
    paramMeadata.decorator = name;
    paramMeadata.index = parameterIndex;
    if (metadataExtends) {
        paramMeadata = metadataExtends(paramMeadata);
    }
    parameters[parameterIndex].push(paramMeadata);
    Reflect.defineMetadata(metaName, parameters, target, propertyKey);
}
