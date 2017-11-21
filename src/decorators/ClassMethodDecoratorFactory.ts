import 'reflect-metadata';
import { Type } from '../Type';
import { TypeMetadata } from '../metadatas';
import { createDecorator, MetadataAdapter } from './DecoratorFactory'
import { DecoratorType } from './DecoratorType';


export type ClassMethodDecorator = (target: Object | Type<any>, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;

/**
 * class method decorator
 *
 * @export
 * @interface IClassMethodDecorator
 * @template T
 */
export interface IClassMethodDecorator<T extends TypeMetadata> {
    (metadata?: T): ClassMethodDecorator;
    (target: Type<any>): void;
    (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): void;
}

/**
 * create decorator for class and method.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]
 * @returns {IClassMethodDecorator<T>}
 */
export function createClassMethodDecorator<T extends TypeMetadata>(name: string, adapter?: MetadataAdapter): IClassMethodDecorator<T> {
    let decorator = createDecorator<T>(name, adapter);
    decorator.decoratorType = DecoratorType.Class | DecoratorType.Method;
    return decorator;
}

