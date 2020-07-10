import { PropertyMetadata, createPropDecorator } from '@tsdi/ioc';


/**
 * @NonSerialize decorator define component property not need serialized.
 */
export const NonSerialize = createPropDecorator<PropertyMetadata>('NonSerialize');
