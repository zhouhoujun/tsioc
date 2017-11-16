import 'reflect-metadata';
import { Type } from '../Type';
import { PropertyMetadata, ClassMetadata, MethodMetadata, ParameterMetadata } from './Metadata';
import { createDecorator } from './DecoratorFactory';



/**
 * Parameter and Property decorator.
 *
 * @export
 * @interface IParamPropDecorator
 */
export interface IParamPropDecorator {
    <T extends PropertyMetadata>(meatedata?: T): PropertyDecorator;
    <T extends ParameterMetadata>(meatedata?: T): ParameterDecorator;
    (target: object, propertyKey: string | symbol): void;
    (target: object, propertyKey: string | symbol, parameterIndex: number): void;
}
/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @returns
 */
export function createParamPropDecorator<T>(name: string): IParamPropDecorator {
    return createDecorator<T>(name);
    // return (...args: any[]) => {
    //     switch (args.length) {
    //         case 1:
    //             return createClassDecorator<T>(name).apply(this, args);
    //         case 2:
    //             return createPropDecorator<T>(name).apply(this, args);
    //         case 3:
    //             if (args.length === 3 && typeof args[2] === 'number') {
    //                 return createParamDecorator<T>(name).apply(this, args);
    //             } else if (typeof args[2] === 'undefined') {
    //                 return createPropDecorator<T>(name).apply(this, args);
    //             }
    //     }
    //     throw new Error(`Invalid @${name} Decorator declaration.`);
    // }
}


