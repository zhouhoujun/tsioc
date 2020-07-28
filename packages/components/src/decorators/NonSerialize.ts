import { PropertyMetadata, createPropDecorator, Token } from '@tsdi/ioc';


/**
 * NonSerialize decorator.
 *
 * @export
 * @interface INonSerializeDecorator
 */
export interface INonSerializeDecorator {
    /**
     * NonSerialize decorator with param. define component property not need serialized.
     *
     * @param {Token<T>} provider define provider to resolve value to the property.
     */
    (provider: Token): PropertyDecorator;
    /**
     * NonSerialize decorator with metadata. define component property not need serialized.
     * @param {T} [metadata] NonSerialize matadata.
     */
    (metadata?: PropertyMetadata): PropertyDecorator;
    /**
     * NonSerialize decorator. define component property not need serialized.
     */
    (target: object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>): void;
}

/**
 * @NonSerialize decorator define component property not need serialized.
 */
export const NonSerialize: INonSerializeDecorator = createPropDecorator<PropertyMetadata>('NonSerialize');
