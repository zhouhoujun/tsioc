import 'reflect-metadata';
import { PropertyMetadata } from './Metadata';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';


/**
 * property decorator.
 *
 * @export
 * @interface IPropertyDecorator
 */
export interface IPropertyDecorator {
    <T extends PropertyMetadata>(meatedata?: T): PropertyDecorator;
    (target: object, propertyKey: string | symbol): void;
}


/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string): IPropertyDecorator {
    return createDecorator<T>(name);
}

// export function createPropDecorator<T extends PropertyMetadata>(name: string): IPropertyDecorator {
//     let metaName = `@${name}`;
//     return (...args: any[]) => {
//         if (args.length > 1 && (args.length < 3 || typeof args[2] === 'undefined')) {
//             let target = args[0];
//             let propertyKey = args[1];
//             let descriptor = args[2];
//             setPropertyMetadata<T>(name, metaName, target, propertyKey);
//             return undefined;
//         } else {
//             let metadata = args[0];
//             return (target: any, propertyKey: string | symbol) => {
//                 setPropertyMetadata<T>(name, metaName, target, propertyKey, metadata);
//             };
//         };
//     }
// }

// function setPropertyMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, metadata?: T) {
//     let meta = Reflect.getOwnMetadata(metaName, target) || {};
//     let propmetadata: PropertyMetadata = metadata || {};

//     propmetadata.propertyName = propertyKey;
//     propmetadata.decorator = name;
//     let t = Reflect.getMetadata('design:type', target, propertyKey);
//     if (!t) {
//         // Needed to support react native inheritance
//         t = Reflect.getMetadata('design:type', target.constructor, propertyKey);
//     }
//     propmetadata.type = propmetadata.type || t;

//     meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];
//     meta[propertyKey].unshift(propmetadata);
//     Reflect.defineMetadata(metaName, meta, target.constructor);
// }
