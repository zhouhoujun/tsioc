import { TypeMetadata } from '../metadatas';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';



export type MethodPropParamDecorator = (target: Object, propertyKey: string | symbol, descriptor?: number | TypedPropertyDescriptor<any>) => void;
/**
 * method, property or parameter decorator.
 *
 * @export
 * @interface IMethodPropParamDecorator
 */
export interface IMethodPropParamDecorator<T extends TypeMetadata> {
    /**
     * define method, property or parameter decorator with metadata map.
     * @param {T} [metadata] metadata map
     */
    (metadata?: T): MethodPropParamDecorator;
    /**
     * define method, property or parameter decorator.
     */
    (target: object, propertyKey: string | symbol, descriptor?: number | TypedPropertyDescriptor<any>): void;
}

/**
 * create method, property or parameter decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IMethodPropParamDecorator<T>}
 */
export function createMethodPropParamDecorator<T extends TypeMetadata>(
    name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IMethodPropParamDecorator<T> {

    let decorator = createDecorator<T>(name, adapter, metadataExtends);
    decorator.decoratorType = DecoratorType.Method | DecoratorType.Property | DecoratorType.Parameter;
    return decorator;
}

