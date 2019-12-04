import { Type } from '../types';
import { TypeMetadata } from '../metadatas/TypeMetadata';
import { createDecorator, MetadataExtends } from './DecoratorFactory'
import { DecoratorType } from './DecoratorType';
import { ArgsIteratorAction } from './ArgsIterator';


export type ClassMethodDecorator = (target: Object | Type, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;

/**
 * class method decorator
 *
 * @export
 * @interface IClassMethodDecorator
 * @template T
 */
export interface IClassMethodDecorator<T extends TypeMetadata> {
    /**
     * create decorator with metadata map. for class or method decorator.
     *
     * @param {T} [metadata] metadata map.
     */
    (metadata?: T): ClassMethodDecorator;

    (target: Type): void;
    (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): void;

    decoratorType?: DecoratorType;
}

/**
 * create decorator for class and method.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction<T>[]} [actions]  metadata iterator actions.
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IClassMethodDecorator<T>}
 */
export function createClassMethodDecorator<T extends TypeMetadata>(name: string, actions?: ArgsIteratorAction<T>[], metadataExtends?: MetadataExtends<T>): IClassMethodDecorator<T> {
    let decorator = createDecorator<T>(name, actions, metadataExtends);
    decorator.decoratorType = DecoratorType.Class | DecoratorType.Method;
    return decorator;
}

