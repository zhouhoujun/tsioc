import { ProvideMetadata } from './ProvideMetadata';
import { TypeMetadata } from './TypeMetadata';


/**
 * property metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface PropertyMetadata extends ProvideMetadata, TypeMetadata {
    /**
     * property name
     *
     * @type {string}
     * @memberof PropertyMetadata
     */
    propertyKey?: string;
}
