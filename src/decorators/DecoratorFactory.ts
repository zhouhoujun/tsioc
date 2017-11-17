import 'reflect-metadata';
import { Type } from '../Type';
import { PropertyMetadata, ClassMetadata, MethodMetadata, ParameterMetadata } from './Metadata';
import { arch, type } from 'os';
import { createClassDecorator } from './ClassDecoratorFactory';
import { createPropDecorator, IPropertyDecorator } from './PropertyDecoratorFactory';
import { createParamDecorator, IParameterDecorator } from './ParamDecoratorFactory';
import { createMethodDecorator } from './MethodDecoratorFactory';


/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T metadata type.
 * @param {string} name
 * @returns
 */
export function createDecorator<T>(name: string): any {
    let metaName = `@${name}`;
    let metadata: T = null;
    let factory = (...args: any[]) => {
        switch (args.length) {
            case 0:
                metadata = null;
                return (...args: any[]) => {
                    factory(...args);
                }
            case 1:
                if (args[0] && typeof args[0] === 'function') {
                    let target = args[0];
                    setClassMetadata<T>(name, metaName, target, metadata);
                    return target;
                } else {
                    metadata = args.length > 0 ? args[0] : null;
                    return (...args: any[]) => {
                        factory(...args);
                    }
                }
            case 2:
                let target = args[0];
                let propertyKey = args[1];
                setPropertyMetadata<T>(name, metaName, target, propertyKey, metadata);
                break;
            case 3:
                if (typeof args[2] === 'number') {
                    let target = args[0];
                    let propertyKey = args[1];
                    let parameterIndex = args[2];
                    setParamMetadata<T>(name, metaName, target, propertyKey, parameterIndex, metadata);
                } else if (typeof args[2] === 'undefined') {
                    let target = args[0];
                    let propertyKey = args[1];
                    setPropertyMetadata<T>(name, metaName, target, propertyKey, metadata);
                } else {
                    let target = args[0];
                    let propertyKey = args[1];
                    let descriptor = args[2];
                    setMethodMetadata<T>(name, metaName, target, propertyKey, descriptor, metadata);
                    return descriptor;
                }
                break;
            default:
                throw new Error(`Invalid @${name} Decorator declaration.`);
        }
    }
    return factory;
}


function setClassMetadata<T>(name: string, metaName: string, target: Type<T>, metadata?: T) {
    let annotations = Reflect.getMetadata(metaName, target) || [];
    // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
    let classMetadata: ClassMetadata = metadata || {};
    classMetadata.decorator = name;
    annotations.push(classMetadata);
    Reflect.defineMetadata(metaName, annotations, target);
}


function setMethodMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>, metadata?: T) {
    let meta = Reflect.getOwnMetadata(metaName, target) || {};
    meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];

    let methodMeadata: MethodMetadata = metadata || {};
    methodMeadata.decorator = name;
    meta[propertyKey].unshift(methodMeadata);
    Reflect.defineMetadata(metaName, meta, target.constructor);
}



function setPropertyMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, metadata?: T) {
    let meta = Reflect.getOwnMetadata(metaName, target) || {};
    let propmetadata: PropertyMetadata = metadata || {};

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

    meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];
    meta[propertyKey].unshift(propmetadata);
    Reflect.defineMetadata(metaName, meta, target.constructor);
}


function setParamMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, parameterIndex: number, metadata?: T) {
    let parameters: any[][] = Reflect.getOwnMetadata(metaName, target, propertyKey) || [];

    // there might be gaps if some in between parameters do not have annotations.
    // we pad with nulls.
    while (parameters.length <= parameterIndex) {
        parameters.push(null);
    }

    parameters[parameterIndex] = parameters[parameterIndex] || [];

    let paramMeadata: ParameterMetadata = metadata || {};

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
    parameters[parameterIndex].push(paramMeadata);

    Reflect.defineMetadata(metaName, parameters, target, propertyKey);
}
