import { ProviderMetadata } from './ProviderMetadata';
import { ProvidersMetadata } from './ProvidersMetadata';
import { RefMetadata } from './RefMetadata';
import { TypeMetadata } from './TypeMetadata';

/**
 * class pattern metadata.
 */
export interface PatternMetadata {
    /**
     * is singleton or not.
     *
     * @type {boolean}
     */
    singleton?: boolean;
    /**
     * class cache timeout when not used.
     *
     * @type {number}
     */
    expires?: number;
}

/**
 * class metadata.
 *
 * @export
 * @interface ClassMetadata
 */
export interface ClassMetadata extends PatternMetadata, ProviderMetadata, ProvidersMetadata, RefMetadata, TypeMetadata {

}

