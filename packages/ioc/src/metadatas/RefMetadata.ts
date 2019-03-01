import { Token } from '../types';
import { TypeMetadata } from './TypeMetadata';

/**
 * ref provider.
 *
 * @export
 * @interface RefProvider
 */
export interface RefProvider {
    /**
     * ref to tagert.
     *
     * @type {Token<any>}
     * @memberof RefProvider
     */
    target: Token<any>;

    /**
     * ref provide
     *
     * @type {Token<any>}
     * @memberof RefProvider
     */
    provide?: Token<any>;

    /**
     * provide alias.
     *
     * @type {string}
     * @memberof RefProvider
     */
    alias?: string;
}

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
     * @type {RefProvider}
     * @memberof RefMetadata
     */
    refs?: RefProvider
}
