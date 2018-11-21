import { Token } from '../../types';
import { TypeMetadata } from './TypeMetadata';
import { RefToMetadata } from './RefToMetadata';

/**
 * provider type to.
 *
 * @export
 * @interface Provider
 * @extends {MetaType}
 */
export interface ProviderMetadata extends TypeMetadata, RefToMetadata  {
    /**
     * this type provider to.
     *
     * @type {SymbolType<any>}
     * @memberof Provider
     */
    provide?:  Token<any>;
    /**
     * provide alias.
     *
     * @type {string}
     * @memberof ProviderMetadata
     */
    alias?: string;
}
