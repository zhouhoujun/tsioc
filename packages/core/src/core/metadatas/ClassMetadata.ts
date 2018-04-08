import { ProviderMetadata } from './ProviderMetadata';
import { ObjectMap } from '../../types';


/**
 * class metadata.
 *
 * @export
 * @interface ClassMetadata
 */
export interface ClassMetadata extends ProviderMetadata {
    /**
     * is singleton or not.
     *
     * @type {boolean}
     * @memberof ClassMetadata
     */
    singleton?: boolean;
    /**
     * class package name.
     *
     * @type {string}
     * @memberof ClassMetadata
     */
    package?: string;

    /**
     * class cache timeout when not used.
     *
     * @type {number}
     * @memberof ClassMetadata
     */
    expires?: number;
}

