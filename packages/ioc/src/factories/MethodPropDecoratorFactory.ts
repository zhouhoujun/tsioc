import { MethodPropMetadata } from '../metadatas';
import { createDecorator, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { ArgsIteratorAction } from './ArgsIterator';



export type MethodPropDecorator = (target: Object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;
/**
 * method and Property decorator.
 *
 * @export
 * @interface IMethodPropDecorator
 */
export interface IMethodPropDecorator<T extends MethodPropMetadata> {
    /**
     * create method decorator with metadata map.
     * @param {T} [metadata]
     */
    (metadata?: T): MethodPropDecorator;
    (target: object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>): void;
}

/**
 * create method or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction<T>[]} [actions]  metadata iterator action.
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IMethodPropDecorator<T>}
 */
export function createMethodPropDecorator<T extends MethodPropMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metadataExtends?: MetadataExtends<T>): IMethodPropDecorator<T> {
    let decorator = createDecorator<T>(name, actions, metadataExtends);
    decorator.decoratorType = DecoratorType.Method | DecoratorType.Property;
    return decorator;
}

