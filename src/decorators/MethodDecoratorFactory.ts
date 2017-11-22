import 'reflect-metadata';
import { MethodMetadata } from '../metadatas';
import { Type } from '../Type';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
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
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(
    name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IMethodDecorator<T> {

    let decorator = createDecorator<T>(name, adapter, metadataExtends);
    decorator.decoratorType = DecoratorType.Method;
    return decorator;
}
