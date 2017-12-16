import { Metadate } from './Metadate';
import { ParamProvider } from '../../ParamProvider';

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Metadate {
    providers?: ParamProvider[];
    propertyKey?: string | symbol;
    // /**
    //  * method parameter names
    //  *
    //  * @type {string[]}
    //  * @memberof ClassMetadata
    //  */
    // parameterNames?: string[];
    // descriptor?: TypedPropertyDescriptor<any>;
}
