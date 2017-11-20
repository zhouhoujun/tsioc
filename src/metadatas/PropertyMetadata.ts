import { TypeMetadata } from './TypeMetadata';
import { Provide } from './index';


/**
 * property metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface PropertyMetadata extends Provide {
    /**
     * property name
     *
     * @type {(string | symbol)}
     * @memberof PropertyMetadata
     */
    propertyName?: string | symbol;

}
