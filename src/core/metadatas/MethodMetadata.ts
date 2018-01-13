import { Metadate } from './Metadate';
import { Providers } from '../../types';

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Metadate {
    /**
     * param providers
     *
     * @type {ParamProvider[]}
     * @memberof MethodMetadata
     */
    providers?: Providers[];
    /**
     * method property key
     *
     * @type {(string | symbol)}
     * @memberof MethodMetadata
     */
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
