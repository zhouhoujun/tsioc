import { ProviderMetadata } from './ProviderMetadata';


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
}

