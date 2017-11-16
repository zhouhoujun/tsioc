import 'reflect-metadata';
import { MethodMetadata } from './Metadata';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';


/**
 * Method decorator.
 *
 * @export
 * @interface IMethodDecorator
 */
export interface IMethodDecorator {
    <T extends MethodMetadata>(meatedata?: T): MethodDecorator;
    <T>(target: Function, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): void;
}


/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(name: string): IMethodDecorator {
    return createDecorator<T>(name);
}

// export function createMethodDecorator<T extends MethodMetadata>(name: string): IMethodDecorator {
//     let metaName = `@${name}`;
//     return (...args: any[]) => {
//         if (args.length === 3 && typeof args[2] !== 'number') {
//             let target = args[0];
//             let propertyKey = args[1];
//             let descriptor = args[2];
//             setMethodMetadata<T>(name, metaName, target, propertyKey, descriptor);
//             return descriptor;

//         } else {
//             let metadata = args[0];
//             return <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void => {
//                 setMethodMetadata<T>(name, metaName, target as Type<T>, propertyKey, descriptor, metadata);
//                 return descriptor;
//             };
//         }
//     }
// }

// function setMethodMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>, metadata?: T) {
//     let meta = Reflect.getOwnMetadata(metaName, target) || {};
//     meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];

//     let methodMeadata: MethodMetadata = metadata || {};
//     methodMeadata.decorator = name;
//     meta[propertyKey].unshift(methodMeadata);
//     Reflect.defineMetadata(metaName, meta, target.constructor);
// }
