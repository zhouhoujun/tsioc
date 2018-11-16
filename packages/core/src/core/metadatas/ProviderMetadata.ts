import { Token } from '../../types';
import { TypeMetadata } from './TypeMetadata';
import { RefMetadata } from './RefMetadata';

/**
 * provider type to.
 *
 * @export
 * @interface Provider
 * @extends {MetaType}
 */
export interface ProviderMetadata extends TypeMetadata, RefMetadata  {
    /**
     * this type provider to.
     *
     * @type {SymbolType<any>}
     * @memberof Provider
     */
    provide?:  Token<any>;
    alias?: string;
}
