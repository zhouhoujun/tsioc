import { Metadate } from './Metadate';
import { ParamProvider } from '../IMethodAccessor';

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Metadate {
    providers?: ParamProvider[];
    propertyKey?: string | symbol;
    descriptor?: TypedPropertyDescriptor<any>
}
