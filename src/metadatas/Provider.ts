import { SymbolType } from '../types';
import { TypeMetadata } from './TypeMetadata';

/**
 * provider type to.
 *
 * @export
 * @interface Provider
 * @extends {MetaType}
 */
export interface Provider extends TypeMetadata {
    /**
     * this type provider to.
     *
     * @type {SymbolType<any>}
     * @memberof Provider
     */
    provide?:  SymbolType<any>;
    alias?: string;
}
