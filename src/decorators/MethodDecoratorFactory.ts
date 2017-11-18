import 'reflect-metadata';
import { MethodMetadata } from './Metadata';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';


/**
 * Method decorator.
 *
 * @export
 * @interface IMethodDecorator
 */
export interface IMethodDecorator<T extends MethodMetadata> {
    (metadata?: T): MethodDecorator;
    (target: Function, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): void;
}


/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(name: string): IMethodDecorator<T> {
    let decorator = createDecorator<T>(name);
    decorator.decoratorType = DecoratorType.Method;
    return decorator;
}
