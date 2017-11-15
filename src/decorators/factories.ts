import 'reflect-metadata';
import { Type } from '../Type';
import { PropertyMetadata, ClassMetadata, MethodMetadata, ParameterMetadata } from './Metadata';
import { arch, type } from 'os';


/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T metadata type.
 * @param {string} name
 * @returns
 */
export function createDecorator<T>(name: string) {
    return function (...args: any[]) {
        switch (args.length) {
            case 1:
                return createClassDecorator<T>(name).apply(this, args);
            case 2:
                return createPropDecorator<T>(name).apply(this, args);
            case 3:
                if (args[2] === 'number') {
                    return createParamDecorator<T>(name).apply(this, args);
                }
                return createMethodDecorator<T>(name).apply(this, args);
            default:
                throw new Error(`Invalid @${name} Decorator declaration.`);
        }
    }
}

export type DecoratorFactory<T, TDecorator> = TDecorator | ((meatedata: T) => TDecorator);

/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @returns
 */
export function createParamPropDecorator<T>(name: string) {
    return function (...args: any[]) {
        if (args.length === 1 && typeof args[0] === 'function') {
            throw new Error(`Invalid @${name} Decorator declaration.`);
        }
        if (args.length < 3 || typeof args[2] === 'undefined') {
            return createPropDecorator<T>(name).apply(this, args);
        } else if (args.length === 3 && typeof args[2] === 'number') {
            return createParamDecorator<T>(name).apply(this, args);
        }

        throw new Error(`Invalid @${name} Decorator declaration.`);
    }
}


/**
 * create class decorator
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns {*}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string): (target?: T | Type<any>) => any {
    let metaName = `@${name}`;
    return <TClass>(target?: T | Type<TClass>) => {
        if (target && typeof target === 'function') {
            setClassMetadata<T>(name, metaName, target);
            return target;
        } else {
            let metadata = target as T;
            return (target: Type<TClass>) => {
                setClassMetadata<T>(name, metaName, target, metadata);
                return target;
            }
        }
    };
}

function setClassMetadata<T>(name: string, metaName: string, target: any, metadata?: T) {
    let annotations = Reflect.getMetadata(metaName, target) || [];
    // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
    let classMetadata: ClassMetadata = metadata || {};
    classMetadata.decorator = name;
    annotations.push(classMetadata);
    Reflect.defineMetadata(metaName, annotations, target);
}

/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>(name: string): any {
    let metaName = `@${name}`;
    return (...args: any[]) => {
        if (args.length === 3 && typeof args[2] === 'number') {
            let target = args[0];
            let propertyKey = args[1];
            let parameterIndex = args[2];
            setParamMetadata<T>(name, metaName, target, propertyKey, parameterIndex);
            return undefined;

        } else {
            let metadata = args[0];
            return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
                setParamMetadata<T>(name, metaName, target, propertyKey, parameterIndex, metadata);
            }
        }
    };
}

function setParamMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, parameterIndex: number, metadata?: T) {
    let parameters: any[][] = Reflect.getOwnMetadata(metaName, target) || [];

    // there might be gaps if some in between parameters do not have annotations.
    // we pad with nulls.
    while (parameters.length <= parameterIndex) {
        parameters.push(null);
    }

    parameters[parameterIndex] = parameters[parameterIndex] || [];

    let paramMeadata: ParameterMetadata = metadata || {};

    let t = Reflect.getMetadata('design:type', target, propertyKey);
    if (!t) {
        // Needed to support react native inheritance
        t = Reflect.getMetadata('design:type', target.constructor, propertyKey);
    }
    paramMeadata.decorator = name;
    paramMeadata.type = paramMeadata.type || t;
    paramMeadata.index = parameterIndex;
    parameters[parameterIndex].push(paramMeadata);

    Reflect.defineMetadata(metaName, parameters, target.constructor);
}

/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(name: string): DecoratorFactory<T, MethodDecorator> {
    let metaName = `@${name}`;
    return (...args: any[]) => {
        if (args.length === 3 && typeof args[2] !== 'number') {
            let target = args[0];
            let propertyKey = args[1];
            let descriptor = args[2];
            setMethodMetadata<T>(name, metaName, target, propertyKey, descriptor);
            return descriptor;

        } else {
            let metadata = args[0];
            return <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void => {
                setMethodMetadata<T>(name, metaName, target as Type<T>, propertyKey, descriptor, metadata);
                return descriptor;
            };
        }
    }
}

function setMethodMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>, metadata?: T) {
    let meta = Reflect.getOwnMetadata(metaName, target) || {};
    meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];

    let methodMeadata: MethodMetadata = metadata || {};
    methodMeadata.decorator = name;
    meta[propertyKey].unshift(methodMeadata);
    Reflect.defineMetadata(metaName, meta, target.constructor);
}


/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string): any {
    let metaName = `@${name}`;
    return (...args: any[]) => {
        if (args.length > 1 && (args.length < 3 || typeof args[2] === 'undefined')) {
            let target = args[0];
            let propertyKey = args[1];
            let descriptor = args[2];
            setPropertyMetadata<T>(name, metaName, target, propertyKey);
            return undefined;
        } else {
            let metadata = args[0];
            return (target: any, propertyKey: string | symbol) => {
                setPropertyMetadata<T>(name, metaName, target, propertyKey, metadata);
            };
        };
    }
}

function setPropertyMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, metadata?: T) {
    let meta = Reflect.getOwnMetadata(metaName, target) || {};
    let propmetadata: PropertyMetadata = metadata || {};

    propmetadata.propertyName = propertyKey;
    propmetadata.decorator = name;
    let t = Reflect.getMetadata('design:type', target, propertyKey);
    if (!t) {
        // Needed to support react native inheritance
        t = Reflect.getMetadata('design:type', target.constructor, propertyKey);
    }
    propmetadata.type = propmetadata.type || t;

    meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];
    meta[propertyKey].unshift(propmetadata);
    Reflect.defineMetadata(metaName, meta, target.constructor);
}
