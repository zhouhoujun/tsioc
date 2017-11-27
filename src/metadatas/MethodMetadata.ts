import { Metadate } from './Metadate';

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Metadate {
    propertyKey?: string | symbol;
    descriptor?: TypedPropertyDescriptor<any>
}
