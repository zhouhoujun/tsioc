import 'reflect-metadata';
import { ClassMetadata } from './Metadata';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';


/**
 * class decorator.
 *
 * @export
 * @interface IClassDecorator
 */
export interface IClassDecorator {
    <T extends ClassMetadata>(meatedata?: T): ClassDecorator;
    (target: Type<any>): void;
}


/**
 * create class decorator
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns {*}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string): IClassDecorator {
    return createDecorator<T>(name);
}

// export function createClassDecorator<T extends ClassMetadata>(name: string): IClassDecorator {
//     let metaName = `@${name}`;
//     return (...args: any[]) => {
//         if (args.length === 1 && typeof args[0] === 'function') {
//             let target = args[0];
//             setClassMetadata<T>(name, metaName, target);
//             return target;
//         } else {
//             let metadata = args.length > 0 ? args[0] : null;
//             return (target: Type<any>) => {
//                 setClassMetadata<T>(name, metaName, target, metadata);
//                 return target;
//             }
//         }
//     };
// }

// function setClassMetadata<T>(name: string, metaName: string, target: any, metadata?: T) {
//     let annotations = Reflect.getMetadata(metaName, target) || [];
//     // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
//     let classMetadata: ClassMetadata = metadata || {};
//     classMetadata.decorator = name;
//     annotations.push(classMetadata);
//     Reflect.defineMetadata(metaName, annotations, target);
// }
