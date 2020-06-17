import { PropertyMetadata, createPropDecorator, IPropertyDecorator } from '@tsdi/ioc';


/**
 * @NonSerialize decorator define component property not need serialized.
 */
export const NonSerialize: IPropertyDecorator<PropertyMetadata> = createPropDecorator<PropertyMetadata>('NonSerialize');
