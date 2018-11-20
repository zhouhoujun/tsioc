import { Token } from '../../types';
import { TypeMetadata } from './TypeMetadata';

/**
 * reference metadata.
 *
 * @export
 * @interface RefMetadata
 * @extends {TypeMetadata}
 */
export interface RefMetadata extends TypeMetadata {
    /**
     * define the class as service reference to target.
     *
     * @type {Token<any>}
     * @memberof RefMetadata
     */
    refTo?: Token<any>;
}
