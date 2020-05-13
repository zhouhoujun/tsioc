import { Token } from '../types';

/**
 * provider type to.
 *
 * @export
 * @interface Provider
 * @extends {MetaType}
 */
export interface ProviderMetadata {
    /**
     * this type provider to.
     *
     * @type {SymbolType}
     * @memberof IProviderMetadata
     */
    provide?:  Token;
    /**
     * provide alias.
     *
     * @type {string}
     * @memberof IProviderMetadata
     */
    alias?: string;
}
