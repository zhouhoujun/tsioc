import { TypeMetadata } from './TypeMetadata';
import { ProvideMetadata } from './index';


/**
 * property metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface PropertyMetadata extends ProvideMetadata {
    /**
     * property name
     *
     * @type {(string | symbol)}
     * @memberof PropertyMetadata
     */
    propertyKey?: string | symbol;

}
