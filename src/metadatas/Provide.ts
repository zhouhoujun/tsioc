import { SymbolType } from '../types';
import { TypeMetadata } from './TypeMetadata';

/**
 * provide type from.
 *
 * @export
 * @interface Provide
 * @extends {MetaType}
 */
export interface Provide extends TypeMetadata {
    /**
     * this type provide from.
     *
     * @type {SymbolType<any>}
     * @memberof Provide
     */
    provider?:  SymbolType<any>;
    alias?: string;
}
