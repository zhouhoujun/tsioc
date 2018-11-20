import { Metadate } from './Metadate';
import { ProviderTypes } from '../../types';

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
     * @type {ProviderTypes[]}
     * @memberof MethodMetadata
     */
    providers?: ProviderTypes[];
    /**
     * method property key
     *
     * @type {string}
     * @memberof MethodMetadata
     */
    propertyKey?: string;

}
