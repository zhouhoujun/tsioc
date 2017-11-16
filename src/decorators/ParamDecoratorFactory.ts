import 'reflect-metadata';
import { ParameterMetadata } from './Metadata';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';


/**
 * Parameter decorator.
 *
 * @export
 * @interface IParameterDecorator
 */
export interface IParameterDecorator {
    <T extends ParameterMetadata>(meatedata?: T): ParameterDecorator;
    (target: object, propertyKey: string | symbol, parameterIndex: number): void;
}



/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>(name: string): IParameterDecorator {
    return createDecorator<T>(name);
}

// export function createParamDecorator<T extends ParameterMetadata>(name: string): IParameterDecorator {
//     let metaName = `@${name}`;
//     return (...args: any[]) => {
//         if (args.length === 3 && typeof args[2] === 'number') {
//             let target = args[0];
//             let propertyKey = args[1];
//             let parameterIndex = args[2];
//             setParamMetadata<T>(name, metaName, target, propertyKey, parameterIndex);
//             return undefined;

//         } else {
//             let metadata = args[0];
//             return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
//                 setParamMetadata<T>(name, metaName, target, propertyKey, parameterIndex, metadata);
//             }
//         }
//     };
// }

// function setParamMetadata<T>(name: string, metaName: string, target: Type<T>, propertyKey: string | symbol, parameterIndex: number, metadata?: T) {
//     let parameters: any[][] = Reflect.getOwnMetadata(metaName, target) || [];

//     // there might be gaps if some in between parameters do not have annotations.
//     // we pad with nulls.
//     while (parameters.length <= parameterIndex) {
//         parameters.push(null);
//     }

//     parameters[parameterIndex] = parameters[parameterIndex] || [];

//     let paramMeadata: ParameterMetadata = metadata || {};

//     let t = Reflect.getMetadata('design:type', target, propertyKey);
//     if (!t) {
//         // Needed to support react native inheritance
//         t = Reflect.getMetadata('design:type', target.constructor, propertyKey);
//     }
//     paramMeadata.decorator = name;
//     paramMeadata.type = paramMeadata.type || t;
//     paramMeadata.index = parameterIndex;
//     parameters[parameterIndex].push(paramMeadata);

//     Reflect.defineMetadata(metaName, parameters, target.constructor);
// }
