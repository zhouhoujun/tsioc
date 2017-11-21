import 'reflect-metadata';
import { MethodMetadata } from '../metadatas';
import { Type } from '../Type';
import { createDecorator, MetadataAdapter } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';


/**
 * Method decorator.
 *
 * @export
 * @interface IMethodDecorator
 */
export interface IMethodDecorator<T extends MethodMetadata> {
    (metadata?: T): MethodDecorator;
    (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): void;
}


/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(name: string, adapter?: MetadataAdapter): IMethodDecorator<T> {
    let decorator = createDecorator<T>(name, adapter);
    decorator.decoratorType = DecoratorType.Method;
    return decorator;
}
