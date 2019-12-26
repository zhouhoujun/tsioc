import { ProviderMetadata } from './ProviderMetadata';
import { ProvidersMetadata } from './ProvidersMetadata';
import { RefMetadata } from './RefMetadata';
import { TypeMetadata } from './TypeMetadata';

/**
 * class metadata.
 *
 * @export
 * @interface ClassMetadata
 */
export interface ClassMetadata extends ProviderMetadata, ProvidersMetadata, RefMetadata, TypeMetadata {
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

