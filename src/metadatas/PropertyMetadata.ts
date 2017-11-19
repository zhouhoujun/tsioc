import { TypeMetadata } from './TypeMetadata';


/**
 * property metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface PropertyMetadata extends TypeMetadata {
    /**
     * property name
     *
     * @type {(string | symbol)}
     * @memberof PropertyMetadata
     */
    propertyName?: string | symbol;

}
